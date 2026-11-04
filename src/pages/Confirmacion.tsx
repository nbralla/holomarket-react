import { EstadoChip } from '../components/Chips';
import Tabla, { type Fila } from '../components/Tabla';
import { CantidadMovimiento } from '../components/TablaMovimientos';
import { estadoPublicacion, pedidoPorId, pubPorId, usuarioPorId } from '../logica/consultas';
import { useTienda } from '../hooks/useTienda';
import type { Pedido, Usuario } from '../types';
import { clp, nombreCorto, plural, suma } from '../utils/formato';

import { Link } from 'react-router';
/* Después de pagar: pedidos generados y cómo cambió el stock de cada carta. */
export default function Confirmacion({ ids, usuario }: { ids: string; usuario: Usuario }) {
  const { estado } = useTienda();
  const pedidos = ids.split(',').map((id) => pedidoPorId(estado, id)).filter((o): o is Pedido => Boolean(o && o.compradorId === usuario.id));

  if (!pedidos.length) {
    return (
      <section className="vista contenedor" id="vista-confirmacion" data-vista="confirmacion">
        <div className="vacio vacio--grande">
          <h1 className="titulo-vista">No encontramos esa compra</h1>
          <p>Revisa tus compras en la sección Pedidos.</p>
          <Link className="btn btn--primario" to="/pedidos">Ver mis pedidos</Link>
        </div>
      </section>
    );
  }

  const total = suma(pedidos, (o) => o.total);
  const filas: Fila[] = [];
  pedidos.forEach((o) => o.items.forEach((it) => {
    const m = estado.movimientos.find((x) => x.ref === o.id && x.pubId === it.pubId && x.tipo === 'venta');
    const pub = pubPorId(estado, it.pubId);
    const est = pub ? estadoPublicacion(pub) : null;
    filas.push({
      clave: `${o.id}-${it.pubId}`,
      celdas: [
        <><Link to={`/carta/${it.pubId}`}>{it.nombre}</Link><span className="celda-sub">{it.pubId}</span></>,
        o.id,
        m ? <CantidadMovimiento cantidad={m.cantidad} /> : `−${it.cantidad}`,
        m ? <>{m.antes} → <strong>{m.despues}</strong></> : '—',
        est ? <EstadoChip clave={est.clave} texto={est.texto} /> : '',
      ],
    });
  }));

  return (
    <section className="vista contenedor" id="vista-confirmacion" data-vista="confirmacion">
      <div className="confirmacion">
        <div className="confirmacion__sello" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </div>
        <h1 className="titulo-vista">Listo, tu compra quedó pagada</h1>
        <p className="bajada">
          Pagaste {clp(total)} con {pedidos[0].pago.detalle}. Generamos {pedidos.length} {plural(pedidos.length, 'pedido', 'pedidos')}, uno por vendedor,
          y te avisaremos cuando cada paquete vaya en camino.
        </p>
        <ul className="confirmacion__pedidos">
          {pedidos.map((o) => {
            const unidades = suma(o.items, (it) => it.cantidad);
            return (
              <li key={o.id}>
                <Link to={`/pedidos?id=${o.id}`}><strong>{o.id}</strong></Link>
                <span>Vende {nombreCorto(usuarioPorId(estado, o.vendedorId))}: {unidades} {plural(unidades, 'carta', 'cartas')}, {clp(o.total)}</span>
              </li>
            );
          })}
        </ul>
        <section className="subseccion" aria-labelledby="stock-actualizado">
          <h2 id="stock-actualizado">Stock actualizado</h2>
          <p className="bajada">Al confirmar el pago, HoloMarket descontó estas unidades del inventario de cada vendedor y lo dejó registrado en el historial.</p>
          <Tabla columnas={[{ t: 'Carta' }, { t: 'Pedido' }, { t: 'Cantidad', num: true }, { t: 'Stock antes → después', num: true }, { t: 'Estado de la publicación' }]}
            filas={filas} leyenda="Stock actualizado por la compra" />
        </section>
        <div className="acciones-fila">
          <Link className="btn btn--primario" to="/pedidos">Ver mis pedidos</Link>
          <Link className="btn btn--fantasma" to="/catalogo">Seguir comprando</Link>
        </div>
      </div>
    </section>
  );
}
