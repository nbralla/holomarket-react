/* Pruebas de la lógica que queda en el front (catálogo, carrito y saldo) con los datos de demostración.
   Las reglas que escriben datos (compra, stock, retiros) ahora las aplica el backend. */
import { describe, expect, it } from 'vitest';
import { celdaCsv } from '../services/csv';
import type { Estado, Pedido, Retiro, Usuario } from '../types';
import { agregarAlCarrito, calcularCompra, revisarCarrito } from './compras';
import { filtrarPublicaciones, FILTROS_VACIOS, leerFiltros, saldoVendedor, usuarioPorId } from './consultas';
import { crearEstadoInicial } from './estado';

const nuevoEstado = (): Estado => crearEstadoInicial(new Date(2026, 9, 8, 12).getTime());
const usuario = (e: Estado, id: string) => usuarioPorId(e, id) as Usuario;
/* Neto de las ventas entregadas de un vendedor (lo que puede retirar si no tiene retiros). */
const netoEntregado = (e: Estado, uid: string) =>
  e.pedidos.filter((o) => o.vendedorId === uid && o.estado === 'entregado').reduce((s, o) => s + o.netoVendedor, 0);

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

describe('Carrito y resumen de compra', () => {
  it('no permite agregar más que el stock ni cartas propias', () => {
    const e = nuevoEstado();
    const diego = usuario(e, 'U02');
    const camila = usuario(e, 'U01');
    expect(agregarAlCarrito(e, camila, [], 'P001', 5).ok).toBe(false);
    expect(agregarAlCarrito(e, diego, [], 'P001', 1).ok).toBe(false);
    const r = agregarAlCarrito(e, camila, [], 'P001', 2);
    expect(r.ok && r.valor).toEqual([{ pubId: 'P001', cantidad: 2 }]);
  });
  it('al revisar el carrito ajusta la cantidad si el stock bajó', () => {
    const e = nuevoEstado();
    const r = revisarCarrito(e, 'U01', [{ pubId: 'P001', cantidad: 9 }]);
    expect(r.items).toEqual([{ pubId: 'P001', cantidad: 3 }]);
    expect(r.avisos[0]).toContain('Solo quedan 3 unidades');
  });
  it('arma un paquete (y un envío) por vendedor', () => {
    const e = nuevoEstado();
    const { lineas } = revisarCarrito(e, 'U01', [{ pubId: 'P001', cantidad: 1 }, { pubId: 'P002', cantidad: 1 }]);
    const compra = calcularCompra(e, lineas, 'despacho', 'Metropolitana de Santiago');
    expect(compra.paquetes).toHaveLength(2);
    expect(compra.total).toBe(compra.subtotal + compra.envio);
    expect(calcularCompra(e, lineas, 'retiro', 'Metropolitana de Santiago').envio).toBe(0);
  });
});

describe('Saldo del vendedor', () => {
  it('libera la venta solo cuando el pedido queda entregado', () => {
    const e = nuevoEstado();
    const antes = saldoVendedor(e, 'U02').disponible;
    expect(antes).toBe(netoEntregado(e, 'U02'));
    const pendiente = e.pedidos.find((o) => o.vendedorId === 'U02' && o.estado !== 'entregado') as Pedido;
    expect(saldoVendedor(e, 'U02').retenido).toBeGreaterThan(0);
    pendiente.estado = 'entregado';
    expect(saldoVendedor(e, 'U02').disponible).toBe(antes + pendiente.netoVendedor);
  });
  it('descuenta los retiros en proceso y los transferidos', () => {
    const e = nuevoEstado();
    // Ventas entregadas − RET-001 transferido ($30.000) − RET-002 en proceso ($20.000)
    expect(saldoVendedor(e, 'U03').disponible).toBe(netoEntregado(e, 'U03') - 50000);
    (e.retiros.find((r) => r.id === 'RET-002') as Retiro).estado = 'rechazado';
    expect(saldoVendedor(e, 'U03').disponible).toBe(netoEntregado(e, 'U03') - 30000);
  });
});

describe('Exportación', () => {
  it('evita fórmulas en el CSV', () => {
    expect(celdaCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(celdaCsv('-3')).toBe('-3');
    expect(celdaCsv('Sol; Ring')).toBe('"Sol; Ring"');
  });
});
