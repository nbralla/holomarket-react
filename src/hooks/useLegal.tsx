import { useCallback, type MouseEvent } from 'react';
import MarcoModal from '../components/MarcoModal';
import TextoLegal from '../components/TextoLegal';
import { TITULOS_LEGALES, type TipoLegal } from '../data/legal';
import { useModal } from './useModal';

/* Devuelve un manejador de clic que abre los textos legales en una ventana modal. */
export function useLegal() {
  const { abrir } = useModal();
  return useCallback((tipo: TipoLegal) => (ev?: MouseEvent) => {
    ev?.preventDefault();
    void abrir<boolean>((cerrar) => (
      <MarcoModal titulo={TITULOS_LEGALES[tipo]} confirmar="Entendido" cancelar={null}
        alConfirmar={() => cerrar(true)} alCancelar={() => cerrar(null)}>
        <TextoLegal tipo={tipo} />
      </MarcoModal>
    ), { ancho: tipo !== 'terminos' });
  }, [abrir]);
}
