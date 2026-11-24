import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AvisosContext, type AccionAviso, type TipoAviso } from './avisosContext';

import { Link } from 'react-router';
interface Aviso {
  id: number;
  mensaje: string;
  tipo: TipoAviso;
  accion?: AccionAviso;
  saliendo: boolean;
}

/* Avisos flotantes (toasts): máximo 3 a la vez; los de error duran más. */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(1);
  const ultimo = useRef({ mensaje: '', momento: 0 });
  const relojes = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pendientes = relojes.current;
    return () => pendientes.forEach((t) => clearTimeout(t));
  }, []);

  const programar = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      relojes.current.delete(t);
      fn();
    }, ms);
    relojes.current.add(t);
  }, []);

  const quitar = useCallback((id: number) => {
    setAvisos((lista) => lista.map((a) => (a.id === id ? { ...a, saliendo: true } : a)));
    programar(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), 220);
  }, [programar]);

  const avisar = useCallback((mensaje: string, tipo: TipoAviso = 'info', accion?: AccionAviso) => {
    // Evita duplicar el mismo aviso si dos partes de la app lo piden casi al mismo tiempo.
    const ahora = Date.now();
    if (ultimo.current.mensaje === mensaje && ahora - ultimo.current.momento < 800) return;
    ultimo.current = { mensaje, momento: ahora };
    const id = siguienteId.current++;
    setAvisos((lista) => [...lista.filter((a) => !a.saliendo).slice(-2), { id, mensaje, tipo, accion, saliendo: false }]);
    programar(() => quitar(id), tipo === 'error' ? 6500 : 4200);
  }, [programar, quitar]);

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <div className="avisos" id="avisos">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso-flotante aviso-flotante--${a.tipo}${a.saliendo ? ' aviso-flotante--sale' : ''}`}
            role={a.tipo === 'error' ? 'alert' : 'status'}>
            <p>{a.mensaje}</p>
            {a.accion && <Link to={a.accion.href} onClick={() => quitar(a.id)}>{a.accion.texto}</Link>}
            <button type="button" className="aviso-flotante__cerrar" aria-label="Cerrar aviso" onClick={() => quitar(a.id)}>×</button>
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  );
}
