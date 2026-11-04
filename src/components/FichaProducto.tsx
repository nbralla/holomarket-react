import { Link } from 'react-router';
import { useDolar } from '../hooks/useDolar';
import { useDatosMercado } from '../hooks/useMercado';
import type { Producto } from '../logica/productos';
import { clp, plural } from '../utils/formato';
import Carta from './Carta';
import Precio from './Precio';

/* Ficha de una carta en el catálogo: todas sus publicaciones resumidas en "N publicaciones desde $X",
   más el precio de mercado de TCGplayer como referencia. Toda la ficha lleva a la página de la carta. */
export default function FichaProducto({ producto }: { producto: Producto }) {
  const dolar = useDolar();
  const mercado = useDatosMercado(producto.mejor);
  const conStock = producto.publicaciones.filter((p) => p.stock > 0);
  const agotada = conStock.length === 0;

  return (
    <article className={`producto-ficha${agotada ? ' producto-ficha--agotada' : ''}`}>
      <Link className="producto-ficha__enlace" to={`/carta/${producto.mejor.id}`}>
        <div className="producto-ficha__carta"><Carta carta={producto.mejor} alt="" /></div>
        <div className="producto-ficha__info">
          <h3 className="producto-ficha__nombre">{producto.nombre}</h3>
          <p className="producto-ficha__edicion">{producto.edicion}</p>
          <p className="producto-ficha__rareza">{producto.rareza}{producto.numero ? `, #${producto.numero}` : ''}</p>
          {agotada ? (
            <p><span className="pildora-agotada">Sin stock</span></p>
          ) : (
            <>
              <p className="producto-ficha__desde">
                {conStock.length} {plural(conStock.length, 'publicación', 'publicaciones')} desde
              </p>
              <p className="producto-ficha__precio"><Precio precio={producto.mejor.precio} precioAnterior={producto.mejor.precioAnterior} /></p>
            </>
          )}
          {mercado?.mercado && (
            <p className="producto-ficha__mercado">
              Precio de mercado: <strong>{clp(mercado.mercado * dolar.valor)}</strong>
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
