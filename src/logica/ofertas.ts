/* =========================================================================
   Ofertas y pagos rechazados
   ========================================================================= */
import type { Estado, JuegoId, Publicacion } from '../types';
import { publicacionesVisibles } from './consultas';

/* Una publicación está en oferta si su precio anterior es mayor que el actual. */
export const enOferta = (p: Pick<Publicacion, 'precio' | 'precioAnterior'>): boolean =>
  typeof p.precioAnterior === 'number' && p.precioAnterior > p.precio;

/* Porcentaje de descuento redondeado (0 si no está en oferta). */
export const descuento = (p: Pick<Publicacion, 'precio' | 'precioAnterior'>): number =>
  enOferta(p) ? Math.round((1 - p.precio / (p.precioAnterior as number)) * 100) : 0;

/* Publicaciones visibles y con stock que están en oferta, de mayor a menor descuento. */
export function publicacionesEnOferta(e: Estado, juego: JuegoId | '' = ''): Publicacion[] {
  return publicacionesVisibles(e)
    .filter((p) => p.stock > 0 && enOferta(p) && (!juego || p.juego === juego))
    .sort((a, b) => descuento(b) - descuento(a) || a.precio - b.precio);
}

/* ---------- Pago simulado: tarjetas de prueba que el "banco" rechaza ---------- */
export type MotivoRechazo = 'rechazada' | 'fondos';

const TARJETAS_RECHAZADAS: Record<string, MotivoRechazo> = {
  '4000000000000002': 'rechazada',   // el banco emisor no autoriza la compra
  '4000000000009995': 'fondos',      // fondos o cupo insuficiente
};

export const TEXTO_RECHAZO: Record<MotivoRechazo, string> = {
  rechazada: 'El banco emisor no autorizó la compra.',
  fondos: 'La tarjeta no tiene fondos o cupo suficiente para este monto.',
};

/* Motivo por el que se rechaza el pago con esta tarjeta, o null si se aprueba. */
export const motivoRechazo = (numeroTarjeta: string): MotivoRechazo | null =>
  TARJETAS_RECHAZADAS[numeroTarjeta.replace(/\D/g, '')] ?? null;

export const esMotivoRechazo = (valor: string | null): valor is MotivoRechazo =>
  valor !== null && Object.prototype.hasOwnProperty.call(TEXTO_RECHAZO, valor);
