import { useEffect, useRef, useState, type FormEvent } from 'react';
import { leerFiltros, rutaCatalogo } from '../logica/consultas';
import { useDebounce } from '../hooks/useDebounce';
import { useNavegar, useRuta } from '../hooks/useRuta';
import { useTienda } from '../hooks/useTienda';
import { iniciales, nombreCorto, plural, suma } from '../utils/formato';

import { Link } from 'react-router';
const SECCION_ACTIVA: Record<string, string> = { carta: 'catalogo', categoria: 'categorias', checkout: 'carrito', 'pago-rechazado': 'carrito', confirmacion: 'pedidos' };

export default function Cabecera() {
  const { estado, usuario, carrito, cerrarSesion } = useTienda();
  const ruta = useRuta();
  const { navegar, reemplazar: reemplazarRuta } = useNavegar();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [texto, setTexto] = useState(() => (ruta.vista === 'catalogo' ? ruta.params.get('q') ?? '' : ''));
  const buscador = useRef<HTMLInputElement>(null);
  const escribiendo = useRef(false);
  const rutaRef = useRef(ruta);
  rutaRef.current = ruta;

  const rol = usuario?.rol ?? 'visitante';
  const actual = SECCION_ACTIVA[ruta.vista] ?? ruta.vista;
  const enCarrito = suma(carrito, (i) => i.cantidad);
  const porEnviar = usuario ? estado.pedidos.filter((o) => o.vendedorId === usuario.id && o.estado === 'pagado').length : 0;
  const marca = (seccion: string) => (actual === seccion ? 'page' as const : undefined);

  // Al cambiar de página se cierran los menús y el buscador muestra la búsqueda del catálogo.
  useEffect(() => {
    setMenuAbierto(false);
    setMenuUsuario(false);
    if (document.activeElement !== buscador.current) setTexto(ruta.vista === 'catalogo' ? ruta.params.get('q') ?? '' : '');
  }, [ruta]);

  // En el catálogo, la búsqueda se aplica mientras escribes (250 ms después de la última tecla).
  const textoRetrasado = useDebounce(texto, 250);
  useEffect(() => {
    if (!escribiendo.current) return;
    escribiendo.current = false;
    const r = rutaRef.current;
    if (r.vista !== 'catalogo') return;
    const filtros = leerFiltros(r.params);
    const q = textoRetrasado.trim().slice(0, 60);
    if (filtros.q !== q) reemplazarRuta(rutaCatalogo({ ...filtros, q }));
  }, [textoRetrasado, reemplazarRuta]);

  // Escape cierra los menús; un clic fuera cierra el menú de usuario.
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      setMenuAbierto(false);
      setMenuUsuario(false);
    };
    const clic = (ev: MouseEvent) => {
      if (!(ev.target instanceof Element) || !ev.target.closest('.usuario')) setMenuUsuario(false);
    };
    document.addEventListener('keydown', tecla);
    document.addEventListener('click', clic);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('click', clic);
    };
  }, []);

  const buscar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    escribiendo.current = false;
    const q = texto.trim().slice(0, 60);
    if (ruta.vista === 'catalogo') reemplazarRuta(rutaCatalogo({ ...leerFiltros(ruta.params), q }));
    else navegar(q ? `/catalogo?q=${encodeURIComponent(q)}` : '/catalogo');
  };

  return (
    <>
      <header className="cabecera">
        <div className="cabecera__fila contenedor">
          <Link className="logo" to="/" aria-label="HoloMarket, ir al inicio">
            <span className="logo__marca" aria-hidden="true" />
            <span className="logo__texto">HoloMarket</span>
          </Link>

          <form className="buscador" id="form-buscar" role="search" onSubmit={buscar}>
            <label className="solo-lector" htmlFor="buscar">Buscar cartas</label>
            <input id="buscar" ref={buscador} type="search" name="q" placeholder="Busca por carta, edición o número" autoComplete="off"
              maxLength={60} value={texto} onChange={(ev) => { escribiendo.current = true; setTexto(ev.target.value); }} />
            <button type="submit" className="buscador__boton" aria-label="Buscar">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" />
              </svg>
            </button>
          </form>

          <button type="button" className="boton-menu" id="boton-menu" aria-expanded={menuAbierto} aria-controls="navegacion"
            onClick={() => setMenuAbierto((a) => !a)}>
            <span className="boton-menu__icono" aria-hidden="true"><i /><i /><i /></span>
            <span>Menú</span>
          </button>

          <nav className={`menu${menuAbierto ? ' menu--abierta' : ''}`} id="navegacion" aria-label="Principal">
            <ul className="menu__lista">
              <li><Link to="/catalogo" data-nav="catalogo" aria-current={marca('catalogo')}>Catálogo</Link></li>
              <li><Link to="/categorias" data-nav="categorias" aria-current={marca('categorias')}>Categorías</Link></li>
              <li><Link to="/ofertas" data-nav="ofertas" aria-current={marca('ofertas')}>Ofertas</Link></li>
              {rol !== 'admin' && <li><Link to="/vender" data-nav="vender" aria-current={marca('vender')}>Vender</Link></li>}
              {rol === 'cliente' && (
                <>
                  <li>
                    <Link to="/pedidos" id="nav-pedidos" data-nav="pedidos" aria-current={marca('pedidos')}
                      aria-label={porEnviar ? `Pedidos, ${porEnviar} ${plural(porEnviar, 'venta', 'ventas')} por enviar` : 'Pedidos'}>
                      Pedidos {porEnviar > 0 && <span className="badge rounded-pill contador" id="pedidos-contador">{porEnviar}</span>}
                    </Link>
                  </li>
                </>
              )}
              {rol === 'admin' && <li><Link to="/admin" data-nav="admin" aria-current={marca('admin')}>Administración</Link></li>}
              {rol === 'visitante' && <li><Link className="menu__ingresar" to="/ingresar" data-nav="ingresar" aria-current={marca('ingresar')}>Ingresar</Link></li>}
            </ul>
          </nav>

          {rol !== 'admin' && (
            <Link className="carrito-enlace" id="carrito-enlace" to="/carrito" data-nav="carrito" aria-current={marca('carrito')}
              aria-label={enCarrito ? `Carrito, ${enCarrito} ${plural(enCarrito, 'carta', 'cartas')}` : 'Carrito, vacío'}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 4h2.2l2.3 10.6a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.5L21 8H6.1" /><circle cx="10" cy="20" r="1.4" /><circle cx="17.2" cy="20" r="1.4" />
              </svg>
              <span className="badge rounded-pill contador" id="carrito-contador" hidden={enCarrito === 0}>{enCarrito}</span>
            </Link>
          )}

          {usuario && (
            <div className="usuario">
              <button type="button" className="usuario__boton" id="boton-usuario" aria-expanded={menuUsuario} aria-controls="menu-usuario"
                onClick={() => setMenuUsuario((a) => !a)}>
                <span className="avatar" id="usuario-avatar" aria-hidden="true">{iniciales(usuario.nombre)}</span>
                <span className="usuario__nombre" id="usuario-nombre">{nombreCorto(usuario)}</span>
              </button>
              <div className="usuario__menu" id="menu-usuario" hidden={!menuUsuario}>
                <p className="usuario__completo" id="usuario-nombre-completo">{usuario.nombre}</p>
                <p className="usuario__correo" id="usuario-correo">{usuario.email}</p>
                <p className="usuario__rol" id="usuario-rol">{usuario.rol === 'admin' ? 'Administrador' : 'Cliente'}</p>
                {rol === 'cliente' && (
                  <ul className="usuario__enlaces" aria-label="Mi cuenta">
                    <li><Link to="/inventario" aria-current={marca('inventario')} onClick={() => setMenuUsuario(false)}>Mi inventario</Link></li>
                    <li><Link to="/pedidos" aria-current={marca('pedidos')} onClick={() => setMenuUsuario(false)}>Mis pedidos</Link></li>
                    <li><Link to="/retiros" aria-current={marca('retiros')} onClick={() => setMenuUsuario(false)}>Retiros de dinero</Link></li>
                  </ul>
                )}
                <button type="button" className="btn btn--fantasma btn--chico btn--bloque" data-accion="cerrar-sesion" onClick={() => cerrarSesion()}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
