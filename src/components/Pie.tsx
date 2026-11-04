import { useLegal } from '../hooks/useLegal';
import { IMAGENES_ACTIVAS } from '../services/apiTcg';

export default function Pie() {
  const verLegal = useLegal();
  return (
    <footer className="pie">
      {/* Utilidades flex de Bootstrap: marca a la izquierda y enlaces a la derecha; en celular, uno bajo el otro */}
      <div className="contenedor pie__fila d-flex flex-wrap justify-content-between gap-4">
        <div className="pie__marca">
          <p className="logo logo--pie"><span className="logo__marca" aria-hidden="true" /><span className="logo__texto">HoloMarket</span></p>
          <p>Marketplace chileno de cartas coleccionables. Precios en pesos chilenos (CLP) con IVA incluido.</p>
        </div>
        <nav aria-label="Información legal">
          <ul className="pie__enlaces">
            <li><a href="#" data-accion="ver-terminos" onClick={verLegal('terminos')}>Términos y condiciones</a></li>
            <li><a href="#" data-accion="ver-privacidad" onClick={verLegal('privacidad')}>Política de privacidad</a></li>
            <li><a href="#" data-accion="ver-condiciones" onClick={verLegal('condiciones')}>Guía de condiciones</a></li>
          </ul>
        </nav>
      </div>
      <div className="contenedor pie__legal">
        <p>© {new Date().getFullYear()} HoloMarket. Todos los derechos reservados.</p>
        <p id="pie-imagenes">
          Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece Card Game y Mitos y Leyendas son marcas de sus respectivos dueños. HoloMarket no está afiliado a ellas
          {IMAGENES_ACTIVAS
            ? '. Las imágenes de referencia de las cartas se obtienen desde API TCG y pertenecen a sus titulares.'
            : ' y muestra las cartas con ilustraciones genéricas.'}
        </p>
      </div>
    </footer>
  );
}
