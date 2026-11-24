import { useRef, useState } from 'react';
import { CondicionChip } from '../components/Chips';
import FichaProducto from '../components/FichaProducto';
import { agruparProductos } from '../logica/productos';
import { CONDICIONES, IDIOMAS, IDS_JUEGOS, JUEGOS, RAREZAS, condicionDe, rarezasDe } from '../data/catalogo';
import {
  filtrarPublicaciones, FILTROS_VACIOS, leerFiltros, rangoPrecioInvalido, rutaCatalogo, type Filtros, type Orden,
} from '../logica/consultas';
import { useLegal } from '../hooks/useLegal';
import { useTienda } from '../hooks/useTienda';
import type { CondicionId, JuegoId } from '../types';
import { clp, plural } from '../utils/formato';
import { useNavegar } from '../hooks/useRuta';
import type { Ruta } from '../utils/navegacion';

const soloDigitos = (v: string) => v.replace(/\D/g, '').slice(0, 9);

/* Catálogo con búsqueda, filtros y orden. Los filtros viven en la URL (/catalogo?juego=pokemon&cond=NM)
   para poder compartir o recargar la búsqueda. */
export default function Catalogo({ ruta }: { ruta: Ruta }) {
  const { estado } = useTienda();
  const { reemplazar: reemplazarRuta } = useNavegar();
  const verLegal = useLegal();
  const titulo = useRef<HTMLHeadingElement>(null);
  const [panelAbierto, setPanelAbierto] = useState(() => !window.matchMedia('(max-width: 1080px)').matches);
  const f = leerFiltros(ruta.params);
  const lista = filtrarPublicaciones(estado, f);
  // Una ficha por carta: sus publicaciones (las que cumplen los filtros) se resumen en "N desde $X".
  const productos = agruparProductos(lista);
  const rangoInvalido = rangoPrecioInvalido(f);

  const cambiar = (parcial: Partial<Filtros>) => reemplazarRuta(rutaCatalogo({ ...f, ...parcial }));

  const alternarCondicion = (id: CondicionId, marcado: boolean) =>
    cambiar({ cond: marcado ? [...f.cond, id] : f.cond.filter((c) => c !== id) });

  const limpiar = () => {
    reemplazarRuta(rutaCatalogo(FILTROS_VACIOS));
    titulo.current?.focus();
  };

  const chips: { clave: string; texto: string; quitar: Partial<Filtros> }[] = [];
  if (f.q) chips.push({ clave: 'q', texto: `Búsqueda: ${f.q}`, quitar: { q: '' } });
  if (f.juego) chips.push({ clave: 'juego', texto: JUEGOS[f.juego].nombre, quitar: { juego: '' } });
  f.cond.forEach((c) => chips.push({ clave: `cond-${c}`, texto: condicionDe(c).nombre, quitar: { cond: f.cond.filter((x) => x !== c) } }));
  if (f.rareza) chips.push({ clave: 'rareza', texto: f.rareza, quitar: { rareza: '' } });
  if (f.idioma) chips.push({ clave: 'idioma', texto: IDIOMAS[f.idioma], quitar: { idioma: '' } });
  if (f.min || f.max) {
    chips.push({ clave: 'precio', texto: `${f.min ? clp(Number(f.min)) : '$0'} a ${f.max ? clp(Number(f.max)) : 'sin límite'}`, quitar: { min: '', max: '' } });
  }
  if (f.agotadas) chips.push({ clave: 'agotadas', texto: 'Incluye agotadas', quitar: { agotadas: false } });

  return (
    <section className="vista contenedor" id="vista-catalogo" data-vista="catalogo" aria-labelledby="catalogo-titulo">
      <div className="vista__cabeza">
        <div>
          <h1 className="titulo-vista" id="catalogo-titulo" ref={titulo} tabIndex={-1}>{f.juego ? JUEGOS[f.juego].nombre : 'Catálogo'}</h1>
          <p className="bajada" id="catalogo-resumen" role="status">
            {productos.length} {plural(productos.length, 'carta', 'cartas')} · {lista.length} {plural(lista.length, 'publicación', 'publicaciones')}{f.q ? ` para “${f.q}”` : ''}
          </p>
        </div>
        <div className="campo campo--linea">
          <label htmlFor="orden">Ordenar por</label>
          <select id="orden" value={f.orden} onChange={(ev) => cambiar({ orden: ev.target.value as Orden })}>
            <option value="recientes">Más recientes</option>
            <option value="precio-asc">Menor precio</option>
            <option value="precio-desc">Mayor precio</option>
            <option value="nombre">Nombre (A a Z)</option>
          </select>
        </div>
      </div>

      {/* Grilla de Bootstrap: filtros a la izquierda (col-lg-3) y resultados (col-lg-9); en celular, uno bajo el otro */}
      <div className="catalogo row g-4">
        <div className="col-lg-3">
        <details className="filtros-panel" id="filtros-panel" open={panelAbierto} onToggle={(ev) => setPanelAbierto(ev.currentTarget.open)}>
          <summary>Filtros</summary>
          <form className="filtros" id="form-filtros" noValidate onSubmit={(ev) => ev.preventDefault()}>
            <fieldset className="filtro">
              <legend>Juego</legend>
              <div id="filtro-juegos">
                {(['', ...IDS_JUEGOS] as (JuegoId | '')[]).map((id) => (
                  <label key={id || 'todos'} className="casilla">
                    <input type="radio" name="juego" value={id} checked={f.juego === id} onChange={() => cambiar({ juego: id, rareza: id && f.rareza && !rarezasDe(id).includes(f.rareza) ? '' : f.rareza })} />{' '}
                    {id ? JUEGOS[id].nombre : 'Todos los juegos'}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="filtro">
              <legend>Condición</legend>
              <div id="filtro-condiciones">
                {CONDICIONES.map((c) => (
                  <label key={c.id} className="casilla">
                    <input type="checkbox" name="cond" value={c.id} checked={f.cond.includes(c.id)}
                      onChange={(ev) => alternarCondicion(c.id, ev.target.checked)} />{' '}
                    <CondicionChip id={c.id} /> {c.nombre}
                  </label>
                ))}
              </div>
              <button type="button" className="enlace-boton" data-accion="ver-condiciones" onClick={verLegal('condiciones')}>¿Qué significa cada condición?</button>
            </fieldset>
            <div className="filtro">
              <div className="campo">
                <label htmlFor="f-rareza">Rareza</label>
                <select id="f-rareza" name="rareza" value={f.rareza} onChange={(ev) => cambiar({ rareza: ev.target.value })}>
                  <option value="">Todas</option>
                  {/* Con un juego elegido se ven sus rarezas; si no, todas agrupadas por juego */}
                  {f.juego
                    ? RAREZAS[f.juego].map((r) => <option key={r} value={r}>{r}</option>)
                    : IDS_JUEGOS.map((j) => (
                      <optgroup key={j} label={JUEGOS[j].nombre}>
                        {RAREZAS[j].map((r) => <option key={r} value={r}>{r}</option>)}
                      </optgroup>
                    ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="f-idioma">Idioma</label>
                <select id="f-idioma" name="idioma" value={f.idioma} onChange={(ev) => cambiar({ idioma: ev.target.value })}>
                  <option value="">Todos</option>
                  {Object.entries(IDIOMAS).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                </select>
              </div>
            </div>
            <fieldset className={`filtro${rangoInvalido ? ' con-error' : ''}`}>
              <legend>Precio (CLP)</legend>
              <div className="rango">
                <div className="campo">
                  <label htmlFor="f-min">Desde</label>
                  <input id="f-min" name="min" type="number" min={0} step={1000} inputMode="numeric" placeholder="0" value={f.min}
                    aria-describedby="f-precio-error" aria-invalid={rangoInvalido || undefined} onChange={(ev) => cambiar({ min: soloDigitos(ev.target.value) })} />
                </div>
                <div className="campo">
                  <label htmlFor="f-max">Hasta</label>
                  <input id="f-max" name="max" type="number" min={0} step={1000} inputMode="numeric" placeholder="Sin límite" value={f.max}
                    aria-describedby="f-precio-error" aria-invalid={rangoInvalido || undefined} onChange={(ev) => cambiar({ max: soloDigitos(ev.target.value) })} />
                </div>
              </div>
              <p className="campo__error" id="f-precio-error">{rangoInvalido ? 'El precio "desde" no puede ser mayor que el precio "hasta".' : ''}</p>
            </fieldset>
            <label className="casilla">
              <input type="checkbox" id="f-agotadas" name="agotadas" checked={f.agotadas} onChange={(ev) => cambiar({ agotadas: ev.target.checked })} /> Mostrar también agotadas
            </label>
            <button type="button" className="btn btn--fantasma btn--bloque" data-accion="limpiar-filtros" onClick={limpiar}>Limpiar filtros</button>
          </form>
        </details>
        </div>

        <div className="catalogo__resultados col-lg-9">
          <div className="chips-activos" id="catalogo-activos">
            {chips.map((c) => (
              <button key={c.clave} type="button" className="chip-filtro" data-accion="quitar-filtro" aria-label={`Quitar filtro ${c.texto}`}
                onClick={() => cambiar(c.quitar)}>
                {c.texto}<span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
          <h2 className="solo-lector">Resultados</h2>
          {productos.length ? (
            // 1 ficha por fila en celular, 2 en tablet/escritorio y 3 en pantallas muy anchas
            <div className="rejilla-productos row row-cols-1 row-cols-md-2 row-cols-xxl-3 g-3" id="catalogo-resultados">
              {productos.map((p) => <div key={p.clave} className="col"><FichaProducto producto={p} /></div>)}
            </div>
          ) : (
            <div className="vacio vacio--caja" id="catalogo-resultados">
              <h3>No encontramos cartas con esos filtros</h3>
              <p>Quita algún filtro o busca por otro nombre, edición o número.</p>
              <button type="button" className="btn btn--primario" data-accion="limpiar-filtros" onClick={limpiar}>Limpiar filtros</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
