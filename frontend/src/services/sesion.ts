/* =========================================================================
   Sesión del usuario y carrito
   -------------------------------------------------------------------------
   El backend entrega un token JWT al ingresar. Se guarda junto con el id del
   usuario y la hora de vencimiento: la sesión se cierra tras unos minutos sin
   actividad (configurable). El bloqueo por intentos fallidos lo hace el backend.
   ========================================================================= */
import type { ItemCarrito, Sesion, Usuario } from '../types';
import { borrar, CLAVES, claveCarrito, guardar, leer } from './almacen';

export function leerSesion(): Sesion | null {
  const s = leer<Sesion | null>(CLAVES.sesion, null);
  return s && typeof s.uid === 'string' && typeof s.expira === 'number' && typeof s.token === 'string' ? s : null;
}

export function guardarSesion(uid: string, minutos: number, token: string): Sesion {
  const s = { uid, token, expira: Date.now() + minutos * 60000 };
  guardar(CLAVES.sesion, s);
  return s;
}

export const borrarSesion = (): void => borrar(CLAVES.sesion);

/* ---------- Carrito (uno por usuario) ---------- */
export function leerCarrito(uid: string): ItemCarrito[] {
  const items = leer<unknown>(claveCarrito(uid), []);
  return Array.isArray(items)
    ? items.filter((i): i is ItemCarrito => Boolean(i) && typeof i.pubId === 'string' && Number.isInteger(i.cantidad) && i.cantidad > 0)
    : [];
}

export const guardarCarrito = (uid: string, items: ItemCarrito[]): boolean => guardar(claveCarrito(uid), items);

export type ResultadoIngreso =
  | { ok: true; usuario: Usuario }
  | { ok: false; error: string };
