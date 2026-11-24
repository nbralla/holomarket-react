import { useEffect, useState } from 'react';

/* Devuelve el valor recién cuando deja de cambiar por "ms" milisegundos
   (por ejemplo, para buscar después de que la persona deja de escribir). */
export function useDebounce<T>(valor: T, ms: number): T {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}
