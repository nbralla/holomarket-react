/* =========================================================================
   Almacenamiento en el navegador (localStorage)
   -------------------------------------------------------------------------
   Simula la base de datos del MVP. Si el navegador bloquea localStorage
   (modo privado estricto), guarda en memoria y la app sigue funcionando.
   Cuando exista el backend, este es el único archivo que hay que cambiar
   por llamadas a la API (fetch).
   ========================================================================= */

export const CLAVES = {
  version: 'hm_version',
  usuarios: 'hm_usuarios',
  publicaciones: 'hm_publicaciones',
  pedidos: 'hm_pedidos',
  movimientos: 'hm_movimientos',
  actividad: 'hm_actividad',
  retiros: 'hm_retiros',
  config: 'hm_config',
  sesion: 'hm_sesion',
  intentos: 'hm_intentos',
  imagenes: 'hm_imagenes_cache_v2',   // v2: además de la imagen guarda el producto, su precio y atributos
  historial: 'hm_historial_precios',
  dolar: 'hm_dolar',
  sets: 'hm_sets_cache',
} as const;

export const claveCarrito = (uid: string): string => `hm_carrito_${uid}`;

const memoria = new Map<string, string>();

function probarLocalStorage(): boolean {
  try {
    localStorage.setItem('hm_prueba', '1');
    localStorage.removeItem('hm_prueba');
    return true;
  } catch {
    return false;
  }
}

export const persistente = typeof localStorage !== 'undefined' && probarLocalStorage();

export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = persistente ? localStorage.getItem(clave) : memoria.get(clave) ?? null;
    return crudo == null ? porDefecto : (JSON.parse(crudo) as T);
  } catch {
    return porDefecto;
  }
}

/* Devuelve false si no hay espacio (localStorage tiene un límite de unos 5 MB). */
export function guardar(clave: string, valor: unknown): boolean {
  const crudo = JSON.stringify(valor);
  if (!persistente) {
    memoria.set(clave, crudo);
    return true;
  }
  try {
    localStorage.setItem(clave, crudo);
    return true;
  } catch {
    return false;
  }
}

export function borrar(clave: string): void {
  if (persistente) localStorage.removeItem(clave);
  else memoria.delete(clave);
}

/* Borra todas las claves de HoloMarket (las que empiezan con "hm_"). */
export function borrarTodo(): void {
  if (persistente) {
    Object.keys(localStorage).filter((k) => k.startsWith('hm_')).forEach((k) => localStorage.removeItem(k));
  } else {
    memoria.clear();
  }
}
