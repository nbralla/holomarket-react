/* Pruebas de las reglas de negocio con los datos de demostración. */
import { describe, expect, it } from 'vitest';
import { celdaCsv } from '../services/csv';
import type { Estado, Usuario } from '../types';
import { agregarAlCarrito, cancelarPedido, confirmarRecepcion, marcarEnviado, procesarCompra } from './compras';
import { filtrarPublicaciones, FILTROS_VACIOS, leerFiltros, pubPorId, saldoVendedor, usuarioPorId } from './consultas';
import { crearEstadoInicial } from './estado';
import { ajustarStock, eliminarPublicacion } from './publicaciones';
import { anularRetiro, guardarCuentaBancaria, pagarRetiro, rechazarRetiro, solicitarRetiro } from './retiros';
import { registrarUsuario } from './usuarios';

const nuevoEstado = (): Estado => crearEstadoInicial(new Date(2026, 9, 8, 12).getTime());
const usuario = (e: Estado, id: string) => usuarioPorId(e, id) as Usuario;
/* Neto de las ventas entregadas de un vendedor (lo que puede retirar si no tiene retiros). */
const netoEntregado = (e: Estado, uid: string) =>
  e.pedidos.filter((o) => o.vendedorId === uid && o.estado === 'entregado').reduce((s, o) => s + o.netoVendedor, 0);

const DATOS_COMPRA = {
  entrega: 'despacho' as const, pago: 'tarjeta' as const, receptor: 'Camila Rojas', telefono: '+56 9 8765 4321',
  region: 'Metropolitana de Santiago', comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 3450', numeroTarjeta: '4111 1111 1111 1111',
};

describe('Catálogo', () => {
  it('muestra 23 publicaciones visibles (no las pausadas ni agotadas)', () => {
    expect(filtrarPublicaciones(nuevoEstado(), FILTROS_VACIOS)).toHaveLength(23);
  });
  it('busca sin importar tildes ni mayúsculas', () => {
    const e = nuevoEstado();
    expect(filtrarPublicaciones(e, { ...FILTROS_VACIOS, q: 'CHARIZARD' })).toHaveLength(4);
    expect(filtrarPublicaciones(e, leerFiltros(new URLSearchParams('q=charizard&cond=EX')))).toHaveLength(1);
  });
  it('oculta las publicaciones de usuarios bloqueados', () => {
    const e = nuevoEstado();
    usuario(e, 'U03').estado = 'bloqueado';
    expect(filtrarPublicaciones(e, FILTROS_VACIOS).every((p) => p.vendedorId !== 'U03')).toBe(true);
  });
});

describe('Compra y stock', () => {
  it('descuenta el stock y registra el movimiento de venta', () => {
    const e = nuevoEstado();
    const camila = usuario(e, 'U01');
    const r = procesarCompra(e, camila, [{ pubId: 'P001', cantidad: 2 }], DATOS_COMPRA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor[0].id).toBe('HM-1023');
    expect(r.valor[0].pago.detalle).toBe('tarjeta terminada en 1111');
    expect(pubPorId(e, 'P001')?.stock).toBe(1);
    const mov = e.movimientos.find((m) => m.ref === 'HM-1023');
    expect(mov?.antes).toBe(3);
    expect(mov?.despues).toBe(1);
  });
  it('crea un pedido por vendedor', () => {
    const e = nuevoEstado();
    const r = procesarCompra(e, usuario(e, 'U01'), [{ pubId: 'P001', cantidad: 1 }, { pubId: 'P002', cantidad: 1 }], DATOS_COMPRA);
    expect(r.ok && r.valor.length).toBe(2);
  });
  it('no permite comprar más que el stock ni cartas propias', () => {
    const e = nuevoEstado();
    const diego = usuario(e, 'U02');
    const camila = usuario(e, 'U01');
    expect(agregarAlCarrito(e, camila, [], 'P001', 5).ok).toBe(false);
    expect(agregarAlCarrito(e, diego, [], 'P001', 1).ok).toBe(false);
  });
  it('si el stock cambió, la compra se rechaza completa', () => {
    const e = nuevoEstado();
    const r = procesarCompra(e, usuario(e, 'U01'), [{ pubId: 'P001', cantidad: 9 }], DATOS_COMPRA);
    expect(r.ok).toBe(false);
    expect(pubPorId(e, 'P001')?.stock).toBe(3);
  });
  it('cancelar un pedido pagado devuelve las unidades', () => {
    const e = nuevoEstado();
    const r = procesarCompra(e, usuario(e, 'U01'), [{ pubId: 'P001', cantidad: 2 }], DATOS_COMPRA);
    if (!r.ok) throw new Error(r.error);
    const c = cancelarPedido(e, 'U01', r.valor[0].id);
    expect(c.ok).toBe(true);
    expect(pubPorId(e, 'P001')?.stock).toBe(3);
  });
  it('un ajuste de salida no puede dejar stock negativo', () => {
    const e = nuevoEstado();
    expect(ajustarStock(e, 'U02', 'P001', 'salida', 50, 'Prueba').ok).toBe(false);
    expect(ajustarStock(e, 'U02', 'P001', 'entrada', 3, 'Reposición').ok).toBe(true);
    expect(pubPorId(e, 'P001')?.stock).toBe(6);
  });
  it('eliminar una publicación deja su stock en 0', () => {
    const e = nuevoEstado();
    expect(eliminarPublicacion(e, usuario(e, 'U02'), 'P001').ok).toBe(true);
    expect(pubPorId(e, 'P001')?.stock).toBe(0);
  });
});

