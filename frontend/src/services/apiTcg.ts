/* =========================================================================
   Imágenes de cartas desde API TCG (https://docs.apitcg.com)
   -------------------------------------------------------------------------
   El navegador consulta /apitcg/api/... y el servidor de desarrollo de Vite
   reenvía la consulta a api.apitcg.com agregando la clave (ver
   vite.config.ts). Así la clave nunca llega al navegador y no hay bloqueo
   de CORS.

   Solo está activo con "npm run dev" y APITCG_KEY en .env.local. Si no, las
   cartas se dibujan con CSS como siempre.

   Para encontrar la imagen CORRECTA (Charizard ex tiene decenas de versiones)
   se busca en este orden y se elige la carta cuyo número coincide:
     1. Por código exacto, en los juegos que lo usan (OP01-120, LOB-EN001).
     2. Por nombre dentro de la edición (set) de la publicación.
     3. Solo por nombre, hasta 100 resultados.

   Cada imagen encontrada se guarda 30 días en el navegador para no gastar
   el límite mensual de consultas del plan (1.000 en el plan gratis).
   ========================================================================= */
import { RAREZAS } from '../data/catalogo';
import type { DatosCarta, JuegoId } from '../types';
import { sinParentesis } from '../utils/formato';
import { normalizar } from '../utils/validaciones';
import { borrar, CLAVES, guardar, leer } from './almacen';

export const IMAGENES_ACTIVAS: boolean = typeof __IMAGENES_API__ === 'boolean' ? __IMAGENES_API__ : false;

const BASE = '/apitcg/api';
const TIEMPO_MAXIMO = 15000;
export const DIAS_CACHE = 30;
const SIMULTANEAS = 3;
const DIA_MS = 86400000;

/* Nombre (slug) que usa API TCG para cada juego de HoloMarket. */
const TCG: Record<JuegoId, string> = { pokemon: 'pokemon', magic: 'magic', yugioh: 'yugioh', onepiece: 'one-piece', myl: 'mitos-y-leyendas' };

/* ---------- Forma de la respuesta de API TCG ---------- */
interface ImagenApi {
  small?: string;
  medium?: string;
  large?: string;
}

interface ProductoApi {
  _id?: number;
  name?: string;
  code?: string;
  set?: { _id?: string; name?: string; code?: string } | string | null;
  /* Las claves dependen del juego y van con mayúscula: Rarity, Number, Artist... */
  attributes?: Record<string, unknown>;
  images?: ImagenApi[] | ImagenApi;
  markets?: { tcgplayer?: { prices?: { market?: number | null }; printing?: string } };
}

interface RespuestaApi {
  data?: ProductoApi[];
  fallback?: boolean;   // true = no hubo coincidencias y la API devolvió resultados "parecidos"
}

interface SetApi {
  _id?: string;
  name?: string;
}

export interface Sugerencia {
  nombre: string;
  edicion: string;
  numero: string;
  rareza: string;
  miniatura: string;
  imagen: string;
}

class ErrorApi extends Error {
  status: number;
  detalle: string;
  constructor(status: number, detalle: string) {
    super(`La API respondió ${status}`);
    this.status = status;
    this.detalle = detalle;
  }
}

