import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { PuntoPrecio } from '../services/apiTcg';
import { clp, DIA } from '../utils/formato';
import Tabla from './Tabla';

/* Historial del precio de mercado (TCGplayer) convertido a pesos.
   Una sola serie: no lleva leyenda, el título la nombra. Al pasar el puntero (o con las flechas
   del teclado) se ve el precio de cada día; debajo hay una tabla con los mismos datos. */

const RANGOS = [
  { id: '1m', texto: '1M', dias: 31 },
  { id: '3m', texto: '3M', dias: 92 },
  { id: '6m', texto: '6M', dias: 183 },
  { id: 'todo', texto: 'Todo', dias: Infinity },
] as const;
type RangoId = (typeof RANGOS)[number]['id'];

const ALTO = 260;
const MARGEN = { arriba: 16, derecha: 16, abajo: 30, izquierda: 64 };

const formatoDia = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatoDiaLargo = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const usd = (n: number) => `US$ ${n.toFixed(2)}`;

/* Eje Y con valores "redondos" (1, 2, 2,5 o 5 × 10^n). */
function marcasY(min: number, max: number, cantidad = 4): number[] {
  const bruto = (max - min) / cantidad || max || 1;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  const desde = Math.floor(min / paso) * paso;
  const marcas: number[] = [];
  for (let v = desde; v <= max + paso * 0.001; v += paso) marcas.push(v);
  if (marcas[marcas.length - 1] < max) marcas.push(marcas[marcas.length - 1] + paso);
  return marcas;
}

