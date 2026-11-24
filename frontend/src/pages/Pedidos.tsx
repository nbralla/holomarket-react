import { useEffect, useState } from 'react';
import Carta from '../components/Carta';
import { EstadoChip } from '../components/Chips';
import MarcoModal from '../components/MarcoModal';
import type { CerrarModal } from '../context/modalContext';
import { cancelarPedido, confirmarRecepcion, marcarEnviado } from '../logica/compras';
import { pedidoPorId, pubPorId, textoEstadoPedido, usuarioPorId } from '../logica/consultas';
import { useAvisos } from '../hooks/useAvisos';
import { useModal } from '../hooks/useModal';
import { useTienda } from '../hooks/useTienda';
import type { Pedido, Usuario } from '../types';
import type { Ruta } from '../utils/navegacion';
import { clp, fecha, fechaHora, nombreCorto, plural, suma } from '../utils/formato';
import { Link } from 'react-router';

type Vista = 'compras' | 'ventas';

/* Ventana para marcar un pedido como enviado (con número de seguimiento opcional). */
function VentanaEnvio({ pedido, cerrar }: { pedido: Pedido; cerrar: CerrarModal<string> }) {
  const retiro = pedido.envio.metodo === 'retiro';
  const [seguimiento, setSeguimiento] = useState('');
  const [error, setError] = useState('');

  const confirmar = () => {
    if (retiro) return cerrar('');
    const v = seguimiento.trim();
    if (v && !/^[A-Za-z0-9-]{4,30}$/.test(v)) {
      setError('Usa letras, números o guiones (4 a 30 caracteres).');
      document.getElementById('m-seguimiento')?.focus();
      return;
    }
    cerrar(v.toUpperCase());
  };

  return (
    <MarcoModal titulo={retiro ? `Pedido ${pedido.id} listo para entrega` : `Enviar pedido ${pedido.id}`}
      confirmar={retiro ? 'Marcar listo para entrega' : 'Marcar como enviado'} alConfirmar={confirmar} alCancelar={() => cerrar(null)}>
      {retiro ? (
        <p>Confirma que ya coordinaste la entrega con {pedido.envio.receptor} ({pedido.envio.telefono}).</p>
      ) : (
        <>
          <p>Despacho a {pedido.envio.receptor}, {pedido.envio.comuna}.</p>
          <div className={`campo${error ? ' con-error' : ''}`}>
            <label htmlFor="m-seguimiento">Número de seguimiento <span className="campo__opcional">(opcional)</span></label>
            <input id="m-seguimiento" name="seguimiento" maxLength={30} autoComplete="off" placeholder="Ej.: BX-4458210" value={seguimiento}
              aria-describedby="m-seguimiento-error" aria-invalid={error ? true : undefined} onChange={(ev) => setSeguimiento(ev.target.value)} />
            <p className="campo__error" id="m-seguimiento-error">{error}</p>
          </div>
        </>
      )}
    </MarcoModal>
  );
}

interface PropsPedido {
  pedido: Pedido;
  vista: Vista;
  destacado: boolean;
  alEnviar: (o: Pedido) => void;
  alRecibir: (o: Pedido) => void;
  alCancelar: (o: Pedido) => void;
}

