import { useEffect, useMemo, useState } from 'react';
import {
  buscarHistorial, consultaDe, IMAGENES_ACTIVAS, mercadoEnCache, pedirImagen, type DatosMercado, type PuntoPrecio,
} from '../services/apiTcg';
import type { DatosCarta } from '../types';

/* Producto de API TCG que corresponde a la carta (precio de mercado y atributos).
   undefined = buscando; null = sin datos (no hay clave de API o la carta no está en la API). */
export function useDatosMercado(carta: DatosCarta | null): DatosMercado | null | undefined {
  const juego = carta?.juego;
  const nombre = carta?.nombre ?? '';
  const edicion = carta?.edicion;
  const numero = carta?.numero;
  const consulta = useMemo(
    () => (IMAGENES_ACTIVAS && juego && nombre ? consultaDe({ juego, nombre, edicion, numero }) : null),
    [juego, nombre, edicion, numero],
  );
  // Solo sirve para volver a dibujar cuando termina la consulta (el dato queda en la caché).
  const [, setListo] = useState(0);

  useEffect(() => {
    if (!consulta || mercadoEnCache(consulta) !== undefined) return;
    let vigente = true;
    pedirImagen(consulta).then(() => {
      if (vigente) setListo((n) => n + 1);
    });
    return () => { vigente = false; };
  }, [consulta]);

  if (!consulta) return null;
  const datos = mercadoEnCache(consulta);
  return datos === undefined ? undefined : datos;
}

type EstadoHistorial =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; puntos: PuntoPrecio[] }
  | { tipo: 'error' };

/* Historial diario del precio de mercado de un producto de API TCG. */
export function useHistorial(id: number | null | undefined): EstadoHistorial | null {
  const [resultado, setResultado] = useState<{ id: number; estado: EstadoHistorial } | null>(null);

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    buscarHistorial(id)
      .then((puntos) => { if (vigente) setResultado({ id, estado: { tipo: 'listo', puntos } }); })
      .catch(() => { if (vigente) setResultado({ id, estado: { tipo: 'error' } }); });
    return () => { vigente = false; };
  }, [id]);

  if (!id) return null;
  return resultado && resultado.id === id ? resultado.estado : { tipo: 'cargando' };
}
