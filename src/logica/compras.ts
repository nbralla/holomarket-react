/* =========================================================================
   Carrito, compra y ciclo de vida de los pedidos
   ========================================================================= */
import type { Estado, ItemCarrito, MetodoEntrega, MetodoPago, Pedido, Publicacion, Resultado, Usuario } from '../types';
import { clp, plural, suma } from '../utils/formato';
import { pedidoPorId, pubPorId, publicacionesVisibles, usuarioPorId } from './consultas';
import { cambiarStock, construirPedido, costoEnvio, lineaDesde, registrarActividad, siguienteId } from './estado';

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

export interface DatosCompra {
  entrega: MetodoEntrega;
  pago: MetodoPago;
  receptor: string;
  telefono: string;
  region: string;
  comuna: string;
  direccion: string;
  numeroTarjeta: string;   // solo se usan los últimos 4 dígitos
}

/* Crea un pedido por vendedor y descuenta el stock. Antes revisa que haya stock para
   todo el carrito: se compra todo o nada (nunca queda stock negativo). */
export function procesarCompra(e: Estado, comprador: Usuario, items: ItemCarrito[], datos: DatosCompra): Resultado<Pedido[]> {
  const { lineas, avisos } = revisarCarrito(e, comprador.id, items);
  if (avisos.length) return { ok: false, error: `El stock cambió mientras comprabas. ${avisos.join(' ')} Revisa el resumen y vuelve a pagar.` };
  if (!lineas.length) return { ok: false, error: 'Tu carrito quedó vacío.' };
  const despacho = datos.entrega === 'despacho';
  const region = despacho ? datos.region : comprador.region;
  const compra = calcularCompra(e, lineas, datos.entrega, region);
  const digitos = datos.numeroTarjeta.replace(/\D/g, '');
  const detallePago = datos.pago === 'tarjeta' ? `tarjeta terminada en ${digitos.slice(-4)}` : 'transferencia simulada';
  const ahora = Date.now();
  const pedidos = compra.paquetes.map((g) => {
    const pedido = construirPedido(e.config, {
      id: siguienteId(e, 'pedido'), comprador, vendedor: g.vendedor, momento: ahora,
      lineas: g.items.map((l) => lineaDesde(l.pub, l.item.cantidad)),
      pago: { metodo: datos.pago, detalle: detallePago },
      envio: {
        metodo: datos.entrega, costo: g.envio, receptor: datos.receptor.trim(), telefono: datos.telefono.trim(),
        region: despacho ? region : '', comuna: despacho ? datos.comuna : '', direccion: despacho ? datos.direccion.trim() : '',
      },
    });
    e.pedidos.push(pedido);
    g.items.forEach((l) => cambiarStock(e, l.pub, l.pub.stock - l.item.cantidad, 'venta', pedido.id, comprador.id));
    registrarActividad(e, 'Compra realizada', `${pedido.id} a ${g.vendedor.nombre} por ${clp(pedido.total)}`, comprador.id);
    return pedido;
  });
  return { ok: true, valor: pedidos };
}

/* ---------- Estados del pedido: pagado → enviado → entregado (o cancelado) ---------- */
export function marcarEnviado(e: Estado, uid: string, id: string, seguimiento: string): Resultado<Pedido> {
  const o = pedidoPorId(e, id);
  if (!o || o.vendedorId !== uid || o.estado !== 'pagado') return { ok: false, error: 'Este pedido ya no se puede marcar como enviado.' };
  const retiro = o.envio.metodo === 'retiro';
  o.estado = 'enviado';
  o.seguimiento = retiro ? '' : seguimiento.trim().toUpperCase();
  o.historial.push({ estado: 'enviado', fecha: Date.now() });
  registrarActividad(e, retiro ? 'Pedido listo para entrega' : 'Pedido enviado', `${o.id}${o.seguimiento ? `, seguimiento ${o.seguimiento}` : ''}`, uid);
  return { ok: true, valor: o };
}

export function confirmarRecepcion(e: Estado, uid: string, id: string): Resultado<Pedido> {
  const o = pedidoPorId(e, id);
  if (!o || o.compradorId !== uid || o.estado !== 'enviado') return { ok: false, error: 'Este pedido ya no se puede confirmar.' };
  o.estado = 'entregado';
  o.historial.push({ estado: 'entregado', fecha: Date.now() });
  registrarActividad(e, 'Pedido recibido', o.id, uid);
  return { ok: true, valor: o };
}

/* Solo se cancela mientras está pagado (no enviado): las unidades vuelven al stock. */
export function cancelarPedido(e: Estado, uid: string, id: string): Resultado<{ pedido: Pedido; devueltas: number }> {
  const o = pedidoPorId(e, id);
  if (!o || o.compradorId !== uid || o.estado !== 'pagado') return { ok: false, error: 'Este pedido ya no se puede cancelar.' };
  let devueltas = 0;
  o.items.forEach((it) => {
    const pub = pubPorId(e, it.pubId);
    if (pub && pub.estado !== 'eliminada' && pub.stock + it.cantidad <= 999) {
      cambiarStock(e, pub, pub.stock + it.cantidad, 'cancelacion', o.id, uid);
      devueltas += it.cantidad;
    }
  });
  o.estado = 'cancelado';
  o.historial.push({ estado: 'cancelado', fecha: Date.now() });
  registrarActividad(e, 'Pedido cancelado', `${o.id}, ${devueltas} u. devueltas al stock`, uid);
  return { ok: true, valor: { pedido: o, devueltas } };
}
