/* =========================================================================
   Sesión del usuario y bloqueo por intentos fallidos
   -------------------------------------------------------------------------
   La sesión vence tras unos minutos sin actividad (configurable). Después de
   3 contraseñas incorrectas seguidas, el correo queda bloqueado 30 segundos.
   ========================================================================= */
import type { Estado, ItemCarrito, Sesion, Usuario } from '../types';
import { hashClave } from '../utils/sha256';
import { borrar, CLAVES, claveCarrito, guardar, leer } from './almacen';

export const SEGUNDOS_BLOQUEO = 30;
const INTENTOS_MAXIMOS = 3;

export function leerSesion(): Sesion | null {
  const s = leer<Sesion | null>(CLAVES.sesion, null);
  return s && typeof s.uid === 'string' && typeof s.expira === 'number' ? s : null;
}

export function guardarSesion(uid: string, minutos: number): Sesion {
  const s = { uid, expira: Date.now() + minutos * 60000 };
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

/* ---------- Ingreso con correo y contraseña ---------- */
interface RegistroIntentos {
  fallos: number;
  hasta: number;
}

export type ResultadoIngreso =
  | { ok: true; usuario: Usuario }
  | { ok: false; error: string; usuario?: Usuario; bloqueado?: boolean };

export function verificarCredenciales(e: Estado, correo: string, clave: string): ResultadoIngreso {
  const email = correo.trim().toLowerCase();
  const intentos = leer<Record<string, RegistroIntentos>>(CLAVES.intentos, {});
  const registro = intentos[email] ?? { fallos: 0, hasta: 0 };
  if (registro.hasta > Date.now()) {
    const seg = Math.ceil((registro.hasta - Date.now()) / 1000);
    return { ok: false, bloqueado: true, error: `Demasiados intentos fallidos. Espera ${seg} segundos antes de volver a intentarlo.` };
  }
  const u = e.usuarios.find((x) => x.email === email);
  if (!u || hashClave(u.sal, clave) !== u.clave) {
    registro.fallos += 1;
    let bloqueo = false;
    if (registro.fallos >= INTENTOS_MAXIMOS) {
      registro.hasta = Date.now() + SEGUNDOS_BLOQUEO * 1000;
      registro.fallos = 0;
      bloqueo = true;
    }
    intentos[email] = registro;
    guardar(CLAVES.intentos, intentos);
    return {
      ok: false,
      usuario: u,
      error: bloqueo
        ? `Correo o contraseña incorrectos. Por seguridad bloqueamos el acceso de esta cuenta durante ${SEGUNDOS_BLOQUEO} segundos.`
        : 'Correo o contraseña incorrectos.',
    };
  }
  if (u.estado !== 'activo') return { ok: false, usuario: u, error: 'Tu cuenta está bloqueada. Escribe a soporte@holomarket.cl para revisarla.' };
  delete intentos[email];
  guardar(CLAVES.intentos, intentos);
  return { ok: true, usuario: u };
}
