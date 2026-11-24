/* Checkout: datos prellenados desde la cuenta, validación del pago y llamada a la API de compra.
   La API se simula con spyOn sobre el objeto "api" (mock): la prueba no necesita el backend. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { estadoDemo, montar, simularFetch, tiendaFalsa, usuarioDemo } from '../pruebas/montar';
import { api, ErrorApi } from '../services/datos';
import type { Pedido } from '../types';
import Checkout from './Checkout';

function montarCheckout() {
  const estado = estadoDemo();
  const camila = usuarioDemo(estado, 'U01');
  const tienda = tiendaFalsa({ estado, usuario: camila, carrito: [{ pubId: 'P001', cantidad: 2 }] });
  return { ...montar(<Checkout usuario={camila} />, { tienda, ruta: '/checkout' }), estado };
}

describe('Checkout', () => {
  beforeEach(() => { simularFetch(); });

  it('completa la entrega con los datos de la cuenta que inició sesión', () => {
    montarCheckout();
    expect((screen.getByLabelText('Nombre de quien recibe') as HTMLInputElement).value).toBe('Camila Rojas');
    expect((screen.getByLabelText('Región') as HTMLSelectElement).value).toBe('Metropolitana de Santiago');
    expect((screen.getByLabelText('Dirección') as HTMLInputElement).value).toBe('Av. Irarrázaval 3450, depto. 1204');
  });

  it('sin datos de tarjeta no paga: muestra los errores y no llama a la API', async () => {
    const usuario = userEvent.setup();
    const comprar = spyOn(api, 'comprar');
    const { tienda } = montarCheckout();
    await usuario.click(screen.getByRole('button', { name: /^Pagar/ }));
    expect(screen.getByText('Ingresa el número de la tarjeta.')).toBeTruthy();
    expect(screen.getByText('El código de seguridad tiene 3 o 4 dígitos.')).toBeTruthy();
    expect(tienda.ejecutar).not.toHaveBeenCalled();
    expect(comprar).not.toHaveBeenCalled();
  });

  it('rechaza un número de tarjeta que no pasa la validación de Luhn', async () => {
    const usuario = userEvent.setup();
    montarCheckout();
    await usuario.type(screen.getByLabelText('Número de tarjeta'), '4111 1111 1111 1112');
    await usuario.click(screen.getByRole('button', { name: /^Pagar/ }));
    expect(screen.getByText('El número de tarjeta no es válido. Revisa los dígitos.')).toBeTruthy();
  });

  it('con una tarjeta válida envía el carrito a la API, lo vacía y va a la confirmación', async () => {
    const usuario = userEvent.setup();
    const comprar = spyOn(api, 'comprar').and.resolveTo([{ id: 'HM-1023' } as Pedido]);
    const { tienda } = montarCheckout();
    await usuario.type(screen.getByLabelText('Número de tarjeta'), '4111 1111 1111 1111');
    await usuario.type(screen.getByLabelText('Nombre en la tarjeta'), 'Camila Rojas');
    await usuario.type(screen.getByLabelText('Vencimiento'), '1229');
    await usuario.type(screen.getByLabelText('Código de seguridad'), '123');
    await usuario.click(screen.getByRole('button', { name: /^Pagar/ }));

    expect(comprar).toHaveBeenCalledOnceWith([{ pubId: 'P001', cantidad: 2 }], jasmine.objectContaining({
      entrega: 'despacho', pago: 'tarjeta', receptor: 'Camila Rojas', numeroTarjeta: '4111 1111 1111 1111',
    }));
    expect(tienda.guardarCarrito).toHaveBeenCalledWith([]);
    expect(screen.getByTestId('url').textContent).toBe('/confirmacion/HM-1023');
  });

  it('si el backend responde 402 (banco rechaza) va a "Pago rechazado" sin vaciar el carrito', async () => {
    const usuario = userEvent.setup();
    spyOn(api, 'comprar').and.rejectWith(new ErrorApi(402, 'Sin fondos', { motivo: 'fondos' }));
    const { tienda } = montarCheckout();
    await usuario.type(screen.getByLabelText('Número de tarjeta'), '4000 0000 0000 9995');   // tarjeta de prueba: sin fondos
    await usuario.type(screen.getByLabelText('Nombre en la tarjeta'), 'Camila Rojas');
    await usuario.type(screen.getByLabelText('Vencimiento'), '1229');
    await usuario.type(screen.getByLabelText('Código de seguridad'), '123');
    await usuario.click(screen.getByRole('button', { name: /^Pagar/ }));

    expect(screen.getByTestId('url').textContent).toBe('/pago-rechazado?motivo=fondos');
    expect(tienda.guardarCarrito).not.toHaveBeenCalled();
  });

  it('si el stock cambió (409) muestra el mensaje del backend y se queda en el checkout', async () => {
    const usuario = userEvent.setup();
    spyOn(api, 'comprar').and.rejectWith(new ErrorApi(409, 'El stock cambió mientras comprabas.'));
    const { tienda } = montarCheckout();
    await usuario.type(screen.getByLabelText('Número de tarjeta'), '4111 1111 1111 1111');
    await usuario.type(screen.getByLabelText('Nombre en la tarjeta'), 'Camila Rojas');
    await usuario.type(screen.getByLabelText('Vencimiento'), '1229');
    await usuario.type(screen.getByLabelText('Código de seguridad'), '123');
    await usuario.click(screen.getByRole('button', { name: /^Pagar/ }));

    expect(await screen.findByText('El stock cambió mientras comprabas.')).toBeTruthy();
    expect(screen.getByTestId('url').textContent).toBe('/checkout');
    expect(tienda.guardarCarrito).not.toHaveBeenCalled();
  });
});
