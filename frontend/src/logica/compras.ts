/* =========================================================================
   Carrito y resumen de la compra
   -------------------------------------------------------------------------
   Sirven para mostrar el carrito y el checkout al instante. El pago, el
   descuento de stock y los estados del pedido los hace el backend
   (PedidoService): ahí se vuelve a validar todo con los datos guardados.
   ========================================================================= */
import type { Estado, ItemCarrito, MetodoEntrega, Publicacion, Resultado, Usuario } from '../types';
import { plural, suma } from '../utils/formato';
import { pubPorId, publicacionesVisibles, usuarioPorId } from './consultas';
import { costoEnvio } from './estado';

export interface LineaCarrito {
  item: ItemCarrito;
  pub: Publicacion;
}

export interface Paquete {
  vendedor: Usuario;
  items: LineaCarrito[];
  subtotal: number;
  unidades: number;
  envio: number;
}

export interface ResumenCompra {
  paquetes: Paquete[];
  subtotal: number;
  envio: number;
  total: number;
  unidades: number;
}

/* Compara el carrito con el stock actual: quita lo que ya no se puede comprar y ajusta cantidades. */
export function revisarCarrito(e: Estado, uid: string, items: ItemCarrito[]): { lineas: LineaCarrito[]; avisos: string[]; items: ItemCarrito[] } {
  const visibles = new Set(publicacionesVisibles(e).map((p) => p.id));
  const avisos: string[] = [];
  const lineas: LineaCarrito[] = [];
  items.forEach((original) => {
    const item = { ...original };
    const pub = pubPorId(e, item.pubId);
    if (!pub || !visibles.has(pub.id) || pub.vendedorId === uid) {
      avisos.push(`${pub ? pub.nombre : 'Una carta'} ya no está disponible y la quitamos de tu carrito.`);
    } else if (pub.stock <= 0) {
      avisos.push(`${pub.nombre} se agotó y la quitamos de tu carrito.`);
    } else {
      if (item.cantidad > pub.stock) {
        avisos.push(`Solo quedan ${pub.stock} ${plural(pub.stock, 'unidad', 'unidades')} de ${pub.nombre}; ajustamos la cantidad.`);
        item.cantidad = pub.stock;
      }
      lineas.push({ item, pub });
    }
  });
  return { lineas, avisos, items: lineas.map((l) => l.item) };
}

/* Un pedido y un envío por vendedor: cada uno despacha su propio paquete. */
export function calcularCompra(e: Estado, lineas: LineaCarrito[], metodo: MetodoEntrega, regionDestino: string): ResumenCompra {
  const grupos = new Map<string, LineaCarrito[]>();
  lineas.forEach((l) => grupos.set(l.pub.vendedorId, [...(grupos.get(l.pub.vendedorId) ?? []), l]));
  const paquetes: Paquete[] = [];
  grupos.forEach((items, vendedorId) => {
    const vendedor = usuarioPorId(e, vendedorId);
    if (!vendedor) return;
    paquetes.push({
      vendedor, items,
      subtotal: suma(items, (l) => l.pub.precio * l.item.cantidad),
      unidades: suma(items, (l) => l.item.cantidad),
      envio: costoEnvio(e.config, metodo, vendedor.region, regionDestino),
    });
  });
  const subtotal = suma(paquetes, (g) => g.subtotal);
  const envio = suma(paquetes, (g) => g.envio);
  return { paquetes, subtotal, envio, total: subtotal + envio, unidades: suma(paquetes, (g) => g.unidades) };
}

/* Valida que se pueda agregar una cantidad al carrito. Devuelve los ítems nuevos o el motivo del rechazo. */
export function agregarAlCarrito(e: Estado, usuario: Usuario, items: ItemCarrito[], pubId: string, cantidad: number): Resultado<ItemCarrito[]> {
  if (usuario.rol !== 'cliente') return { ok: false, error: 'La cuenta de administración no puede comprar. Ingresa con un usuario cliente.' };
  const pub = pubPorId(e, pubId);
  if (!pub || !publicacionesVisibles(e).includes(pub) || pub.stock <= 0) return { ok: false, error: 'Esta publicación ya no está disponible.' };
  if (pub.vendedorId === usuario.id) return { ok: false, error: 'No puedes comprar tus propias cartas.' };
  const actual = items.find((i) => i.pubId === pubId)?.cantidad ?? 0;
  if (actual + cantidad > pub.stock) {
    const libres = pub.stock - actual;
    return {
      ok: false,
      error: libres <= 0
        ? `Ya tienes en el carrito todas las unidades disponibles de ${pub.nombre} (${pub.stock}).`
        : `Solo hay ${pub.stock} ${plural(pub.stock, 'unidad', 'unidades')} de ${pub.nombre}: puedes agregar ${libres} más.`,
    };
  }
  const nuevos = actual
    ? items.map((i) => (i.pubId === pubId ? { ...i, cantidad: i.cantidad + cantidad } : i))
    : [...items, { pubId, cantidad }];
  return { ok: true, valor: nuevos };
}
