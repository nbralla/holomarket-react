import { useState, type FormEvent } from 'react';
import Campo from '../components/Campo';
import { EstadoChip } from '../components/Chips';
import Indicadores from '../components/Indicadores';
import Tabla from '../components/Tabla';
import { Tiempo } from '../components/TablaMovimientos';
import { BANCOS, TIPOS_CUENTA } from '../data/catalogo';
import {
  cuentaTexto, DIAS_HABILES_RETIRO, detalleRetiro, ESTADOS_RETIRO, resumenCuenta, saldoVendedor, textoEstadoPedido, usuarioPorId,
} from '../logica/consultas';
import { anularRetiro, guardarCuentaBancaria, solicitarRetiro } from '../logica/retiros';
import { useAvisos } from '../hooks/useAvisos';
import { enfocarCampo, useFormulario } from '../hooks/useFormulario';
import { useModal } from '../hooks/useModal';
import { useTienda } from '../hooks/useTienda';
import type { Pedido, Retiro, Usuario } from '../types';
import { clp, fecha, nombreCorto, plural } from '../utils/formato';
import { cuentaBancariaValida, entero } from '../utils/validaciones';
import { Link } from 'react-router';

const SALDO_VENTA: Record<Pedido['estado'], { clave: string; texto: string } | null> = {
  entregado: { clave: 'activa', texto: 'Liberado' },
  pagado: { clave: 'pausada', texto: 'Retenido' },
  enviado: { clave: 'pausada', texto: 'Retenido' },
  cancelado: null,
};

function IconoBanco() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5 12 4l9 5.5" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" /><path d="M3 20h18" />
    </svg>
  );
}

