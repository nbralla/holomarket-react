/* =========================================================================
   Estado de la tienda: creación de los datos de demostración y operaciones
   básicas que comparten todas las reglas de negocio.
   -------------------------------------------------------------------------
   Todas las funciones de la carpeta logica/ son "puras" respecto de React:
   reciben el estado (un borrador que se puede modificar) y no tocan el DOM
   ni el localStorage. Por eso se pueden probar con Vitest sin navegador.
   ========================================================================= */
import { CONFIGURACION_INICIAL } from '../data/catalogo';
import { PEDIDOS_DEMO, PUBLICACIONES_DEMO, RETIROS_DEMO, USUARIOS_DEMO } from '../data/demo';
import type {
  Configuracion, Envio, Estado, LineaPedido, MetodoEntrega, Pago, Pedido, Publicacion,
  Retiro, TipoMovimiento, TipoSecuencia, Usuario,
} from '../types';
import { clp, DIA } from '../utils/formato';
import { hashClave, hexAleatorio } from '../utils/sha256';

/* ---------- Identificadores correlativos: U04, P026, HM-1005, RET-003... ---------- */
export function siguienteId(e: Estado, tipo: TipoSecuencia): string {
  const s = e.config.secuencias;
  s[tipo] = (s[tipo] || 0) + 1;
  const n = s[tipo];
  if (tipo === 'pedido') return `HM-${n}`;
  if (tipo === 'retiro') return `RET-${String(n).padStart(3, '0')}`;
  const prefijo = { usuario: 'U', publicacion: 'P', movimiento: 'M', actividad: 'A' }[tipo];
  return prefijo + String(n).padStart(tipo === 'usuario' ? 2 : 3, '0');
}

/* ---------- Auditoría ---------- */
export function registrarActividad(e: Estado, accion: string, detalle: string, uid: string | null | undefined, momento = Date.now()): void {
  e.actividad.push({ id: siguienteId(e, 'actividad'), fecha: momento, uid: uid ?? null, accion, detalle: detalle || '' });
  if (e.actividad.length > 400) e.actividad = e.actividad.slice(-400);
}

interface DatosMovimiento {
  pub: Publicacion;
  tipo: TipoMovimiento;
  cantidad: number;
  antes: number;
  despues: number;
  ref: string;
  uid: string | null;
  momento?: number;
}

export function registrarMovimiento(e: Estado, m: DatosMovimiento): void {
  e.movimientos.push({
    id: siguienteId(e, 'movimiento'), fecha: m.momento ?? Date.now(), pubId: m.pub.id, carta: m.pub.nombre, juego: m.pub.juego,
    vendedorId: m.pub.vendedorId, tipo: m.tipo, cantidad: m.cantidad, antes: m.antes, despues: m.despues, ref: m.ref || '', uid: m.uid,
  });
}

/* Cambia el stock de una publicación y deja la trazabilidad en el historial (kardex). */
export function cambiarStock(e: Estado, pub: Publicacion, nuevoStock: number, tipo: TipoMovimiento, ref: string, uid: string | null): number {
  const antes = pub.stock;
  if (!Number.isInteger(nuevoStock) || nuevoStock < 0) throw new Error('El stock no puede quedar negativo.');
  pub.stock = nuevoStock;
  pub.actualizado = Date.now();
  registrarMovimiento(e, { pub, tipo, cantidad: nuevoStock - antes, antes, despues: nuevoStock, ref, uid });
  return antes;
}

/* ---------- Envíos y pedidos ---------- */
export function costoEnvio(config: Configuracion, metodo: MetodoEntrega, regionVendedor: string, regionComprador: string): number {
  if (metodo === 'retiro') return 0;
  return regionVendedor === regionComprador ? config.envioMismaRegion : config.envioOtraRegion;
}

export function lineaDesde(pub: Publicacion, cantidad: number): LineaPedido {
  return {
    pubId: pub.id, nombre: pub.nombre, juego: pub.juego, edicion: pub.edicion, numero: pub.numero,
    condicion: pub.condicion, idioma: pub.idioma, precio: pub.precio, cantidad,
  };
}

interface DatosPedido {
  id: string;
  comprador: Usuario;
  vendedor: Usuario;
  lineas: LineaPedido[];
  envio: Envio;
  pago: Pago;
  momento: number;
}

