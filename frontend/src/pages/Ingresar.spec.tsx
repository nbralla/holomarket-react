/* Página Ingresar: estado del formulario, validaciones, eventos y la función "ingresar" simulada. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { estadoDemo, montar, tiendaFalsa, usuarioDemo } from '../pruebas/montar';
import Ingresar from './Ingresar';

describe('Ingresar', () => {
  it('el estado del formulario cambia a medida que se escribe', async () => {
    const usuario = userEvent.setup();
    montar(<Ingresar />, { ruta: '/ingresar' });
    const correo = screen.getByLabelText('Correo') as HTMLInputElement;
    const clave = screen.getByLabelText('Contraseña') as HTMLInputElement;

    await usuario.type(correo, 'camila@demo.cl');
    await usuario.type(clave, 'Demo1234');
    expect(correo.value).toBe('camila@demo.cl');
    expect(clave.value).toBe('Demo1234');
  });

  it('"Mostrar" alterna la contraseña entre oculta y visible', async () => {
    const usuario = userEvent.setup();
    montar(<Ingresar />, { ruta: '/ingresar' });
    const clave = screen.getByLabelText('Contraseña') as HTMLInputElement;
    expect(clave.type).toBe('password');
    await usuario.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(clave.type).toBe('text');
    await usuario.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(clave.type).toBe('password');
  });

  it('con los campos vacíos muestra los errores y no intenta ingresar', async () => {
    const usuario = userEvent.setup();
    const { tienda } = montar(<Ingresar />, { ruta: '/ingresar' });
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getByText('Ingresa tu correo.')).toBeTruthy();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeTruthy();
    expect(tienda.ingresar).not.toHaveBeenCalled();
  });

  it('con datos correctos llama a ingresar(correo, clave) y lleva al catálogo', async () => {
    const usuario = userEvent.setup();
    const estado = estadoDemo();
    const tienda = tiendaFalsa({ estado });
    // Mock: la tienda responde que el ingreso fue exitoso, sin revisar contraseñas de verdad.
    (tienda.ingresar as jasmine.Spy).and.returnValue({ ok: true, usuario: usuarioDemo(estado, 'U01') });
    montar(<Ingresar />, { tienda, ruta: '/ingresar' });

    await usuario.type(screen.getByLabelText('Correo'), 'camila@demo.cl');
    await usuario.type(screen.getByLabelText('Contraseña'), 'Demo1234');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(tienda.ingresar).toHaveBeenCalledOnceWith('camila@demo.cl', 'Demo1234');
    expect(screen.getByTestId('url').textContent).toBe('/catalogo');
  });

  it('si la contraseña es incorrecta muestra el error y limpia la contraseña', async () => {
    const usuario = userEvent.setup();
    const tienda = tiendaFalsa();
    (tienda.ingresar as jasmine.Spy).and.returnValue({ ok: false, error: 'Correo o contraseña incorrectos.' });
    montar(<Ingresar />, { tienda, ruta: '/ingresar' });

    await usuario.type(screen.getByLabelText('Correo'), 'camila@demo.cl');
    await usuario.type(screen.getByLabelText('Contraseña'), 'otra-clave');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(screen.getByRole('alert').textContent).toBe('Correo o contraseña incorrectos.');
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('url').textContent).toBe('/ingresar');
  });
});
