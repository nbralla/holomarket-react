import { useContext } from 'react';
import { ModalContext, type ModalValor } from '../context/modalContext';

export function useModal(): ModalValor {
  const valor = useContext(ModalContext);
  if (!valor) throw new Error('useModal debe usarse dentro de <ModalProvider>.');
  return valor;
}
