import { useState } from 'react';
import { Link } from 'react-router';
import FichaProducto from '../components/FichaProducto';
import { IDS_JUEGOS, JUEGOS } from '../data/catalogo';
import { descuento, publicacionesEnOferta } from '../logica/ofertas';
import { agruparProductos } from '../logica/productos';
import { useTienda } from '../hooks/useTienda';
import type { JuegoId } from '../types';
import { plural } from '../utils/formato';

type Orden = 'descuento' | 'precio';

/* Todas las cartas con descuento, filtrables por juego y ordenables por descuento o precio. */
export default function Ofertas() {
  const { estado } = useTienda();
  const [juego, setJuego] = useState<JuegoId | ''>('');
  const [orden, setOrden] = useState<Orden>('descuento');

  const todas = publicacionesEnOferta(estado);
  const productos = agruparProductos(publicacionesEnOferta(estado, juego)).sort((a, b) =>
    orden === 'precio' ? a.mejor.precio - b.mejor.precio : descuento(b.mejor) - descuento(a.mejor) || a.mejor.precio - b.mejor.precio);
  const cuantas = (id: JuegoId | '') => (id ? todas.filter((p) => p.juego === id).length : todas.length);

  return (
    <section className="vista contenedor" id="vista-ofertas" aria-labelledby="ofertas-titulo">
      <div className="vista__cabeza">
        <div>
          <h1 className="titulo-vista" id="ofertas-titulo">Ofertas</h1>
          <p className="bajada" id="ofertas-resumen" role="status">
            {productos.length} {plural(productos.length, 'carta con descuento', 'cartas con descuento')}
            {juego ? ` de ${JUEGOS[juego].nombre}` : ''}
          </p>
        </div>
        <div className="campo campo--linea">
          <label htmlFor="ofertas-orden">Ordenar por</label>
          <select id="ofertas-orden" value={orden} onChange={(ev) => setOrden(ev.target.value as Orden)}>
            <option value="descuento">Mayor descuento</option>
            <option value="precio">Menor precio</option>
          </select>
        </div>
      </div>

      <div className="filtro-juegos" role="group" aria-label="Filtrar ofertas por juego">
        {(['', ...IDS_JUEGOS] as const).map((id) => (
          <button key={id || 'todos'} type="button" className="btn btn--chico btn--fantasma" aria-pressed={juego === id}
            disabled={id !== '' && cuantas(id) === 0} onClick={() => setJuego(id)}>
            {id ? JUEGOS[id].nombre : 'Todos'} <span className="badge rounded-pill contador">{cuantas(id)}</span>
          </button>
        ))}
      </div>

      {productos.length ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3" id="ofertas-resultados">
          {productos.map((p) => <div key={p.clave} className="col"><FichaProducto producto={p} /></div>)}
        </div>
      ) : (
        <div className="vacio vacio--caja">
          <h2>Por ahora no hay ofertas{juego ? ` de ${JUEGOS[juego].nombre}` : ''}</h2>
          <p>Vuelve pronto o revisa el catálogo completo.</p>
          <Link className="btn btn--primario" to="/catalogo">Ir al catálogo</Link>
        </div>
      )}
    </section>
  );
}
