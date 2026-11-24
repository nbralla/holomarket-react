/* =========================================================================
   Consultas sobre el estado (no modifican nada)
   ========================================================================= */
import { CONDICIONES, IDIOMAS, JUEGOS, TODAS_RAREZAS, esJuego } from '../data/catalogo';
import type {
  CondicionId, Estado, JuegoId, Pedido, Publicacion, ResumenCuenta, Retiro, TipoMovimiento, Usuario, VistaPedidos,
} from '../types';
import { fecha, plural, sinParentesis, suma } from '../utils/formato';
import { normalizar } from '../utils/validaciones';

export const usuarioPorId = (e: Estado, id: string | null | undefined): Usuario | undefined => e.usuarios.find((u) => u.id === id);
export const pubPorId = (e: Estado, id: string | null | undefined): Publicacion | undefined => e.publicaciones.find((p) => p.id === id);
export const pedidoPorId = (e: Estado, id: string | null | undefined): Pedido | undefined => e.pedidos.find((o) => o.id === id);

/* Publicaciones que un comprador puede ver: activas y de vendedores no bloqueados. */
export function publicacionesVisibles(e: Estado): Publicacion[] {
  return e.publicaciones.filter((p) => {
    if (p.estado !== 'activa') return false;
    const v = usuarioPorId(e, p.vendedorId);
    return Boolean(v && v.estado === 'activo');
  });
}

export type ClaveEstadoPublicacion = 'activa' | 'pausada' | 'agotada' | 'eliminada';

export function estadoPublicacion(p: Publicacion): { clave: ClaveEstadoPublicacion; texto: string } {
  if (p.estado === 'eliminada') return { clave: 'eliminada', texto: 'Eliminada' };
  if (p.estado === 'pausada') return { clave: 'pausada', texto: 'Pausada' };
  if (p.stock <= 0) return { clave: 'agotada', texto: 'Agotada' };
  return { clave: 'activa', texto: 'Activa' };
}

export function infoStock(stock: number, stockBajo: number): { texto: string; clase: string } {
  if (stock <= 0) return { texto: 'Sin stock', clase: 'stock--agotado' };
  if (stock <= stockBajo) return { texto: stock === 1 ? 'Última unidad' : `Quedan ${stock}`, clase: 'stock--bajo' };
  return { texto: `${stock} ${plural(stock, 'disponible', 'disponibles')}`, clase: '' };
}

/* Dos publicaciones son "la misma carta" si coinciden juego, nombre, edición, número y acabado. */
export function mismaCarta(a: Publicacion, b: Publicacion): boolean {
  const clave = (p: Publicacion) =>
    [p.juego, normalizar(sinParentesis(p.nombre)), normalizar(p.edicion), normalizar(p.numero), p.acabado].join('|');
  return clave(a) === clave(b);
}

export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, string> = {
  alta: 'Alta de publicación', venta: 'Venta', cancelacion: 'Devolución por cancelación',
  entrada: 'Ajuste de entrada', salida: 'Ajuste de salida', edicion: 'Edición de publicación', baja: 'Baja de publicación',
};

/* ---------- Filtros del catálogo (se guardan en la URL para poder compartirla) ---------- */
export type Orden = 'recientes' | 'precio-asc' | 'precio-desc' | 'nombre';

export const ORDENES: Record<Orden, (a: Publicacion, b: Publicacion) => number> = {
  recientes: (a, b) => b.creado - a.creado,
  'precio-asc': (a, b) => a.precio - b.precio,
  'precio-desc': (a, b) => b.precio - a.precio,
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
};

export interface Filtros {
  juego: JuegoId | '';
  q: string;
  cond: CondicionId[];
  rareza: string;
  idioma: string;
  min: string;
  max: string;
  agotadas: boolean;
  orden: Orden;
}

export const FILTROS_VACIOS: Filtros = { juego: '', q: '', cond: [], rareza: '', idioma: '', min: '', max: '', agotadas: false, orden: 'recientes' };

const soloDigitos = (v: string | null) => String(v ?? '').replace(/\D/g, '').slice(0, 9);
const esOrden = (v: string | null): v is Orden => v !== null && Object.prototype.hasOwnProperty.call(ORDENES, v);

export function leerFiltros(params: URLSearchParams): Filtros {
  const juego = params.get('juego') ?? '';
  const rareza = params.get('rareza') ?? '';
  const idioma = params.get('idioma') ?? '';
  const orden = params.get('orden');
  return {
    juego: esJuego(juego) ? juego : '',
    q: (params.get('q') ?? '').trim().slice(0, 60),
    cond: (params.get('cond') ?? '').split(',').filter((c): c is CondicionId => CONDICIONES.some((x) => x.id === c)),
    rareza: TODAS_RAREZAS.includes(rareza) ? rareza : '',
    idioma: IDIOMAS[idioma] ? idioma : '',
    min: soloDigitos(params.get('min')),
    max: soloDigitos(params.get('max')),
    agotadas: params.get('agotadas') === '1',
    orden: esOrden(orden) ? orden : 'recientes',
  };
}

export function rutaCatalogo(f: Filtros): string {
  const p = new URLSearchParams();
  if (f.juego) p.set('juego', f.juego);
  if (f.q) p.set('q', f.q);
  if (f.cond.length) p.set('cond', f.cond.join(','));
  if (f.rareza) p.set('rareza', f.rareza);
  if (f.idioma) p.set('idioma', f.idioma);
  if (f.min) p.set('min', f.min);
  if (f.max) p.set('max', f.max);
  if (f.agotadas) p.set('agotadas', '1');
  if (f.orden !== 'recientes') p.set('orden', f.orden);
  const consulta = p.toString();
  return `/catalogo${consulta ? `?${consulta}` : ''}`;
}

