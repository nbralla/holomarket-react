import { descuento } from '../logica/ofertas';
import type { Publicacion } from '../types';
import { clp } from '../utils/formato';

interface Props extends Pick<Publicacion, 'precio' | 'precioAnterior'> {
  clase?: string;
}

/* Precio de una publicación. Si está en oferta muestra también el precio anterior tachado
   y el porcentaje de descuento (badge de Bootstrap). */
export default function Precio({ precio, precioAnterior, clase = '' }: Props) {
  const pct = descuento({ precio, precioAnterior });
  return (
    <span className={`precio${pct ? ' precio--oferta' : ''}${clase ? ` ${clase}` : ''}`}>
      <span className="precio__actual">{clp(precio)}</span>
      {pct > 0 && (
        <>
          {' '}
          <s className="precio__anterior"><span className="visually-hidden">Antes: </span>{clp(precioAnterior as number)}</s>
          {' '}
          <span className="badge precio__descuento">-{pct}%</span>
        </>
      )}
    </span>
  );
}
