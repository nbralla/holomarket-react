/* Registro: validaciones del formulario (RUT, contraseñas, términos) y creación de la cuenta. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { montar, simularFetch, tiendaFalsa } from '../pruebas/montar';
import type { Usuario } from '../types';
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
    expect(tienda.registrar).not.toHaveBeenCalled();
  });

  it('avisa cuando las contraseñas no coinciden', async () => {
    const usuario = userEvent.setup();
    montar(<Registro />, { ruta: '/registro' });
    await usuario.type(screen.getByLabelText('Contraseña'), 'Clave1234');
    await usuario.type(screen.getByLabelText('Repite la contraseña'), 'Clave9999');
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
  });

  it('con datos válidos pide crear la cuenta al backend y lleva al catálogo', async () => {
    const usuario = userEvent.setup();
    const tienda = tiendaFalsa({
      registrar: jasmine.createSpy('registrar').and.resolveTo({ ok: true, usuario: { nombre: 'Ana Pérez' } as Usuario }),
    });
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

    // La contraseña viaja al backend, que la guarda con BCrypt; el front nunca la almacena.
    expect(tienda.registrar).toHaveBeenCalledOnceWith({
      rut: '21.456.789-K', nombre: 'Ana Pérez', email: 'ana@correo.cl', telefono: '', region: 'Biobío',
      comuna: 'Concepción', clave: 'Clave1234', acepta: true,
    });
    expect(screen.getByTestId('url').textContent).toBe('/catalogo');
  });
});
