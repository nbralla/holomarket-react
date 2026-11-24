/* Pie de página: los enlaces legales abren la ventana modal con el texto correspondiente. */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { montar } from '../pruebas/montar';
import Pie from './Pie';

describe('Pie', () => {
  it('"Guía de condiciones" abre una ventana con las 7 condiciones y "Entendido" la cierra', async () => {
    const usuario = userEvent.setup();
    montar(<Pie />);
    expect(screen.queryByRole('dialog')).toBeNull();

    await usuario.click(screen.getByRole('link', { name: 'Guía de condiciones' }));
    const ventana = await screen.findByRole('dialog');
    expect(within(ventana).getByRole('heading', { name: 'Guía de condiciones' })).toBeTruthy();
    expect(within(ventana).getAllByRole('row').length).toBe(1 + 7);   // encabezado + MT, NM, EX, GD, LP, PL, PO

    await usuario.click(within(ventana).getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('el enlace no cambia la página (solo abre la ventana)', async () => {
    const usuario = userEvent.setup();
    montar(<Pie />, { ruta: '/catalogo' });
    await usuario.click(screen.getByRole('link', { name: 'Términos y condiciones' }));
    expect(screen.getByTestId('url').textContent).toBe('/catalogo');
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});