/* "$290 mil", "$1,2 M": etiquetas cortas para el eje. */
function clpCorto(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M`;
  if (n >= 1e4) return `$${Math.round(n / 1e3).toLocaleString('es-CL')} mil`;
  return clp(n);
}

interface Props {
  puntos: PuntoPrecio[];
  dolar: number;
  impresion?: string;
}

export default function GraficoPrecios({ puntos, dolar, impresion }: Props) {
  const [rango, setRango] = useState<RangoId>('3m');
  const [activo, setActivo] = useState<number | null>(null);
  const [ancho, setAncho] = useState(640);
  const caja = useRef<HTMLDivElement>(null);

  // El SVG se dibuja al ancho real del contenedor (así el texto nunca se deforma).
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setAncho(Math.max(280, Math.round(el.clientWidth)));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const datos = useMemo(() => {
    const ultimo = puntos[puntos.length - 1]?.fecha ?? 0;
    const dias = RANGOS.find((r) => r.id === rango)?.dias ?? Infinity;
    return puntos
      .filter((p) => dias === Infinity || p.fecha >= ultimo - dias * DIA)
      .map((p) => ({ ...p, clp: Math.round(p.usd * dolar) }));
  }, [puntos, rango, dolar]);

  if (datos.length < 2) {
    return <p className="bajada">Aún no hay suficientes días de historial para dibujar el gráfico.</p>;
  }

  const ancho_util = ancho - MARGEN.izquierda - MARGEN.derecha;
  const alto_util = ALTO - MARGEN.arriba - MARGEN.abajo;
  const valores = datos.map((d) => d.clp);
  const marcas = marcasY(Math.min(...valores), Math.max(...valores));
  const yMin = marcas[0];
  const yMax = marcas[marcas.length - 1];
  const t0 = datos[0].fecha;
  const t1 = datos[datos.length - 1].fecha;
  const x = (t: number) => MARGEN.izquierda + ((t - t0) / (t1 - t0 || 1)) * ancho_util;
  const y = (v: number) => MARGEN.arriba + (1 - (v - yMin) / (yMax - yMin || 1)) * alto_util;
  const linea = datos.map((d, i) => `${i ? 'L' : 'M'}${x(d.fecha).toFixed(1)},${y(d.clp).toFixed(1)}`).join(' ');

  // Unas 5 fechas en el eje X (3 en pantallas angostas), repartidas a lo largo del período.
  const nFechas = Math.min(ancho < 460 ? 3 : 5, datos.length);
  const fechasX = Array.from({ length: nFechas }, (_, i) => datos[Math.round((i * (datos.length - 1)) / (nFechas - 1))]);

  const primero = datos[0];
  const ultimo = datos[datos.length - 1];
  const variacion = ((ultimo.clp - primero.clp) / primero.clp) * 100;
  const sel = activo !== null ? datos[Math.min(activo, datos.length - 1)] : null;

  const alMover = (ev: PointerEvent<SVGRectElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const t = t0 + ((ev.clientX - r.left) / r.width) * (t1 - t0);
    let i = 0;
    for (let k = 1; k < datos.length; k += 1) if (Math.abs(datos[k].fecha - t) < Math.abs(datos[i].fecha - t)) i = k;
    setActivo(i);
  };
  const alTeclear = (ev: KeyboardEvent<SVGRectElement>) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'Home' && ev.key !== 'End') return;
    ev.preventDefault();
    setActivo((a) => {
      const actual = a ?? datos.length - 1;
      if (ev.key === 'Home') return 0;
      if (ev.key === 'End') return datos.length - 1;
      return Math.max(0, Math.min(datos.length - 1, actual + (ev.key === 'ArrowLeft' ? -1 : 1)));
    });
  };

  return (
    <div className="grafico">
      <div className="grafico__cabeza">
        <p className="grafico__valor">
          <span className="grafico__etiqueta">Precio de mercado{impresion ? ` · ${impresion}` : ''}</span>
          <strong>{clp(ultimo.clp)}</strong>
          <span className="grafico__variacion">
            {variacion >= 0 ? '▲' : '▼'} {Math.abs(variacion).toLocaleString('es-CL', { maximumFractionDigits: 1 })} % en el período
          </span>
        </p>
        <div className="segmentado" role="group" aria-label="Período del gráfico">
          {RANGOS.map((r) => (
            <button key={r.id} type="button" aria-pressed={rango === r.id} onClick={() => { setRango(r.id); setActivo(null); }}>{r.texto}</button>
          ))}
        </div>
      </div>

      <div className="grafico__lienzo" ref={caja}>
        <svg width={ancho} height={ALTO} role="img"
          aria-label={`Precio de mercado entre ${formatoDiaLargo.format(primero.fecha)} y ${formatoDiaLargo.format(ultimo.fecha)}: de ${clp(primero.clp)} a ${clp(ultimo.clp)}.`}>
          {/* Grilla y eje Y: tenues, para que el protagonista sea la línea */}
          {marcas.map((v) => (
            <g key={v}>
              <line className="grafico__grilla" x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(v)} y2={y(v)} />
              <text className="grafico__eje" x={MARGEN.izquierda - 8} y={y(v)} dy="0.32em" textAnchor="end">{clpCorto(v)}</text>
            </g>
          ))}
          {fechasX.map((d, i) => (
            <text key={d.fecha} className="grafico__eje" x={x(d.fecha)} y={ALTO - 8}
              textAnchor={i === 0 ? 'start' : i === fechasX.length - 1 ? 'end' : 'middle'}>{formatoDia.format(d.fecha)}</text>
          ))}

          <path className="grafico__linea" d={linea} />
          {!sel && <circle className="grafico__punto" cx={x(ultimo.fecha)} cy={y(ultimo.clp)} r={4} />}

          {sel && (
            <g>
              <line className="grafico__cursor" x1={x(sel.fecha)} x2={x(sel.fecha)} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} />
              <circle className="grafico__punto" cx={x(sel.fecha)} cy={y(sel.clp)} r={5} />
            </g>
          )}

          {/* Zona de interacción: más grande que la línea, para que sea fácil de usar */}
          <rect className="grafico__zona" x={MARGEN.izquierda} y={MARGEN.arriba} width={ancho_util} height={alto_util}
            tabIndex={0} aria-label="Explorar el historial: usa las flechas izquierda y derecha"
            onPointerMove={alMover} onPointerDown={alMover} onPointerLeave={() => setActivo(null)}
            onKeyDown={alTeclear} onBlur={() => setActivo(null)} />
        </svg>

        {sel && (
          <div className="grafico__tooltip" role="status"
            style={{ left: Math.min(Math.max(x(sel.fecha), 90), ancho - 90), top: Math.max(y(sel.clp) - 12, 8) }}>
            <span>{formatoDiaLargo.format(sel.fecha)}</span>
            <strong>{clp(sel.clp)}</strong>
            <span>{usd(sel.usd)}</span>
          </div>
        )}
      </div>

      <details className="grafico__tabla">
        <summary>Ver los datos en una tabla</summary>
        <Tabla columnas={[{ t: 'Fecha' }, { t: 'Precio (CLP)', num: true }, { t: 'Precio (USD)', num: true }]} leyenda="Precio de mercado por día"
          filas={[...datos].reverse().map((d) => ({ clave: String(d.fecha), celdas: [formatoDiaLargo.format(d.fecha), clp(d.clp), usd(d.usd)] }))} />
      </details>
    </div>
  );
}
