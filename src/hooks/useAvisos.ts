import { useContext } from 'react';
import { AvisosContext, type AvisosValor } from '../context/avisosContext';

export function useAvisos(): AvisosValor {
  const valor = useContext(AvisosContext);
  if (!valor) throw new Error('useAvisos debe usarse dentro de <AvisosProvider>.');
  return valor;
}
