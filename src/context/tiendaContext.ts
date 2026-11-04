import { createContext } from 'react';
import type { ResultadoIngreso } from '../services/sesion';
import type { Estado, ItemCarrito, Usuario } from '../types';

export interface TiendaValor {
  /* Datos de la tienda (usuarios, publicaciones, pedidos, movimientos, retiros...). */
  estado: Estado;
  /* Usuario con sesión activa, o null si es visitante. */
  usuario: Usuario | null;
  /* Carrito del usuario actual. */
  carrito: ItemCarrito[];
  /* Aplica un cambio sobre una copia del estado, redibuja la app y envía a la API (json-server)
     solo lo que cambió. Devuelve lo que devuelve "cambio", o null si la operación falló. */
  actualizar: <R>(cambio: (borrador: Estado) => R) => R | null;
  guardarCarrito: (items: ItemCarrito[]) => void;
  ingresar: (email: string, clave: string) => ResultadoIngreso;
  iniciarSesion: (usuario: Usuario) => void;
  cerrarSesion: (mensaje?: string) => void;
  /* Devuelve false si la API no respondió. */
  restablecerDemo: () => Promise<boolean>;
}

export const TiendaContext = createContext<TiendaValor | null>(null);
