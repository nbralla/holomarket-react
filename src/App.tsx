/* =========================================================================
   App: asocia cada URL con su página usando React Router (<Routes> y
   <Route>) y controla el acceso por rol (visitante, cliente o administrador).
   ========================================================================= */
import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router';
import Cabecera from './components/Cabecera';
import Pie from './components/Pie';
import { useAvisos } from './hooks/useAvisos';
import { useRuta } from './hooks/useRuta';
import { useTienda } from './hooks/useTienda';
import { JUEGOS, esJuego } from './data/catalogo';
import { pubPorId } from './logica/consultas';
import Admin from './pages/admin/Admin';
import Carrito from './pages/Carrito';
import Catalogo from './pages/Catalogo';
import Checkout from './pages/Checkout';
import Confirmacion from './pages/Confirmacion';
import Detalle from './pages/Detalle';
import Ingresar from './pages/Ingresar';
import Categoria from './pages/Categoria';
import Categorias from './pages/Categorias';
import Inicio from './pages/Inicio';
import Inventario from './pages/Inventario';
import NoEncontrada from './pages/NoEncontrada';
import Ofertas from './pages/Ofertas';
import PagoRechazado from './pages/PagoRechazado';
import Pedidos from './pages/Pedidos';
import Registro from './pages/Registro';
import Retiros from './pages/Retiros';
import SinPermiso from './pages/SinPermiso';
import Vender from './pages/Vender';
import { alFallar } from './services/apiTcg';
import { persistente } from './services/almacen';
import type { Rol, Usuario } from './types';
import { recordarDestino } from './utils/navegacion';

