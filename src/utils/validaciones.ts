/* =========================================================================
   Validaciones reutilizables
   -------------------------------------------------------------------------
   Funciones puras (sin acceso al DOM ni a React) para validar las entradas
   de los formularios. Devuelven true/false o un mensaje de error en español.
   Se prueban en validaciones.test.ts con "npm run test".
   ========================================================================= */

/* Quita tildes y pasa a minúsculas: sirve para búsquedas y comparaciones. */
export function normalizar(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/* ---------- RUT chileno (módulo 11) ---------- */
export function limpiarRut(rut: string): string {
  return String(rut || '').toUpperCase().replace(/[^0-9K]/g, '');
}

export function calcularDv(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

export function rutValido(valor: string): boolean {
  const limpio = limpiarRut(valor);
  if (limpio.length < 8 || limpio.length > 9) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return calcularDv(cuerpo) === dv;
}

/* 12345678K -> 12.345.678-K */
export function formatearRut(valor: string): string {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}

/* ---------- Datos de contacto ---------- */
export function emailValido(valor: string): boolean {
  const v = String(valor || '').trim();
  return v.length <= 100 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
}

export function nombreValido(valor: string): boolean {
  const v = String(valor || '').trim();
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{3,60}$/.test(v) && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}/.test(v);
}

/* Celular o fijo chileno: +56 9 XXXX XXXX (con o sin espacios / +56). */
export function telefonoValido(valor: string): boolean {
  const v = String(valor || '').replace(/[\s-]/g, '');
  return /^(\+?56)?9\d{8}$/.test(v) || /^(\+?56)?2\d{8}$/.test(v);
}

/* ---------- Contraseña ---------- */
export function claveError(valor: string): string {
  const v = String(valor || '');
  if (!v) return 'Crea una contraseña.';
  if (v.length < 8 || v.length > 20) return 'Usa entre 8 y 20 caracteres.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Incluye al menos una letra y un número.';
  return '';
}

/* 0 = vacía, 1 = débil, 2 = media, 3 = fuerte */
export function fuerzaClave(valor: string): 0 | 1 | 2 | 3 {
  const v = String(valor || '');
  if (!v) return 0;
  let puntos = 0;
  if (v.length >= 8) puntos++;
  if (v.length >= 12) puntos++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) puntos++;
  if (/\d/.test(v)) puntos++;
  if (/[^A-Za-z0-9]/.test(v)) puntos++;
  if (puntos <= 2) return 1;
  if (puntos <= 3) return 2;
  return 3;
}

/* ---------- Pago simulado ---------- */
export function luhn(numero: string): boolean {
  const digitos = String(numero || '').replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(digitos)) return false;
  let suma = 0;
  let doble = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let d = Number(digitos[i]);
    if (doble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
    doble = !doble;
  }
  return suma % 10 === 0;
}

/* MM/AA, no vencida */
export function vencimientoValido(valor: string, hoy: Date = new Date()): boolean {
  const m = String(valor || '').trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  const actual = hoy.getFullYear() * 12 + hoy.getMonth();
  return anio * 12 + (mes - 1) >= actual;
}

export function cvvValido(valor: string): boolean {
  return /^\d{3,4}$/.test(String(valor || '').trim());
}

/* ---------- Números y textos ---------- */
export function entero(valor: unknown): number {
  const texto = String(valor ?? '').trim();
  return /^-?\d+$/.test(texto) ? Number(texto) : NaN;
}

/* Número de cuenta bancaria: solo dígitos (se aceptan espacios y guiones al escribir), de 4 a 20. */
export function cuentaBancariaValida(valor: string): boolean {
  return /^\d{4,20}$/.test(String(valor || '').replace(/[\s-]/g, ''));
}

export function precioError(valor: string): string {
  const n = entero(valor);
  if (String(valor ?? '').trim() === '') return 'Ingresa un precio.';
  if (Number.isNaN(n)) return 'El precio debe ser un número entero, sin puntos ni decimales.';
  if (n < 100) return 'El precio mínimo es $100.';
  if (n > 50000000) return 'El precio máximo es $50.000.000.';
  return '';
}

export function stockError(valor: string, minimo = 1): string {
  const n = entero(valor);
  if (String(valor ?? '').trim() === '') return 'Ingresa la cantidad disponible.';
  if (Number.isNaN(n)) return 'La cantidad debe ser un número entero.';
  if (n < minimo) return minimo === 0 ? 'La cantidad no puede ser negativa.' : 'Publica al menos 1 unidad.';
  if (n > 999) return 'El máximo por publicación es 999 unidades.';
  return '';
}

export function numeroCartaValido(valor: string): boolean {
  const v = String(valor || '').trim();
  return v === '' || /^[A-Za-z0-9][A-Za-z0-9/ -]{0,14}$/.test(v);
}

export function largoEntre(valor: string, min: number, max: number): boolean {
  const n = String(valor || '').trim().length;
  return n >= min && n <= max;
}

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];

export function imagenError(archivo: { type: string; size: number } | null | undefined, maxMb = 3): string {
  if (!archivo) return '';
  if (!TIPOS_IMAGEN.includes(archivo.type)) return 'Formato no permitido. Usa JPG, PNG o WebP.';
  if (archivo.size > maxMb * 1024 * 1024) return `La imagen pesa más de ${maxMb} MB. Elige una más liviana.`;
  return '';
}

/* Número de seguimiento o comprobante: letras, números o guiones (4 a 30). Vacío es válido (opcional). */
export function codigoOpcionalValido(valor: string): boolean {
  const v = String(valor || '').trim();
  return !v || /^[A-Za-z0-9-]{4,30}$/.test(v);
}
