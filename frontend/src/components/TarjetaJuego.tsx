import { Link } from 'react-router';
import { JUEGOS } from '../data/catalogo';
import type { JuegoId, Publicacion } from '../types';
import { plural } from '../utils/formato';
import Carta from './Carta';

interface Props {
  juego: JuegoId;
  /* Publicaciones disponibles de ese juego: se muestran las 3 más valiosas en abanico. */
  publicaciones: Publicacion[];
  /* Texto extra bajo el nombre (por ejemplo, las ediciones). */
  detalle?: string;
}

/* Tarjeta de un juego (categoría): abanico de cartas, nombre y cantidad de publicaciones.
   Se usa en el inicio y en la página de categorías. */
export default function TarjetaJuego({ juego, publicaciones, detalle }: Props) {
  const n = publicaciones.length;
  // Las 3 cartas más valiosas del juego, en abanico (la más cara al centro).
  const [mayor, segunda, tercera] = [...publicaciones].sort((a, b) => b.precio - a.precio);
  const abanico = [{ pub: segunda, pos: 'izq' }, { pub: tercera, pos: 'der' }, { pub: mayor, pos: 'centro' }];
  return (
    <Link className={`juego juego--${juego}`} to={`/categoria/${juego}`}>
      <span className={`juego__arte juego__arte--${Math.min(n, 3)}`} aria-hidden="true">
        {abanico.map(({ pub, pos }) => pub && (
          <span key={pub.id} className={`juego__carta juego__carta--${pos}`}><Carta carta={pub} /></span>
        ))}
      </span>
      <span className="juego__info">
        <span className="juego__nombre">{JUEGOS[juego].nombre}</span>
        <span className="juego__n">{n} {plural(n, 'publicación', 'publicaciones')}</span>
        {detalle && <span className="juego__detalle">{detalle}</span>}
      </span>
    </Link>
  );
}
