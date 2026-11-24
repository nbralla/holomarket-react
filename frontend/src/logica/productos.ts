/* =========================================================================
   Cartas (productos) y sus publicaciones
   -------------------------------------------------------------------------
   Varias personas pueden vender la misma carta: "Charizard ex, Obsidian
   Flames 125/197" de Diego, de Valentina y de Camila. Como en TCGplayer, el
   catálogo muestra una ficha por carta ("3 publicaciones desde $4.490") y la
   página de la carta lista a todos sus vendedores.
   La carta es la misma si coinciden juego, nombre (sin lo que va entre
   paréntesis), edición y número. El acabado (Holo, Reverse holo...), la
   condición y el idioma son de cada publicación.
   ========================================================================= */
import type { CondicionId, Estado, EstadoPedido, Publicacion } from '../types';
import { sinParentesis } from '../utils/formato';
import { normalizar } from '../utils/validaciones';
import { pubPorId, publicacionesVisibles } from './consultas';

export interface Producto {
  clave: string;
  juego: Publicacion['juego'];
  nombre: string;
  edicion: string;
  numero: string;
  rareza: string;
  publicaciones: Publicacion[];   // de menor a mayor precio, primero las que tienen stock
  mejor: Publicacion;             // la más barata con stock (o la más barata, si todas están agotadas)
  unidades: number;               // unidades disponibles sumando todas las publicaciones
  vendedores: number;
}

export const claveProducto = (p: Pick<Publicacion, 'juego' | 'nombre' | 'edicion' | 'numero'>): string =>
  [p.juego, normalizar(sinParentesis(p.nombre)), normalizar(p.edicion), normalizar(p.numero)].join('|');

const porPrecio = (a: Publicacion, b: Publicacion) => (Number(a.stock <= 0) - Number(b.stock <= 0)) || a.precio - b.precio;

function armar(clave: string, pubs: Publicacion[]): Producto {
  const publicaciones = [...pubs].sort(porPrecio);
  const mejor = publicaciones[0];
  return {
    clave, juego: mejor.juego, nombre: mejor.nombre, edicion: mejor.edicion, numero: mejor.numero, rareza: mejor.rareza,
    publicaciones, mejor,
    unidades: publicaciones.reduce((s, p) => s + Math.max(0, p.stock), 0),
    vendedores: new Set(publicaciones.map((p) => p.vendedorId)).size,
  };
}

/* Agrupa una lista de publicaciones por carta, respetando el orden de la lista
   (si viene ordenada por precio, la primera carta es la que tiene la oferta más barata). */
export function agruparProductos(pubs: Publicacion[]): Producto[] {
  const grupos = new Map<string, Publicacion[]>();
  pubs.forEach((p) => {
    const clave = claveProducto(p);
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(p);
    else grupos.set(clave, [p]);
  });
  return [...grupos].map(([clave, lista]) => armar(clave, lista));
}

/* La carta a la que pertenece una publicación, con todas las publicaciones visibles de esa carta.
   La publicación pedida siempre se incluye (aunque esté pausada) para que su dueño la vea. */
export function productoDe(e: Estado, pub: Publicacion): Producto {
  const clave = claveProducto(pub);
  const otras = publicacionesVisibles(e).filter((p) => p.id !== pub.id && claveProducto(p) === clave);
  return armar(clave, [pub, ...otras]);
}

/* Una venta de la carta en HoloMarket: una línea de un pedido no cancelado. */
export interface Venta {
  clave: string;
  pedidoId: string;
  fecha: number;
  condicion: CondicionId;
  idioma: string;
  acabado: string;
  cantidad: number;
  precio: number;          // precio unitario pagado
  vendedorId: string;
  estado: EstadoPedido;
}

/* Historial de ventas de la carta, de la más reciente a la más antigua. La carta se reconoce con
   los datos guardados en la línea del pedido, así se incluyen ventas de publicaciones ya eliminadas. */
export function ventasDeProducto(e: Estado, producto: Producto): Venta[] {
  return e.pedidos
    .filter((o) => o.estado !== 'cancelado')
    .flatMap((o) => o.items
      .filter((it) => claveProducto(it) === producto.clave)
      .map((it, i): Venta => ({
        clave: `${o.id}-${i}`, pedidoId: o.id, fecha: o.fecha, condicion: it.condicion, idioma: it.idioma,
        acabado: pubPorId(e, it.pubId)?.acabado ?? '', cantidad: it.cantidad, precio: it.precio,
        vendedorId: o.vendedorId, estado: o.estado,
      })))
    .sort((a, b) => b.fecha - a.fecha);
}

/* Unidades de la carta vendidas en HoloMarket (pedidos no cancelados). */
export const unidadesVendidas = (e: Estado, producto: Producto): number =>
  ventasDeProducto(e, producto).reduce((s, v) => s + v.cantidad, 0);