/* Página pública: solo cambia el título de la pestaña del navegador. */
function Vista({ titulo, children }: { titulo: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${titulo} | HoloMarket`;
  }, [titulo]);
  return <>{children}</>;
}

/* Detalle de una carta: el título de la pestaña es el nombre de la carta (/carta/P001). */
function VistaCarta() {
  const { id = '' } = useParams();
  const { estado } = useTienda();
  return <Vista titulo={pubPorId(estado, id)?.nombre ?? 'Carta'}><Detalle id={id} /></Vista>;
}

/* Cartas de un juego (/categoria/pokemon): el título de la pestaña es el nombre del juego. */
function VistaCategoria() {
  const { juego = '' } = useParams();
  return <Vista titulo={esJuego(juego) ? JUEGOS[juego].nombre : 'Categoría'}><Categoria juego={juego} /></Vista>;
}

/* Ingresar y Registro: quien llega con la sesión ya iniciada va al catálogo (o a administración).
   Si la sesión se inicia en esta misma página, es la página la que decide a dónde volver. */
function SoloVisitante({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { usuario } = useTienda();
  const [conSesionAlEntrar] = useState(() => Boolean(usuario));
  if (usuario && conSesionAlEntrar) return <Navigate to={usuario.rol === 'admin' ? '/admin' : '/catalogo'} replace />;
  return <Vista titulo={titulo}>{children}</Vista>;
}

/* Un visitante pidió una página con sesión: se recuerda a dónde iba y se le envía a Ingresar.
   Si la sesión se acaba de cerrar, el aviso ya lo dio TiendaProvider. */
function IrAIngresar({ aviso, habiaUsuario }: { aviso: string; habiaUsuario: RefObject<boolean> }) {
  const ruta = useRuta();
  const { avisar } = useAvisos();
  const navigate = useNavigate();
  useEffect(() => {
    recordarDestino(ruta.url);
    if (!habiaUsuario.current) avisar(aviso, 'info');
    navigate('/ingresar', { replace: true });
  }, [ruta.url, aviso, avisar, navigate, habiaUsuario]);
  return null;
}

interface PropsPrivada {
  rol: Rol;
  titulo: string;
  aviso: string;
  habiaUsuario: RefObject<boolean>;
  /* Recibe el usuario con sesión y el :id de la URL (vacío si la ruta no tiene). */
  pagina: (usuario: Usuario, id: string) => ReactNode;
}

/* Página que pide sesión con un rol determinado. */
function Privada({ rol, titulo, aviso, habiaUsuario, pagina }: PropsPrivada) {
  const { usuario } = useTienda();
  const { id = '' } = useParams();
  if (!usuario) return <IrAIngresar aviso={aviso} habiaUsuario={habiaUsuario} />;
  if (usuario.rol !== rol) return <Vista titulo="Sin acceso"><SinPermiso rol={usuario.rol} /></Vista>;
  return <Vista titulo={titulo}>{pagina(usuario, id)}</Vista>;
}

export default function App() {
  const ruta = useRuta();
  const { usuario } = useTienda();
  const { avisar } = useAvisos();
  const habiaUsuario = useRef(Boolean(usuario));
  const primeraVez = useRef(true);
  const esAdmin = useRef(false);

  useEffect(() => {
    habiaUsuario.current = Boolean(usuario);
    esAdmin.current = usuario?.rol === 'admin';
  });

  // Al cambiar de página: vuelve arriba y lleva el foco al título (lo anuncia el lector de pantalla).
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    window.scrollTo(0, 0);
    const h1 = document.querySelector<HTMLElement>('#principal h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  }, [ruta.camino]);

  // En Chrome, la rueda del mouse sobre un campo numérico con foco cambia su valor (por ejemplo,
  // la comisión bajaba de 3 a 0 al desplazar la página). Se quita el foco para que solo se desplace.
  useEffect(() => {
    const alGirar = (ev: WheelEvent) => {
      const campo = document.activeElement;
      if (campo instanceof HTMLInputElement && campo.type === 'number' && ev.target === campo) campo.blur();
    };
    document.addEventListener('wheel', alGirar, { passive: true });
    return () => document.removeEventListener('wheel', alGirar);
  }, []);

  // Avisos generales: API de imágenes caída y navegador sin almacenamiento.
  useEffect(() => alFallar((mensaje) => avisar(`No se pudieron cargar las imágenes de las cartas: ${mensaje}`, 'error',
    esAdmin.current ? { href: '/admin?tab=configuracion', texto: 'Probar la conexión' } : undefined)), [avisar]);
  useEffect(() => {
    if (!persistente) avisar('Tu navegador no permite guardar datos: la sesión y el carrito se pierden al recargar.', 'error');
  }, [avisar]);

  // El enlace "Saltar al contenido" no cambia la URL.
  const saltar = (ev: MouseEvent<HTMLAnchorElement>) => {
    ev.preventDefault();
    document.getElementById('principal')?.focus();
  };

  const privada = (rol: Rol, titulo: string, aviso: string, pagina: PropsPrivada['pagina']) => (
    <Privada rol={rol} titulo={titulo} aviso={aviso} habiaUsuario={habiaUsuario} pagina={pagina} />
  );

  return (
    <>
      <a className="saltar" href="#principal" data-accion="saltar" onClick={saltar}>Saltar al contenido</a>
      {/* Cabecera y Pie quedan FUERA de <Routes>: se ven en todas las páginas */}
      <Cabecera />
      <main id="principal" tabIndex={-1}>
        {/* key: al cambiar de página (no solo de filtros) la página parte desde cero. */}
        <Routes key={ruta.camino}>
          <Route path="/" element={<Vista titulo="Compra y vende cartas TCG en Chile"><Inicio /></Vista>} />
          <Route path="/catalogo" element={<Vista titulo="Catálogo"><Catalogo ruta={ruta} /></Vista>} />
          <Route path="/ofertas" element={<Vista titulo="Ofertas"><Ofertas /></Vista>} />
          <Route path="/categorias" element={<Vista titulo="Categorías"><Categorias /></Vista>} />
          <Route path="/categoria/:juego" element={<VistaCategoria />} />
          <Route path="/carta/:id" element={<VistaCarta />} />

          <Route path="/ingresar" element={<SoloVisitante titulo="Ingresar"><Ingresar /></SoloVisitante>} />
          <Route path="/registro" element={<SoloVisitante titulo="Crear cuenta"><Registro /></SoloVisitante>} />

          <Route path="/pago-rechazado" element={privada('cliente', 'Pago rechazado', 'Ingresa con tu cuenta para revisar tu compra.',
            (u) => <PagoRechazado usuario={u} />)} />
          <Route path="/carrito" element={privada('cliente', 'Carrito', 'Ingresa con tu cuenta para ver tu carrito.',
            (u) => <Carrito usuario={u} />)} />
          <Route path="/checkout" element={privada('cliente', 'Entrega y pago', 'Ingresa con tu cuenta para pagar.',
            (u) => <Checkout usuario={u} />)} />
          <Route path="/confirmacion/:id" element={privada('cliente', 'Compra confirmada', 'Ingresa para ver tu compra.',
            (u, id) => <Confirmacion ids={id} usuario={u} />)} />
          {/* "/vender" publica una carta nueva; "/vender/:id" edita esa publicación (misma página) */}
          <Route path="/vender" element={privada('cliente', 'Publicar una carta', 'Ingresa o crea una cuenta para publicar tus cartas.',
            (u) => <Vender id="" usuario={u} />)} />
          <Route path="/vender/:id" element={privada('cliente', 'Publicar una carta', 'Ingresa o crea una cuenta para publicar tus cartas.',
            (u, id) => <Vender id={id} usuario={u} />)} />
          <Route path="/inventario" element={privada('cliente', 'Mi inventario', 'Ingresa para ver tu inventario.',
            (u) => <Inventario usuario={u} />)} />
          <Route path="/pedidos" element={privada('cliente', 'Pedidos', 'Ingresa para ver tus pedidos.',
            (u) => <Pedidos ruta={ruta} usuario={u} />)} />
          <Route path="/retiros" element={privada('cliente', 'Retiros', 'Ingresa para retirar el dinero de tus ventas.',
            (u) => <Retiros usuario={u} />)} />
          <Route path="/admin" element={privada('admin', 'Administración', 'Ingresa con la cuenta de administración.',
            (u) => <Admin ruta={ruta} admin={u} />)} />

          {/* "*" = cualquier URL que no coincida con las de arriba */}
          <Route path="*" element={<Vista titulo="Página no encontrada"><NoEncontrada /></Vista>} />
        </Routes>
      </main>
      <Pie />
    </>
  );
}
