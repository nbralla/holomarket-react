import { useEffect, useSyncExternalStore } from 'react';
import { dolarActual, pedirDolar, suscribirDolar, type FuenteDolar } from '../services/dolar';
import { useTienda } from './useTienda';

export interface ValorDolar {
  valor: number;
  fecha: number | null;
  fuente: FuenteDolar | 'respaldo';   // respaldo = el valor de Administración › Configuración
}

/* Dólar en vivo para convertir precios de USD a CLP. Mientras llega (o si las APIs fallan),
   usa el valor de respaldo de la configuración. */
export function useDolar(): ValorDolar {
  const { estado } = useTienda();
  const dolar = useSyncExternalStore(suscribirDolar, dolarActual);
  useEffect(() => { pedirDolar(); }, []);
  return dolar ?? { valor: estado.config.dolar, fecha: null, fuente: 'respaldo' };
}
