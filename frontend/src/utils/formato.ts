/* =========================================================================
   Formato de textos, montos y fechas (es-CL)
   ========================================================================= */
import type { Usuario } from '../types';
import { normalizar } from './validaciones';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const formatoFecha = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
const formatoFechaHora = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const DIA = 86400000;

/* 5990 -> "$5.990" */
export const clp = (n: number): string => formatoCLP.format(Math.round(Number(n) || 0));
export const fecha = (t: number): string => formatoFecha.format(new Date(t));
export const fechaHora = (t: number): string => formatoFechaHora.format(new Date(t));

export const plural = (n: number, singular: string, varios: string): string => (n === 1 ? singular : varios);

export const suma = <T,>(lista: T[], fn: (x: T) => number): number => lista.reduce((s, x) => s + fn(x), 0);

export function iniciales(nombre: string): string {
  return String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

/* "Camila Rojas" -> "Camila R." */
export function nombreCorto(usuario: Pick<Usuario, 'nombre'> | null | undefined): string {
  if (!usuario) return 'Usuario eliminado';
  const partes = usuario.nombre.split(/\s+/);
  return partes.length > 1 ? `${partes[0]} ${partes[1][0]}.` : partes[0];
}

/* "Charizard ex (ilustración especial)" -> "Charizard ex" */
export const sinParentesis = (texto: string): string => String(texto || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();

/* Texto grande de la "ilustración" de la carta: primera palabra del nombre. */
const PALABRAS_VACIAS = ['the', 'el', 'la', 'los', 'las', 'de', 'del', 'of', 'a', 'an'];
export function glifoDe(nombre: string): string {
  const palabras = String(nombre).replace(/\(.*?\)/g, '').trim().split(/[\s,.&-]+/).filter(Boolean);
  const palabra = palabras.find((p) => !PALABRAS_VACIAS.includes(p.toLowerCase())) ?? palabras[0] ?? 'TCG';
  return palabra.length > 9 ? palabra.slice(0, 8) : palabra;
}

/* Tono de color estable para cada nombre de carta (0 a 359). */
export function tonoDe(texto: string): number {
  let h = 0;
  for (const ch of normalizar(texto)) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return h % 360;
}
