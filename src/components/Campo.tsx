import type { ReactNode } from 'react';

interface Props {
  id: string;
  etiqueta: ReactNode;
  error?: string;
  ayuda?: ReactNode;
  opcional?: boolean;
  clase?: string;
  children: ReactNode;
}

/* Campo de formulario: etiqueta, control, texto de ayuda y mensaje de error.
   El error va en <p id="{id}-error">, enlazado con aria-describedby desde el control. */
export default function Campo({ id, etiqueta, error, ayuda, opcional, clase, children }: Props) {
  return (
    <div className={`campo${error ? ' con-error' : ''}${clase ? ` ${clase}` : ''}`}>
      <label htmlFor={id}>{etiqueta}{opcional && <span className="campo__opcional"> (opcional)</span>}</label>
      {children}
      {ayuda !== undefined && <p className="campo__ayuda" id={`${id}-ayuda`}>{ayuda}</p>}
      <p className="campo__error" id={`${id}-error`}>{error}</p>
    </div>
  );
}
