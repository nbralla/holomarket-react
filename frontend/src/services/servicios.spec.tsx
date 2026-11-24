/* Servicios que usan la red, probados con un mock de fetch (sin internet ni APIs reales):
   el dólar en vivo, el historial de precios y las sugerencias de API TCG. */
import { simularFetch } from '../pruebas/montar';
import { buscarHistorial, buscarSugerencias, reiniciarImagenes } from './apiTcg';
import { dolarActual, pedirDolar, reiniciarDolar, suscribirDolar } from './dolar';

const URL_MERCADO = 'https://open.er-api.com/v6/latest/USD';
const URL_BCCH = 'https://mindicador.cl/api/dolar';

/* Espera a que se resuelvan las promesas pendientes (las respuestas simuladas llegan "al tiro"). */
const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('Dólar en vivo (services/dolar.ts)', () => {
  beforeEach(() => reiniciarDolar());

  it('usa el dólar observado del Banco Central cuando las dos APIs responden', async () => {
    simularFetch({
      [URL_MERCADO]: { result: 'success', rates: { CLP: 981.06 }, time_last_update_unix: 1792800000 },
      [URL_BCCH]: { serie: [{ fecha: '2026-10-23T03:00:00.000Z', valor: 986.58 }] },
    });
    const avisado = jasmine.createSpy('oyente');
    const dejar = suscribirDolar(avisado);
    pedirDolar();
    await esperar();
    await esperar();
    expect(dolarActual()).toEqual(jasmine.objectContaining({ valor: 986.58, fuente: 'bcch' }));
    expect(avisado).toHaveBeenCalled();
    dejar();
  });

  it('si el Banco Central no responde, queda el tipo de cambio de mercado', async () => {
    simularFetch({ [URL_MERCADO]: { result: 'success', rates: { CLP: 981.06 }, time_last_update_unix: 1792800000 } });
    pedirDolar();
    await esperar();
    await esperar();
    expect(dolarActual()).toEqual(jasmine.objectContaining({ valor: 981.06, fuente: 'mercado' }));
  });

  it('si ninguna API responde no inventa un valor (la página usa el de respaldo)', async () => {
    const fetchFalso = simularFetch({});
    pedirDolar();
    pedirDolar();   // pedirlo dos veces no repite las consultas
    await esperar();
    expect(dolarActual()).toBeNull();
    expect(fetchFalso).toHaveBeenCalledTimes(2);   // una a cada API
  });
});

describe('API TCG (services/apiTcg.ts)', () => {
  beforeEach(() => reiniciarImagenes());

  it('arma el historial de precios ordenado por fecha y lo guarda para no volver a pedirlo', async () => {
    const fetchFalso = simularFetch({
      '/apitcg/api/history-prices/41719?limit=400': [
        { date: '2026-10-23T00:00:00.000Z', markets: { tcgplayer: { prices: { market: 305.08 } } } },
        { date: '2026-10-21T00:00:00.000Z', markets: { tcgplayer: { prices: { market: 309.65 } } } },
        { date: 'fecha-mala', markets: { tcgplayer: { prices: { market: 1 } } } },
      ],
    });
    const puntos = await buscarHistorial(41719);
    expect(puntos.map((p) => p.usd)).toEqual([309.65, 305.08]);   // del más antiguo al más nuevo, sin el registro malo
    await buscarHistorial(41719);
    expect(fetchFalso).toHaveBeenCalledTimes(1);   // la segunda vez viene de la caché
  });

  it('las sugerencias leen el número y la rareza con las claves que usa la API (Number, Rarity)', async () => {
    simularFetch({
      '/apitcg/api/products?tcg=pokemon&type=card&name=Mewtwo&limit=12': {
        data: [{
          name: 'M Mewtwo EX (159 Full Art)', set: { name: 'XY - BREAKthrough' },
          attributes: { Number: '159/162', Rarity: 'Ultra Rare' },
          images: [{ small: 'https://img.test/a_200w.jpg', medium: 'https://img.test/a_400w.jpg' }],
        }],
      },
    });
    const [s] = await buscarSugerencias('pokemon', 'Mewtwo');
    expect(s).toEqual({
      nombre: 'M Mewtwo EX (159 Full Art)', edicion: 'XY - BREAKthrough', numero: '159/162', rareza: 'Ultra Rare',
      miniatura: 'https://img.test/a_200w.jpg', imagen: 'https://img.test/a_400w.jpg',
    });
  });
});
