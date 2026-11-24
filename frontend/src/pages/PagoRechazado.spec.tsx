/* Pago rechazado: explica el motivo, no cobra y permite reintentar. */
import { screen } from '@testing-library/react';
import { estadoDemo, montar, simularFetch, tiendaFalsa, usuarioDemo } from '../pruebas/montar';
import type { ItemCarrito } from '../types';
import PagoRechazado from './PagoRechazado';

function montarRechazo(ruta: string, carrito: ItemCarrito[]) {
  const estado = estadoDemo();
  const camila = usuarioDemo(estado, 'U01');
  return montar(<PagoRechazado usuario={camila} />, { tienda: tiendaFalsa({ estado, usuario: camila, carrito }), ruta });
}

describe('Pago rechazado', () => {
  beforeEach(() => { simularFetch(); });

  it('muestra el motivo del rechazo que viene en la URL', () => {
    montarRechazo('/pago-rechazado?motivo=fondos', [{ pubId: 'P001', cantidad: 1 }]);
    expect(screen.getByRole('heading', { name: 'No se pudo realizar el pago' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('La tarjeta no tiene fondos o cupo suficiente para este monto.');
  });

  it('con cartas en el carrito ofrece reintentar el pago y muestra el total pendiente', () => {
    montarRechazo('/pago-rechazado?motivo=rechazada', [{ pubId: 'P001', cantidad: 2 }]);
    expect(screen.getByText('Tus cartas siguen en el carrito.', { exact: false })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Intentar de nuevo' }).getAttribute('href')).toBe('/checkout');
    expect(screen.getByText('2 unidades')).toBeTruthy();
  });

  it('con un motivo desconocido o el carrito vacío no se rompe', () => {
    montarRechazo('/pago-rechazado?motivo=otro', []);
    expect(screen.getByRole('alert').textContent).toBe('No pudimos procesar el pago.');
    expect(screen.queryByRole('link', { name: 'Intentar de nuevo' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Ir al catálogo' })).toBeTruthy();
  });
});
