/* =========================================================================
   Publicaciones e inventario del vendedor
   ========================================================================= */
import type { CondicionId, Estado, JuegoId, Publicacion, Resultado, Usuario } from '../types';
import { clp, plural } from '../utils/formato';
import { pubPorId } from './consultas';
import { cambiarStock, registrarActividad, registrarMovimiento, siguienteId } from './estado';

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

/* undefined = no cambia, null = se quita, texto = valor nuevo */
export interface CambiosImagen {
  imagen?: string | null;
  imagenApi?: string | null;
}

const limpiar = (d: DatosPublicacion) => ({
  ...d,
  nombre: d.nombre.trim().replace(/\s+/g, ' '),
  edicion: d.edicion.trim().replace(/\s+/g, ' '),
  numero: d.numero.trim().toUpperCase(),
  descripcion: d.descripcion.trim(),
});

/* Publicación del propio vendedor que todavía se puede modificar. */
export function pubPropia(e: Estado, uid: string, id: string): Publicacion | undefined {
  const pub = pubPorId(e, id);
  return pub && pub.vendedorId === uid && pub.estado !== 'eliminada' ? pub : undefined;
}

export function crearPublicacion(e: Estado, vendedor: Usuario, datos: DatosPublicacion, img: CambiosImagen): Publicacion {
  const ahora = Date.now();
  const { stock, ...resto } = limpiar(datos);
  const pub: Publicacion = {
    id: siguienteId(e, 'publicacion'), vendedorId: vendedor.id, ...resto, stock, estado: 'activa',
    imagen: img.imagen ?? null, imagenApi: img.imagenApi ?? null, creado: ahora, actualizado: ahora,
  };
  e.publicaciones.push(pub);
  registrarMovimiento(e, { pub, tipo: 'alta', cantidad: stock, antes: 0, despues: stock, ref: 'Publicación nueva', uid: vendedor.id });
  registrarActividad(e, 'Publicación creada', `${pub.nombre} (${pub.id}), ${stock} u. a ${clp(pub.precio)}`, vendedor.id);
  return pub;
}

export function editarPublicacion(e: Estado, uid: string, id: string, datos: DatosPublicacion, img: CambiosImagen): Resultado<Publicacion> {
  const pub = pubPropia(e, uid, id);
  if (!pub) return { ok: false, error: 'No encontramos la publicación que editabas.' };
  const { stock, ...resto } = limpiar(datos);
  const precioAntes = pub.precio;
  Object.assign(pub, resto, { actualizado: Date.now() });
  if (img.imagen !== undefined) pub.imagen = img.imagen;
  if (img.imagenApi !== undefined) pub.imagenApi = img.imagenApi;
  if (stock !== pub.stock) cambiarStock(e, pub, stock, 'edicion', 'Edición de la publicación', uid);
  registrarActividad(e, 'Publicación editada',
    `${pub.nombre} (${pub.id})${precioAntes !== pub.precio ? `, precio ${clp(precioAntes)} → ${clp(pub.precio)}` : ''}`, uid);
  return { ok: true, valor: pub };
}

/* Ajuste manual de stock (botones + y −, o ventana "Ajustar"). */
export function ajustarStock(e: Estado, uid: string, id: string, tipo: 'entrada' | 'salida', cantidad: number, motivo: string): Resultado<{ antes: number; despues: number; pub: Publicacion }> {
  const pub = pubPropia(e, uid, id);
  if (!pub) return { ok: false, error: 'Solo puedes ajustar el stock de tus publicaciones.' };
  if (!Number.isInteger(cantidad) || cantidad < 1) return { ok: false, error: 'Ingresa una cantidad entera mayor que 0.' };
  if (tipo === 'salida' && cantidad > pub.stock) {
    return { ok: false, error: `No puedes restar más de ${pub.stock} ${plural(pub.stock, 'unidad', 'unidades')}.` };
  }
  if (tipo === 'entrada' && pub.stock + cantidad > 999) return { ok: false, error: 'El stock máximo por publicación es 999 unidades.' };
  const antes = pub.stock;
  const despues = tipo === 'entrada' ? antes + cantidad : antes - cantidad;
  cambiarStock(e, pub, despues, tipo, motivo, uid);
  return { ok: true, valor: { antes, despues, pub } };
}

export function cambiarPrecio(e: Estado, uid: string, id: string, precio: number): Resultado<{ antes: number; pub: Publicacion }> {
  const pub = pubPropia(e, uid, id);
  if (!pub) return { ok: false, error: 'Solo puedes cambiar el precio de tus publicaciones.' };
  const antes = pub.precio;
  pub.precio = precio;
  pub.actualizado = Date.now();
  registrarActividad(e, 'Cambio de precio', `${pub.nombre} (${pub.id}): ${clp(antes)} → ${clp(precio)}`, uid);
  return { ok: true, valor: { antes, pub } };
}

/* El dueño pausa o activa su publicación; el administrador puede hacerlo como moderación. */
export function cambiarEstadoPublicacion(e: Estado, usuario: Usuario, id: string, nuevo: 'activa' | 'pausada'): Resultado<Publicacion> {
  const esAdmin = usuario.rol === 'admin';
  const pub = esAdmin ? pubPorId(e, id) : pubPropia(e, usuario.id, id);
  if (!pub || pub.estado === 'eliminada' || pub.estado === nuevo) return { ok: false, error: 'No se pudo cambiar el estado de la publicación.' };
  pub.estado = nuevo;
  pub.actualizado = Date.now();
  registrarActividad(e, nuevo === 'pausada' ? 'Publicación pausada' : 'Publicación activada',
    `${pub.nombre} (${pub.id})${esAdmin ? ', por moderación' : ''}`, usuario.id);
  return { ok: true, valor: pub };
}

export function eliminarPublicacion(e: Estado, usuario: Usuario, id: string): Resultado<Publicacion> {
  const esAdmin = usuario.rol === 'admin';
  const pub = esAdmin ? pubPorId(e, id) : pubPropia(e, usuario.id, id);
  if (!pub || pub.estado === 'eliminada') return { ok: false, error: 'Esta publicación ya no existe.' };
  cambiarStock(e, pub, 0, 'baja', esAdmin ? 'Eliminada por moderación' : 'Publicación eliminada', usuario.id);
  pub.estado = 'eliminada';
  registrarActividad(e, 'Publicación eliminada', `${pub.nombre} (${pub.id})${esAdmin ? ', por moderación' : ''}`, usuario.id);
  return { ok: true, valor: pub };
}
