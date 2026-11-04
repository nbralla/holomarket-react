import TarjetaJuego from '../components/TarjetaJuego';
import { IDS_JUEGOS, JUEGOS } from '../data/catalogo';
import { publicacionesVisibles } from '../logica/consultas';
import { useTienda } from '../hooks/useTienda';

/* Una tarjeta por juego (categoría). Cada una lleva a /categoria/:juego. */
export default function Categorias() {
  const { estado } = useTienda();
  const disponibles = publicacionesVisibles(estado).filter((p) => p.stock > 0);

  return (
    <section className="vista contenedor" id="vista-categorias" aria-labelledby="categorias-titulo">
      <h1 className="titulo-vista" id="categorias-titulo">Categorías</h1>
      <p className="bajada">Elige un juego para ver sus cartas y filtrarlas por rareza.</p>
      <ul className="juegos juegos--grandes row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
        {IDS_JUEGOS.map((id) => (
          <li key={id}>
            <TarjetaJuego juego={id} publicaciones={disponibles.filter((p) => p.juego === id)}
              detalle={`Ediciones: ${JUEGOS[id].ediciones.slice(0, 3).join(', ')}${JUEGOS[id].ediciones.length > 3 ? '…' : ''}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
