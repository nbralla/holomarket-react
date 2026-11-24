import { createContext } from 'react';

export type TipoAviso = 'exito' | 'error' | 'info';

export interface AccionAviso {
  href: string;
  texto: string;
}

export interface AvisosValor {
  /* Muestra un aviso flotante (toast) que se cierra solo. */
  avisar: (mensaje: string, tipo?: TipoAviso, accion?: AccionAviso) => void;
}

export const AvisosContext = createContext<AvisosValor | null>(null);
