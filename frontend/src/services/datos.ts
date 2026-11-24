/* =========================================================================
   Cliente de la API REST de HoloMarket (backend Spring Boot)
   -------------------------------------------------------------------------
   Igual que en el ejemplo de la PokéStore, la URL base sale de VITE_API_URL:
     - Desarrollo: "/api" y el proxy de Vite la reenvía a http://localhost:8080.
     - Producción (S3): http://IP-DE-LA-EC2/api, fijada en .env.production al compilar.

   Las reglas del negocio (stock, montos, permisos) las aplica el backend.
   Cada acción llama a su endpoint y después el front vuelve a pedir
   GET /api/estado, que devuelve todo lo que el usuario puede ver.
   ========================================================================= */
import { CONFIGURACION_INICIAL } from '../data/catalogo';
import { estadoValido } from '../logica/estado';
import type { DatosPublicacion } from '../logica/publicaciones';
import type { Configuracion, Estado, ItemCarrito, MetodoEntrega, MetodoPago, Pedido, Publicacion, Retiro, Usuario } from '../types';
import { leerSesion } from './sesion';

// import.meta.env lo completa Vite; en Karma (esbuild) no existe, por eso el "?.".
export const URL_API: string = import.meta.env?.VITE_API_URL || '/api';

/* Error con el mensaje que devuelve el backend: { status, message, errors }. */
export class ErrorApi extends Error {
  status: number;
  errores: Record<string, string>;

  constructor(status: number, mensaje: string, errores: Record<string, string> = {}) {
    super(mensaje);
    this.status = status;
    this.errores = errores;
  }
}

export const SIN_CONEXION = 'No hay conexión con el servidor de HoloMarket. Revisa que el backend esté encendido e inténtalo de nuevo.';

/* Si el token venció o el usuario fue bloqueado, el proveedor de la tienda registra aquí qué hacer. */
let alNoAutorizado: (() => void) | null = null;
export const avisarNoAutorizado = (fn: (() => void) | null): void => { alNoAutorizado = fn; };

async function pedir<T>(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  const token = leerSesion()?.token;
  const headers: Record<string, string> = {};
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${URL_API}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(0, SIN_CONEXION);
  }
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) alNoAutorizado?.();
    const errores: Record<string, string> = datos?.errors ?? {};
    // Para errores de validación se muestra el primer campo con problema: es más útil que "Datos inválidos".
    const detalle = datos?.message === 'Datos inválidos' ? Object.values(errores)[0] : undefined;
    throw new ErrorApi(res.status, detalle ?? datos?.message ?? `Error ${res.status}`, errores);
  }
  return datos as T;
}

/* READ: todo lo que el usuario actual puede ver (según su token), con la forma de types/index.ts. */
export async function cargarEstado(): Promise<Estado> {
  const crudo = await pedir<Estado>('/estado');
  if (!estadoValido(crudo)) throw new Error('La API respondió datos con una forma inesperada');
  crudo.config = { ...CONFIGURACION_INICIAL, ...crudo.config };
  return crudo;
}

/* ---------- Cuerpos de las peticiones ---------- */
export interface DatosRegistro {
  rut: string;
  nombre: string;
  email: string;
  telefono: string;
  region: string;
  comuna: string;
  clave: string;
  acepta: boolean;
}

export interface DatosCompra {
  entrega: MetodoEntrega;
  pago: MetodoPago;
  receptor: string;
  telefono: string;
  region: string;
  comuna: string;
  direccion: string;
  numeroTarjeta: string;
}

/* undefined = no cambia, null = se quita, texto = valor nuevo (igual que logica/publicaciones.ts) */
export interface CambiosImagen {
  imagen?: string | null;
  imagenApi?: string | null;
}

export interface RespuestaIngreso {
  token: string;
  usuario: Usuario;
}

const cuerpoPublicacion = (d: DatosPublicacion, img: CambiosImagen) => ({
  ...d,
  imagen: img.imagen ?? null,
  imagenApi: img.imagenApi ?? null,
  cambiaImagen: img.imagen !== undefined,
  cambiaImagenApi: img.imagenApi !== undefined,
});

const id = (x: string) => encodeURIComponent(x);

/* ---------- Endpoints (uno por acción del negocio) ---------- */
export const api = {
  ingresar: (email: string, clave: string) => pedir<RespuestaIngreso>('/auth/login', 'POST', { email, clave }),
  registrar: (d: DatosRegistro) => pedir<RespuestaIngreso>('/auth/registro', 'POST', d),
  salir: () => pedir<void>('/auth/salir', 'POST'),

  crearPublicacion: (d: DatosPublicacion, img: CambiosImagen) =>
    pedir<Publicacion>('/publicaciones', 'POST', cuerpoPublicacion(d, img)),
  editarPublicacion: (pubId: string, d: DatosPublicacion, img: CambiosImagen) =>
    pedir<Publicacion>(`/publicaciones/${id(pubId)}`, 'PUT', cuerpoPublicacion(d, img)),
  ajustarStock: (pubId: string, tipo: 'entrada' | 'salida', cantidad: number, motivo: string) =>
    pedir<Publicacion>(`/publicaciones/${id(pubId)}/stock`, 'POST', { tipo, cantidad, motivo }),
  cambiarPrecio: (pubId: string, precio: number) => pedir<Publicacion>(`/publicaciones/${id(pubId)}/precio`, 'PUT', { precio }),
  estadoPublicacion: (pubId: string, estado: 'activa' | 'pausada') =>
    pedir<Publicacion>(`/publicaciones/${id(pubId)}/estado`, 'PUT', { estado }),
  eliminarPublicacion: (pubId: string) => pedir<void>(`/publicaciones/${id(pubId)}`, 'DELETE'),

  comprar: (items: ItemCarrito[], d: DatosCompra) => pedir<Pedido[]>('/pedidos', 'POST', { items, ...d }),
  marcarEnviado: (pedidoId: string, seguimiento: string) => pedir<Pedido>(`/pedidos/${id(pedidoId)}/enviar`, 'POST', { seguimiento }),
  confirmarRecepcion: (pedidoId: string) => pedir<Pedido>(`/pedidos/${id(pedidoId)}/recibir`, 'POST'),
  cancelarPedido: (pedidoId: string) => pedir<Pedido>(`/pedidos/${id(pedidoId)}/cancelar`, 'POST'),

  guardarCuenta: (banco: string, tipo: string, numero: string) => pedir<void>('/usuarios/yo/cuenta', 'PUT', { banco, tipo, numero }),
  solicitarRetiro: (monto: number) => pedir<Retiro>('/retiros', 'POST', { monto }),
  anularRetiro: (retiroId: string) => pedir<Retiro>(`/retiros/${id(retiroId)}/anular`, 'POST'),
  transferirRetiro: (retiroId: string, comprobante: string) => pedir<Retiro>(`/retiros/${id(retiroId)}/transferir`, 'POST', { comprobante }),
  rechazarRetiro: (retiroId: string, motivo: string) => pedir<Retiro>(`/retiros/${id(retiroId)}/rechazar`, 'POST', { motivo }),

  estadoUsuario: (usuarioId: string, estado: 'activo' | 'bloqueado') => pedir<Usuario>(`/usuarios/${id(usuarioId)}/estado`, 'PUT', { estado }),
  guardarConfiguracion: (c: Configuracion) => pedir<Configuracion>('/config', 'PUT', c),
  restablecerDemo: () => pedir<void>('/admin/restablecer', 'POST'),
  registrarActividad: (accion: string, detalle: string) => pedir<void>('/actividad', 'POST', { accion, detalle }),
};
