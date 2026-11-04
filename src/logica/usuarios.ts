/* =========================================================================
   Registro de usuarios, moderación y configuración del negocio
   ========================================================================= */
import { CAMPOS_CONFIGURACION } from '../data/catalogo';
import type { Configuracion, Estado, Resultado, Usuario } from '../types';
import { hashClave, hexAleatorio } from '../utils/sha256';
import { formatearRut, limpiarRut } from '../utils/validaciones';
import { registrarActividad, siguienteId } from './estado';

export interface DatosRegistro {
  rut: string;
  nombre: string;
  email: string;
  telefono: string;
  region: string;
  comuna: string;
  clave: string;
}

export const rutRegistrado = (e: Estado, rut: string): boolean => e.usuarios.some((u) => limpiarRut(u.rut) === limpiarRut(rut));
export const emailRegistrado = (e: Estado, email: string): boolean => e.usuarios.some((u) => u.email === email.trim().toLowerCase());

/* Crea una cuenta de cliente. La contraseña se guarda como hash SHA-256 con sal y se registra
   la fecha del consentimiento (términos y política de privacidad). */
export function registrarUsuario(e: Estado, d: DatosRegistro): Resultado<Usuario> {
  if (rutRegistrado(e, d.rut)) return { ok: false, error: 'Ya existe una cuenta con este RUT.' };
  if (emailRegistrado(e, d.email)) return { ok: false, error: 'Ya existe una cuenta con este correo. Si es tuyo, ingresa con él.' };
  const sal = hexAleatorio(8);
  const ahora = Date.now();
  const usuario: Usuario = {
    id: siguienteId(e, 'usuario'), rut: formatearRut(d.rut), nombre: d.nombre.trim().replace(/\s+/g, ' '),
    email: d.email.trim().toLowerCase(), sal, clave: hashClave(sal, d.clave), rol: 'cliente',
    region: d.region, comuna: d.comuna, telefono: d.telefono.trim(), direccion: '',
    estado: 'activo', creado: ahora, consentimiento: ahora, cuenta: null,
  };
  e.usuarios.push(usuario);
  registrarActividad(e, 'Registro de usuario', `${usuario.email}, aceptó términos y política de privacidad`, usuario.id);
  return { ok: true, valor: usuario };
}

/* Bloquear oculta sus publicaciones del catálogo e impide que vuelva a ingresar. */
export function cambiarEstadoUsuario(e: Estado, admin: Usuario, id: string, nuevo: 'activo' | 'bloqueado'): Resultado<Usuario> {
  const u = e.usuarios.find((x) => x.id === id);
  if (admin.rol !== 'admin' || !u || u.rol === 'admin' || u.estado === nuevo) return { ok: false, error: 'No se pudo cambiar el estado del usuario.' };
  u.estado = nuevo;
  registrarActividad(e, nuevo === 'bloqueado' ? 'Usuario bloqueado' : 'Usuario reactivado', `${u.nombre} (${u.email})`, admin.id);
  return { ok: true, valor: u };
}

/* Guarda solo los valores que cambiaron; devuelve la lista de cambios para el registro de actividad. */
export function guardarConfiguracion(e: Estado, admin: Usuario, valores: Configuracion): string[] {
  const cambios: string[] = [];
  CAMPOS_CONFIGURACION.forEach(([campo, etiqueta]) => {
    if (e.config[campo] !== valores[campo]) {
      cambios.push(`${etiqueta}: ${e.config[campo]} → ${valores[campo]}`);
      e.config[campo] = valores[campo];
    }
  });
  if (cambios.length) registrarActividad(e, 'Configuración actualizada', cambios.join('; '), admin.id);
  return cambios;
}
