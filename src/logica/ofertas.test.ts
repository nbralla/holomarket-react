/* Pruebas de ofertas y del pago simulado rechazado. */
import { describe, expect, it } from 'vitest';
import { crearEstadoInicial } from './estado';
import { descuento, enOferta, motivoRechazo, publicacionesEnOferta } from './ofertas';

const nuevoEstado = () => crearEstadoInicial(new Date(2026, 9, 8, 12).getTime());

describe('Ofertas', () => {
  it('una publicación está en oferta solo si el precio anterior es mayor', () => {
    expect(enOferta({ precio: 4490, precioAnterior: 5490 })).toBe(true);
    expect(enOferta({ precio: 4490, precioAnterior: 4490 })).toBe(false);
    expect(enOferta({ precio: 4490, precioAnterior: null })).toBe(false);
    expect(enOferta({ precio: 4490 })).toBe(false);   // publicaciones antiguas, sin el campo
  });

  it('calcula el porcentaje de descuento redondeado', () => {
    expect(descuento({ precio: 4490, precioAnterior: 5490 })).toBe(18);
    expect(descuento({ precio: 590, precioAnterior: 790 })).toBe(25);
    expect(descuento({ precio: 590, precioAnterior: null })).toBe(0);
  });

  it('lista las ofertas con stock, de mayor a menor descuento, y filtra por juego', () => {
    const e = nuevoEstado();
    const ofertas = publicacionesEnOferta(e);
    expect(ofertas.length).toBeGreaterThan(0);
    expect(ofertas.every((p) => p.stock > 0 && enOferta(p))).toBe(true);
    const descuentos = ofertas.map(descuento);
    expect(descuentos).toEqual([...descuentos].sort((a, b) => b - a));
    expect(publicacionesEnOferta(e, 'magic').every((p) => p.juego === 'magic')).toBe(true);
  });
});

describe('Pago simulado', () => {
  it('rechaza las tarjetas de prueba de rechazo (con o sin espacios) y aprueba las demás', () => {
    expect(motivoRechazo('4000 0000 0000 0002')).toBe('rechazada');
    expect(motivoRechazo('4000000000009995')).toBe('fondos');
    expect(motivoRechazo('4111 1111 1111 1111')).toBeNull();
  });
});
