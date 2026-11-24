/* Ofertas: solo cartas con descuento, filtro por juego (estado) y orden. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { descuento, publicacionesEnOferta } from '../logica/ofertas';
import { estadoDemo, montar, simularFetch, tiendaFalsa } from '../pruebas/montar';
import { clp } from '../utils/formato';
import Ofertas from './Ofertas';

const preciosActuales = () => Array.from(document.querySelectorAll('#ofertas-resultados .precio__actual')).map((p) => p.textContent);

describe('Ofertas', () => {
  beforeEach(() => { simularFetch(); });

  it('muestra solo cartas con descuento, con el precio anterior tachado y el porcentaje', () => {
    const estado = estadoDemo();
    const ofertas = publicacionesEnOferta(estado);
    montar(<Ofertas />, { tienda: tiendaFalsa({ estado }), ruta: '/ofertas' });
    expect(document.querySelectorAll('#ofertas-resultados .producto-ficha').length).toBe(ofertas.length);
    expect(document.querySelectorAll('#ofertas-resultados .precio__anterior').length).toBe(ofertas.length);
    // La primera es la de mayor descuento
    const mayor = ofertas[0];
    expect(document.querySelector('#ofertas-resultados .precio__descuento')?.textContent).toBe(`-${descuento(mayor)}%`);
  });

  it('al elegir un juego se filtran las ofertas y el botón queda marcado', async () => {
    const usuario = userEvent.setup();
    montar(<Ofertas />, { ruta: '/ofertas' });
    const magic = screen.getByRole('button', { name: /Magic: The Gathering/ });
    await usuario.click(magic);
    expect(magic.getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('ofertas-resumen')?.textContent).toContain('de Magic: The Gathering');
    expect(preciosActuales()).toEqual([clp(49990)]);   // Sheoldred, la única oferta de Magic
  });

  it('ordenar por "Menor precio" pone primero la oferta más barata', async () => {
    const usuario = userEvent.setup();
    montar(<Ofertas />, { ruta: '/ofertas' });
    await usuario.selectOptions(screen.getByLabelText('Ordenar por'), 'precio');
    const precios = preciosActuales().map((t) => Number(String(t).replace(/\D/g, '')));
    expect(precios).toEqual([...precios].sort((a, b) => a - b));
  });
});