function TarjetaPedido({ pedido: o, vista, destacado, alEnviar, alRecibir, alCancelar }: PropsPedido) {
  const { estado } = useTienda();
  const otro = usuarioPorId(estado, vista === 'compras' ? o.vendedorId : o.compradorId);
  const retiro = o.envio.metodo === 'retiro';
  const hechos = new Map(o.historial.map((h) => [h.estado, h.fecha]));
  const pasos: [Pedido['estado'], string][] = [['pagado', 'Pagado'], ['enviado', retiro ? 'Listo para entrega' : 'Enviado'], ['entregado', 'Entregado']];
  const cancelado = hechos.get('cancelado');

  let acciones = null;
  if (vista === 'compras' && o.estado === 'pagado') {
    acciones = <button type="button" className="btn btn--fantasma btn--chico" data-accion="cancelar-pedido" data-id={o.id}
      aria-label={`Cancelar el pedido ${o.id}`} onClick={() => alCancelar(o)}>Cancelar pedido</button>;
  } else if (vista === 'compras' && o.estado === 'enviado') {
    acciones = <button type="button" className="btn btn--primario btn--chico" data-accion="confirmar-recepcion" data-id={o.id}
      aria-label={`Confirmar que recibí el pedido ${o.id}`} onClick={() => alRecibir(o)}>Confirmar que lo recibí</button>;
  } else if (vista === 'ventas' && o.estado === 'pagado') {
    const texto = retiro ? 'Marcar listo para entrega' : 'Marcar como enviado';
    acciones = <button type="button" className="btn btn--primario btn--chico" data-accion="marcar-enviado" data-id={o.id}
      aria-label={`${texto} el pedido ${o.id}`} onClick={() => alEnviar(o)}>{texto}</button>;
  } else if (vista === 'ventas' && o.estado === 'enviado') {
    acciones = <p className="nota">Esperando que {nombreCorto(otro)} confirme la recepción para liberar tu pago.</p>;
  } else if (vista === 'ventas' && o.estado === 'entregado') {
    acciones = (
      <>
        <p className="nota">Pago liberado: {clp(o.netoVendedor)} ya está en tu saldo.</p>
        <Link className="btn btn--suave btn--chico" to="/retiros">Retirar dinero</Link>
      </>
    );
  }

  return (
    <article className={`pedido${destacado ? ' pedido--destacado' : ''}`} id={`pedido-${o.id}`} aria-labelledby={`titulo-${o.id}`}>
      <div className="pedido__cabeza">
        <div>
          <h2 className="pedido__id" id={`titulo-${o.id}`}>Pedido {o.id}</h2>
          <p className="pedido__meta">
            {fechaHora(o.fecha)}. {vista === 'compras' ? `Vende ${nombreCorto(otro)}` : `Compra ${otro ? otro.nombre : 'usuario'}`}. Pago con {o.pago.detalle}.
          </p>
        </div>
        <EstadoChip clave={o.estado} texto={textoEstadoPedido(o, vista)} />
      </div>

      {o.estado === 'cancelado' ? (
        <p className="alerta alerta--error">
          Pedido cancelado el {cancelado ? fechaHora(cancelado) : ''}. Las unidades volvieron al stock del vendedor.
        </p>
      ) : (
        <ol className="seguimiento" aria-label={`Seguimiento del pedido ${o.id}`}>
          {pasos.map(([clave, texto]) => {
            const f = hechos.get(clave);
            return (
              <li key={clave} className={f ? 'hecho' : ''} aria-current={o.estado === clave ? 'step' : undefined}>
                <span>{texto}</span>
                {f && <time dateTime={new Date(f).toISOString()}>{fecha(f)}</time>}
              </li>
            );
          })}
        </ol>
      )}

      <ul className="pedido__items">
        {o.items.map((it) => {
          const pub = pubPorId(estado, it.pubId);
          return (
            <li key={it.pubId} className="pedido__item">
              <Carta carta={pub ?? { ...it, acabado: 'Normal' }} clase="carta--mini" />
              <div>
                <Link to={`/carta/${it.pubId}`}>{it.nombre}</Link>
                <span className="celda-sub">{it.edicion}, {it.condicion}, {it.idioma}</span>
              </div>
              <span className="pedido__cantidad">{it.cantidad} × {clp(it.precio)}</span>
            </li>
          );
        })}
      </ul>

      <div className="pedido__pie">
        <p className="pedido__entrega">
          {retiro ? `Entrega en persona. Contacto de ${o.envio.receptor}: ${o.envio.telefono}.` : (
            <>
              Despacho a {o.envio.receptor}, {o.envio.direccion}, {o.envio.comuna}, {o.envio.region}.
              {o.envio.costo ? ` Envío pagado por quien compra: ${clp(o.envio.costo)}.` : ''}
              {o.seguimiento && <> Seguimiento: <strong>{o.seguimiento}</strong>.</>}
            </>
          )}
        </p>
        {vista === 'compras' ? (
          <dl className="totales">
            <dt>Cartas</dt><dd>{clp(o.subtotal)}</dd>
            <dt>Envío</dt><dd>{o.envio.costo ? clp(o.envio.costo) : 'Sin costo'}</dd>
            <dt className="total">Total pagado</dt><dd className="total">{clp(o.total)}</dd>
          </dl>
        ) : (
          <dl className="totales">
            <dt>Venta</dt><dd>{clp(o.subtotal)}</dd>
            <dt>Comisión {o.comisionPct} %</dt><dd>−{clp(o.comision)}</dd>
            <dt>IVA de la comisión</dt><dd>−{clp(o.ivaComision)}</dd>
            <dt className="total">Recibes</dt><dd className="total">{clp(o.netoVendedor)}</dd>
          </dl>
        )}
      </div>
      {acciones && <div className="pedido__acciones">{acciones}</div>}
    </article>
  );
}

