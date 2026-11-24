/* Checkout: datos prellenados desde la cuenta, validación del pago y compra completa. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pubPorId } from '../logica/consultas';
import { estadoDemo, montar, simularFetch, tiendaFalsa, usuarioDemo } from '../pruebas/montar';
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

  it('sin datos de tarjeta no paga: muestra los errores y no toca el stock', async () => {
    const usuario = userEvent.setup();
    const { tienda } = montarCheckout();
    await usuario.click(screen.getByRole('button', { name: /^Pagar/ }));
    expect(screen.getByText('Ingresa el número de la tarjeta.')).toBeTruthy();
    expect(screen.getByText('El código de seguridad tiene 3 o 4 dígitos.')).toBeTruthy();
    expect(tienda.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza un número de tarjeta que no pasa la validación de Luhn', async () => {
    const usuario = userEvent.setup();
    montarCheckout();
    await usuario.type(screen.getByLabelText('Número de tarjeta'), '4111 1111 1111 1112');
    await usuario.click(screen.getByRole('button', { name: /^Pagar/ }));
    expect(screen.getByText('El número de tarjeta no es válido. Revisa los dígitos.')).toBeTruthy();
  });

  it('con una tarjeta válida paga, descuenta el stock, vacía el carrito y va a la confirmación', async () => {
    const usuario = userEvent.setup();
    const { tienda, estado } = montarCheckout();
    await usuario.type(screen.getByLabelText('Número de tarjeta'), '4111 1111 1111 1111');
    await usuario.type(screen.getByLabelText('Nombre en la tarjeta'), 'Camila Rojas');
    await usuario.type(screen.getByLabelText('Vencimiento'), '1229');
    await usuario.type(screen.getByLabelText('Código de seguridad'), '123');
    await usuario.click(screen.getByRole('button', { name: /^Pagar/ }));

    expect(tienda.actualizar).toHaveBeenCalledTimes(1);
    expect(pubPorId(estado, 'P001')?.stock).toBe(1);   // tenía 3 y se compraron 2
    expect(tienda.guardarCarrito).toHaveBeenCalledWith([]);
    expect(screen.getByTestId('url').textContent).toBe('/confirmacion/HM-1023');
  });

  it('si el banco rechaza la tarjeta va a "Pago rechazado" sin cobrar ni vaciar el carrito', async () => {
    const usuario = userEvent.setup();
    const { tienda, estado } = montarCheckout();
    await usuario.type(screen.getByLabelText('Número de tarjeta'), '4000 0000 0000 9995');   // tarjeta de prueba: sin fondos
    await usuario.type(screen.getByLabelText('Nombre en la tarjeta'), 'Camila Rojas');
    await usuario.type(screen.getByLabelText('Vencimiento'), '1229');
    await usuario.type(screen.getByLabelText('Código de seguridad'), '123');
    await usuario.click(screen.getByRole('button', { name: /^Pagar/ }));

    expect(screen.getByTestId('url').textContent).toBe('/pago-rechazado?motivo=fondos');
    expect(pubPorId(estado, 'P001')?.stock).toBe(3);   // el stock no cambia
    expect(estado.pedidos.some((o) => o.id === 'HM-1023')).toBeFalse();
    expect(tienda.guardarCarrito).not.toHaveBeenCalled();
    expect(estado.actividad[estado.actividad.length - 1].accion).toBe('Pago rechazado');
  });
});