/* La comisión (y su IVA) se descuenta al vendedor; quien compra paga cartas + envío. */
export function construirPedido(config: Configuracion, d: DatosPedido): Pedido {
  const subtotal = d.lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const comision = Math.round(subtotal * config.comision / 100);
  const ivaComision = Math.round(comision * config.iva / 100);
  return {
    id: d.id, compradorId: d.comprador.id, vendedorId: d.vendedor.id, fecha: d.momento,
    items: d.lineas, subtotal, envio: d.envio, total: subtotal + d.envio.costo,
    comisionPct: config.comision, comision, ivaComision, netoVendedor: subtotal - comision - ivaComision,
    pago: d.pago, estado: 'pagado', historial: [{ estado: 'pagado', fecha: d.momento }], seguimiento: '',
  };
}

/* ---------- Datos de demostración ---------- */
export function crearEstadoInicial(ahora = Date.now()): Estado {
  const e: Estado = {
    config: {
      ...CONFIGURACION_INICIAL,
      secuencias: {
        usuario: USUARIOS_DEMO.length - 1, publicacion: PUBLICACIONES_DEMO.length, pedido: 1000 + PEDIDOS_DEMO.length,
        movimiento: 0, actividad: 0, retiro: RETIROS_DEMO.length,
      },
    },
    usuarios: [], publicaciones: [], pedidos: [], movimientos: [], actividad: [], retiros: [],
  };

  e.usuarios = USUARIOS_DEMO.map((u) => {
    const sal = hexAleatorio(8);
    const creado = ahora - u.diasAtras * DIA;
    return {
      id: u.id, rut: u.rut, nombre: u.nombre, email: u.email.toLowerCase(), sal, clave: hashClave(sal, u.clave),
      rol: u.rol, region: u.region, comuna: u.comuna, telefono: u.telefono, direccion: u.direccion,
      estado: 'activo', creado, cuenta: u.cuenta ? { ...u.cuenta, actualizada: creado } : null,
    };
  });

  // Unidades ya vendidas en los pedidos de ejemplo (para reconstruir el stock inicial de cada publicación).
  const vendidas: Record<string, number> = {};
  PEDIDOS_DEMO.forEach((o) => o.items.forEach((it) => { vendidas[it.pub] = (vendidas[it.pub] ?? 0) + it.cantidad; }));

  e.publicaciones = PUBLICACIONES_DEMO.map((p) => {
    const creado = ahora - p.diasAtras * DIA - 3600000;
    return {
      id: p.id, vendedorId: p.vendedor, juego: p.juego, nombre: p.nombre, edicion: p.edicion, numero: p.numero,
      rareza: p.rareza, acabado: p.acabado, idioma: p.idioma, condicion: p.condicion, precio: p.precio,
      precioAnterior: p.precioAnterior ?? null, stock: p.stock,
      estado: p.estado, descripcion: p.descripcion, imagen: null, imagenApi: null, creado, actualizado: creado,
    };
  });

  const stockTemporal: Record<string, number> = {};
  e.publicaciones.forEach((p) => {
    const inicial = p.stock + (vendidas[p.id] ?? 0);
    stockTemporal[p.id] = inicial;
    registrarMovimiento(e, { pub: p, tipo: 'alta', cantidad: inicial, antes: 0, despues: inicial, ref: 'Publicación inicial', uid: p.vendedorId, momento: p.creado });
    registrarActividad(e, 'Publicación creada', `${p.nombre} (${p.id}), ${inicial} u.`, p.vendedorId, p.creado);
  });

  // Pedidos de ejemplo con su historial de estados y sus movimientos de venta.
  [...PEDIDOS_DEMO].sort((a, b) => b.estados[0][1] - a.estados[0][1]).forEach((o) => {
    const comprador = e.usuarios.find((u) => u.id === o.comprador) as Usuario;
    const vendedor = e.usuarios.find((u) => u.id === o.vendedor) as Usuario;
    const momento = ahora - o.estados[0][1] * DIA;
    const lineas = o.items.map((it) => {
      const linea = lineaDesde(e.publicaciones.find((p) => p.id === it.pub) as Publicacion, it.cantidad);
      return it.precio ? { ...linea, precio: it.precio } : linea;
    });
    const envio: Envio = {
      metodo: o.entrega, costo: costoEnvio(e.config, o.entrega, vendedor.region, comprador.region), receptor: comprador.nombre,
      telefono: comprador.telefono, region: comprador.region, comuna: comprador.comuna, direccion: comprador.direccion,
    };
    const pago: Pago = { metodo: o.pago, detalle: o.pago === 'tarjeta' ? 'tarjeta terminada en 1111' : 'transferencia simulada' };
    const pedido = construirPedido(e.config, { id: o.id, comprador, vendedor, lineas, envio, pago, momento });
    pedido.historial = o.estados.map(([estado, dias]) => ({ estado, fecha: ahora - dias * DIA }));
    pedido.estado = o.estados[o.estados.length - 1][0];
    pedido.seguimiento = o.seguimiento;
    e.pedidos.push(pedido);
    lineas.forEach((l) => {
      const antes = stockTemporal[l.pubId];
      stockTemporal[l.pubId] = antes - l.cantidad;
      const pub = e.publicaciones.find((p) => p.id === l.pubId) as Publicacion;
      registrarMovimiento(e, { pub, tipo: 'venta', cantidad: -l.cantidad, antes, despues: antes - l.cantidad, ref: o.id, uid: comprador.id, momento });
    });
    registrarActividad(e, 'Compra realizada', `${o.id} por ${clp(pedido.total)}`, comprador.id, momento);
  });

  // Retiros de ejemplo: el saldo sale de los pedidos entregados de arriba.
  RETIROS_DEMO.forEach((r) => {
    const u = e.usuarios.find((x) => x.id === r.usuario) as Usuario;
    const historial = r.estados.map(([estado, dias]) => ({ estado, fecha: ahora - dias * DIA }));
    const final = historial[historial.length - 1];
    const retiro: Retiro = {
      id: r.id, uid: u.id, monto: r.monto, estado: final.estado, fecha: historial[0].fecha, historial,
      comprobante: r.comprobante ?? '', motivo: '',
      cuenta: { banco: u.cuenta?.banco ?? '', tipo: u.cuenta?.tipo ?? '', ultimos: (u.cuenta?.numero ?? '').slice(-4), titular: u.nombre, rut: u.rut },
    };
    e.retiros.push(retiro);
    registrarActividad(e, 'Retiro solicitado', `${r.id} por ${clp(r.monto)}`, u.id, historial[0].fecha);
    if (final.estado === 'pagado') {
      registrarActividad(e, 'Retiro transferido', `${r.id} por ${clp(r.monto)}, comprobante ${r.comprobante}`, 'U00', final.fecha);
    }
  });

  e.usuarios.filter((u) => u.rol === 'cliente').forEach((u) => registrarActividad(e, 'Registro de usuario', u.email, u.id, u.creado));
  e.movimientos.sort((a, b) => a.fecha - b.fecha);
  e.actividad.sort((a, b) => a.fecha - b.fecha);
  return e;
}