/* Compras y ventas del usuario, con su seguimiento: pagado → enviado → entregado. */
export default function Pedidos({ ruta, usuario }: { ruta: Ruta; usuario: Usuario }) {
  const { estado, actualizar } = useTienda();
  const { avisar } = useAvisos();
  const modal = useModal();

  const destacado = ruta.params.get('id') ?? '';
  const compras = estado.pedidos.filter((o) => o.compradorId === usuario.id);
  const ventas = estado.pedidos.filter((o) => o.vendedorId === usuario.id);
  const porEnviar = ventas.filter((o) => o.estado === 'pagado').length;
  // Si llega con ?id= de una venta propia y sin ?tab=, abre la pestaña de ventas.
  const pedidoDestacado = destacado ? pedidoPorId(estado, destacado) : undefined;
  const vista: Vista = ruta.params.get('tab') === 'ventas' || (pedidoDestacado?.vendedorId === usuario.id && !ruta.params.get('tab'))
    ? 'ventas' : 'compras';
  const lista = (vista === 'compras' ? compras : ventas).slice().sort((a, b) => b.fecha - a.fecha);

  useEffect(() => {
    if (!destacado) return;
    // Se espera un cuadro para no competir con el "volver arriba" que hace App al cambiar de página.
    const id = requestAnimationFrame(() => document.getElementById(`pedido-${destacado}`)?.scrollIntoView({ block: 'center' }));
    return () => cancelAnimationFrame(id);
  }, [destacado, vista]);

  const enviar = async (o: Pedido) => {
    const seguimiento = await modal.abrir<string>((cerrar) => <VentanaEnvio pedido={o} cerrar={cerrar} />);
    if (seguimiento === null) return;
    const r = actualizar((e) => marcarEnviado(e, usuario.id, o.id, seguimiento));
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(`Marcaste el pedido ${o.id} como ${o.envio.metodo === 'retiro' ? 'listo para entrega' : 'enviado'}.`, 'exito');
  };

  const recibir = async (o: Pedido) => {
    const ok = await modal.confirmar({
      titulo: 'Confirmar recepción',
      mensaje: <p>¿Recibiste el pedido <strong>{o.id}</strong> y está todo bien? Al confirmar liberamos el pago al vendedor.</p>,
      confirmar: 'Sí, lo recibí',
    });
    if (!ok) return;
    const r = actualizar((e) => confirmarRecepcion(e, usuario.id, o.id));
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(`Confirmaste la recepción de ${o.id}. Liberamos el pago al vendedor.`, 'exito');
  };

  const cancelar = async (o: Pedido) => {
    const unidades = suma(o.items, (it) => it.cantidad);
    const ok = await modal.confirmar({
      titulo: `Cancelar el pedido ${o.id}`,
      mensaje: `Te devolveremos ${clp(o.total)} y ${unidades === 1 ? 'la unidad vuelve' : `las ${unidades} unidades vuelven`} al stock del vendedor. Esta acción no se puede deshacer.`,
      confirmar: 'Sí, cancelar pedido',
      cancelar: 'Volver',
      peligro: true,
    });
    if (!ok) return;
    const r = actualizar((e) => cancelarPedido(e, usuario.id, o.id));
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(`Cancelaste el pedido ${o.id}. Devolvimos ${r.valor.devueltas} ${plural(r.valor.devueltas, 'unidad', 'unidades')} al stock.`, 'exito');
  };

  return (
    <section className="vista contenedor" id="vista-pedidos" data-vista="pedidos" aria-labelledby="pedidos-titulo">
      <h1 className="titulo-vista" id="pedidos-titulo">Pedidos</h1>
      <nav className="pestanas" aria-label="Tipo de pedido">
        <Link to="/pedidos?tab=compras" data-pestana="compras" aria-current={vista === 'compras' ? 'page' : undefined}>
          Mis compras <span className="pestanas__n" id="pedidos-n-compras">{compras.length}</span>
        </Link>
        <Link to="/pedidos?tab=ventas" data-pestana="ventas" aria-current={vista === 'ventas' ? 'page' : undefined}>
          Mis ventas <span className="pestanas__n" id="pedidos-n-ventas">{porEnviar ? `${porEnviar} por enviar` : ventas.length}</span>
        </Link>
      </nav>
      <div className="pedidos" id="pedidos-lista">
        {lista.length ? lista.map((o) => (
          <TarjetaPedido key={o.id} pedido={o} vista={vista} destacado={o.id === destacado}
            alEnviar={enviar} alRecibir={recibir} alCancelar={cancelar} />
        )) : vista === 'compras' ? (
          <div className="vacio vacio--caja">
            <h2>Aún no compras cartas</h2>
            <p>Cuando compres, aquí verás el estado de cada pedido.</p>
            <Link className="btn btn--primario" to="/catalogo">Explorar el catálogo</Link>
          </div>
        ) : (
          <div className="vacio vacio--caja">
            <h2>Aún no vendes cartas</h2>
            <p>Publica una carta y aquí verás los pedidos que debes enviar.</p>
            <Link className="btn btn--primario" to="/vender">Publicar una carta</Link>
          </div>
        )}
      </div>
    </section>
  );
}
