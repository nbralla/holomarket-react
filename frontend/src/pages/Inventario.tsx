import { useState, type FocusEvent, type KeyboardEvent } from 'react';
import Carta from '../components/Carta';
import { CondicionChip, EstadoChip } from '../components/Chips';
import Indicadores from '../components/Indicadores';
import MarcoModal from '../components/MarcoModal';
import Tabla from '../components/Tabla';
import TablaMovimientos from '../components/TablaMovimientos';
import { estadoPublicacion, saldoVendedor } from '../logica/consultas';
import { registrarActividad } from '../logica/estado';
import { ajustarStock, cambiarEstadoPublicacion, cambiarPrecio, eliminarPublicacion } from '../logica/publicaciones';
import { useAvisos } from '../hooks/useAvisos';
import { useModal } from '../hooks/useModal';
import { useTienda } from '../hooks/useTienda';
import type { CerrarModal } from '../context/modalContext';
import type { Publicacion, Usuario } from '../types';
import { clp, plural, suma } from '../utils/formato';
import { entero, precioError } from '../utils/validaciones';

import { Link } from 'react-router';
type Filtro = 'todas' | 'activas' | 'pausadas' | 'agotadas' | 'bajo';
const MOTIVOS = ['Reposición de stock', 'Venta fuera de HoloMarket', 'Carta dañada o perdida', 'Corrección de conteo'];

interface Ajuste {
  tipo: 'entrada' | 'salida';
  cantidad: number;
  motivo: string;
}