/* Solo se aceptan direcciones http(s): nunca javascript:, data: u otras. */
export function urlSegura(valor: unknown): string | null {
  if (!valor) return null;
  try {
    const u = new URL(String(valor));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

/* Mensaje en español según el tipo de falla. */
export function explicarFalla(e: unknown): string {
  if (e instanceof DOMException && e.name === 'AbortError') return `la API tardó más de ${TIEMPO_MAXIMO / 1000} segundos en responder.`;
  if (e instanceof ErrorApi) {
    if (e.status === 401 || e.status === 403) return `la API rechazó la clave (error ${e.status}). Revisa APITCG_KEY en .env.local y vuelve a ejecutar "npm run dev".`;
    if (e.status === 429) return 'se acabó el límite de consultas de tu plan de API TCG (error 429).';
    return `la API respondió con error ${e.status}${e.detalle ? `: ${e.detalle}` : ''}.`;
  }
  return 'no hubo respuesta del servidor. Revisa tu conexión a Internet y que "npm run dev" siga abierto.';
}

/* ---------- Lectura de un producto ---------- */
const limpio = (t: unknown): string => normalizar(t).replace(/[^a-z0-9]/g, '');
const imagenDe = (p: ProductoApi): ImagenApi => (Array.isArray(p.images) ? p.images[0] : p.images) ?? {};
const nombreSet = (p: ProductoApi): string => (p.set && typeof p.set === 'object' ? p.set.name ?? '' : '');

function atributo(p: ProductoApi, clave: string): string {
  const a = p.attributes ?? {};
  const v = a[clave] ?? a[clave.toLowerCase()];
  return typeof v === 'string' ? v : '';
}

/* Número impreso en la carta: "125/197" (Pokémon) o el código "OP01-120" / "LOB-EN001". */
const numeroDe = (p: ProductoApi): string => String(atributo(p, 'Number') || p.code || '').trim();
const numerosDe = (p: ProductoApi): string[] => [atributo(p, 'Number'), String(p.code ?? '')].map((t) => t.trim()).filter(Boolean);

/* "SV03: Obsidian Flames" -> "Obsidian Flames" (TCGplayer antepone el código a algunas ediciones). */
const sinCodigoSet = (nombre: string): string => nombre.replace(/^[A-Z0-9]{2,6}:\s*/, '');

async function consultar<T>(ruta: string, params: Record<string, string>, signal: AbortSignal): Promise<T | null> {
  const consulta = Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
  const resp = await fetch(`${BASE}/${ruta}${consulta}`, { headers: { Accept: 'application/json' }, signal });
  if (resp.status === 404) return null;
  if (!resp.ok) {
    let detalle = '';
    try {
      const j = (await resp.json()) as { error?: string; message?: string };
      detalle = String(j.error ?? j.message ?? '').slice(0, 120);
    } catch {
      detalle = '';
    }
    throw new ErrorApi(resp.status, detalle);
  }
  return (await resp.json()) as T;
}

async function conTiempo<T>(tarea: (signal: AbortSignal) => Promise<T>, externo?: AbortSignal): Promise<T> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_MAXIMO);
  const alAbortar = () => control.abort();
  externo?.addEventListener('abort', alAbortar);
  try {
    return await tarea(control.signal);
  } finally {
    clearTimeout(reloj);
    externo?.removeEventListener('abort', alAbortar);
  }
}

/* ---------- Imagen de una carta ya publicada ---------- */
export interface ConsultaImagen {
  juego: JuegoId;
  nombreBase: string;
  edicion: string;
  numero: string;
  numeroCorto: string;
}

export const consultaDe = (c: DatosCarta): ConsultaImagen => ({
  juego: c.juego,
  nombreBase: sinParentesis(c.nombre),
  edicion: sinParentesis(String(c.edicion ?? '')),
  numero: String(c.numero ?? '').trim().toUpperCase(),
  numeroCorto: String(c.numero ?? '').split('/')[0].trim(),
});

const claveDe = (c: ConsultaImagen) => [c.juego, normalizar(c.nombreBase), normalizar(c.edicion), normalizar(c.numero)].join('|');

/* Número de la publicación vs. número de la carta en la API: "025/165" = "25/165" = "025". */
function mismoNumero(c: ConsultaImagen, p: ProductoApi): boolean {
  if (!c.numero) return false;
  const corto = (t: string) => t.split('/')[0].trim().replace(/^0+(?=\d)/, '').toLowerCase();
  return numerosDe(p).some((api) => limpio(api) === limpio(c.numero) ||
    (/\d/.test(c.numeroCorto) && corto(api) === corto(c.numeroCorto) && c.numero.includes('/') === api.includes('/')));
}

interface Eleccion {
  url: string;
  puntaje: number;
  numero: boolean;   // true = coincide el número impreso
  id: number | null;           // _id del producto en API TCG (para pedir su historial de precios)
  mercado: number | null;      // precio de mercado en TCGplayer (USD)
  impresion: string;           // impresión a la que corresponde ese precio (Normal, Holofoil...)
  atributos: [string, string][];   // datos de la carta: tipo, HP, ataques, artista...
}

