import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import Carta from '../components/Carta';
import { CondicionChip, EstadoChip } from '../components/Chips';
import GraficoPrecios from '../components/GraficoPrecios';
import Precio from '../components/Precio';
import Tabla from '../components/Tabla';
import TablaMovimientos from '../components/TablaMovimientos';
import { CONDICIONES, IDIOMAS, JUEGOS, condicionDe } from '../data/catalogo';
import { estadoPublicacion, pubPorId, publicacionesVisibles, usuarioPorId } from '../logica/consultas';
import { costoEnvio } from '../logica/estado';
import { descuento, enOferta } from '../logica/ofertas';
import { productoDe, ventasDeProducto } from '../logica/productos';
import { useCarrito } from '../hooks/useCarrito';
import { useDolar } from '../hooks/useDolar';
import { useDatosMercado, useHistorial } from '../hooks/useMercado';
import { NOMBRE_FUENTE } from '../services/dolar';
import { useTienda } from '../hooks/useTienda';
import type { Estado, Publicacion, Usuario } from '../types';
import { clp, fecha, iniciales, nombreCorto, plural } from '../utils/formato';

type Orden = 'precio' | 'condicion';

/* Ventas completadas de un vendedor (pedidos entregados): es su "reputación" en la lista. */
const ventasDe = (e: Estado, uid: string) => e.pedidos.filter((o) => o.vendedorId === uid && o.estado === 'entregado').length;

/* Costo de envío para quien mira la página: a su región si tiene sesión, o el mínimo si no. */
function envioPara(e: Estado, vendedor: Usuario | undefined, usuario: Usuario | null): { monto: number; texto: string } {
  if (usuario?.rol === 'cliente' && vendedor) {
    return { monto: costoEnvio(e.config, 'despacho', vendedor.region, usuario.region), texto: 'de envío a tu región' };
  }
  return { monto: e.config.envioMismaRegion, texto: 'de envío desde' };
}

const descripcionPub = (p: Publicacion) =>
  [condicionDe(p.condicion).nombre, p.acabado !== 'Normal' ? p.acabado : ''].filter(Boolean).join(' ');

