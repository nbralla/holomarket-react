import { useEffect, useMemo, useState } from 'react';
import { consultaDe, IMAGENES_ACTIVAS, imagenEnCache, pedirImagen } from '../services/apiTcg';
import type { DatosCarta } from '../types';

/* Busca en API TCG la imagen de una carta. Devuelve la URL, o null mientras no hay
   (en ese caso se sigue mostrando la carta dibujada con CSS). */
export function useImagenCarta(carta: DatosCarta, activo = true): string | null {
  const { juego, nombre, edicion, numero } = carta;
  const consulta = useMemo(
    () => (activo && IMAGENES_ACTIVAS ? consultaDe({ juego, nombre, edicion, numero }) : null),
    [activo, juego, nombre, edicion, numero],
  );
  const [encontrada, setEncontrada] = useState<{ consulta: object; url: string | null } | null>(null);

  useEffect(() => {
    if (!consulta || imagenEnCache(consulta) !== undefined) return;
    let vigente = true;
    pedirImagen(consulta).then((url) => {
      if (vigente) setEncontrada({ consulta, url });
    });
    return () => { vigente = false; };
  }, [consulta]);

  if (!consulta) return null;
  const guardada = imagenEnCache(consulta);
  if (guardada !== undefined) return guardada;
  return encontrada && encontrada.consulta === consulta ? encontrada.url : null;
}