/* Atributos que ya se muestran aparte o que son textos largos de reglas. */
const ATRIBUTOS_OCULTOS = new Set(['number', 'rarity', 'description', 'cardtext', 'flavortext', 'oracletext']);

/* Pasa los atributos de la API a texto plano (vienen con algo de HTML: <br>, <em>...). */
function atributosDe(p: ProductoApi): [string, string][] {
  return Object.entries(p.attributes ?? {})
    .filter(([k, v]) => typeof v === 'string' && v.trim() && !ATRIBUTOS_OCULTOS.has(k.toLowerCase().replace(/\s+/g, '')))
    .map(([k, v]): [string, string] => [
      k.replace(/([a-z])([A-Z])/g, '$1 $2').slice(0, 40),
      String(v).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280),
    ])
    .slice(0, 14);
}

/* Elige entre los resultados la carta más parecida a la publicación (nombre, número y edición).
   Si el nombre no coincide, no se usa: es mejor la carta dibujada que la imagen de otra carta. */
export function elegirImagen(respuesta: RespuestaApi | null, c: ConsultaImagen): Eleccion | null {
  const buscado = limpio(c.nombreBase);
  let mejor: Eleccion | null = null;
  (respuesta?.data ?? []).forEach((p) => {
    const img = imagenDe(p);
    const url = urlSegura(img.medium ?? img.large ?? img.small);
    if (!url) return;
    const nombre = limpio(p.name);
    let puntaje = 0;
    if (nombre === buscado) puntaje += 4;
    else if (nombre.startsWith(buscado)) puntaje += 3;          // "Charizard ex - 125/197"
    else if (buscado && nombre.includes(buscado)) puntaje += 1;
    else return;
    const numero = mismoNumero(c, p);
    if (numero) puntaje += 6;
    const set = limpio(sinCodigoSet(nombreSet(p)));
    if (c.edicion && set && (set.includes(limpio(c.edicion)) || limpio(c.edicion).includes(set))) puntaje += 2;
    if (!mejor || puntaje > mejor.puntaje) {
      const tcgplayer = p.markets?.tcgplayer;
      const mercado = tcgplayer?.prices?.market;
      mejor = {
        url, puntaje, numero,
        id: typeof p._id === 'number' ? p._id : null,
        mercado: typeof mercado === 'number' && mercado > 0 ? mercado : null,
        impresion: String(tcgplayer?.printing ?? ''),
        atributos: atributosDe(p),
      };
    }
  });
  return mejor;
}

export const mejorImagen = (respuesta: RespuestaApi | null, c: ConsultaImagen): string | null => elegirImagen(respuesta, c)?.url ?? null;

/* ---------- Ediciones (sets) de cada juego, para filtrar la búsqueda ---------- */
interface CacheSets {
  vence: number;
  lista: { id: string; nombre: string }[];
}

const setsEnCurso = new Map<JuegoId, Promise<CacheSets['lista']>>();

function setsDe(juego: JuegoId, signal: AbortSignal): Promise<CacheSets['lista']> {
  const guardados = leer<Record<string, CacheSets>>(CLAVES.sets, {}) ?? {};
  const actual = guardados[juego];
  if (actual && Date.now() < actual.vence) return Promise.resolve(actual.lista);
  const existente = setsEnCurso.get(juego);
  if (existente) return existente;
  const promesa = consultar<{ data?: SetApi[] }>(`${TCG[juego]}/sets`, {}, signal).then((r) => {
    const lista = (r?.data ?? [])
      .filter((s) => s._id && s.name)
      .map((s) => ({ id: String(s._id), nombre: String(s.name) }));
    const todos = leer<Record<string, CacheSets>>(CLAVES.sets, {}) ?? {};
    todos[juego] = { vence: Date.now() + DIAS_CACHE * DIA_MS, lista };
    guardar(CLAVES.sets, todos);
    return lista;
  }).finally(() => setsEnCurso.delete(juego));
  setsEnCurso.set(juego, promesa);
  return promesa;
}

