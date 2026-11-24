/* Carrito: renderizado condicional (vacío o con cartas) y eventos que cambian el carrito. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { estadoDemo, montar, simularFetch, tiendaFalsa, usuarioDemo } from '../pruebas/montar';
import type { ItemCarrito } from '../types';
import Carrito from './Carrito';

function montarCarrito(carrito: ItemCarrito[]) {
  const estado = estadoDemo();
  const camila = usuarioDemo(estado, 'U01');
  const tienda = tiendaFalsa({ estado, usuario: camila, carrito });
  return montar(<Carrito usuario={camila} />, { tienda, ruta: '/carrito' });
}

describe('Carrito', () => {
  beforeEach(() => { simularFetch(); });

  it('sin cartas muestra el carrito vacío y el enlace al catálogo', () => {
    montarCarrito([]);
    expect(screen.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir al catálogo' }).getAttribute('href')).toBe('/catalogo');
  });

  it('agrupa las cartas en un paquete por vendedor', () => {
    montarCarrito([{ pubId: 'P001', cantidad: 2 }, { pubId: 'P013', cantidad: 1 }]);
    expect(screen.queryByText('Tu carrito está vacío')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Paquete 1: vende Diego M.' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Paquete 2: vende Valentina S.' })).toBeTruthy();
  });

  it('"+" suma una unidad y "Quitar" saca la carta del carrito', async () => {
    const usuario = userEvent.setup();
    const { tienda } = montarCarrito([{ pubId: 'P001', cantidad: 1 }]);

    await usuario.click(screen.getByRole('button', { name: 'Agregar una unidad de Charizard ex' }));
    expect(tienda.guardarCarrito).toHaveBeenCalledWith([{ pubId: 'P001', cantidad: 2 }]);

    await usuario.click(screen.getByRole('button', { name: 'Quitar Charizard ex del carrito' }));
    expect(tienda.guardarCarrito).toHaveBeenCalledWith([]);
  });

  it('no deja pasar del stock disponible: con todas las unidades, "+" se desactiva', async () => {
    const usuario = userEvent.setup();
    const { tienda } = montarCarrito([{ pubId: 'P001', cantidad: 3 }]);   // P001 tiene 3 unidades
    const mas = screen.getByRole('button', { name: 'Agregar una unidad de Charizard ex' }) as HTMLButtonElement;
    const menos = screen.getByRole('button', { name: 'Quitar una unidad de Charizard ex' }) as HTMLButtonElement;
    expect(mas.disabled).toBeTrue();
    expect(menos.disabled).toBeFalse();
    await usuario.click(mas);
    expect(tienda.guardarCarrito).not.toHaveBeenCalled();
  });
});
