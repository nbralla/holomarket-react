import { infoStock, usuarioPorId } from '../logica/consultas';
import { useCarrito } from '../hooks/useCarrito';
import { useTienda } from '../hooks/useTienda';
import type { Publicacion } from '../types';
import { nombreCorto } from '../utils/formato';
import Carta from './Carta';
import Precio from './Precio';
import { CondicionChip } from './Chips';

import { Link } from 'react-router';
/* Tarjeta de una publicación en el catálogo y en el inicio. */
export default function Ficha({ pub }: { pub: Publicacion }) {
  const { estado, usuario } = useTienda();
  const { agregar } = useCarrito();
  const vendedor = usuarioPorId(estado, pub.vendedorId);
  const stock = infoStock(pub.stock, estado.config.stockBajo);
  const extras = [pub.idioma, pub.acabado !== 'Normal' ? pub.acabado : ''].filter(Boolean);

  let boton = null;
  if (pub.stock <= 0) {
    boton = <button className="btn btn--chico btn--bloque" type="button" disabled>Agotada</button>;
  } else if (usuario && usuario.id === pub.vendedorId) {
    boton = <Link className="btn btn--suave btn--chico btn--bloque" to={`/vender/${pub.id}`}>Editar mi publicación</Link>;
  } else if (!usuario || usuario.rol !== 'admin') {
    boton = (
      <button className="btn btn--fantasma btn--chico btn--bloque" type="button" data-accion="agregar" data-id={pub.id}
        aria-label={`Agregar ${pub.nombre} al carrito`} onClick={() => agregar(pub.id, 1)}>
        Agregar al carrito
      </button>
    );
  }

  return (
    <article className={`ficha${pub.stock <= 0 ? ' ficha--agotada' : ''}`}>
      <Link className="ficha__enlace" to={`/carta/${pub.id}`}>
        <Carta carta={pub} />
        <h3 className="ficha__nombre">{pub.nombre}</h3>
      </Link>
      <p className="ficha__edicion">{pub.edicion}{pub.numero ? `, ${pub.numero}` : ''}</p>
      <p className="ficha__etiquetas">
        <CondicionChip id={pub.condicion} />
        {extras.map((t) => <span key={t} className="etiqueta">{t}</span>)}
      </p>
      <div className="ficha__compra">
        <p className="ficha__precio"><Precio precio={pub.precio} precioAnterior={pub.precioAnterior} /></p>
        <p className={`ficha__stock ${stock.clase}`}>{stock.texto}</p>
      </div>
      <p className="ficha__vendedor">Vende {nombreCorto(vendedor)}, {vendedor?.comuna ?? ''}</p>
      {boton}
    </article>
  );
}
