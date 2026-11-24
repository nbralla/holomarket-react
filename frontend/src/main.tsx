// Punto de entrada: monta la app dentro de <div id="root"> (está en index.html)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import Arranque from './components/Arranque';
import { AvisosProvider } from './context/AvisosProvider';
// Bootstrap primero (grilla, utilidades y componentes); después nuestros estilos, que lo personalizan.
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* BrowserRouter envuelve TODA la app: así cualquier componente puede usar rutas y Links */}
    <BrowserRouter>
      <AvisosProvider>
        {/* Arranque pide los datos a la API (json-server) y después muestra la tienda */}
        <Arranque />
      </AvisosProvider>
    </BrowserRouter>
  </StrictMode>,
);