describe('Saldo y retiros', () => {
  it('libera la venta solo cuando el comprador confirma la recepción', () => {
    const e = nuevoEstado();
    const antes = saldoVendedor(e, 'U02').disponible;
    expect(antes).toBe(netoEntregado(e, 'U02'));
    const r = procesarCompra(e, usuario(e, 'U01'), [{ pubId: 'P001', cantidad: 2 }], DATOS_COMPRA);
    if (!r.ok) throw new Error(r.error);
    const id = r.valor[0].id;
    expect(saldoVendedor(e, 'U02').retenido).toBeGreaterThan(0);
    expect(saldoVendedor(e, 'U02').disponible).toBe(antes);
    marcarEnviado(e, 'U02', id, 'BX-1234');
    confirmarRecepcion(e, 'U01', id);
    expect(saldoVendedor(e, 'U02').disponible).toBe(antes + r.valor[0].netoVendedor);
  });
  it('exige cuenta, respeta el mínimo y el saldo, y anular devuelve el monto', () => {
    const e = nuevoEstado();
    expect(solicitarRetiro(e, 'U02', 10000).ok).toBe(false);
    guardarCuentaBancaria(e, 'U02', 'Banco de Chile', 'Cuenta corriente', '00-1234 5678');
    expect(usuario(e, 'U02').cuenta?.numero).toBe('0012345678');
    expect(solicitarRetiro(e, 'U02', 1000).ok).toBe(false);
    expect(solicitarRetiro(e, 'U02', netoEntregado(e, 'U02') + 1).ok).toBe(false);   // más que el saldo
    const r = solicitarRetiro(e, 'U02', 20000);
    if (!r.ok) throw new Error(r.error);
    expect(r.valor.cuenta.ultimos).toBe('5678');
    expect(JSON.stringify(r.valor)).not.toContain('0012345678');
    expect(saldoVendedor(e, 'U02').disponible).toBe(netoEntregado(e, 'U02') - 20000);
    anularRetiro(e, 'U02', r.valor.id);
    expect(saldoVendedor(e, 'U02').disponible).toBe(netoEntregado(e, 'U02'));
  });
  it('el administrador transfiere o rechaza solicitudes pendientes', () => {
    const e = nuevoEstado();
    const admin = usuario(e, 'U00');
    // Ventas entregadas − RET-001 transferido ($30.000) − RET-002 en proceso ($20.000)
    expect(saldoVendedor(e, 'U03').disponible).toBe(netoEntregado(e, 'U03') - 50000);
    expect(rechazarRetiro(e, admin, 'RET-002', 'Datos incompletos').ok).toBe(true);
    expect(saldoVendedor(e, 'U03').disponible).toBe(netoEntregado(e, 'U03') - 30000);
    expect(pagarRetiro(e, admin, 'RET-002', 'TRF-1').ok).toBe(false);
  });
});

describe('Registro y exportación', () => {
  it('no permite RUT ni correo repetidos y no guarda la contraseña en texto plano', () => {
    const e = nuevoEstado();
    const base = { nombre: 'Martina Soto', telefono: '', region: 'Biobío', comuna: 'Concepción', clave: 'HoloMarket2026' };
    expect(registrarUsuario(e, { ...base, rut: '12.345.678-5', email: 'martina@demo.cl' }).ok).toBe(false);
    expect(registrarUsuario(e, { ...base, rut: '21456789K', email: 'CAMILA@demo.cl' }).ok).toBe(false);
    const r = registrarUsuario(e, { ...base, rut: '21456789K', email: 'martina@demo.cl' });
    if (!r.ok) throw new Error(r.error);
    expect(r.valor.rut).toBe('21.456.789-K');
    expect(r.valor.clave).not.toContain('HoloMarket2026');
    expect(r.valor.consentimiento).toBeGreaterThan(0);
  });
  it('evita fórmulas en el CSV', () => {
    expect(celdaCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(celdaCsv('-3')).toBe('-3');
    expect(celdaCsv('Sol; Ring')).toBe('"Sol; Ring"');
  });
});
