import type { Rol } from '../types';
import { Link } from 'react-router';

/* Se muestra cuando un usuario con sesión entra a una sección de otro rol. */
export default function SinPermiso({ rol }: { rol: Rol }) {
  return (
    <section className="vista contenedor" id="vista-sin-permiso" data-vista="sin-permiso">
      <div className="vacio vacio--grande">
        <h1 className="titulo-vista">No tienes acceso a esta sección</h1>
        <p id="sin-permiso-detalle">
          {rol === 'admin'
            ? 'La cuenta de administración no compra ni vende cartas. Para probar esta sección, cierra sesión e ingresa con un usuario cliente.'
            : 'Esta sección es solo para el equipo de administración de HoloMarket.'}
        </p>
        <Link className="btn btn--primario" to="/">Volver al inicio</Link>
      </div>
    </section>
  );
}
