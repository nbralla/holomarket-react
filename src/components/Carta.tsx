import { useState, type CSSProperties } from 'react';
import { JUEGO_CORTO } from '../data/catalogo';
import { useHolo } from '../hooks/useHolo';
import { useImagenCarta } from '../hooks/useImagenCarta';
import { urlSegura } from '../services/apiTcg';
import type { DatosCarta } from '../types';
import { glifoDe, sinParentesis, tonoDe } from '../utils/formato';
import { fotoValida } from '../utils/imagen';

interface Props {
  carta: DatosCarta;
  clase?: string;
  alt?: string;
  /* false = no consultar API TCG (por ejemplo, la vista previa mientras se escribe). */
  buscarImagen?: boolean;
  /* true = efecto holográfico al mover el puntero. */
  interactiva?: boolean;
}

/* Carta con la proporción real (63 × 88 mm). Prioridad: foto del vendedor, imagen elegida
   de API TCG, imagen encontrada en API TCG y, si no hay, una carta dibujada solo con CSS. */
export default function Carta({ carta, clase = '', alt = '', buscarImagen = true, interactiva = false }: Props) {
  const holo = carta.acabado && carta.acabado !== 'Normal' ? ' carta--holo' : '';
  const tieneFoto = fotoValida(carta.imagen);
  const elegida = urlSegura(carta.imagenApi);
  const encontrada = useImagenCarta(carta, buscarImagen && !tieneFoto && !elegida);
  const [fallida, setFallida] = useState('');
  const eventos = useHolo(interactiva);

  if (tieneFoto) {
    return (
      <div className={`carta carta--foto ${clase}`} {...eventos}>
        <img src={carta.imagen ?? ''} alt={alt} loading="lazy" />
      </div>
    );
  }

  const urlApi = elegida ?? encontrada;
  if (urlApi && urlApi !== fallida) {
    return (
      <div className={`carta carta--foto carta--api${holo} ${clase}`} {...eventos}>
        <img src={urlApi} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFallida(urlApi)} />
      </div>
    );
  }

  const glifo = glifoDe(carta.nombre);
  const estilo = { '--tono': tonoDe(carta.nombre), '--largo': Math.max(3, glifo.length) } as CSSProperties;
  return (
    <div className={`carta carta--${carta.juego}${holo} ${clase}`} style={estilo} aria-hidden="true" {...eventos}>
      <div className="carta__marco">
        <div className="carta__cabeza">{sinParentesis(carta.nombre)}</div>
        <div className="carta__arte"><span className="carta__glifo">{glifo}</span></div>
        <div className="carta__texto"><i /><i /><i /></div>
        <div className="carta__pie"><span>{JUEGO_CORTO[carta.juego] ?? ''}</span><span>{carta.numero || carta.idioma || ''}</span></div>
      </div>
    </div>
  );
}
