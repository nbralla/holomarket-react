/* =========================================================================
   Publicaciones del vendedor
   -------------------------------------------------------------------------
   Crear, editar, ajustar stock, pausar y eliminar lo hace el backend
   (PublicacionService). Aquí queda lo que la interfaz necesita para armar
   el formulario y saber si una publicación se puede editar.
   ========================================================================= */
import type { CondicionId, Estado, JuegoId, Publicacion } from '../types';
import { pubPorId } from './consultas';

export interface DatosPublicacion {
  juego: JuegoId;
  nombre: string;
  edicion: string;
  numero: string;
  rareza: string;
  acabado: string;
  idioma: string;
  condicion: CondicionId;
  precio: number;
  precioAnterior: number | null;   // si es mayor que el precio, la carta aparece en Ofertas
  stock: number;
  descripcion: string;
}

/* Publicación del propio vendedor que todavía se puede modificar. */
export function pubPropia(e: Estado, uid: string, id: string): Publicacion | undefined {
  const pub = pubPorId(e, id);
  return pub && pub.vendedorId === uid && pub.estado !== 'eliminada' ? pub : undefined;
}
