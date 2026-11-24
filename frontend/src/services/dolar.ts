/* =========================================================================
   Valor del dólar en vivo (CLP por USD)
   -------------------------------------------------------------------------
   Sirve para mostrar en pesos el precio de mercado de TCGplayer, que viene
   en dólares. Se consultan dos APIs gratuitas y sin clave, a la vez:

     1. open.er-api.com   → responde en menos de 1 segundo (tipo de cambio de mercado).
     2. mindicador.cl     → dólar observado oficial del Banco Central de Chile.
                             Es más lenta: cuando llega, reemplaza al valor anterior.

   Si ninguna responde, se usa el valor de respaldo de Administración ›
   Configuración. El valor obtenido se guarda 1 hora en el navegador.
   ========================================================================= */
import { borrar, CLAVES, guardar, leer } from './almacen';

export type FuenteDolar = 'bcch' | 'mercado';

export interface Dolar {
  valor: number;        // pesos por dólar
  fecha: number;        // día del valor (milisegundos)
  fuente: FuenteDolar;
}

const VIDA_MS = 3600000;
const URL_MERCADO = 'https://open.er-api.com/v6/latest/USD';
const URL_BCCH = 'https://mindicador.cl/api/dolar';

/* Un valor razonable para el peso chileno; cualquier otra cosa se descarta. */
const valido = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 300 && n < 3000;

/* Lee la respuesta de open.er-api.com: { result: 'success', rates: { CLP: 981.05 }, time_last_update_unix }. */
export function leerMercado(json: unknown): Dolar | null {
  const r = json as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number } | null;
  const valor = r?.rates?.CLP;
  if (r?.result !== 'success' || !valido(valor)) return null;
  return { valor, fecha: (r.time_last_update_unix ?? Date.now() / 1000) * 1000, fuente: 'mercado' };
}

/* Lee la respuesta de mindicador.cl: { serie: [{ fecha: '2026-10-23T03:00:00.000Z', valor: 986.58 }, ...] } (la más reciente primero). */
export function leerBcch(json: unknown): Dolar | null {
  const ultimo = (json as { serie?: { fecha?: string; valor?: number }[] } | null)?.serie?.[0];
  const fecha = Date.parse(String(ultimo?.fecha ?? ''));
  if (!ultimo || !valido(ultimo.valor) || !Number.isFinite(fecha)) return null;
  return { valor: ultimo.valor, fecha, fuente: 'bcch' };
}

/* ---------- Estado compartido: todas las pantallas ven el mismo valor ---------- */
interface Guardado extends Dolar { vence: number }

function delCache(): Dolar | null {
  const g = leer<Guardado | null>(CLAVES.dolar, null);
  return g && Date.now() < g.vence && valido(g.valor) ? { valor: g.valor, fecha: g.fecha, fuente: g.fuente } : null;
}

let actual: Dolar | null = delCache();
const oyentes = new Set<() => void>();
let pedido = false;

export const dolarActual = (): Dolar | null => actual;

export function suscribirDolar(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

function fijar(d: Dolar): void {
  // El valor oficial del Banco Central no se reemplaza por uno de mercado.
  if (actual?.fuente === 'bcch' && d.fuente !== 'bcch' && Date.now() - actual.fecha < 3 * 86400000) return;
  actual = d;
  guardar(CLAVES.dolar, { ...d, vence: Date.now() + VIDA_MS });
  oyentes.forEach((o) => o());
}

async function consultar(url: string, segundos: number): Promise<unknown> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), segundos * 1000);
  try {
    const r = await fetch(url, { signal: control.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`Error ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(reloj);
  }
}

/* Pide el dólar una vez por sesión (o cuando vence la hora guardada). Las fallas no se avisan:
   en ese caso se sigue usando el valor de respaldo. */
export function pedirDolar(): void {
  if (pedido || (actual && actual.fuente === 'bcch')) return;
  pedido = true;
  consultar(URL_MERCADO, 8).then((j) => { const d = leerMercado(j); if (d) fijar(d); }).catch(() => undefined);
  consultar(URL_BCCH, 45).then((j) => { const d = leerBcch(j); if (d) fijar(d); }).catch(() => undefined);
}

/* Olvida el valor guardado para que el próximo pedirDolar() vuelva a consultar las APIs (se usa en las pruebas). */
export function reiniciarDolar(): void {
  actual = null;
  pedido = false;
  borrar(CLAVES.dolar);
}

export const NOMBRE_FUENTE: Record<FuenteDolar, string> = {
  bcch: 'dólar observado del Banco Central (mindicador.cl)',
  mercado: 'tipo de cambio de mercado (open.er-api.com)',
};
