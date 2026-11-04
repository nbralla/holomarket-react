import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import MarcoModal from '../components/MarcoModal';
import { ModalContext, type CerrarModal, type OpcionesConfirmar } from './modalContext';

interface Abierta {
  contenido: ReactNode;
  ancho: boolean;
}

/* Una sola ventana <dialog> para toda la app. showModal() bloquea el resto de la página
   y la tecla Escape la cierra (evento "cancel"). */
export function ModalProvider({ children }: { children: ReactNode }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((valor: unknown) => void) | null>(null);
  const [abierta, setAbierta] = useState<Abierta | null>(null);

  const cerrar = useCallback((valor: unknown) => {
    const r = resolver.current;
    resolver.current = null;
    setAbierta(null);
    r?.(valor);
  }, []);

  const abrir = useCallback(<T,>(render: (cerrar: CerrarModal<T>) => ReactNode, opciones?: { ancho?: boolean }) =>
    new Promise<T | null>((resolve) => {
      resolver.current?.(null);   // si había otra abierta, se cancela
      resolver.current = resolve as (valor: unknown) => void;
      setAbierta({ contenido: render((valor) => cerrar(valor)), ancho: Boolean(opciones?.ancho) });
    }), [cerrar]);

  const confirmar = useCallback(async (o: OpcionesConfirmar) => {
    const r = await abrir<boolean>((cerrarModal) => (
      <MarcoModal titulo={o.titulo} confirmar={o.confirmar} cancelar={o.cancelar === undefined ? 'Cancelar' : o.cancelar}
        peligro={o.peligro} alConfirmar={() => cerrarModal(true)} alCancelar={() => cerrarModal(null)}>
        {typeof o.mensaje === 'string' ? <p>{o.mensaje}</p> : o.mensaje}
      </MarcoModal>
    ));
    return r === true;
  }, [abrir]);

  // Abre o cierra el <dialog> y deja el foco en el primer campo (o en el botón principal).
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
    if (abierta) {
      const campo = d.querySelector<HTMLElement>('#modal-cuerpo input, #modal-cuerpo select, #modal-cuerpo textarea');
      (campo ?? d.querySelector<HTMLElement>('button[type="submit"]'))?.focus();
    }
  }, [abierta]);

  const alCancelar = (ev: SyntheticEvent<HTMLDialogElement>) => {
    ev.preventDefault();
    cerrar(null);
  };

  const valor = useMemo(() => ({ abrir, confirmar }), [abrir, confirmar]);

  return (
    <ModalContext.Provider value={valor}>
      {children}
      <dialog className={`ventana${abierta?.ancho ? ' ventana--ancho' : ''}`} id="modal" aria-labelledby="modal-titulo" ref={dialogo} onCancel={alCancelar}>
        {abierta?.contenido}
      </dialog>
    </ModalContext.Provider>
  );
}