/* Selector de cantidad "1 de 4" + botón para agregar al carrito (o el motivo por el que no se puede). */
function Comprar({ pub, grande = false }: { pub: Publicacion; grande?: boolean }) {
  const { usuario } = useTienda();
  const { agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  if (usuario?.id === pub.vendedorId) {
    return <Link className={`btn btn--suave${grande ? ' btn--grande' : ' btn--chico'}`} to={`/vender/${pub.id}`}>Editar mi publicación</Link>;
  }
  if (usuario?.rol === 'admin') return <span className="nota">La cuenta de administración no compra.</span>;
  if (pub.stock <= 0) return <button type="button" className={`btn${grande ? ' btn--grande' : ' btn--chico'}`} disabled>Sin stock</button>;
  const opciones = Array.from({ length: Math.min(pub.stock, 20) }, (_, i) => i + 1);
  return (
    <div className={`comprar${grande ? ' comprar--grande' : ''}`}>
      <label className="comprar__cantidad">
        <select value={cantidad} aria-label={`Cantidad de ${pub.nombre}, ${pub.stock} ${plural(pub.stock, "disponible", "disponibles")}`} onChange={(ev) => setCantidad(Number(ev.target.value))}>
          {opciones.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="comprar__de">de {pub.stock}</span>
      </label>
      <button type="button" className={`btn btn--primario${grande ? ' btn--grande' : ''}`} data-accion="agregar" onClick={() => agregar(pub.id, cantidad)}>
        Agregar al carrito
      </button>
    </div>
  );
}

export default function Detalle({ id }: { id: string }) {
  const { estado, usuario } = useTienda();
  const [orden, setOrden] = useState<Orden>('precio');
  const [vistaHistorial, setVistaHistorial] = useState<'mercado' | 'ventas'>('mercado');

  const pub = pubPorId(estado, id);
  const vendedor = pub ? usuarioPorId(estado, pub.vendedorId) : undefined;
  const esDueno = Boolean(usuario && pub && usuario.id === pub.vendedorId);
  const esAdmin = usuario?.rol === 'admin';
  const visible = Boolean(pub && publicacionesVisibles(estado).includes(pub));
  const mercado = useDatosMercado(pub ?? null);
  const historial = useHistorial(pub ? mercado?.id : null);
  const dolarVivo = useDolar();

  if (!pub || !vendedor || (!visible && !esDueno && !esAdmin) || (pub.estado === 'eliminada' && !esAdmin)) {
    return (
      <section className="vista contenedor" id="vista-detalle" data-vista="detalle">
        <div className="vacio vacio--grande">
          <h1 className="titulo-vista">Esta publicación no está disponible</h1>
          <p>Puede que el vendedor la haya pausado o eliminado. Busca otras ofertas de la misma carta en el catálogo.</p>
          <Link className="btn btn--primario" to="/catalogo">Ir al catálogo</Link>
        </div>
      </section>
    );
  }

  const juego = JUEGOS[pub.juego];
  const producto = productoDe(estado, pub);
  const est = estadoPublicacion(pub);
  const conStock = producto.publicaciones.filter((p) => p.stock > 0);
  const ventas = ventasDeProducto(estado, producto);
  const vendidas = ventas.reduce((s, v) => s + v.cantidad, 0);
  const minVenta = Math.min(...ventas.map((v) => v.precio));
  const maxVenta = Math.max(...ventas.map((v) => v.precio));
  const promedioVentas = vendidas ? ventas.reduce((s, v) => s + v.precio * v.cantidad, 0) / vendidas : 0;

  // Pestañas accesibles: con las flechas se pasa de una a otra (patrón "tabs" de WAI-ARIA).
  const teclaPestanas = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    const siguiente = vistaHistorial === 'mercado' ? 'ventas' : 'mercado';
    setVistaHistorial(siguiente);
    document.getElementById(`tab-${siguiente}`)?.focus();
  };
  const envio = envioPara(estado, vendedor, usuario);
  const dolar = dolarVivo.valor;
  const movimientos = estado.movimientos.filter((m) => m.pubId === pub.id).reverse();

  const rangoCond = (p: Publicacion) => CONDICIONES.findIndex((c) => c.id === p.condicion);
  const listado = [...producto.publicaciones].sort((a, b) =>
    (Number(a.stock <= 0) - Number(b.stock <= 0)) ||
    (orden === 'condicion' ? rangoCond(a) - rangoCond(b) || a.precio - b.precio : a.precio - b.precio));

  let aviso = null;
  if (est.clave === 'eliminada' || est.clave === 'pausada') {
    aviso = <p className="alerta alerta--aviso">Esta publicación está {est.texto.toLowerCase()} y no aparece en el catálogo.</p>;
  } else if (est.clave === 'agotada') {
    aviso = <p className="alerta alerta--aviso">Esta publicación está agotada. Revisa las demás ofertas de la carta más abajo.</p>;
  }

  return (
    <section className="vista contenedor" id="vista-detalle" data-vista="detalle">
      <nav className="migas" aria-label="Ruta de navegación">
        <ol>
          <li><Link to="/catalogo">Catálogo</Link></li>
          <li><Link to={`/catalogo?juego=${pub.juego}`}>{juego.nombre}</Link></li>
          <li aria-current="page">{pub.nombre}</li>
        </ol>
      </nav>

      <header className="producto__cabeza">
        <h1 className="producto__titulo">{pub.nombre} <span className="producto__titulo-edicion">- {pub.edicion}</span></h1>
        <p className="producto__subtitulo">
          {juego.nombre}{(esDueno || esAdmin) && <> <EstadoChip clave={est.clave} texto={est.texto} /></>}
        </p>
      </header>

      {/* Grilla de Bootstrap con orden por tamaño de pantalla:
          celular: carta, compra, detalles · tablet: carta | compra, y detalles abajo · escritorio: carta | detalles | compra */}
      <div className="producto row g-4">
        <div className="col-12 col-md-5 col-xl-3 order-1">
          <div className="producto__carta"><Carta carta={pub} clase="carta--grande" alt={`Imagen de ${pub.nombre}`} interactiva /></div>
        </div>

        <div className="producto__detalles col-12 col-xl-5 order-3 order-xl-2">
          <h2 className="titulo-chico">Detalles de la carta</h2>
          <dl className="producto__datos">
            <div className="producto__dato"><dt>Número / Rareza</dt><dd>{[pub.numero || 'Sin número', pub.rareza].join(' / ')}</dd></div>
            <div className="producto__dato"><dt>Edición</dt><dd>{pub.edicion}</dd></div>
            {mercado?.atributos.map(([k, v]) => <div key={k} className="producto__dato"><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          {mercado === undefined && <p className="nota">Buscando los datos de la carta…</p>}
        </div>

        <aside className="oferta col-12 col-md-7 col-xl-4 order-2 order-xl-3" aria-labelledby="oferta-titulo">
          <div className="oferta__caja">
            <p className="oferta__cabeza" id="oferta-titulo">{pub.id === producto.mejor.id && conStock.length > 1 ? 'Mejor precio' : 'Oferta seleccionada'}</p>
            <div className="oferta__cuerpo">
              <p className="oferta__condicion"><CondicionChip id={pub.condicion} /> {descripcionPub(pub)} · {IDIOMAS[pub.idioma] ?? pub.idioma}</p>
              <p className="oferta__precio"><Precio precio={pub.precio} precioAnterior={pub.precioAnterior} /></p>
              <p className="oferta__envio">+ {clp(envio.monto)} {envio.texto}</p>
              <p className="oferta__vendedor">Vende <strong>{nombreCorto(vendedor)}</strong>, {vendedor.comuna}</p>
              {aviso ?? <Comprar key={pub.id} pub={pub} grande />}
              {pub.descripcion && <p className="cita"><strong>Nota de quien vende:</strong> {pub.descripcion}</p>}
              {esDueno && <p className="oferta__enlace"><Link to="/inventario">Ir a mi inventario</Link></p>}
            </div>
          </div>
          {producto.publicaciones.length > 1 && (
            <a className="oferta__otras" href="#publicaciones">
              <strong>Ver {producto.publicaciones.length - 1} {plural(producto.publicaciones.length - 1, 'publicación más', 'publicaciones más')}</strong>
              {conStock.length > 0 && <span>Desde {clp(conStock[0].precio)}</span>}
            </a>
          )}
        </aside>
      </div>

      <section className="subseccion mercado" aria-labelledby="mercado-titulo">
        <h2 id="mercado-titulo">Historial de precios y ventas</h2>
        <div className="mercado__rejilla row g-3">
          <div className="col-lg-8">
          <div className="mercado__grafico">
            {/* Dos pestañas: el precio de mercado (TCGplayer) y lo que se ha pagado en HoloMarket */}
            <div className="pestanas pestanas--panel" role="tablist" aria-label="Historial de la carta" onKeyDown={teclaPestanas}>
              <button type="button" role="tab" id="tab-mercado" aria-controls="panel-mercado" aria-selected={vistaHistorial === 'mercado'}
                tabIndex={vistaHistorial === 'mercado' ? 0 : -1} onClick={() => setVistaHistorial('mercado')}>
                Precio de mercado
              </button>
              <button type="button" role="tab" id="tab-ventas" aria-controls="panel-ventas" aria-selected={vistaHistorial === 'ventas'}
                tabIndex={vistaHistorial === 'ventas' ? 0 : -1} onClick={() => setVistaHistorial('ventas')}>
                Ventas en HoloMarket <span className="pestanas__n">{ventas.length}</span>
              </button>
            </div>

            <div role="tabpanel" id="panel-mercado" aria-labelledby="tab-mercado" hidden={vistaHistorial !== 'mercado'}>
              {historial?.tipo === 'listo' && historial.puntos.length > 1 ? (
                <GraficoPrecios puntos={historial.puntos} dolar={dolar} impresion={mercado?.impresion} />
              ) : (
                <div className="mercado__vacio">
                  {mercado === undefined || historial?.tipo === 'cargando'
                    ? <p>Cargando el historial de precios…</p>
                    : <p>No hay historial de precios de mercado para esta carta. {pub.juego === 'myl' ? 'API TCG no publica precios de Mitos y Leyendas.' : ''}</p>}
                </div>
              )}
              {mercado?.mercado && (
                <p className="nota">
                  Precio de mercado de TCGplayer (EE. UU.) según API TCG, convertido a pesos con{' '}
                  {dolarVivo.fuente === 'respaldo'
                    ? `el valor de respaldo de ${clp(dolar)} por dólar`
                    : `el ${NOMBRE_FUENTE[dolarVivo.fuente]}: ${dolar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 2 })}${dolarVivo.fecha ? ` al ${fecha(dolarVivo.fecha)}` : ''}`}.
                  {' '}Es una referencia: en HoloMarket cada vendedor fija su precio.
                </p>
              )}
            </div>

            <div role="tabpanel" id="panel-ventas" aria-labelledby="tab-ventas" hidden={vistaHistorial !== 'ventas'}>
              {ventas.length ? (
                <>
                  <dl className="cifras cifras--fila">
                    <div><dt>Última venta</dt><dd>{clp(ventas[0].precio)}</dd></div>
                    <div><dt>Precio promedio</dt><dd>{clp(promedioVentas)}</dd></div>
                    <div><dt>Rango de precios</dt><dd>{minVenta === maxVenta ? clp(minVenta) : `${clp(minVenta)} a ${clp(maxVenta)}`}</dd></div>
                    <div><dt>Unidades vendidas</dt><dd>{vendidas}</dd></div>
                  </dl>
                  <Tabla leyenda="Ventas de esta carta en HoloMarket"
                    columnas={[{ t: 'Fecha' }, { t: 'Condición' }, { t: 'Idioma' }, { t: 'Cantidad', num: true }, { t: 'Precio unitario', num: true }]}
                    filas={ventas.map((v) => ({
                      clave: v.clave,
                      celdas: [
                        fecha(v.fecha),
                        <><CondicionChip id={v.condicion} /> {condicionDe(v.condicion).nombre}{v.acabado && v.acabado !== 'Normal' ? ` ${v.acabado}` : ''}</>,
                        IDIOMAS[v.idioma] ?? v.idioma,
                        String(v.cantidad),
                        <strong>{clp(v.precio)}</strong>,
                      ],
                    }))} />
                  <p className="nota">Precios pagados en HoloMarket, sin envío. No incluye pedidos cancelados.</p>
                </>
              ) : (
                <div className="mercado__vacio">
                  <p>Esta carta todavía no tiene ventas en HoloMarket. Cuando alguien la compre, aparecerá aquí con la fecha, la condición y el precio pagado.</p>
                </div>
              )}
            </div>
          </div>

          </div>

          <div className="col-lg-4">
          <div className="mercado__resumen">
            <h3 className="titulo-chico">En HoloMarket</h3>
            <dl className="cifras">
              <div><dt>Precio más bajo</dt><dd>{conStock.length ? clp(conStock[0].precio) : '-'}</dd></div>
              <div><dt>Precio de mercado</dt><dd>{mercado?.mercado ? clp(mercado.mercado * dolar) : '-'}</dd></div>
              <div><dt>Unidades disponibles</dt><dd>{producto.unidades}</dd></div>
              <div><dt>Vendedores</dt><dd>{producto.vendedores}</dd></div>
              <div><dt>Publicaciones</dt><dd>{producto.publicaciones.length}</dd></div>
              <div><dt>Unidades vendidas</dt><dd>{vendidas}</dd></div>
            </dl>
          </div>
          </div>
        </div>
      </section>

      <section className="subseccion" id="publicaciones" aria-labelledby="publicaciones-titulo">
        <div className="publicaciones__cabeza">
          <div>
            <h2 id="publicaciones-titulo">{producto.publicaciones.length} {plural(producto.publicaciones.length, 'publicación', 'publicaciones')}</h2>
            {conStock.length > 0 && <p className="bajada">desde {clp(conStock[0].precio)}</p>}
          </div>
          <div className="campo campo--linea">
            <label htmlFor="orden-publicaciones">Ordenar por</label>
            <select id="orden-publicaciones" value={orden} onChange={(ev) => setOrden(ev.target.value as Orden)}>
              <option value="precio">Precio</option>
              <option value="condicion">Mejor condición</option>
            </select>
          </div>
        </div>

        <ul className="publicaciones">
          {listado.map((p) => {
            const v = usuarioPorId(estado, p.vendedorId);
            const ventas = ventasDe(estado, p.vendedorId);
            const envioP = envioPara(estado, v, usuario);
            return (
              <li key={p.id} className={`publicacion${p.id === pub.id ? ' publicacion--actual' : ''}${p.stock <= 0 ? ' publicacion--agotada' : ''}`}>
                <div className="publicacion__fila row align-items-center gx-3 gy-2">
                  <p className="publicacion__precio col-sm-6 col-lg-3">
                    <strong>{clp(p.precio)}</strong>
                    {enOferta(p) && (
                      <span className="publicacion__antes">
                        <s><span className="visually-hidden">Antes: </span>{clp(p.precioAnterior as number)}</s>{' '}
                        <span className="badge precio__descuento">-{descuento(p)}%</span>
                      </span>
                    )}
                    <span>+ {clp(envioP.monto)} de envío</span>
                  </p>
                  <p className="publicacion__condicion col-sm-6 col-lg">
                    <CondicionChip id={p.condicion} /> <strong>{descripcionPub(p)}</strong>
                    <span className="publicacion__idioma">{IDIOMAS[p.idioma] ?? p.idioma}</span>
                  </p>
                  <div className="publicacion__compra col-12 col-lg-auto"><Comprar pub={p} /></div>
                </div>
                <div className="publicacion__vendedor">
                  <span className="avatar avatar--chico" aria-hidden="true">{iniciales(v?.nombre ?? '?')}</span>
                  <Link to={`/carta/${p.id}`}>{nombreCorto(v)}</Link>
                  <span>{v?.comuna}, {v?.region}</span>
                  <span>{ventas} {plural(ventas, 'venta completada', 'ventas completadas')}</span>
                  {v && <span>En HoloMarket desde {fecha(v.creado)}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {(esDueno || esAdmin) && (
        <section className="subseccion" aria-labelledby="detalle-historial">
          <h2 id="detalle-historial">Historial de stock</h2>
          <p className="bajada">Solo lo ven quien vende y el equipo de administración.</p>
          <TablaMovimientos movimientos={movimientos} conCarta={false} />
        </section>
      )}
    </section>
  );
}
