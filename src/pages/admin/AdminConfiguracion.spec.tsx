/* Administración › Configuración: guardar parámetros y restablecer la demo (con confirmación). */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { estadoDemo, montar, simularFetch, tiendaFalsa, usuarioDemo } from '../../pruebas/montar';
import AdminConfiguracion from './AdminConfiguracion';

function montarConfiguracion() {
  const estado = estadoDemo();
  const admin = usuarioDemo(estado, 'U00');
  const tienda = tiendaFalsa({ estado, usuario: admin });
  return { ...montar(<AdminConfiguracion admin={admin} />, { tienda, ruta: '/admin?tab=configuracion' }), estado };
}

describe('Administración › Configuración', () => {
  beforeEach(() => { simularFetch(); });

  it('guarda la comisión y el aviso dice exactamente qué cambió', async () => {
    const usuario = userEvent.setup();
    const { estado } = montarConfiguracion();
    const comision = screen.getByLabelText('Comisión por venta (%)');
    await usuario.clear(comision);
    await usuario.type(comision, '3');
    await usuario.click(screen.getByRole('button', { name: 'Guardar configuración' }));

    expect(estado.config.comision).toBe(3);
    expect(await screen.findByText('Guardaste la configuración (Comisión por venta (%): 8 → 3). Se aplica a las compras nuevas.')).toBeTruthy();
  });

  it('no guarda un valor fuera de rango y lo explica', async () => {
    const usuario = userEvent.setup();
    const { tienda } = montarConfiguracion();
    const comision = screen.getByLabelText('Comisión por venta (%)');
    await usuario.clear(comision);
    await usuario.type(comision, '45');
    await usuario.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(screen.getByText('Ingresa un número entero entre 0 y 30.')).toBeTruthy();
    expect(tienda.actualizar).not.toHaveBeenCalled();
  });

  it('"Restablecer datos" pide confirmación y solo restablece si se confirma', async () => {
    const usuario = userEvent.setup();
    const { tienda } = montarConfiguracion();
    await usuario.click(screen.getByRole('button', { name: 'Restablecer datos de demostración' }));
    let ventana = await screen.findByRole('dialog');
    await usuario.click(within(ventana).getByRole('button', { name: 'Cancelar' }));
    expect(tienda.restablecerDemo).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole('button', { name: 'Restablecer datos de demostración' }));
    ventana = await screen.findByRole('dialog');
    await usuario.click(within(ventana).getByRole('button', { name: 'Restablecer datos' }));
    expect(tienda.restablecerDemo).toHaveBeenCalledTimes(1);
  });
});