/* El vendedor registra su cuenta bancaria y retira el dinero de sus ventas ya entregadas. */
export default function Retiros({ usuario }: { usuario: Usuario }) {
  const { estado, actualizar } = useTienda();
  const { avisar } = useAvisos();
  const modal = useModal();
  const [editandoCuenta, setEditandoCuenta] = useState(false);
  const [monto, setMonto] = useState('');
  const [errorMonto, setErrorMonto] = useState('');

  const s = saldoVendedor(estado, usuario.id);
  const min = estado.config.retiroMinimo;
  const cuenta = resumenCuenta(usuario);
  const conFormulario = !cuenta || editandoCuenta;
  const puede = Boolean(cuenta) && s.disponible >= min;

  const fc = useFormulario('ret-', () => ({ banco: usuario.cuenta?.banco ?? '', tipo: usuario.cuenta?.tipo ?? '', numero: '' }), (v) => ({
    banco: BANCOS.includes(v.banco) ? '' : 'Elige tu banco o institución.',
    tipo: TIPOS_CUENTA.includes(v.tipo) ? '' : 'Elige el tipo de cuenta.',
    numero: cuentaBancariaValida(v.numero) ? '' : 'Ingresa solo los números de la cuenta (entre 4 y 20 dígitos).',
  }));

  const reglaMonto = (valor: string): string => {
    const n = entero(valor);
    if (!valor.trim()) return 'Ingresa el monto que quieres retirar.';
    if (Number.isNaN(n)) return 'El monto debe ser un número entero, sin puntos ni decimales.';
    if (n < min) return `El monto mínimo de retiro es ${clp(min)}.`;
    if (n > s.disponible) return `Puedes retirar hasta ${clp(s.disponible)}.`;
    return '';
  };

  const abrirCambioCuenta = () => {
    fc.reiniciar({ banco: usuario.cuenta?.banco ?? '', tipo: usuario.cuenta?.tipo ?? '', numero: '' });
    setEditandoCuenta(true);
    requestAnimationFrame(() => enfocarCampo('ret-banco'));
  };

  const enviarCuenta = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!fc.validarTodo()) return;
    const { banco, tipo, numero } = fc.valores;
    const r = actualizar((e) => guardarCuentaBancaria(e, usuario.id, banco, tipo, numero));
    if (!r) return;
    if (!r.ok) {
      avisar(r.error, 'error');
      return;
    }
    setEditandoCuenta(false);
    fc.reiniciar({ banco, tipo, numero: '' });
    avisar(r.valor.nueva ? 'Registraste tu cuenta bancaria. Ya puedes solicitar retiros.' : 'Actualizaste tu cuenta. Los retiros nuevos irán a esta cuenta.', 'exito');
    requestAnimationFrame(() => {
      const campo = document.getElementById('ret-monto') as HTMLInputElement | null;
      if (campo && !campo.closest('fieldset')?.disabled) campo.focus();
      else document.querySelector<HTMLElement>('[data-accion="cambiar-cuenta"]')?.focus();
    });
  };

  const enviarRetiro = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!cuenta) return;
    const error = reglaMonto(monto);
    setErrorMonto(error);
    if (error) {
      enfocarCampo('ret-monto');
      return;
    }
    const n = entero(monto);
    const ok = await modal.confirmar({
      titulo: 'Confirmar retiro',
      mensaje: (
        <p>
          Transferiremos <strong>{clp(n)}</strong> a {cuentaTexto(cuenta)}, a nombre de {cuenta.titular}. El plazo es
          de {DIAS_HABILES_RETIRO} días hábiles y puedes anular la solicitud mientras esté en proceso.
        </p>
      ),
      confirmar: 'Solicitar retiro',
    });
    if (!ok) return;
    // solicitarRetiro vuelve a calcular el saldo con los datos guardados (por si cambió en otra pestaña).
    const r = actualizar((e) => solicitarRetiro(e, usuario.id, n));
    if (!r) return;
    if (!r.ok) {
      avisar(r.error, 'error');
      return;
    }
    setMonto('');
    avisar(`Solicitaste el retiro ${r.valor.id} por ${clp(n)}. Lo transferiremos en ${DIAS_HABILES_RETIRO} días hábiles.`, 'exito');
  };

  const anular = async (ret: Retiro) => {
    const ok = await modal.confirmar({
      titulo: 'Anular retiro',
      mensaje: <p>¿Anular la solicitud <strong>{ret.id}</strong> por {clp(ret.monto)}? El monto vuelve a tu saldo disponible.</p>,
      confirmar: 'Sí, anular',
      peligro: true,
    });
    if (!ok) return;
    const r = actualizar((e) => anularRetiro(e, usuario.id, ret.id));
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(`Anulaste el retiro ${ret.id}. El monto volvió a tu saldo.`, 'exito');
  };

  let aviso: string;
  if (!cuenta) aviso = 'Registra la cuenta bancaria donde quieres recibir tu dinero para poder retirar.';
  else if (s.disponible < min) {
    aviso = `Necesitas al menos ${clp(min)} disponibles para retirar; hoy tienes ${clp(s.disponible)}.`
      + (s.retenido ? ` Cuando se confirmen tus pedidos en curso se liberarán ${clp(s.retenido)} más.` : '');
  } else aviso = `Transferiremos a ${cuentaTexto(cuenta)} en un plazo de ${DIAS_HABILES_RETIRO} días hábiles.`;

  const mios = estado.retiros.filter((r) => r.uid === usuario.id).sort((a, b) => b.fecha - a.fecha);
  const ventas = estado.pedidos.filter((o) => o.vendedorId === usuario.id).sort((a, b) => b.fecha - a.fecha);

  return (
    <section className="vista contenedor" id="vista-retiros" data-vista="retiros" aria-labelledby="retiros-titulo">
      <div className="vista__cabeza">
        <div>
          <h1 className="titulo-vista" id="retiros-titulo">Retiros</h1>
          <p className="bajada">Transfiere a tu cuenta bancaria el dinero de tus ventas, ya descontada la comisión.</p>
        </div>
        <Link className="btn btn--fantasma" to="/pedidos?tab=ventas">Ver mis ventas</Link>
      </div>

      <div id="ret-indicadores">
        <Indicadores items={[
          { valor: clp(s.disponible), etiqueta: 'disponible para retirar', variante: 'destacado',
            detalle: s.disponible >= min ? `Mínimo por retiro: ${clp(min)}` : `Te faltan ${clp(min - s.disponible)} para el mínimo de ${clp(min)}` },
          { valor: clp(s.retenido), etiqueta: 'retenido en pedidos en curso',
            detalle: s.nRetenidos ? `${s.nRetenidos} ${plural(s.nRetenidos, 'pedido', 'pedidos')}: se libera al confirmarse la recepción` : 'No tienes pedidos en curso' },
          { valor: clp(s.enProceso), etiqueta: 'en proceso de retiro',
            detalle: s.nEnProceso ? `${s.nEnProceso} ${plural(s.nEnProceso, 'solicitud', 'solicitudes')}, transferencia en ${DIAS_HABILES_RETIRO} días hábiles` : 'Sin solicitudes pendientes' },
          { valor: clp(s.retirado), etiqueta: 'retirado en total', detalle: `De ${clp(s.liberado)} liberados por tus ventas` },
        ]} />
      </div>

      <div className="retiros">
        <div className="retiros__principal">
          <section className="bloque" aria-labelledby="ret-cuenta-titulo">
            <h2 className="titulo-chico" id="ret-cuenta-titulo">1. Cuenta de destino</h2>
            {cuenta && !conFormulario && (
              <div id="ret-cuenta-resumen">
                <div className="cuenta-bancaria">
                  <span className="cuenta-bancaria__icono"><IconoBanco /></span>
                  <div className="cuenta-bancaria__datos">
                    <p className="cuenta-bancaria__banco">{cuenta.banco}</p>
                    <p className="cuenta-bancaria__detalle">
                      {cuenta.tipo} <span className="cuenta-bancaria__numero" aria-label={`terminada en ${cuenta.ultimos}`}>•••• {cuenta.ultimos}</span>
                    </p>
                    <p className="cuenta-bancaria__detalle">A nombre de {cuenta.titular}, RUT {cuenta.rut}</p>
                  </div>
                  <button type="button" className="btn btn--fantasma btn--chico" data-accion="cambiar-cuenta" onClick={abrirCambioCuenta}>Cambiar cuenta</button>
                </div>
              </div>
            )}
            {conFormulario && (
              <form className="formulario" id="form-cuenta" noValidate onSubmit={enviarCuenta}>
                <p className="nota">La cuenta debe estar a tu nombre: <strong id="ret-titular">{usuario.nombre}, RUT {usuario.rut}</strong>. Así evitamos transferencias a terceros.</p>
                <div className="rejilla-campos row row-cols-1 row-cols-sm-2 g-3">
                  <Campo id="ret-banco" etiqueta="Banco o institución" error={fc.errores.banco}>
                    <select {...fc.campo('banco', { validarAlCambiar: true })}>
                      <option value="">Elige tu banco</option>
                      {BANCOS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Campo>
                  <Campo id="ret-tipo" etiqueta="Tipo de cuenta" error={fc.errores.tipo}>
                    <select {...fc.campo('tipo', { validarAlCambiar: true })}>
                      <option value="">Elige el tipo</option>
                      {TIPOS_CUENTA.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Campo>
                  <Campo id="ret-numero" etiqueta="Número de cuenta" clase="col-sm-12" error={fc.errores.numero}
                    ayuda="En la CuentaRUT es tu RUT sin dígito verificador. Después solo mostraremos los últimos 4 dígitos.">
                    <input {...fc.campo('numero', { ayuda: true })} inputMode="numeric" autoComplete="off" maxLength={24} placeholder="Solo números" />
                  </Campo>
                </div>
                <div className="acciones-fila acciones-fila--compacta">
                  <button type="submit" className="btn btn--primario">Guardar cuenta</button>
                  {cuenta && (
                    <button type="button" className="btn btn--fantasma" id="ret-cancelar-cuenta" data-accion="cancelar-cuenta"
                      onClick={() => setEditandoCuenta(false)}>Cancelar</button>
                  )}
                </div>
              </form>
            )}
          </section>

          <section className="bloque" aria-labelledby="ret-solicitar-titulo">
            <h2 className="titulo-chico" id="ret-solicitar-titulo">2. Monto a retirar</h2>
            <form className="formulario" id="form-retiro" noValidate onSubmit={enviarRetiro}>
              <fieldset className="sin-borde" id="ret-campos" disabled={!puede}>
                <legend className="solo-lector">Solicitud de retiro</legend>
                <div className="monto">
                  <Campo id="ret-monto" etiqueta="Monto (CLP)" error={errorMonto} ayuda={`Mínimo ${clp(min)}. Disponible: ${clp(s.disponible)}.`}>
                    <input id="ret-monto" name="monto" type="number" min={min} max={s.disponible} step={1} inputMode="numeric"
                      value={puede ? monto : ''} aria-describedby="ret-monto-ayuda ret-monto-error" aria-invalid={errorMonto ? true : undefined}
                      onChange={(ev) => { setMonto(ev.target.value); if (errorMonto) setErrorMonto(reglaMonto(ev.target.value)); }} />
                  </Campo>
                  <button type="button" className="btn btn--suave" data-accion="retirar-todo"
                    onClick={() => { setMonto(String(s.disponible)); setErrorMonto(''); enfocarCampo('ret-monto'); }}>Retirar todo</button>
                </div>
                <button type="submit" className="btn btn--primario btn--grande" id="ret-enviar">Solicitar retiro</button>
              </fieldset>
              <p className={`alerta alerta--${puede ? 'info' : 'aviso'}`} id="ret-estado" role="status">{aviso}</p>
            </form>
          </section>
        </div>

        <aside className="bloque retiros__ayuda" aria-labelledby="ret-ayuda-titulo">
          <h2 className="titulo-chico" id="ret-ayuda-titulo">Cómo funciona</h2>
          <ol className="pasos-retiro">
            <li><strong>Vendes una carta.</strong> El monto queda retenido mientras el pedido está pagado o en camino.</li>
            <li><strong>Quien compra confirma la recepción.</strong> Liberamos la venta, ya descontada la comisión de {estado.config.comision} % + IVA.</li>
            <li><strong>Solicitas el retiro</strong> desde <span id="ret-minimo">{clp(min)}</span> a una cuenta a tu nombre.</li>
            <li><strong>Transferimos en {DIAS_HABILES_RETIRO} días hábiles.</strong> Puedes anular la solicitud mientras esté en proceso.</li>
          </ol>
        </aside>
      </div>

      <section className="subseccion" aria-labelledby="ret-historial-titulo">
        <h2 id="ret-historial-titulo">Solicitudes de retiro</h2>
        <div id="ret-historial">
          <Tabla columnas={[{ t: 'Solicitud' }, { t: 'Monto', num: true }, { t: 'Cuenta' }, { t: 'Estado' }, { t: 'Detalle' }, { t: 'Acción' }]}
            vacio="Todavía no solicitas retiros." leyenda="Solicitudes de retiro"
            filas={mios.map((r) => ({
              clave: r.id,
              celdas: [
                <><strong>{r.id}</strong><span className="celda-sub"><Tiempo t={r.fecha} /></span></>,
                <strong>{clp(r.monto)}</strong>,
                cuentaTexto(r.cuenta),
                <EstadoChip clave={`ret-${r.estado}`} texto={ESTADOS_RETIRO[r.estado]} />,
                detalleRetiro(r),
                r.estado === 'solicitado'
                  ? <button type="button" className="btn btn--chico btn--fantasma" data-accion="anular-retiro" data-id={r.id}
                    aria-label={`Anular el retiro ${r.id}`} onClick={() => anular(r)}>Anular</button>
                  : <span className="nota">Sin acciones</span>,
              ],
            }))} />
        </div>
      </section>

      <section className="subseccion" aria-labelledby="ret-ventas-titulo">
        <h2 id="ret-ventas-titulo">Detalle de tus ventas</h2>
        <p className="bajada">Cada venta suma a tu saldo cuando se entrega. Las canceladas no suman.</p>
        <div id="ret-ventas">
          <Tabla columnas={[{ t: 'Pedido' }, { t: 'Comprador' }, { t: 'Estado del pedido' }, { t: 'Venta', num: true },
            { t: 'Comisión + IVA', num: true }, { t: 'Neto', num: true }, { t: 'Saldo' }]}
            vacio="Aún no tienes ventas. Cuando vendas, aquí verás cuánto recibes por cada una." leyenda="Ventas y saldo"
            filas={ventas.map((o) => {
              const saldo = SALDO_VENTA[o.estado];
              return {
                clave: o.id,
                celdas: [
                  <><Link to={`/pedidos?tab=ventas&id=${o.id}`}>{o.id}</Link><span className="celda-sub">{fecha(o.fecha)}</span></>,
                  nombreCorto(usuarioPorId(estado, o.compradorId)),
                  <EstadoChip clave={o.estado} texto={textoEstadoPedido(o, 'ventas')} />,
                  clp(o.subtotal),
                  `−${clp(o.comision + o.ivaComision)}`,
                  <strong>{clp(o.netoVendedor)}</strong>,
                  saldo ? <EstadoChip clave={saldo.clave} texto={saldo.texto} /> : <span className="nota">No suma</span>,
                ],
              };
            })} />
        </div>
      </section>
    </section>
  );
}
