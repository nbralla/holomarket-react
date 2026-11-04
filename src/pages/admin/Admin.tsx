import type { ReactNode } from 'react';
import { useTienda } from '../../hooks/useTienda';
import type { Usuario } from '../../types';
import type { Ruta } from '../../utils/navegacion';
import AdminActividad from './AdminActividad';
import AdminConfiguracion from './AdminConfiguracion';
import AdminMovimientos from './AdminMovimientos';
import AdminPublicaciones from './AdminPublicaciones';
import AdminResumen from './AdminResumen';
import AdminRetiros from './AdminRetiros';
import AdminUsuarios from './AdminUsuarios';
import { Link } from 'react-router';

type Pestana = 'resumen' | 'publicaciones' | 'usuarios' | 'movimientos' | 'retiros' | 'actividad' | 'configuracion';

const PESTANAS: [Pestana, string][] = [
  ['resumen', 'Resumen'], ['publicaciones', 'Publicaciones'], ['usuarios', 'Usuarios'], ['movimientos', 'Movimientos de stock'],
  ['retiros', 'Retiros'], ['actividad', 'Actividad'], ['configuracion', 'Configuración'],
];

const esPestana = (v: string | null): v is Pestana => PESTANAS.some(([id]) => id === v);

/* Panel de administración. La pestaña activa viene de la URL (/admin?tab=usuarios). */
export default function Admin({ ruta, admin }: { ruta: Ruta; admin: Usuario }) {
  const { estado } = useTienda();
  const pedida = ruta.params.get('tab');
  const pestana: Pestana = esPestana(pedida) ? pedida : 'resumen';
  const nRetiros = estado.retiros.filter((r) => r.estado === 'solicitado').length;

  const contenido: Record<Pestana, ReactNode> = {
    resumen: <AdminResumen />,
    publicaciones: <AdminPublicaciones admin={admin} />,
    usuarios: <AdminUsuarios admin={admin} />,
    movimientos: <AdminMovimientos admin={admin} />,
    retiros: <AdminRetiros admin={admin} />,
    actividad: <AdminActividad />,
    configuracion: <AdminConfiguracion admin={admin} />,
  };

  return (
    <section className="vista contenedor" id="vista-admin" data-vista="admin" aria-labelledby="admin-titulo">
      <div className="vista__cabeza">
        <div>
          <h1 className="titulo-vista" id="admin-titulo">Administración</h1>
          <p className="bajada">Supervisa ventas, stock, usuarios y parámetros de HoloMarket.</p>
        </div>
      </div>
      <nav className="pestanas" aria-label="Secciones de administración">
        {PESTANAS.map(([id, texto]) => (
          <Link key={id} to={`/admin?tab=${id}`} data-pestana={id} aria-current={pestana === id ? 'page' : undefined}>
            {texto}
            {id === 'retiros' && nRetiros > 0 && <> <span className="pestanas__n" id="admin-n-retiros">{nRetiros}</span></>}
          </Link>
        ))}
      </nav>
      <div id="admin-contenido" key={pestana}>{contenido[pestana]}</div>
    </section>
  );
}