export const rangoPrecioInvalido = (f: Filtros): boolean => f.min !== '' && f.max !== '' && Number(f.min) > Number(f.max);

export function filtrarPublicaciones(e: Estado, f: Filtros): Publicacion[] {
  const terminos = normalizar(f.q).split(/\s+/).filter(Boolean);
  const invalido = rangoPrecioInvalido(f);
  const min = f.min === '' || invalido ? null : Number(f.min);
  const max = f.max === '' || invalido ? null : Number(f.max);
  return publicacionesVisibles(e).filter((p) => {
    if (!f.agotadas && p.stock <= 0) return false;
    if (f.juego && p.juego !== f.juego) return false;
    if (f.cond.length && !f.cond.includes(p.condicion)) return false;
    if (f.rareza && p.rareza !== f.rareza) return false;
    if (f.idioma && p.idioma !== f.idioma) return false;
    if (min !== null && p.precio < min) return false;
    if (max !== null && p.precio > max) return false;
    if (!terminos.length) return true;
    const texto = normalizar(`${p.nombre} ${p.edicion} ${p.numero} ${JUEGOS[p.juego].nombre}`);
    return terminos.every((t) => texto.includes(t));
  }).sort((a, b) => (Number(a.stock <= 0) - Number(b.stock <= 0)) || ORDENES[f.orden](a, b));
}

/* ---------- Pedidos ---------- */
export function textoEstadoPedido(o: Pedido, vista: VistaPedidos): string {
  if (o.estado === 'pagado') return vista === 'ventas' ? 'Por enviar' : 'Pagado, en preparación';
  if (o.estado === 'enviado') return o.envio.metodo === 'retiro' ? 'Listo para entrega' : 'En camino';
  return o.estado === 'entregado' ? 'Entregado' : 'Cancelado';
}

/* ---------- Saldo y retiros del vendedor ----------
   El neto de cada venta (precio − comisión − IVA de la comisión) queda retenido mientras el
   pedido está pagado o enviado, y se libera cuando quien compra confirma la recepción.
   Saldo disponible = ventas liberadas − retiros en proceso − retiros transferidos. */
export interface Saldo {
  liberado: number;
  retenido: number;
  nRetenidos: number;
  enProceso: number;
  nEnProceso: number;
  retirado: number;
  disponible: number;
}

export function saldoVendedor(e: Estado, uid: string): Saldo {
  const ventas = e.pedidos.filter((o) => o.vendedorId === uid);
  const enCurso = ventas.filter((o) => o.estado === 'pagado' || o.estado === 'enviado');
  const retiros = e.retiros.filter((r) => r.uid === uid);
  const enProceso = retiros.filter((r) => r.estado === 'solicitado');
  const liberado = suma(ventas.filter((o) => o.estado === 'entregado'), (o) => o.netoVendedor);
  const montoEnProceso = suma(enProceso, (r) => r.monto);
  const retirado = suma(retiros.filter((r) => r.estado === 'pagado'), (r) => r.monto);
  return {
    liberado, retenido: suma(enCurso, (o) => o.netoVendedor), nRetenidos: enCurso.length,
    enProceso: montoEnProceso, nEnProceso: enProceso.length, retirado,
    disponible: Math.max(0, liberado - montoEnProceso - retirado),
  };
}

export const ESTADOS_RETIRO: Record<Retiro['estado'], string> = {
  solicitado: 'En proceso', pagado: 'Transferido', rechazado: 'Rechazado', anulado: 'Anulado',
};
export const DIAS_HABILES_RETIRO = 2;

/* La cuenta se muestra y se copia a cada retiro solo con sus últimos 4 dígitos. */
export function resumenCuenta(u: Usuario | null | undefined): ResumenCuenta | null {
  const c = u?.cuenta;
  return u && c ? { banco: c.banco, tipo: c.tipo, ultimos: String(c.numero).slice(-4), titular: u.nombre, rut: u.rut } : null;
}

export const cuentaTexto = (c: ResumenCuenta): string => `${c.banco}, ${c.tipo} terminada en ${c.ultimos}`;

export function sumarDiasHabiles(t: number, dias: number): number {
  const f = new Date(t);
  let n = 0;
  while (n < dias) {
    f.setDate(f.getDate() + 1);
    if (f.getDay() !== 0 && f.getDay() !== 6) n += 1;
  }
  return f.getTime();
}

export function detalleRetiro(r: Retiro): string {
  const cuando = (estado: Retiro['estado']) => {
    const h = r.historial.find((x) => x.estado === estado);
    return h ? fecha(h.fecha) : '';
  };
  if (r.estado === 'solicitado') return `Transferencia estimada: ${fecha(sumarDiasHabiles(r.fecha, DIAS_HABILES_RETIRO))}.`;
  if (r.estado === 'pagado') return `Transferido el ${cuando('pagado')}.${r.comprobante ? ` Comprobante ${r.comprobante}.` : ''}`;
  if (r.estado === 'rechazado') return `Rechazado el ${cuando('rechazado')}: ${String(r.motivo).replace(/\.$/, '')}. El monto volvió al saldo.`;
  return `Anulado el ${cuando('anulado')}. El monto volvió al saldo.`;
}
