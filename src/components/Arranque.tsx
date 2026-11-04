import { useEffect, useState } from 'react';
import App from '../App';
import { ModalProvider } from '../context/ModalProvider';
import { TiendaProvider } from '../context/TiendaProvider';
import { cargarEstado } from '../services/datos';
import type { Estado } from '../types';

/* Pide los datos a json-server una sola vez al abrir el sitio. Mientras llegan muestra
   "Cargando..."; si la API no responde, explica qué revisar y permite reintentar. */
export default function Arranque() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // useEffect no acepta una función async directa: usamos .then / .catch
  useEffect(() => {
    let vigente = true;   // si el componente se desmonta, ignoramos la respuesta
    cargarEstado()
      .then((datos) => { if (vigente) setEstado(datos); })
      .catch(() => { if (vigente) setError('No se pudieron cargar los datos de la tienda. ¿Está corriendo "npm run api"?'); });
    return () => { vigente = false; };
  }, [intento]);

  if (estado) {
    return (
      <TiendaProvider estadoInicial={estado}>
        <ModalProvider>
          <App />
        </ModalProvider>
      </TiendaProvider>
    );
  }

  return (
    <main id="principal" className="vista contenedor" aria-busy={!error}>
      <div className="vacio vacio--grande" role="status">
        {error ? (
          <>
            <h1 className="titulo-vista">Sin conexión con la API</h1>
            <p>{error}</p>
            <p className="nota">Abre otra terminal en la carpeta del proyecto y ejecuta <code>npm run api</code> (json-server en el puerto 3000).</p>
            <button type="button" className="btn btn--primario" onClick={() => { setError(null); setIntento((n) => n + 1); }}>
              Reintentar
            </button>
          </>
        ) : (
          <>
            {/* Spinner de Bootstrap mientras llegan los datos de la API */}
            <div className="spinner-border cargando__spinner" aria-hidden="true" />
            <p>Cargando HoloMarket...</p>
          </>
        )}
      </div>
    </main>
  );
}
