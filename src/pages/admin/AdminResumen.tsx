import type { CSSProperties } from 'react';
import Indicadores from '../../components/Indicadores';
import TablaMovimientos from '../../components/TablaMovimientos';
import { IDS_JUEGOS, JUEGOS } from '../../data/catalogo';
import { publicacionesVisibles, usuarioPorId } from '../../logica/consultas';
import { useTienda } from '../../hooks/useTienda';
import type { Pedido } from '../../types';
import { clp, nombreCorto, plural, suma } from '../../utils/formato';
import { Link } from 'react-router';

/* Indicadores del negocio, ventas por juego, alertas de stock y últimos movimientos. */
export default function AdminResumen() {
  const { estado } = useTienda();
  const validos = estado.pedidos.filter((o) => o.estado !== 'cancelado');
  const porEstado = (e: Pedido['estado']) => estado.pedidos.filter((o) => o.estado === e).length;
  const clientes = estado.usuarios.filter((u) => u.rol === 'cliente');
  const bloqueados = clientes.filter((u) => u.estado !== 'activo').length;
  const activas = publicacionesVisibles(estado);
  const alertas = activas.filter((p) => p.stock <= estado.config.stockBajo).sort((a, b) => a.stock - b.stock);
  const porJuego = IDS_JUEGOS.map((id) => ({
    id, total: suma(validos, (o) => suma(o.items.filter((it) => it.juego === id), (it) => it.precio * it.cantidad)),
  }));
  const maximo = Math.max(1, ...porJuego.map((j) => j.total));
  const porPagar = estado.retiros.filter((r) => r.estado === 'solicitado');

  return (
    <>
      {porPagar.length > 0 && (
        <p className="alerta alerta--aviso aviso-admin">
          {porPagar.length} {plural(porPagar.length, 'solicitud de retiro', 'solicitudes de retiro')} por transferir
          ({clp(suma(porPagar, (r) => r.monto))}). <Link to="/admin?tab=retiros">Revisar retiros</Link>
        </p>
      )}
      <Indicadores items={[
        { valor: clp(suma(validos, (o) => o.subtotal)), etiqueta: 'en ventas', detalle: `${validos.length} ${plural(validos.length, 'pedido', 'pedidos')}, sin contar cancelados` },
        { valor: clp(suma(validos, (o) => o.comision + o.ivaComision)), etiqueta: 'en comisiones', detalle: `${estado.config.comision} % + IVA de cada venta` },
        { valor: String(porEstado('pagado')), etiqueta: plural(porEstado('pagado'), 'pedido por enviar', 'pedidos por enviar'),
          detalle: `${porEstado('enviado')} en camino, ${porEstado('entregado')} entregados, ${porEstado('cancelado')} cancelados`,
          variante: porEstado('pagado') > 0 ? 'alerta' : undefined },
        { valor: String(activas.length), etiqueta: plural(activas.length, 'publicación activa', 'publicaciones activas'), detalle: `${suma(activas, (p) => p.stock)} unidades en stock` },
        { valor: String(clientes.length), etiqueta: plural(clientes.length, 'cliente registrado', 'clientes registrados'),
          detalle: bloqueados ? `${bloqueados} ${plural(bloqueados, 'bloqueado', 'bloqueados')}` : 'Ninguno bloqueado' },
      ]} />
      <div className="rejilla-admin">
        <section className="panel" aria-labelledby="adm-ventas-juego">
          <h2 id="adm-ventas-juego">Ventas por juego</h2>
          <div className="barras">
            {porJuego.map((j) => (
              <div key={j.id} className={`barra juego--${j.id}`}>
                <span className="barra__nombre">{JUEGOS[j.id].nombre}</span>
                <span className="barra__pista" aria-hidden="true">
                  <span className="barra__relleno" style={{ '--valor': `${(j.total / maximo * 100).toFixed(1)}%` } as CSSProperties} />
                </span>
                <span className="barra__valor">{clp(j.total)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel" aria-labelledby="adm-alertas">
          <h2 id="adm-alertas">Stock bajo ({estado.config.stockBajo} o menos)</h2>
          {alertas.length ? (
            <ul className="lista-alertas">
              {alertas.map((p) => (
                <li key={p.id}>
                  <Link to={`/carta/${p.id}`}>{p.nombre}</Link>
                  <span className="celda-sub">
                    {nombreCorto(usuarioPorId(estado, p.vendedorId))}: {p.stock === 0 ? 'agotada' : `${p.stock} ${plural(p.stock, 'unidad', 'unidades')}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="bajada">Ninguna publicación activa tiene stock bajo.</p>}
        </section>
      </div>
      <section className="panel" aria-labelledby="adm-ultimos">
        <div className="seccion__cabeza">
          <h2 id="adm-ultimos">Últimos movimientos de stock</h2>
          <Link className="enlace" to="/admin?tab=movimientos">Ver todos</Link>
        </div>
        <TablaMovimientos movimientos={estado.movimientos.slice().reverse()} conVendedor limite={8} />
      </section>
    </>
  );
}
