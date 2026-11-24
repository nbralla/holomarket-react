/* =========================================================================
   Cuenta bancaria y retiros de dinero del vendedor
   ========================================================================= */
import type { Estado, Resultado, Retiro, Usuario } from '../types';
import { clp } from '../utils/formato';
import { cuentaTexto, resumenCuenta, saldoVendedor, usuarioPorId } from './consultas';
import { registrarActividad, siguienteId } from './estado';

export function guardarCuentaBancaria(e: Estado, uid: string, banco: string, tipo: string, numero: string): Resultado<{ nueva: boolean }> {
  const u = usuarioPorId(e, uid);
  if (!u) return { ok: false, error: 'Tu sesión cambió. Vuelve a ingresar.' };
  const nueva = !u.cuenta;
  u.cuenta = { banco, tipo, numero: numero.replace(/[\s-]/g, ''), actualizada: Date.now() };
  const resumen = resumenCuenta(u);
  registrarActividad(e, nueva ? 'Cuenta bancaria registrada' : 'Cuenta bancaria actualizada', resumen ? cuentaTexto(resumen) : '', uid);
  return { ok: true, valor: { nueva } };
}

/* Se vuelve a calcular el saldo con los datos guardados: evita retirar dos veces el mismo dinero. */
export function solicitarRetiro(e: Estado, uid: string, monto: number): Resultado<Retiro> {
  const u = usuarioPorId(e, uid);
  const cuenta = resumenCuenta(u);
  if (!u || !cuenta) return { ok: false, error: 'Registra una cuenta bancaria antes de retirar.' };
  if (!Number.isInteger(monto) || monto < e.config.retiroMinimo) {
    return { ok: false, error: `El monto mínimo de retiro es ${clp(e.config.retiroMinimo)}.` };
  }
  const disponible = saldoVendedor(e, uid).disponible;
  if (monto > disponible) return { ok: false, error: `Tu saldo cambió: ahora puedes retirar hasta ${clp(disponible)}.` };
  const ahora = Date.now();
  const r: Retiro = {
    id: siguienteId(e, 'retiro'), uid, monto, cuenta, estado: 'solicitado', fecha: ahora,
    historial: [{ estado: 'solicitado', fecha: ahora }], comprobante: '', motivo: '',
  };
  e.retiros.push(r);
  registrarActividad(e, 'Retiro solicitado', `${r.id} por ${clp(monto)} a ${cuentaTexto(cuenta)}`, uid);
  return { ok: true, valor: r };
}

function retiroPendiente(e: Estado, id: string): Retiro | undefined {
  const r = e.retiros.find((x) => x.id === id);
  return r && r.estado === 'solicitado' ? r : undefined;
}

const YA_CAMBIO = 'Esta solicitud de retiro ya cambió de estado. Actualizamos la lista.';

export function anularRetiro(e: Estado, uid: string, id: string): Resultado<Retiro> {
  const r = retiroPendiente(e, id);
  if (!r || r.uid !== uid) return { ok: false, error: YA_CAMBIO };
  r.estado = 'anulado';
  r.historial.push({ estado: 'anulado', fecha: Date.now() });
  registrarActividad(e, 'Retiro anulado', `${r.id} por ${clp(r.monto)}`, uid);
  return { ok: true, valor: r };
}

export function pagarRetiro(e: Estado, admin: Usuario, id: string, comprobante: string): Resultado<Retiro> {
  const r = retiroPendiente(e, id);
  if (!r || admin.rol !== 'admin') return { ok: false, error: YA_CAMBIO };
  const v = usuarioPorId(e, r.uid);
  r.estado = 'pagado';
  r.comprobante = comprobante.trim().toUpperCase();
  r.historial.push({ estado: 'pagado', fecha: Date.now() });
  registrarActividad(e, 'Retiro transferido',
    `${r.id} por ${clp(r.monto)} a ${v ? v.nombre : r.uid}${r.comprobante ? `, comprobante ${r.comprobante}` : ''}`, admin.id);
  return { ok: true, valor: r };
}

export function rechazarRetiro(e: Estado, admin: Usuario, id: string, motivo: string): Resultado<Retiro> {
  const r = retiroPendiente(e, id);
  if (!r || admin.rol !== 'admin') return { ok: false, error: YA_CAMBIO };
  r.estado = 'rechazado';
  r.motivo = motivo;
  r.historial.push({ estado: 'rechazado', fecha: Date.now() });
  registrarActividad(e, 'Retiro rechazado', `${r.id} por ${clp(r.monto)}: ${motivo}`, admin.id);
  return { ok: true, valor: r };
}
