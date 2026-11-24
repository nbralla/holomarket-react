import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { leerRuta, type Ruta } from '../utils/navegacion';

/* Hook personalizado: devuelve la ruta actual (React Router vuelve a dibujar cuando cambia). */
export function useRuta(): Ruta {
  const { pathname, search } = useLocation();
  return useMemo(() => leerRuta(pathname, search), [pathname, search]);
}

/* navegar: va a otra página (queda en el historial: el botón "Atrás" funciona).
   reemplazar: cambia la URL sin agregar una entrada al historial (por ejemplo, al filtrar el catálogo). */
export function useNavegar() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // La URL actual va en una ref: así navegar y reemplazar no cambian en cada página.
  const actual = useRef(`${pathname}${search}`);
  useEffect(() => { actual.current = `${pathname}${search}`; }, [pathname, search]);
  const navegar = useCallback((destino: string) => {
    if (destino !== actual.current) navigate(destino);
  }, [navigate]);
  const reemplazar = useCallback((destino: string) => {
    if (destino !== actual.current) navigate(destino, { replace: true });
  }, [navigate]);
  return { navegar, reemplazar };
}