/* "Obsidian Flames" -> "pokemon-obsidian-flames" (el _id del set "SV03: Obsidian Flames"). */
export function idSetPorNombre(lista: CacheSets['lista'], edicion: string): string {
  const buscado = limpio(edicion);
  if (!buscado) return '';
  const nivel = (nombre: string) => {
    const n = limpio(sinCodigoSet(nombre));
    if (n === buscado) return 3;
    if (n.endsWith(buscado) || limpio(nombre).endsWith(buscado)) return 2;
    if (n.includes(buscado)) return 1;
    return 0;
  };
  const candidatos = lista
    .map((s) => ({ ...s, nivel: nivel(s.nombre) }))
    .filter((s) => s.nivel > 0)
    .sort((a, b) => b.nivel - a.nivel || a.nombre.length - b.nombre.length);
  return candidatos[0]?.id ?? '';
}

/* ---------- Búsqueda en la API (hasta 3 consultas, se detiene al encontrar el número) ---------- */
const CODIGO = /^[A-Z0-9]{2,6}-[A-Z0-9]{2,8}$/;   // OP01-120, LOB-EN001

async function buscarEnApi(c: ConsultaImagen, signal: AbortSignal): Promise<Eleccion | null> {
  const base = { tcg: TCG[c.juego], type: 'card', limit: '100' };
  let respaldo: Eleccion | null = null;
  const anotar = (e: Eleccion | null) => {
    if (e && (!respaldo || e.puntaje > respaldo.puntaje)) respaldo = e;
    return Boolean(e && (e.numero || !c.numero));
  };

  // 1. Código exacto (la API distingue mayúsculas: los números se guardan en mayúscula).
  if (CODIGO.test(c.numero)) {
    const e = elegirImagen(await consultar<RespuestaApi>('products', { ...base, code: c.numero }, signal), c);
    if (anotar(e) && e) return e;
  }

  // 2. Por nombre dentro de la edición. Si no se reconoce la edición, se salta este paso.
  let set = '';
  try {
    set = c.edicion ? idSetPorNombre(await setsDe(c.juego, signal), c.edicion) : '';
  } catch (e) {
    if (e instanceof ErrorApi && [401, 403, 429].includes(e.status)) throw e;
    set = '';
  }
  if (set) {
    const e = elegirImagen(await consultar<RespuestaApi>('products', { ...base, name: c.nombreBase, set }, signal), c);
    if (anotar(e) && e) return e;
  }

  // 3. Solo por nombre.
  const e = elegirImagen(await consultar<RespuestaApi>('products', { ...base, name: c.nombreBase }, signal), c);
  anotar(e);
  return respaldo as Eleccion | null;
}

/* ---------- Caché en localStorage ---------- */
interface EntradaCache {
  url: string | null;
  vence: number;
  id?: number | null;
  mercado?: number | null;
  impresion?: string;
  atributos?: [string, string][];
}

let cache: Record<string, EntradaCache> | null = null;
const leerCache = (): Record<string, EntradaCache> => (cache ??= leer<Record<string, EntradaCache>>(CLAVES.imagenes, {}) ?? {});

function guardarEnCache(c: ConsultaImagen, e: Eleccion | null): void {
  const datos = leerCache();
  // Si no hubo imagen se vuelve a intentar en 1 día (por si la API la agrega); si la hubo, en 30.
  // El precio de mercado cambia a diario, pero el historial (que sí se actualiza) se pide aparte.
  datos[claveDe(c)] = e
    ? { url: e.url, vence: Date.now() + DIAS_CACHE * DIA_MS, id: e.id, mercado: e.mercado, impresion: e.impresion, atributos: e.atributos }
    : { url: null, vence: Date.now() + DIA_MS };
  const claves = Object.keys(datos);
  if (claves.length > 300) {
    claves.sort((a, b) => datos[a].vence - datos[b].vence).slice(0, claves.length - 300).forEach((k) => delete datos[k]);
  }
  guardar(CLAVES.imagenes, datos);
}

/* undefined = aún no se consulta; null = la API no tiene imagen; texto = URL. */
export function imagenEnCache(c: ConsultaImagen): string | null | undefined {
  const e = leerCache()[claveDe(c)];
  if (!e || Date.now() > e.vence) return undefined;
  return e.url;
}

/* Producto de API TCG que corresponde a la carta: undefined = aún no se consulta; null = no se encontró. */
export interface DatosMercado {
  id: number | null;
  mercado: number | null;
  impresion: string;
  atributos: [string, string][];
}

