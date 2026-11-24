import { Link } from 'react-router';
import { calcularCompra, revisarCarrito } from '../logica/compras';
import { esMotivoRechazo, TEXTO_RECHAZO } from '../logica/ofertas';
import { useRuta } from '../hooks/useRuta';
import { useTienda } from '../hooks/useTienda';
import type { Usuario } from '../types';
import { clp, plural } from '../utils/formato';

/* Se muestra cuando el banco rechaza el pago (/pago-rechazado?motivo=fondos). No se cobra nada
   y las cartas siguen en el carrito, así que se puede reintentar al tiro. */
export default function PagoRechazado({ usuario }: { usuario: Usuario }) {
  const { estado, carrito } = useTienda();
  const ruta = useRuta();
  const motivo = ruta.params.get('motivo');
  const lineas = revisarCarrito(estado, usuario.id, carrito).lineas;
  const compra = calcularCompra(estado, lineas, 'despacho', usuario.region);

  return (
    <section className="vista contenedor" id="vista-pago-rechazado" aria-labelledby="rechazo-titulo">
      <div className="rechazo">
        <span className="rechazo__icono" aria-hidden="true">✕</span>
        <h1 className="titulo-vista" id="rechazo-titulo">No se pudo realizar el pago</h1>
        <p className="alerta alerta--error" role="alert">
          {esMotivoRechazo(motivo) ? TEXTO_RECHAZO[motivo] : 'No pudimos procesar el pago.'}
        </p>
        <p>No hicimos ningún cobro. {lineas.length ? 'Tus cartas siguen en el carrito.' : ''}</p>

        {lineas.length > 0 && (
          <dl className="rechazo__resumen">
            <div><dt>Cartas</dt><dd>{compra.unidades} {plural(compra.unidades, 'unidad', 'unidades')}</dd></div>
            <div><dt>Total por pagar</dt><dd>{clp(compra.total)}</dd></div>
          </dl>
        )}

        <div className="acciones-fila justify-content-center">
          {lineas.length > 0
            ? <Link className="btn btn--primario btn--grande" to="/checkout">Intentar de nuevo</Link>
            : <Link className="btn btn--primario btn--grande" to="/catalogo">Ir al catálogo</Link>}
          <Link className="btn btn--fantasma btn--grande" to="/carrito">Volver al carrito</Link>
        </div>
        <p className="nota">Si el problema continúa, prueba con otra tarjeta o elige pagar por transferencia.</p>
      </div>
    </section>
  );
}