/* Revisa que lo leído del almacenamiento tenga la forma esperada. */
export function estadoValido(e: unknown): e is Estado {
  if (!e || typeof e !== 'object') return false;
  const x = e as Record<string, unknown>;
  const config = x.config as { secuencias?: unknown } | null | undefined;
  return ['usuarios', 'publicaciones', 'pedidos', 'movimientos', 'actividad', 'retiros'].every((c) => Array.isArray(x[c])) &&
    Boolean(config && typeof config === 'object' && config.secuencias);
}

/* Asegura que cada secuencia sea al menos el número más alto ya usado (HM-1005 -> 1005).
   Si un guardado se cortó a la mitad (por ejemplo, al cerrar la pestaña), así nunca se repite un id.
   Devuelve true si tuvo que corregir algo. */
export function reconciliarSecuencias(e: Estado): boolean {
  const colecciones: Record<TipoSecuencia, { id: string }[]> = {
    usuario: e.usuarios, publicacion: e.publicaciones, pedido: e.pedidos,
    movimiento: e.movimientos, actividad: e.actividad, retiro: e.retiros,
  };
  let corregido = false;
  (Object.keys(colecciones) as TipoSecuencia[]).forEach((tipo) => {
    const maximo = colecciones[tipo].reduce((max, x) => Math.max(max, Number(/(\d+)$/.exec(x.id)?.[1] ?? 0)), 0);
    if ((e.config.secuencias[tipo] || 0) < maximo) {
      e.config.secuencias[tipo] = maximo;
      corregido = true;
    }
  });
  return corregido;
}
