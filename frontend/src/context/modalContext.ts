import { createContext, type ReactNode } from 'react';

export type CerrarModal<T> = (valor: T | null) => void;

export interface OpcionesConfirmar {
  titulo: string;
  mensaje: ReactNode;
  confirmar?: string;
  cancelar?: string | null;   // null = sin botón cancelar
  peligro?: boolean;
}

export interface ModalValor {
  /* Abre una ventana modal con el contenido que dibuja "render". La promesa entrega el valor
     con que se cerró, o null si se canceló (botón Cancelar o tecla Escape). */
  abrir: <T>(render: (cerrar: CerrarModal<T>) => ReactNode, opciones?: { ancho?: boolean }) => Promise<T | null>;
  /* Atajo para una pregunta de sí o no. */
  confirmar: (opciones: OpcionesConfirmar) => Promise<boolean>;
}

export const ModalContext = createContext<ModalValor | null>(null);
