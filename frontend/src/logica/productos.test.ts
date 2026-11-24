/* Pruebas de la agrupación de publicaciones por carta. */
import { describe, expect, it } from 'vitest';
import { filtrarPublicaciones, FILTROS_VACIOS, pubPorId } from './consultas';
import { crearEstadoInicial } from './estado';
import { agruparProductos, productoDe, unidadesVendidas, ventasDeProducto } from './productos';
import type { Publicacion } from '../types';

const nuevoEstado = () => crearEstadoInicial(new Date(2026, 9, 8, 12).getTime());

describe('Cartas (productos)', () => {
  it('junta las publicaciones de la misma carta y elige la más barata con stock', () => {
    const e = nuevoEstado();
    const charizard = agruparProductos(filtrarPublicaciones(e, { ...FILTROS_VACIOS, q: 'charizard obsidian' }));
    expect(charizard).toHaveLength(1);
    expect(charizard[0].publicaciones.map((p) => p.id)).toEqual(['P002', 'P001', 'P003']);
    expect(charizard[0].mejor.id).toBe('P002');
    expect(charizard[0].vendedores).toBe(3);
  });

  it('una carta normal y su versión reverse holo son la misma carta', () => {
    const e = nuevoEstado();
    const p = productoDe(e, pubPorId(e, 'P012') as Publicacion);
    expect(p.publicaciones.map((x) => x.id).sort()).toEqual(['P012', 'P013']);
  });

  it('no junta cartas con distinto número aunque tengan el mismo nombre', () => {
    const e = nuevoEstado();
    const productos = agruparProductos(filtrarPublicaciones(e, { ...FILTROS_VACIOS, q: 'charizard' }));
    expect(productos.map((p) => p.numero).sort()).toEqual(['125/197', '199/165']);
  });

  it('arma el historial de ventas de la carta, sin los pedidos cancelados', () => {
    const e = nuevoEstado();
    const pub = pubPorId(e, 'P001') as Publicacion;
    const p = productoDe(e, pub);
    const antes = unidadesVendidas(e, p);
    const linea = { pubId: 'P003', nombre: 'Charizard ex', juego: pub.juego, edicion: pub.edicion, numero: pub.numero, condicion: 'NM' as const, idioma: 'ES', precio: 6490, cantidad: 2 };
    e.pedidos.push({ ...e.pedidos[0], id: 'HM-9998', fecha: 1, estado: 'cancelado', items: [linea] });
    e.pedidos.push({ ...e.pedidos[0], id: 'HM-9999', fecha: Date.now(), estado: 'entregado', vendedorId: 'U01', items: [linea] });
    expect(unidadesVendidas(e, p)).toBe(antes + 2);
    const [ultima] = ventasDeProducto(e, p);
    expect(ultima).toMatchObject({ pedidoId: 'HM-9999', cantidad: 2, precio: 6490, condicion: 'NM', acabado: 'Holo', vendedorId: 'U01' });
  });
});