export function mercadoEnCache(c: ConsultaImagen): DatosMercado | null | undefined {
  const e = leerCache()[claveDe(c)];
  if (!e || Date.now() > e.vence) return undefined;
  if (!e.url) return null;
  return { id: e.id ?? null, mercado: e.mercado ?? null, impresion: e.impresion ?? '', atributos: e.atributos ?? [] };
}

export const imagenesGuardadas = (): number => Object.values(leerCache()).filter((e) => e.url && Date.now() < e.vence).length;

/* ---------- Fallas: si la clave es rechazada o se acabó el plan, no se insiste en esta sesión ---------- */
let bloqueo = '';
const fallas = new Set<string>();
const oyentes = new Set<(mensaje: string) => void>();
let avisado = false;

export const ultimoError = (): string => bloqueo;

/* Permite que la interfaz muestre un aviso la primera vez que falla la API. */
export function alFallar(oyente: (mensaje: string) => void): () => void {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

function notificarFalla(mensaje: string): void {
  if (avisado) return;
  avisado = true;
  console.warn(`HoloMarket: no se pudieron cargar las imágenes de la API: ${mensaje}`);
  oyentes.forEach((o) => o(mensaje));
}

export function reiniciarImagenes(): void {
  borrar(CLAVES.imagenes);
  borrar(CLAVES.sets);
  borrar(CLAVES.historial);
  historiales.clear();
  cache = {};
  fallas.clear();
  bloqueo = '';
  avisado = false;
}

/* Consulta una carta. forzar = true ignora la caché y los bloqueos (botón "Probar conexión"). */
export async function buscarImagen(c: ConsultaImagen, forzar = false): Promise<{ url: string | null; error: string }> {
  if (!IMAGENES_ACTIVAS) return { url: null, error: '' };
  const clave = claveDe(c);
  if (!forzar && (bloqueo || fallas.has(clave))) return { url: null, error: bloqueo };
  try {
    const eleccion = await conTiempo((signal) => buscarEnApi(c, signal));
    guardarEnCache(c, eleccion);
    fallas.delete(clave);
    return { url: eleccion?.url ?? null, error: '' };
  } catch (e) {
    const error = explicarFalla(e);
    fallas.add(clave);
    const esTiempo = e instanceof DOMException && e.name === 'AbortError';
    if (!esTiempo && (!(e instanceof ErrorApi) || [401, 403, 429].includes(e.status))) bloqueo = error;
    if (!forzar) notificarFalla(error);
    return { url: null, error };
  }
}

/* Cola simple: como máximo SIMULTANEAS consultas a la vez y una sola por carta. */
const enCurso = new Map<string, Promise<string | null>>();
const cola: { c: ConsultaImagen; resolver: (url: string | null) => void }[] = [];
let activas = 0;

function avanzarCola(): void {
  while (activas < SIMULTANEAS && cola.length) {
    const siguiente = cola.shift();
    if (!siguiente) return;
    activas += 1;
    buscarImagen(siguiente.c)
      .then((r) => siguiente.resolver(r.url), () => siguiente.resolver(null))
      .finally(() => {
        activas -= 1;
        avanzarCola();
      });
  }
}

export function pedirImagen(c: ConsultaImagen): Promise<string | null> {
  const clave = claveDe(c);
  const existente = enCurso.get(clave);
  if (existente) return existente;
  const promesa = new Promise<string | null>((resolver) => cola.push({ c, resolver }));
  enCurso.set(clave, promesa);
  promesa.then(() => enCurso.delete(clave));
  avanzarCola();
  return promesa;
}

/* ---------- Sugerencias al escribir el nombre en "Publicar una carta" ---------- */
const cacheSugerencias = new Map<string, Sugerencia[]>();

export const sugerenciasEnCache = (juego: JuegoId, texto: string): Sugerencia[] | undefined =>
  cacheSugerencias.get(`${juego}|${normalizar(texto)}`);

export async function buscarSugerencias(juego: JuegoId, texto: string, signal?: AbortSignal): Promise<Sugerencia[]> {
  const clave = `${juego}|${normalizar(texto)}`;
  const guardada = cacheSugerencias.get(clave);
  if (guardada) return guardada;
  const respuesta = await conTiempo((s) => consultar<RespuestaApi>('products', { tcg: TCG[juego], type: 'card', name: texto, limit: '12' }, s), signal);
  const lista = (respuesta?.data ?? []).map((p): Sugerencia => {
    const img = imagenDe(p);
    return {
      nombre: String(p.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
      edicion: sinCodigoSet(nombreSet(p)).replace(/\s+/g, ' ').trim().slice(0, 60),
      numero: numeroDe(p).toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, 15),
      rareza: atributo(p, 'Rarity').trim().slice(0, 40),
      miniatura: urlSegura(img.small ?? img.medium) ?? '',
      imagen: urlSegura(img.medium ?? img.large ?? img.small) ?? '',
    };
  }).filter((s) => s.nombre).slice(0, 12);
  cacheSugerencias.set(clave, lista);
  return lista;
}

/* Siglas que usa API TCG en Magic y One Piece. */
const SIGLAS_RAREZA: Partial<Record<JuegoId, Record<string, string>>> = {
  magic: { c: 'Common', u: 'Uncommon', r: 'Rare', m: 'Mythic Rare', s: 'Special', l: 'Land', p: 'Promo' },
  onepiece: { c: 'Common', uc: 'Uncommon', r: 'Rare', sr: 'Super Rare', sec: 'Secret Rare', l: 'Leader',
    sp: 'Special Card', tr: 'Treasure Rare', pr: 'Promo', p: 'Promo', 'don!!': 'DON!!' },
};

/* Traduce la rareza que entrega la API a la lista oficial del juego ('' si no la reconoce). */
export function rarezaDesde(juego: JuegoId, texto: string): string {
  const t = normalizar(texto).trim();
  if (!t) return '';
  const lista = RAREZAS[juego];
  return lista.find((r) => normalizar(r) === t) ?? SIGLAS_RAREZA[juego]?.[t] ?? '';
}

/* ---------- Historial de precios de mercado (TCGplayer, en USD) ----------
   GET /api/history-prices/{id}: un registro por día desde que API TCG sigue la carta.
   Se guarda 12 horas en el navegador: la API lo actualiza una vez al día. */
export interface PuntoPrecio {
  fecha: number;     // milisegundos (medianoche UTC del día)
  usd: number;       // precio de mercado ese día
}

interface RegistroHistorial {
  date?: string;
  markets?: { tcgplayer?: { prices?: { market?: number | null } } };
}

const HORAS_HISTORIAL = 12;
const historiales = new Map<number, Promise<PuntoPrecio[]>>();

export function buscarHistorial(id: number): Promise<PuntoPrecio[]> {
  const guardados = leer<Record<string, { vence: number; puntos: PuntoPrecio[] }>>(CLAVES.historial, {}) ?? {};
  const actual = guardados[id];
  if (actual && Date.now() < actual.vence) return Promise.resolve(actual.puntos);
  const existente = historiales.get(id);
  if (existente) return existente;
  const promesa = conTiempo((signal) => consultar<RegistroHistorial[]>(`history-prices/${id}`, { limit: '400' }, signal)).then((r) => {
    const puntos = (Array.isArray(r) ? r : [])
      .map((x) => ({ fecha: Date.parse(String(x.date ?? '')), usd: Number(x.markets?.tcgplayer?.prices?.market) }))
      .filter((x) => Number.isFinite(x.fecha) && Number.isFinite(x.usd) && x.usd > 0)
      .sort((a, b) => a.fecha - b.fecha);
    const todos = leer<Record<string, { vence: number; puntos: PuntoPrecio[] }>>(CLAVES.historial, {}) ?? {};
    todos[id] = { vence: Date.now() + HORAS_HISTORIAL * 3600000, puntos };
    // Como máximo 30 cartas guardadas: se borran las más antiguas.
    const claves = Object.keys(todos);
    if (claves.length > 30) claves.sort((a, b) => todos[a].vence - todos[b].vence).slice(0, claves.length - 30).forEach((k) => delete todos[k]);
    guardar(CLAVES.historial, todos);
    return puntos;
  }).finally(() => historiales.delete(id));
  historiales.set(id, promesa);
  return promesa;
}
