import { useCallback } from 'react';
import { agregarAlCarrito } from '../logica/compras';
import { pubPorId } from '../logica/consultas';
import { recordarDestino } from '../utils/navegacion';
import { useNavegar } from './useRuta';
import { useAvisos } from './useAvisos';
import { useTienda } from './useTienda';

/* Agrega cartas al carrito con todas las reglas: sesión, stock, cartas propias y cuenta admin. */
export function useCarrito() {
  const { estado, usuario, carrito, guardarCarrito } = useTienda();
  const { avisar } = useAvisos();
  const { navegar } = useNavegar();

  const agregar = useCallback((pubId: string, cantidad: number): boolean => {
    if (!usuario) {
      recordarDestino(`${window.location.pathname}${window.location.search}`);
      avisar('Ingresa con tu cuenta para agregar cartas al carrito.', 'info');
      navegar('/ingresar');
      return false;
    }
    const r = agregarAlCarrito(estado, usuario, carrito, pubId, cantidad);
    if (!r.ok) {
      avisar(r.error, 'error');
      return false;
    }
    guardarCarrito(r.valor);
    const pub = pubPorId(estado, pubId);
    avisar(`Agregaste ${cantidad > 1 ? `${cantidad} × ` : ''}${pub?.nombre ?? 'la carta'} al carrito.`, 'exito', { href: '/carrito', texto: 'Ver carrito' });
    return true;
  }, [estado, usuario, carrito, guardarCarrito, avisar, navegar]);

  return { agregar };
}
