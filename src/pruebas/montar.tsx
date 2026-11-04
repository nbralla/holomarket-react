/* =========================================================================
   Ayuda para las pruebas de componentes (Jasmine + Karma)
   -------------------------------------------------------------------------
   montar() dibuja un componente con todo lo que necesita alrededor:
   React Router (en memoria), avisos, ventana modal y una tienda SIMULADA.

   La tienda simulada (mock) usa los datos de demostración y reemplaza sus
   funciones por espías de Jasmine (jasmine.createSpy). Así una prueba puede
   verificar que el componente llamó a "ingresar" o "guardarCarrito" con los
   datos correctos, sin guardar nada en json-server.
   ========================================================================= */
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { AvisosProvider } from '../context/AvisosProvider';
import { ModalProvider } from '../context/ModalProvider';
import { TiendaContext, type TiendaValor } from '../context/tiendaContext';
import { crearEstadoInicial } from '../logica/estado';
import { usuarioPorId } from '../logica/consultas';
import type { Estado, Usuario } from '../types';

/* Siempre la misma fecha: así los datos de demostración son iguales en cada ejecución. */
export const FECHA_PRUEBAS = new Date(2026, 9, 8, 12).getTime();
export const estadoDemo = (): Estado => crearEstadoInicial(FECHA_PRUEBAS);
export const usuarioDemo = (e: Estado, id: string): Usuario => usuarioPorId(e, id) as Usuario;

/* Tienda falsa: datos reales de la demo y funciones espía. */
export function tiendaFalsa(cambios: Partial<TiendaValor> = {}): TiendaValor {
  const estado = cambios.estado ?? estadoDemo();
  return {
    estado,
    usuario: null,
    carrito: [],
    actualizar: jasmine.createSpy('actualizar').and.callFake((cambio: (e: Estado) => unknown) => cambio(estado)),
    guardarCarrito: jasmine.createSpy('guardarCarrito'),
    ingresar: jasmine.createSpy('ingresar'),
    iniciarSesion: jasmine.createSpy('iniciarSesion'),
    cerrarSesion: jasmine.createSpy('cerrarSesion'),
    restablecerDemo: jasmine.createSpy('restablecerDemo').and.resolveTo(true),
    ...cambios,
  } as TiendaValor;
}

/* Mock de fetch: reemplaza la red del navegador por respuestas falsas (spyOn de Jasmine).
   respuestas: { '/api/config': {...}, ... }. Lo que no esté en la lista falla como si no hubiera red. */
export function simularFetch(respuestas: Record<string, unknown> = {}): jasmine.Spy {
  return spyOn(window, 'fetch').and.callFake((entrada: RequestInfo | URL) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada);
    if (Object.prototype.hasOwnProperty.call(respuestas, url)) {
      return Promise.resolve(new Response(JSON.stringify(respuestas[url]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return Promise.reject(new TypeError('Sin red (fetch simulado en la prueba)'));
  });
}

/* Muestra la URL actual en la página, para comprobar a dónde navegó un componente. */
function UrlActual() {
  const { pathname, search } = useLocation();
  return <output data-testid="url">{`${pathname}${search}`}</output>;
}

interface Opciones {
  tienda?: TiendaValor;
  ruta?: string;
}

export function montar(ui: ReactElement, { tienda = tiendaFalsa(), ruta = '/' }: Opciones = {}) {
  const resultado = render(
    <MemoryRouter initialEntries={[ruta]}>
      <AvisosProvider>
        <TiendaContext.Provider value={tienda}>
          <ModalProvider>
            <Routes><Route path="*" element={ui} /></Routes>
            <UrlActual />
          </ModalProvider>
        </TiendaContext.Provider>
      </AvisosProvider>
    </MemoryRouter>,
  );
  return { ...resultado, tienda };
}
