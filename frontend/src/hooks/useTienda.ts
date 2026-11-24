import { useContext } from 'react';
import { TiendaContext, type TiendaValor } from '../context/tiendaContext';

/* Acceso a los datos, la sesión y el carrito desde cualquier componente. */
export function useTienda(): TiendaValor {
  const valor = useContext(TiendaContext);
  if (!valor) throw new Error('useTienda debe usarse dentro de <TiendaProvider>.');
  return valor;
}
