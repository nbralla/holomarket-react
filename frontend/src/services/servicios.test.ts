/* Pruebas de los servicios: elección de la imagen de API TCG, cliente de la API REST (fetch simulado) y dólar. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearEstadoInicial } from '../logica/estado';
import { consultaDe, elegirImagen, idSetPorNombre, rarezaDesde } from './apiTcg';
import { api, cargarEstado, ErrorApi, SIN_CONEXION } from './datos';
import { leerBcch, leerMercado } from './dolar';

const carta = (code: string, name: string, numero: string, set = 'SV: Scarlet & Violet 151') => ({
  name, code, set: { name: set }, attributes: { Number: numero, Rarity: 'Special Illustration Rare' },
  images: [{ small: `https://img.test/${code}_200w.jpg`, medium: `https://img.test/${code}_400w.jpg` }],
});

describe('Imágenes de API TCG', () => {
  const respuesta = {
    data: [
      carta('a', 'Charizard ex', '006/165'),
      carta('b', 'Charizard ex', '183/165'),
      carta('c', 'Charizard ex', '199/165'),
      carta('d', 'Charmander', '004/165'),
    ],
  };

  it('elige la versión con el mismo número aunque haya varias con el mismo nombre', () => {
    const c = consultaDe({ juego: 'pokemon', nombre: 'Charizard ex (ilustración especial)', edicion: 'Scarlet & Violet 151', numero: '199/165' });
    expect(elegirImagen(respuesta, c)?.url).toBe('https://img.test/c_400w.jpg');
  });

  it('entiende números con o sin ceros a la izquierda', () => {
    const c = consultaDe({ juego: 'pokemon', nombre: 'Charizard ex', numero: '6/165' });
    expect(elegirImagen(respuesta, c)?.url).toBe('https://img.test/a_400w.jpg');
  });

  it('no usa la imagen de otra carta cuando la API devuelve resultados parecidos', () => {
    const c = consultaDe({ juego: 'pokemon', nombre: 'Mewtwo', numero: '150/165' });
    expect(elegirImagen({ data: respuesta.data, fallback: true }, c)).toBeNull();
  });

  it('reconoce la edición aunque TCGplayer le anteponga el código', () => {
    const sets = [
      { id: 'pokemon-sv-scarlet-and-violet-151', nombre: 'SV: Scarlet & Violet 151' },
      { id: 'pokemon-sv03-obsidian-flames', nombre: 'SV03: Obsidian Flames' },
      { id: 'pokemon-sv01-scarlet-and-violet-base-set', nombre: 'SV01: Scarlet & Violet Base Set' },
    ];
    expect(idSetPorNombre(sets, 'Obsidian Flames')).toBe('pokemon-sv03-obsidian-flames');
    expect(idSetPorNombre(sets, 'Scarlet & Violet 151')).toBe('pokemon-sv-scarlet-and-violet-151');
    expect(idSetPorNombre(sets, 'Edición inexistente')).toBe('');
  });

  it('traduce la rareza de la API a la lista oficial de cada juego', () => {
    expect(rarezaDesde('pokemon', 'Special Illustration Rare')).toBe('Special Illustration Rare');
    expect(rarezaDesde('yugioh', 'quarter century secret rare')).toBe('Quarter Century Secret Rare');
    expect(rarezaDesde('magic', 'M')).toBe('Mythic Rare');
    expect(rarezaDesde('onepiece', 'SEC')).toBe('Secret Rare');
    expect(rarezaDesde('onepiece', 'L')).toBe('Leader');
    expect(rarezaDesde('pokemon', 'Rareza inventada')).toBe('');
  });
});

describe('Cliente de la API', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  const responder = (status: number, cuerpo: unknown) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status })));

  it('cargarEstado pide GET /api/estado y completa la configuración', async () => {
    const e = crearEstadoInicial(0);
    const config: Partial<typeof e.config> = { ...e.config };
    delete config.dolar;
    responder(200, { ...e, config });
    const estado = await cargarEstado();
    expect(fetch).toHaveBeenCalledWith('/api/estado', expect.objectContaining({ method: 'GET' }));
    expect(estado.publicaciones).toHaveLength(e.publicaciones.length);
    expect(estado.config.dolar).toBe(950);   // valor inicial si la API no lo trae
  });

  it('convierte el error del backend en un ErrorApi con su mensaje y sus datos', async () => {
    responder(402, { status: 402, message: 'Sin fondos', errors: { motivo: 'fondos' } });
    const error = await api.comprar([{ pubId: 'P001', cantidad: 1 }], {
      entrega: 'retiro', pago: 'tarjeta', receptor: 'Ana', telefono: '+56911111111', region: '', comuna: '', direccion: '',
      numeroTarjeta: '4000 0000 0000 9995',
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).status).toBe(402);
    expect((error as ErrorApi).errores.motivo).toBe('fondos');
  });

  it('en un error de validación muestra el mensaje del primer campo', async () => {
    responder(400, { status: 400, message: 'Datos inválidos', errors: { precio: 'El precio mínimo es $100.' } });
    await expect(api.cambiarPrecio('P001', 50)).rejects.toThrow('El precio mínimo es $100.');
  });

  it('si no hay red avisa que el servidor no responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(cargarEstado()).rejects.toThrow(SIN_CONEXION);
  });
});

describe('Dólar en vivo', () => {
  it('lee el dólar observado de mindicador.cl (el más reciente va primero)', () => {
    const d = leerBcch({ serie: [{ fecha: '2026-10-23T03:00:00.000Z', valor: 986.58 }, { fecha: '2026-10-22T03:00:00.000Z', valor: 976.82 }] });
    expect(d).toEqual({ valor: 986.58, fecha: Date.parse('2026-10-23T03:00:00.000Z'), fuente: 'bcch' });
  });

  it('lee el tipo de cambio de open.er-api.com', () => {
    expect(leerMercado({ result: 'success', rates: { CLP: 981.06 }, time_last_update_unix: 1792800000 }))
      .toEqual({ valor: 981.06, fecha: 1792800000000, fuente: 'mercado' });
  });

  it('descarta respuestas con error o valores imposibles', () => {
    expect(leerMercado({ result: 'error' })).toBeNull();
    expect(leerMercado({ result: 'success', rates: { CLP: 0.9 } })).toBeNull();
    expect(leerBcch({ serie: [] })).toBeNull();
    expect(leerBcch(null)).toBeNull();
  });
});
