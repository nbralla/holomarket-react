/* Arranque: carga los datos de json-server. Se simula la red con un mock de fetch. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AvisosProvider } from '../context/AvisosProvider';
import { estadoDemo, simularFetch } from '../pruebas/montar';
import { COLECCIONES } from '../services/datos';
import Arranque from './Arranque';

/* Respuestas de una API que funciona: cada colección de la demo en su URL. */
function apiConDatos(): Record<string, unknown> {
  const e = estadoDemo();
  const respuestas: Record<string, unknown> = { '/api/config': e.config };
  COLECCIONES.forEach((c) => { respuestas[`/api/${c}`] = e[c]; });
  return respuestas;
}

const montarArranque = () => render(<MemoryRouter><AvisosProvider><Arranque /></AvisosProvider></MemoryRouter>);

describe('Arranque', () => {
  it('mientras espera a la API muestra "Cargando..."', () => {
    spyOn(window, 'fetch').and.returnValue(new Promise<Response>(() => undefined));   // nunca responde
    montarArranque();
    expect(screen.getByText('Cargando HoloMarket...')).toBeTruthy();
  });

  it('si json-server no responde, explica qué hacer (y solo entonces muestra el error)', async () => {
    const fetchFalso = simularFetch({});   // sin respuestas: toda llamada falla
    montarArranque();
    expect(await screen.findByRole('heading', { name: 'Sin conexión con la API' })).toBeTruthy();
    expect(screen.getByText('npm run api')).toBeTruthy();
    expect(fetchFalso).toHaveBeenCalledWith('/api/config', jasmine.anything());
  });

  it('"Reintentar" vuelve a pedir los datos y, si llegan, muestra la tienda', async () => {
    const usuario = userEvent.setup();
    const fetchFalso = simularFetch({});
    montarArranque();
    await screen.findByRole('heading', { name: 'Sin conexión con la API' });
    const llamadas = fetchFalso.calls.count();

    // La API "vuelve": desde ahora el mock responde con los datos de demostración.
    fetchFalso.and.callFake((url: RequestInfo | URL) => {
      const datos = apiConDatos()[String(url)];
      return datos === undefined
        ? Promise.reject(new TypeError('Sin red'))
        : Promise.resolve(new Response(JSON.stringify(datos), { status: 200 }));
    });
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: 'La carta que te falta la tiene alguien en Chile.' })).toBeTruthy();
    expect(fetchFalso.calls.count()).toBeGreaterThan(llamadas);
    expect(screen.queryByText('Sin conexión con la API')).toBeNull();
  });
});