/* Contenido de la ventana "Ajustar stock". Valida antes de cerrar. */
function VentanaAjuste({ pub, cerrar }: { pub: Publicacion; cerrar: CerrarModal<Ajuste> }) {
  const [tipo, setTipo] = useState<Ajuste['tipo']>('entrada');
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [error, setError] = useState('');

  const confirmar = () => {
    const n = entero(cantidad);
    let e = '';
    if (Number.isNaN(n) || n < 1) e = 'Ingresa una cantidad entera mayor que 0.';
    else if (tipo === 'salida' && n > pub.stock) e = `No puedes restar más de ${pub.stock} ${plural(pub.stock, 'unidad', 'unidades')}.`;
    else if (tipo === 'entrada' && pub.stock + n > 999) e = 'El stock máximo por publicación es 999 unidades.';
    setError(e);
    if (e) {
      document.getElementById('m-cantidad')?.focus();
      return;
    }
    cerrar({ tipo, cantidad: n, motivo });
  };

  return (
    <MarcoModal titulo={`Ajustar stock de ${pub.nombre}`} confirmar="Guardar ajuste" alConfirmar={confirmar} alCancelar={() => cerrar(null)}>
      <p>Stock actual: <strong>{pub.stock}</strong> {plural(pub.stock, 'unidad', 'unidades')}.</p>
      <fieldset className="filtro" id="m-tipo">
        <legend>Tipo de movimiento</legend>
        <label className="casilla"><input type="radio" name="tipo" value="entrada" checked={tipo === 'entrada'} onChange={() => setTipo('entrada')} /> Entrada: sumo unidades</label>
        <label className="casilla"><input type="radio" name="tipo" value="salida" checked={tipo === 'salida'} onChange={() => setTipo('salida')} /> Salida: resto unidades</label>
      </fieldset>
      <div className={`campo${error ? ' con-error' : ''}`}>
        <label htmlFor="m-cantidad">Cantidad</label>
        <input id="m-cantidad" name="cantidad" type="number" min={1} max={999} step={1} inputMode="numeric" value={cantidad}
          aria-describedby="m-cantidad-error" aria-invalid={error ? true : undefined} onChange={(ev) => setCantidad(ev.target.value)} />
        <p className="campo__error" id="m-cantidad-error">{error}</p>
      </div>
      <div className="campo">
        <label htmlFor="m-motivo">Motivo</label>
        <select id="m-motivo" name="motivo" value={motivo} onChange={(ev) => setMotivo(ev.target.value)}>
          {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </MarcoModal>
  );
}

/* Inventario del vendedor: precio y stock editables, pausar, eliminar e historial (kardex). */
export default function Inventario({ usuario }: { usuario: Usuario }) {
  const { estado, actualizar } = useTienda();
  const { avisar } = useAvisos();
  const modal = useModal();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [kardexPub, setKardexPub] = useState('');

  const stockBajo = estado.config.stockBajo;
  const mias = estado.publicaciones.filter((p) => p.vendedorId === usuario.id && p.estado !== 'eliminada');
  const propias = estado.publicaciones.filter((p) => p.vendedorId === usuario.id);
  const activas = mias.filter((p) => p.estado === 'activa' && p.stock > 0);
  const atencion = mias.filter((p) => p.estado === 'activa' && p.stock <= stockBajo);
  const ventas = estado.pedidos.filter((o) => o.vendedorId === usuario.id && o.estado !== 'cancelado');
  const valor = suma(mias.filter((p) => p.estado === 'activa'), (p) => p.precio * p.stock);
  const saldo = saldoVendedor(estado, usuario.id);

  const FILTROS: Record<Filtro, (p: Publicacion) => boolean> = {
    todas: () => true,
    activas: (p) => p.estado === 'activa' && p.stock > 0,
    pausadas: (p) => p.estado === 'pausada',
    agotadas: (p) => p.stock <= 0,
    bajo: (p) => p.stock <= stockBajo,
  };
  const lista = mias.filter(FILTROS[filtro]).sort((a, b) => b.creado - a.creado);
  const kardex = propias.some((p) => p.id === kardexPub) ? kardexPub : '';
  const movimientos = estado.movimientos.filter((m) => m.vendedorId === usuario.id && (!kardex || m.pubId === kardex)).slice().reverse();

  /* ---------- Acciones ---------- */
  const stockRapido = (pub: Publicacion, delta: 1 | -1) => {
    const r = actualizar((e) => ajustarStock(e, usuario.id, pub.id, delta > 0 ? 'entrada' : 'salida', 1, 'Ajuste rápido desde inventario'));
    if (r && !r.ok) avisar(r.error, 'error');
    // Si el botón quedó deshabilitado (stock 0 o 999), el foco pasa al otro.
    requestAnimationFrame(() => {
      const mismo = document.querySelector<HTMLButtonElement>(`[data-accion="${delta > 0 ? 'stock-mas' : 'stock-menos'}"][data-id="${pub.id}"]`);
      const otro = document.querySelector<HTMLButtonElement>(`[data-accion="${delta > 0 ? 'stock-menos' : 'stock-mas'}"][data-id="${pub.id}"]`);
      (mismo && !mismo.disabled ? mismo : otro)?.focus();
    });
  };

  const abrirAjuste = async (pub: Publicacion) => {
    const a = await modal.abrir<Ajuste>((cerrar) => <VentanaAjuste pub={pub} cerrar={cerrar} />);
    if (!a) return;
    const r = actualizar((e) => {
      const res = ajustarStock(e, usuario.id, pub.id, a.tipo, a.cantidad, a.motivo);
      if (res.ok) registrarActividad(e, 'Ajuste de stock', `${pub.nombre} (${pub.id}): ${res.valor.antes} → ${res.valor.despues}, ${a.motivo}`, usuario.id);
      return res;
    });
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(`Stock de ${pub.nombre}: ${r.valor.antes} → ${r.valor.despues} ${plural(r.valor.despues, 'unidad', 'unidades')}.`, 'exito');
  };

  // El precio se guarda al salir del campo o con Enter (no en cada tecla).
  const guardarPrecio = (pub: Publicacion, campo: HTMLInputElement) => {
    const error = precioError(campo.value);
    if (error) {
      avisar(error, 'error');
      campo.value = String(pub.precio);
      return;
    }
    const nuevo = entero(campo.value);
    if (nuevo === pub.precio) return;
    const r = actualizar((e) => cambiarPrecio(e, usuario.id, pub.id, nuevo));
    if (r && !r.ok) avisar(r.error, 'error');
    else if (r) avisar(`Precio de ${pub.nombre} actualizado a ${clp(nuevo)}.`, 'exito');
  };

  const pausarOActivar = (pub: Publicacion) => {
    const nuevo = pub.estado === 'pausada' ? 'activa' : 'pausada';
    const r = actualizar((e) => cambiarEstadoPublicacion(e, usuario, pub.id, nuevo));
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(nuevo === 'pausada' ? `Pausaste ${pub.nombre}: ya no aparece en el catálogo.` : `Activaste ${pub.nombre}: vuelve a aparecer en el catálogo.`, 'exito');
  };

  const eliminar = async (pub: Publicacion) => {
    const ok = await modal.confirmar({
      titulo: 'Eliminar publicación',
      mensaje: <p>Vas a eliminar <strong>{pub.nombre}</strong> ({pub.id}). Sus {pub.stock} {plural(pub.stock, 'unidad', 'unidades')} saldrán del stock y no se puede deshacer. Los pedidos ya hechos no cambian.</p>,
      confirmar: 'Eliminar publicación',
      peligro: true,
    });
    if (!ok) return;
    const r = actualizar((e) => eliminarPublicacion(e, usuario, pub.id));
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(`Eliminaste ${pub.nombre}.`, 'exito');
  };

  const filas = lista.map((p) => {
    const est = estadoPublicacion(p);
    const bajo = p.estado === 'activa' && p.stock <= stockBajo;
    const accionEstado = p.estado === 'pausada' ? 'Activar' : 'Pausar';
    return {
      clave: p.id,
      celdas: [
        <div className="celda-carta">
          <Carta carta={p} clase="carta--mini" />
          <div>
            <Link className="celda-carta__nombre" to={`/carta/${p.id}`}>{p.nombre}</Link>
            <span className="celda-sub">{p.edicion}{p.numero ? ` ${p.numero}` : ''} ({p.id})</span>
          </div>
        </div>,
        <CondicionChip id={p.condicion} />,
        <>
          <label className="solo-lector" htmlFor={`precio-${p.id}`}>Precio de {p.nombre}</label>
          {/* Campo no controlado: la key lo reinicia cuando el precio guardado cambia. */}
          <input key={`${p.id}-${p.precio}`} className="entrada-precio" id={`precio-${p.id}`} type="number" min={100} max={50000000} step={10}
            inputMode="numeric" defaultValue={p.precio} data-cambio="precio" data-id={p.id}
            onBlur={(ev: FocusEvent<HTMLInputElement>) => guardarPrecio(p, ev.currentTarget)}
            onKeyDown={(ev: KeyboardEvent<HTMLInputElement>) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.currentTarget.blur(); } }} />
        </>,
        <div className={`stock-control${bajo ? ' stock-control--bajo' : ''}`} role="group" aria-label={`Stock de ${p.nombre}`}>
          <button type="button" data-accion="stock-menos" data-id={p.id} aria-label={`Restar una unidad a ${p.nombre}`} disabled={p.stock <= 0}
            onClick={() => stockRapido(p, -1)}>−</button>
          <output aria-live="polite">{p.stock}</output>
          <button type="button" data-accion="stock-mas" data-id={p.id} aria-label={`Sumar una unidad a ${p.nombre}`} disabled={p.stock >= 999}
            onClick={() => stockRapido(p, 1)}>+</button>
        </div>,
        <EstadoChip clave={est.clave} texto={est.texto} />,
        <div className="acciones">
          <button type="button" className="btn btn--chico btn--fantasma" data-accion="ajustar-stock" data-id={p.id}
            aria-label={`Ajustar stock de ${p.nombre}`} onClick={() => abrirAjuste(p)}>Ajustar</button>
          <Link className="btn btn--chico btn--fantasma" to={`/vender/${p.id}`} aria-label={`Editar ${p.nombre}`}>Editar</Link>
          <button type="button" className="btn btn--chico btn--fantasma" data-accion={accionEstado === 'Activar' ? 'activar' : 'pausar'} data-id={p.id}
            aria-label={`${accionEstado} ${p.nombre}`} onClick={() => pausarOActivar(p)}>{accionEstado}</button>
          <button type="button" className="btn btn--chico btn--texto-peligro" data-accion="eliminar" data-id={p.id}
            aria-label={`Eliminar ${p.nombre}`} onClick={() => eliminar(p)}>Eliminar</button>
        </div>,
      ],
    };
  });

  return (
    <section className="vista contenedor" id="vista-inventario" data-vista="inventario" aria-labelledby="inventario-titulo">
      <div className="vista__cabeza">
        <div>
          <h1 className="titulo-vista" id="inventario-titulo">Mi inventario</h1>
          <p className="bajada">Cambia precio y stock directo en la tabla. Cada cambio de stock queda en el historial.</p>
        </div>
        <div className="acciones-fila acciones-fila--cabeza">
          <Link className="btn btn--fantasma" to="/retiros">Retirar dinero</Link>
          <Link className="btn btn--primario" to="/vender">Publicar una carta</Link>
        </div>
      </div>

      <Indicadores id="inv-indicadores" items={[
        { valor: String(activas.length), etiqueta: plural(activas.length, 'publicación activa', 'publicaciones activas'), detalle: `${mias.length} en total, incluidas pausadas y agotadas` },
        { valor: String(suma(mias, (p) => p.stock)), etiqueta: 'unidades en stock', detalle: `Valor a precio de venta: ${clp(valor)}` },
        { valor: String(atencion.length), etiqueta: 'con stock bajo o agotadas', detalle: `Aviso desde ${stockBajo} ${plural(stockBajo, 'unidad', 'unidades')}`, variante: atencion.length > 0 ? 'alerta' : undefined },
        { valor: clp(saldo.disponible), etiqueta: 'disponible para retirar', detalle: `${clp(saldo.retenido)} retenido en pedidos en curso; ${ventas.length} ${plural(ventas.length, 'venta', 'ventas')} en total` },
      ]} />

      <section className="subseccion" aria-labelledby="inv-publicaciones-titulo">
        <div className="seccion__cabeza">
          <h2 id="inv-publicaciones-titulo">Mis publicaciones</h2>
          <div className="campo campo--linea">
            <label htmlFor="inv-filtro">Mostrar</label>
            <select id="inv-filtro" value={filtro} onChange={(ev) => setFiltro(ev.target.value as Filtro)}>
              <option value="todas">Todas</option>
              <option value="activas">Activas con stock</option>
              <option value="pausadas">Pausadas</option>
              <option value="agotadas">Agotadas</option>
              <option value="bajo">Stock bajo</option>
            </select>
          </div>
        </div>
        <div id="inv-tabla">
          {mias.length ? (
            <Tabla columnas={[{ t: 'Carta' }, { t: 'Condición' }, { t: 'Precio (CLP)' }, { t: 'Stock' }, { t: 'Estado' }, { t: 'Acciones' }]}
              filas={filas} vacio="No tienes publicaciones con este filtro." leyenda="Mis publicaciones" clase="tabla--inventario" />
          ) : (
            <div className="vacio vacio--caja">
              <h2>Aún no publicas cartas</h2>
              <p>Publicar es gratis y toma un par de minutos.</p>
              <Link className="btn btn--primario" to="/vender">Publicar mi primera carta</Link>
            </div>
          )}
        </div>
      </section>

      <section className="subseccion" aria-labelledby="inv-historial-titulo">
        <div className="seccion__cabeza">
          <h2 id="inv-historial-titulo">Historial de stock</h2>
          <div className="campo campo--linea">
            <label htmlFor="inv-kardex-pub">Publicación</label>
            <select id="inv-kardex-pub" value={kardex} onChange={(ev) => setKardexPub(ev.target.value)}>
              <option value="">Todas mis publicaciones</option>
              {propias.map((p) => <option key={p.id} value={p.id}>{`${p.nombre} (${p.id})${p.estado === 'eliminada' ? ', eliminada' : ''}`}</option>)}
            </select>
          </div>
        </div>
        <p className="bajada">Cada venta, cancelación y ajuste queda registrado con el stock antes y después.</p>
        <div id="inv-historial">
          <TablaMovimientos movimientos={movimientos} conCarta limite={40} />
        </div>
      </section>
    </section>
  );
}
