/* =========================================================================
   Rutas de la app (/catalogo, /carta/P001, /pedidos?tab=ventas)
   -------------------------------------------------------------------------
   Las maneja React Router (BrowserRouter en src/main.tsx y <Routes> en
   App.tsx). Aquí solo se traduce la URL actual a un objeto Ruta, que usan
   las páginas que leen filtros o pestañas desde la URL.
   ========================================================================= */

export interface Ruta {
  vista: string;            // primera parte: "catalogo", "carta", "admin"...
  id: string;               // segunda parte: "/carta/P001" -> "P001"
  params: URLSearchParams;  // lo que va después de "?"
  url: string;              // ruta completa, por ejemplo "/catalogo?q=charizard"
  camino: string;           // vista + id, sin parámetros
}

export function leerRuta(pathname: string, search: string): Ruta {
  const partes = pathname.split('/').filter(Boolean);
  let id = '';
  try {
    id = partes[1] ? decodeURIComponent(partes[1]) : '';
  } catch {
    id = '';
  }
  const vista = partes[0] || 'inicio';
  return { vista, id, params: new URLSearchParams(search), url: `${pathname}${search}`, camino: `${vista}/${id}` };
}

/* Página a la que volver después de ingresar (por ejemplo, la carta que se quería comprar). */
let destinoPendiente: string | null = null;

export const recordarDestino = (url: string): void => { destinoPendiente = url; };

export function tomarDestino(porDefecto: string): string {
  const destino = destinoPendiente;
  destinoPendiente = null;
  return !destino || /^\/(ingresar|registro)/.test(destino) ? porDefecto : destino;
}
