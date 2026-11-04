/* =========================================================================
   Datos de la tienda en json-server (db.json)
   -------------------------------------------------------------------------
   Igual que en el ejemplo de la Pokédex: las URL empiezan con /api para
   pasar por el proxy de Vite -> http://127.0.0.1:3000 (npm run api).

     GET    /api/publicaciones        trae la colección completa (READ)
     POST   /api/publicaciones        crea un registro (CREATE)
     PUT    /api/publicaciones/P001   reemplaza un registro (UPDATE)
     DELETE /api/publicaciones/P001   lo elimina (DELETE)
     GET/PUT /api/config              la configuración es un solo objeto

   Las reglas del negocio (logica/) trabajan sobre una copia del estado.
   Después, cambiosEntre() compara el antes y el después y manda a la API
   solo lo que cambió.
   ========================================================================= */
import { CONFIGURACION_INICIAL } from '../data/catalogo';
import { crearEstadoInicial, estadoValido, reconciliarSecuencias } from '../logica/estado';
import type { Estado } from '../types';

const URL = '/api';

export const COLECCIONES = ['usuarios', 'publicaciones', 'pedidos', 'movimientos', 'actividad', 'retiros'] as const;
type Coleccion = (typeof COLECCIONES)[number];

export type Operacion =
  | { metodo: 'POST'; ruta: Coleccion; cuerpo: unknown }
  | { metodo: 'PUT'; ruta: string; cuerpo: unknown }
  | { metodo: 'DELETE'; ruta: string };

async function pedir<T>(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  const res = await fetch(`${URL}/${ruta}`, {
    method: metodo,
    headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error(`Error ${res.status} en ${metodo} /api/${ruta}`);
  return (await res.json()) as T;
}

/* READ: trae todas las colecciones a la vez y revisa que tengan la forma esperada. */
export async function cargarEstado(): Promise<Estado> {
  const [config, ...listas] = await Promise.all([pedir<unknown>('config'), ...COLECCIONES.map((c) => pedir<unknown>(c))]);
  const crudo: Record<string, unknown> = { config };
  COLECCIONES.forEach((c, i) => { crudo[c] = listas[i]; });
  if (!estadoValido(crudo)) throw new Error('db.json no tiene la forma esperada');
  // Campos de configuración agregados después (por ejemplo, el dólar) toman su valor inicial.
  crudo.config = { ...CONFIGURACION_INICIAL, ...crudo.config };
  // Si un guardado anterior quedó a medias, la secuencia se corrige y se guarda con el próximo cambio.
  reconciliarSecuencias(crudo);
  return crudo;
}

/* Compara dos estados y arma la lista de llamadas a la API (función pura: se prueba con Vitest). */
export function cambiosEntre(antes: Estado, despues: Estado): Operacion[] {
  const ops: Operacion[] = [];
  const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  // La configuración va PRIMERO: guarda las secuencias (HM-1006, A040...) antes de crear los registros.
  // Si el envío se corta a la mitad, a lo más queda un número sin usar, nunca un id repetido.
  if (!igual(antes.config, despues.config)) ops.push({ metodo: 'PUT', ruta: 'config', cuerpo: despues.config });

  COLECCIONES.forEach((c) => {
    const previos = new Map<string, unknown>(antes[c].map((x) => [x.id, x]));
    despues[c].forEach((x) => {
      const previo = previos.get(x.id);
      if (previo === undefined) ops.push({ metodo: 'POST', ruta: c, cuerpo: x });
      else if (!igual(previo, x)) ops.push({ metodo: 'PUT', ruta: `${c}/${encodeURIComponent(x.id)}`, cuerpo: x });
      previos.delete(x.id);
    });
    previos.forEach((_x, id) => ops.push({ metodo: 'DELETE', ruta: `${c}/${encodeURIComponent(id)}` }));
  });

  return ops;
}

/* Las llamadas se envían de a una y en orden (una cola): así un PUT nunca llega antes que su POST. */
let cola: Promise<void> = Promise.resolve();
let pendientes = 0;

export const hayCambiosPendientes = (): boolean => pendientes > 0;

export function enviarCambios(ops: Operacion[]): Promise<void> {
  if (ops.length === 0) return Promise.resolve();
  pendientes += 1;
  const tarea = cola.then(async () => {
    for (const op of ops) {
      await pedir(op.ruta, op.metodo, op.metodo === 'DELETE' ? undefined : op.cuerpo);
    }
  });
  // Si una tarea falla, la cola sigue funcionando para las siguientes.
  cola = tarea.catch(() => undefined).finally(() => { pendientes -= 1; });
  return tarea;
}

/* Vuelve a los datos de demostración: calcula la diferencia con el estado actual y la envía. */
export async function restablecerDatosDemo(actual: Estado): Promise<Estado> {
  const nuevo = crearEstadoInicial();
  await enviarCambios(cambiosEntre(actual, nuevo));
  return nuevo;
}
