/* =========================================================================
   Tipos compartidos de HoloMarket
   -------------------------------------------------------------------------
   Describen la forma de los datos que guarda la aplicación. TypeScript los
   usa para avisar en el editor (y en "npm run build") si usamos un campo que
   no existe o con el tipo equivocado.
   ========================================================================= */

export type JuegoId = 'pokemon' | 'magic' | 'yugioh' | 'onepiece' | 'myl';
export type CondicionId = 'MT' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO';
export type Rol = 'admin' | 'cliente';
export type RolVisitante = Rol | 'visitante';
export type EstadoUsuario = 'activo' | 'bloqueado';
export type EstadoPublicacion = 'activa' | 'pausada' | 'eliminada';
export type EstadoPedido = 'pagado' | 'enviado' | 'entregado' | 'cancelado';
export type EstadoRetiro = 'solicitado' | 'pagado' | 'rechazado' | 'anulado';
export type TipoMovimiento = 'alta' | 'venta' | 'cancelacion' | 'entrada' | 'salida' | 'edicion' | 'baja';
export type MetodoEntrega = 'despacho' | 'retiro';
export type MetodoPago = 'tarjeta' | 'transferencia';
export type VistaPedidos = 'compras' | 'ventas';

/* ---------- Catálogo fijo ---------- */
export interface Juego {
  nombre: string;
  ediciones: string[];
}

export interface Condicion {
  id: CondicionId;
  nombre: string;
  detalle: string;
  equivalente: string;     // nombre que se usa en el mercado estadounidense (TCGplayer)
}

export interface Region {
  nombre: string;
  comunas: string[];
}

/* ---------- Usuarios ---------- */
export interface CuentaBancaria {
  banco: string;
  tipo: string;
  numero: string;          // se guarda completo solo en el usuario; en pantalla y en los retiros se enmascara
  actualizada: number;
}

export interface Usuario {
  id: string;
  rut: string;
  nombre: string;
  email: string;
  sal: string;             // texto aleatorio que se mezcla con la contraseña antes del hash
  clave: string;           // hash SHA-256 de sal + contraseña (nunca la contraseña en texto plano)
  rol: Rol;
  region: string;
  comuna: string;
  telefono: string;
  direccion: string;
  estado: EstadoUsuario;
  creado: number;
  consentimiento?: number; // fecha en que aceptó términos y privacidad (Ley 19.628 / 21.719)
  cuenta: CuentaBancaria | null;
}

/* ---------- Publicaciones y stock ---------- */
export interface Publicacion {
  id: string;
  vendedorId: string;
  juego: JuegoId;
  nombre: string;
  edicion: string;
  numero: string;
  rareza: string;
  acabado: string;
  idioma: string;
  condicion: CondicionId;
  precio: number;
  precioAnterior?: number | null;   // precio antes de la oferta (vacío o null = sin oferta)
  stock: number;
  estado: EstadoPublicacion;
  descripcion: string;
  imagen: string | null;      // foto subida por quien vende (data URL JPEG reducida)
  imagenApi: string | null;   // imagen elegida desde API TCG al publicar
  creado: number;
  actualizado: number;
}

export interface Movimiento {
  id: string;
  fecha: number;
  pubId: string;
  carta: string;
  juego: JuegoId;
  vendedorId: string;
  tipo: TipoMovimiento;
  cantidad: number;           // positiva = entra stock, negativa = sale
  antes: number;
  despues: number;
  ref: string;                // pedido o motivo del movimiento
  uid: string | null;         // quién lo hizo
}

export interface Actividad {
  id: string;
  fecha: number;
  uid: string | null;
  accion: string;
  detalle: string;
}

/* ---------- Pedidos ---------- */
export interface LineaPedido {
  pubId: string;
  nombre: string;
  juego: JuegoId;
  edicion: string;
  numero: string;
  condicion: CondicionId;
  idioma: string;
  precio: number;
  cantidad: number;
}

export interface Envio {
  metodo: MetodoEntrega;
  costo: number;
  receptor: string;
  telefono: string;
  region: string;
  comuna: string;
  direccion: string;
}

export interface Pago {
  metodo: MetodoPago;
  detalle: string;            // "tarjeta terminada en 1111": nunca el número completo
}

export interface Pedido {
  id: string;
  compradorId: string;
  vendedorId: string;
  fecha: number;
  items: LineaPedido[];
  subtotal: number;
  envio: Envio;
  total: number;
  comisionPct: number;
  comision: number;
  ivaComision: number;
  netoVendedor: number;
  pago: Pago;
  estado: EstadoPedido;
  historial: { estado: EstadoPedido; fecha: number }[];
  seguimiento: string;
}

/* ---------- Retiros de dinero ---------- */
export interface ResumenCuenta {
  banco: string;
  tipo: string;
  ultimos: string;
  titular: string;
  rut: string;
}

export interface Retiro {
  id: string;
  uid: string;
  monto: number;
  cuenta: ResumenCuenta;
  estado: EstadoRetiro;
  fecha: number;
  historial: { estado: EstadoRetiro; fecha: number }[];
  comprobante: string;
  motivo: string;
}

/* ---------- Configuración y estado completo ---------- */
export interface Configuracion {
  comision: number;
  iva: number;
  envioMismaRegion: number;
  envioOtraRegion: number;
  stockBajo: number;
  sesionMinutos: number;
  retiroMinimo: number;
  dolar: number;           // pesos por dólar, para mostrar en CLP el precio de mercado de TCGplayer
}

export type TipoSecuencia = 'usuario' | 'publicacion' | 'pedido' | 'movimiento' | 'actividad' | 'retiro';

export interface ConfiguracionGuardada extends Configuracion {
  secuencias: Record<TipoSecuencia, number>;
}

export interface Estado {
  usuarios: Usuario[];
  publicaciones: Publicacion[];
  pedidos: Pedido[];
  movimientos: Movimiento[];
  actividad: Actividad[];
  retiros: Retiro[];
  config: ConfiguracionGuardada;
}

export interface ItemCarrito {
  pubId: string;
  cantidad: number;
}

export interface Sesion {
  uid: string;
  expira: number;
}

/* Datos mínimos para dibujar una carta (una publicación o una vista previa). */
export interface DatosCarta {
  juego: JuegoId;
  nombre: string;
  edicion?: string;
  numero?: string;
  idioma?: string;
  acabado?: string;
  imagen?: string | null;
  imagenApi?: string | null;
}

/* Resultado de una operación que puede fallar con un mensaje para mostrar. */
export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };
