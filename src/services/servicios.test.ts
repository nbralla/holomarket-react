/* Pruebas de los servicios: elección de la imagen de API TCG y cambios que se envían a json-server. */
import { describe, expect, it } from 'vitest';
import { crearEstadoInicial, reconciliarSecuencias } from '../logica/estado';
import { consultaDe, elegirImagen, idSetPorNombre, rarezaDesde } from './apiTcg';
import { cambiosEntre } from './datos';
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

describe('Cambios enviados a json-server', () => {
  it('no envía nada si no cambió nada', () => {
    const e = crearEstadoInicial(0);
    expect(cambiosEntre(e, structuredClone(e))).toEqual([]);
  });

  it('usa POST para lo nuevo, PUT para lo modificado y DELETE para lo eliminado', () => {
    const antes = crearEstadoInicial(0);
    const despues = structuredClone(antes);
    despues.publicaciones[0].stock = 99;
    despues.retiros.pop();
    despues.actividad.push({ id: 'A9999', fecha: 1, uid: null, accion: 'Prueba', detalle: '' });
    despues.config.comision = 9;

    const ops = cambiosEntre(antes, despues);
    expect(ops).toContainEqual({ metodo: 'PUT', ruta: `publicaciones/${antes.publicaciones[0].id}`, cuerpo: despues.publicaciones[0] });
    expect(ops).toContainEqual({ metodo: 'DELETE', ruta: `retiros/${antes.retiros[antes.retiros.length - 1].id}` });
    expect(ops).toContainEqual({ metodo: 'POST', ruta: 'actividad', cuerpo: despues.actividad[despues.actividad.length - 1] });
    expect(ops).toContainEqual({ metodo: 'PUT', ruta: 'config', cuerpo: despues.config });
    expect(ops).toHaveLength(4);
    expect(ops[0]).toMatchObject({ metodo: 'PUT', ruta: 'config' });   // la secuencia se guarda antes que los registros
  });

  it('corrige una secuencia atrasada para no repetir ids', () => {
    const e = crearEstadoInicial(0);
    e.config.secuencias.actividad = 1;
    e.config.secuencias.pedido = 1000;
    expect(reconciliarSecuencias(e)).toBe(true);
    expect(e.config.secuencias.actividad).toBe(e.actividad.length);
    expect(e.config.secuencias.pedido).toBe(1000 + e.pedidos.length);
    expect(reconciliarSecuencias(e)).toBe(false);
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
