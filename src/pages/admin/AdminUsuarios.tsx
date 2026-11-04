import { EstadoChip } from '../../components/Chips';
import Tabla from '../../components/Tabla';
import { cambiarEstadoUsuario } from '../../logica/usuarios';
import { useAvisos } from '../../hooks/useAvisos';
import { useModal } from '../../hooks/useModal';
import { useTienda } from '../../hooks/useTienda';
import type { Usuario } from '../../types';
import { fecha, plural } from '../../utils/formato';

/* Lista de usuarios. Bloquear cierra la sesión del usuario y oculta sus publicaciones. */
export default function AdminUsuarios({ admin }: { admin: Usuario }) {
  const { estado, actualizar } = useTienda();
  const { avisar } = useAvisos();
  const modal = useModal();

  const cambiar = async (u: Usuario, nuevo: 'activo' | 'bloqueado') => {
    if (nuevo === 'bloqueado') {
      const ok = await modal.confirmar({
        titulo: 'Bloquear usuario',
        mensaje: <p>Vas a bloquear a <strong>{u.nombre}</strong> ({u.email}). No podrá ingresar y sus publicaciones dejarán de verse en el catálogo.</p>,
        confirmar: 'Bloquear usuario',
        peligro: true,
      });
      if (!ok) return;
    }
    const r = actualizar((e) => cambiarEstadoUsuario(e, admin, u.id, nuevo));
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(nuevo === 'bloqueado' ? `Bloqueaste a ${u.nombre}.` : `Reactivaste a ${u.nombre}.`, 'exito');
  };

  const filas = estado.usuarios.slice().sort((a, b) => a.creado - b.creado).map((u) => {
    const pubs = estado.publicaciones.filter((p) => p.vendedorId === u.id && p.estado === 'activa').length;
    const compras = estado.pedidos.filter((o) => o.compradorId === u.id).length;
    const ventas = estado.pedidos.filter((o) => o.vendedorId === u.id).length;
    const activo = u.estado === 'activo';
    let accion = <span className="nota">Sin acciones</span>;
    if (u.rol !== 'admin') {
      accion = activo
        ? <button type="button" className="btn btn--chico btn--texto-peligro" data-accion="bloquear-usuario" data-id={u.id}
          aria-label={`Bloquear a ${u.nombre}`} onClick={() => cambiar(u, 'bloqueado')}>Bloquear</button>
        : <button type="button" className="btn btn--chico btn--suave" data-accion="activar-usuario" data-id={u.id}
          aria-label={`Reactivar a ${u.nombre}`} onClick={() => cambiar(u, 'activo')}>Reactivar</button>;
    }
    return {
      clave: u.id,
      celdas: [
        <><span className="celda-carta__nombre">{u.nombre}</span><span className="celda-sub">{u.email}</span></>,
        u.rut,
        u.rol === 'admin' ? 'Administrador' : 'Cliente',
        <>{u.comuna}<span className="celda-sub">{u.region}</span></>,
        <>{pubs} {plural(pubs, 'publicación', 'publicaciones')}<span className="celda-sub">{compras} {plural(compras, 'compra', 'compras')}, {ventas} {plural(ventas, 'venta', 'ventas')}</span></>,
        fecha(u.creado),
        <EstadoChip clave={activo ? 'activo' : 'bloqueado'} texto={activo ? 'Activo' : 'Bloqueado'} />,
        accion,
      ],
    };
  });

  return (
    <>
      <p className="bajada">Bloquear a alguien cierra su sesión, le impide volver a ingresar y oculta sus publicaciones del catálogo.</p>
      <Tabla columnas={[{ t: 'Usuario' }, { t: 'RUT' }, { t: 'Rol' }, { t: 'Comuna' }, { t: 'Actividad' }, { t: 'Desde' }, { t: 'Estado' }, { t: 'Acción' }]}
        filas={filas} leyenda="Usuarios" />
    </>
  );
}
