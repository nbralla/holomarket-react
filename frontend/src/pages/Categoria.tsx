import { Link } from 'react-router';
import FichaProducto from '../components/FichaProducto';
import { JUEGOS, RAREZAS, esJuego } from '../data/catalogo';
import { filtrarPublicaciones, FILTROS_VACIOS } from '../logica/consultas';
import { agruparProductos } from '../logica/productos';
import { useRuta } from '../hooks/useRuta';
import { useTienda } from '../hooks/useTienda';
import { plural } from '../utils/formato';
import NoEncontrada from './NoEncontrada';

/* Cartas de un juego (/categoria/pokemon), con un filtro de rareza que vive en la URL (?rareza=...). */
export default function Categoria({ juego }: { juego: string }) {
  const { estado } = useTienda();
  const ruta = useRuta();
  if (!esJuego(juego)) return <NoEncontrada />;

  const delJuego = filtrarPublicaciones(estado, { ...FILTROS_VACIOS, juego });
  // Solo se ofrecen las rarezas que hoy tienen cartas disponibles, en el orden oficial del juego.
  const rarezas = RAREZAS[juego].filter((r) => delJuego.some((p) => p.rareza === r));
  const pedida = ruta.params.get('rareza') ?? '';
  const rareza = rarezas.includes(pedida) ? pedida : '';
  const productos = agruparProductos(rareza ? delJuego.filter((p) => p.rareza === rareza) : delJuego);
  const enlace = (r: string) => `/categoria/${juego}${r ? `?rareza=${encodeURIComponent(r)}` : ''}`;

  return (
    <section className="vista contenedor" id="vista-categoria" aria-labelledby="categoria-titulo">
      <nav className="migas" aria-label="Ruta de navegación">
        <ol>
          <li><Link to="/categorias">Categorías</Link></li>
          <li aria-current="page">{JUEGOS[juego].nombre}</li>
        </ol>
      </nav>
      <div className="vista__cabeza">
        <div>
          <h1 className="titulo-vista" id="categoria-titulo">{JUEGOS[juego].nombre}</h1>
          <p className="bajada" id="categoria-resumen" role="status">
            {productos.length} {plural(productos.length, 'carta', 'cartas')}{rareza ? ` ${rareza}` : ''}
          </p>
        </div>
        <Link className="btn btn--fantasma" to={`/catalogo?juego=${juego}`}>Más filtros en el catálogo</Link>
      </div>

      {/* Pestañas de rareza: componente "nav-pills" de Bootstrap */}
      <ul className="nav nav-pills categoria__rarezas" aria-label="Filtrar por rareza">
        {['', ...rarezas].map((r) => (
          <li key={r || 'todas'} className="nav-item">
            <Link className={`nav-link${r === rareza ? ' active' : ''}`} aria-current={r === rareza ? 'page' : undefined} to={enlace(r)}>
              {r || 'Todas'}
            </Link>
          </li>
        ))}
      </ul>

      {productos.length ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3" id="categoria-resultados">
          {productos.map((p) => <div key={p.clave} className="col"><FichaProducto producto={p} /></div>)}
        </div>
      ) : (
        <div className="vacio vacio--caja">
          <h2>Todavía no hay cartas de {JUEGOS[juego].nombre}</h2>
          <p>Sé la primera persona en publicar una.</p>
          <Link className="btn btn--primario" to="/vender">Publicar una carta</Link>
        </div>
      )}
    </section>
  );
}
