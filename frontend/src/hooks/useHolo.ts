import { useMemo, type PointerEvent } from 'react';

const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Efecto holográfico: la carta se inclina y el brillo sigue al puntero.
   Devuelve los manejadores de eventos para poner en el elemento .carta. */
export function useHolo(activo: boolean) {
  return useMemo(() => {
    if (!activo || sinMovimiento()) return {};
    return {
      onPointerMove: (ev: PointerEvent<HTMLDivElement>) => {
        const carta = ev.currentTarget;
        const r = carta.getBoundingClientRect();
        const x = Math.min(Math.max((ev.clientX - r.left) / r.width, 0), 1);
        const y = Math.min(Math.max((ev.clientY - r.top) / r.height, 0), 1);
        carta.style.setProperty('--rx', `${((0.5 - y) * 16).toFixed(2)}deg`);
        carta.style.setProperty('--ry', `${((x - 0.5) * 20).toFixed(2)}deg`);
        carta.style.setProperty('--hx', `${(x * 100).toFixed(1)}%`);
        carta.style.setProperty('--hy', `${(y * 100).toFixed(1)}%`);
        carta.classList.add('carta--activa');
      },
      onPointerLeave: (ev: PointerEvent<HTMLDivElement>) => {
        const carta = ev.currentTarget;
        ['--rx', '--ry', '--hx', '--hy'].forEach((p) => carta.style.removeProperty(p));
        carta.classList.remove('carta--activa');
      },
    };
  }, [activo]);
}
