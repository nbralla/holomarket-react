import Carta from '../components/Carta';
import Ficha from '../components/Ficha';
import TarjetaJuego from '../components/TarjetaJuego';
import { IDS_JUEGOS } from '../data/catalogo';
import { publicacionesVisibles } from '../logica/consultas';
import { publicacionesEnOferta } from '../logica/ofertas';
import { useTienda } from '../hooks/useTienda';
import { clp, plural } from '../utils/formato';

import { Link } from 'react-router';
export default function Inicio() {
  const { estado } = useTienda();
  const disponibles = publicacionesVisibles(estado).filter((p) => p.stock > 0);
  const destacadas = disponibles.filter((p) => p.acabado !== 'Normal').sort((a, b) => b.precio - a.precio).slice(0, 3);
  const [centro, izq, der] = destacadas;
  const vitrina = [{ pub: izq, pos: 'izq' }, { pub: der, pos: 'der' }, { pub: centro, pos: 'centro' }].filter((x) => x.pub);
  const vendedores = new Set(disponibles.map((p) => p.vendedorId)).size;
  const recientes = [...disponibles].sort((a, b) => b.creado - a.creado).slice(0, 6);
  const ofertas = publicacionesEnOferta(estado).slice(0, 6);

  return (
    <section className="vista" id="vista-inicio" data-vista="inicio" aria-labelledby="inicio-titulo">
      <div className="portada">
        {/* Grilla de Bootstrap: texto y vitrina en dos columnas desde tablet (md), una sola en celular */}
        <div className="portada__contenido contenedor">
          <div className="row align-items-center gx-5 gy-4">
            <div className="portada__texto col-md-7">
              <p className="portada__antetitulo">Marketplace de cartas TCG en Chile</p>
              <h1 className="portada__titulo" id="inicio-titulo">La carta que te falta la tiene alguien en Chile.</h1>
              <p className="portada__bajada">Compra cartas sueltas a otros jugadores y vende las que te sobran. Precios en pesos y envío desde la región de quien vende.</p>
              <div className="portada__acciones">
                <Link className="btn btn--primario btn--grande" to="/catalogo">Explorar el catálogo</Link>
                <Link className="btn btn--claro btn--grande" to="/vender">Vender mis cartas</Link>
              </div>
              <p className="portada__dato" id="inicio-dato">
                {disponibles.length} {plural(disponibles.length, 'publicación disponible', 'publicaciones disponibles')} de {vendedores}{' '}
                {plural(vendedores, 'vendedor', 'vendedores')} en {IDS_JUEGOS.length} juegos.
              </p>
            </div>
            <div className="vitrina col-md-5" id="vitrina" role="group" aria-label="Cartas destacadas">
              {vitrina.map(({ pub, pos }) => pub && (
                <Link key={pub.id} className={`vitrina__carta vitrina__carta--${pos}`} to={`/carta/${pub.id}`} aria-label={`${pub.nombre}, ${clp(pub.precio)}`}>
                  <Carta carta={pub} alt={pub.nombre} interactiva={pos === 'centro'} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="contenedor">
        <section className="seccion" aria-labelledby="juegos-titulo">
          <h2 className="seccion__titulo" id="juegos-titulo">Juegos</h2>
          {/* 2 por fila en celular, 3 en tablet y 5 en escritorio */}
          <ul className="juegos row row-cols-2 row-cols-sm-3 row-cols-lg-5 g-3" id="chips-juegos">
            {IDS_JUEGOS.map((id) => (
              <li key={id}><TarjetaJuego juego={id} publicaciones={disponibles.filter((p) => p.juego === id)} /></li>
            ))}
          </ul>
        </section>

        {ofertas.length > 0 && (
          <section className="seccion" aria-labelledby="ofertas-titulo">
            <div className="seccion__cabeza">
              <h2 className="seccion__titulo" id="ofertas-titulo">Ofertas</h2>
              <Link className="enlace" to="/ofertas">Ver todas las ofertas</Link>
            </div>
            <div className="rejilla-fichas row row-cols-2 row-cols-sm-3 row-cols-lg-6 gx-3 gy-4" id="inicio-ofertas">
              {ofertas.map((p) => <Ficha key={p.id} pub={p} />)}
            </div>
          </section>
        )}

        <section className="seccion" aria-labelledby="recientes-titulo">
          <div className="seccion__cabeza">
            <h2 className="seccion__titulo" id="recientes-titulo">Recién publicadas</h2>
            <Link className="enlace" to="/catalogo">Ver todo el catálogo</Link>
          </div>
          <div className="rejilla-fichas row row-cols-2 row-cols-sm-3 row-cols-lg-6 gx-3 gy-4" id="inicio-recientes">
            {recientes.map((p) => <Ficha key={p.id} pub={p} />)}
          </div>
        </section>

        <section className="seccion pasos" aria-labelledby="pasos-titulo">
          <h2 className="seccion__titulo" id="pasos-titulo">Vender es simple</h2>
          <ol className="pasos__lista row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
            <li><div className="paso"><h3>Publica gratis</h3><p>Sube la foto, elige la condición y define precio y stock.</p></div></li>
            <li><div className="paso"><h3>Recibe el pedido</h3><p>Cuando alguien paga, tu stock se descuenta solo y el pedido aparece en tus ventas.</p></div></li>
            <li><div className="paso"><h3>Envía en 3 días hábiles</h3><p>Despacha o coordina la entrega en persona y marca el pedido como enviado.</p></div></li>
            <li><div className="paso"><h3>Recibe tu pago</h3><p>Lo liberamos cuando el comprador confirma la recepción y lo retiras a tu cuenta bancaria. Comisión de {estado.config.comision} % + IVA.</p></div></li>
          </ol>
        </section>
      </div>
    </section>
  );
}
