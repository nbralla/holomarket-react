/* Campo de formulario: props recibidas y renderizado condicional del error. */
import { render, screen } from '@testing-library/react';
import Campo from './Campo';

describe('Campo', () => {
  it('muestra la etiqueta recibida por props y la asocia al control', () => {
    render(<Campo id="correo" etiqueta="Correo"><input id="correo" /></Campo>);
    // getByLabelText solo encuentra el input si <label htmlFor="correo"> está bien enlazado.
    expect(screen.getByLabelText('Correo')).toBe(document.getElementById('correo') as HTMLElement);
  });

  it('solo muestra el mensaje de error cuando hay un error', () => {
    const { container, rerender } = render(<Campo id="clave" etiqueta="Clave"><input id="clave" /></Campo>);
    const caja = container.querySelector('.campo') as HTMLElement;
    expect(caja.classList).not.toContain('con-error');
    expect(document.getElementById('clave-error')?.textContent).toBe('');

    rerender(<Campo id="clave" etiqueta="Clave" error="Ingresa tu contraseña."><input id="clave" /></Campo>);
    expect(caja.classList).toContain('con-error');
    expect(document.getElementById('clave-error')?.textContent).toBe('Ingresa tu contraseña.');
  });

  it('agrega "(opcional)" y el texto de ayuda solo si se piden', () => {
    const { rerender } = render(<Campo id="tel" etiqueta="Teléfono"><input id="tel" /></Campo>);
    expect(screen.queryByText('(opcional)', { exact: false })).toBeNull();
    expect(document.getElementById('tel-ayuda')).toBeNull();

    rerender(<Campo id="tel" etiqueta="Teléfono" opcional ayuda="Con código de área."><input id="tel" /></Campo>);
    expect(screen.getByText('(opcional)', { exact: false })).toBeTruthy();
    expect(document.getElementById('tel-ayuda')?.textContent).toBe('Con código de área.');
  });
});
