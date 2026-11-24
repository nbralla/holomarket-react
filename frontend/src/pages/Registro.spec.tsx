/* Registro: validaciones del formulario (RUT, contraseñas, términos) y creación de la cuenta. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { estadoDemo, montar, simularFetch, tiendaFalsa } from '../pruebas/montar';
import Registro from './Registro';

describe('Registro', () => {
  beforeEach(() => { simularFetch(); });

  it('con el formulario vacío marca los campos obligatorios y no crea la cuenta', async () => {
    const usuario = userEvent.setup();
    const { tienda } = montar(<Registro />, { ruta: '/registro' });
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Elige tu región.')).toBeTruthy();
    expect(screen.getByText('Repite tu contraseña.')).toBeTruthy();
    expect(screen.getByText('Para crear tu cuenta debes aceptar los términos y la política de privacidad.')).toBeTruthy();
    expect(tienda.actualizar).not.toHaveBeenCalled();
  });

  it('avisa cuando las contraseñas no coinciden', async () => {
    const usuario = userEvent.setup();
    montar(<Registro />, { ruta: '/registro' });
    await usuario.type(screen.getByLabelText('Contraseña'), 'Clave1234');
    await usuario.type(screen.getByLabelText('Repite la contraseña'), 'Clave9999');
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
  });

  it('con datos válidos crea la cuenta, inicia la sesión y lleva al catálogo', async () => {
    const usuario = userEvent.setup();
    const estado = estadoDemo();
    const tienda = tiendaFalsa({ estado });
    montar(<Registro />, { tienda, ruta: '/registro' });

    await usuario.type(screen.getByLabelText('RUT'), '21.456.789-K');
    await usuario.type(screen.getByLabelText('Nombre y apellido'), 'Ana Pérez');
    await usuario.type(screen.getByLabelText('Correo'), 'ana@correo.cl');
    await usuario.selectOptions(screen.getByLabelText('Región'), 'Biobío');
    await usuario.selectOptions(screen.getByLabelText('Comuna'), 'Concepción');
    await usuario.type(screen.getByLabelText('Contraseña'), 'Clave1234');
    await usuario.type(screen.getByLabelText('Repite la contraseña'), 'Clave1234');
    await usuario.click(screen.getByRole('checkbox'));
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(tienda.actualizar).toHaveBeenCalledTimes(1);
    const nueva = estado.usuarios.find((u) => u.email === 'ana@correo.cl');
    expect(nueva?.nombre).toBe('Ana Pérez');
    expect(nueva?.clave).not.toBe('Clave1234');   // se guarda el hash, nunca la contraseña
    expect(tienda.iniciarSesion).toHaveBeenCalledOnceWith(nueva as never);
    expect(screen.getByTestId('url').textContent).toBe('/catalogo');
  });
});
