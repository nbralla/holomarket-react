import { createContext } from 'react';
import type { DatosRegistro } from '../services/datos';
import type { ResultadoIngreso } from '../services/sesion';
import type { Estado, ItemCarrito, Resultado, Usuario } from '../types';

export interface TiendaValor {
  /* Datos de la tienda que el usuario puede ver (los entrega GET /api/estado según su rol). */
  estado: Estado;
  /* Usuario con sesión activa, o null si es visitante. */
  usuario: Usuario | null;
  /* Carrito del usuario actual. */
  carrito: ItemCarrito[];
  /* Llama a un endpoint de la API y, si responde bien, vuelve a cargar los datos de la tienda.
     Nunca lanza: devuelve { ok: true, valor } o { ok: false, error } con el mensaje del backend. */
  ejecutar: <R>(llamada: () => Promise<R>) => Promise<Resultado<R>>;
  guardarCarrito: (items: ItemCarrito[]) => void;
  ingresar: (email: string, clave: string) => Promise<ResultadoIngreso>;
  registrar: (datos: DatosRegistro) => Promise<ResultadoIngreso>;
  cerrarSesion: (mensaje?: string) => void;
  /* Devuelve false si la API no respondió. */
  restablecerDemo: () => Promise<boolean>;
}

export const TiendaContext = createContext<TiendaValor | null>(null);
