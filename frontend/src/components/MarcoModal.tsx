import type { FormEvent, ReactNode } from 'react';

interface Props {
  titulo: string;
  children: ReactNode;
  confirmar?: string;
  cancelar?: string | null;
  peligro?: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}

/* Estructura común de las ventanas modales: título, contenido y botones. */
export default function MarcoModal({ titulo, children, confirmar = 'Aceptar', cancelar = 'Cancelar', peligro = false, alConfirmar, alCancelar }: Props) {
  const enviar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    alConfirmar();
  };
  return (
    <form id="modal-form" noValidate onSubmit={enviar}>
      <h2 className="ventana__titulo" id="modal-titulo">{titulo}</h2>
      <div className="ventana__cuerpo" id="modal-cuerpo">{children}</div>
      <div className="ventana__acciones" id="modal-acciones">
        {cancelar && <button type="button" className="btn btn--fantasma" data-modal="cancelar" onClick={alCancelar}>{cancelar}</button>}
        <button type="submit" className={`btn ${peligro ? 'btn--peligro' : 'btn--primario'}`}>{confirmar}</button>
      </div>
    </form>
  );
}
