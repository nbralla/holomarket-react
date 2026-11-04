import { useState } from 'react';
import Carta from '../../components/Carta';
import { EstadoChip } from '../../components/Chips';
import Tabla from '../../components/Tabla';
import { JUEGOS } from '../../data/catalogo';
import { estadoPublicacion, usuarioPorId } from '../../logica/consultas';
import { cambiarEstadoPublicacion, eliminarPublicacion } from '../../logica/publicaciones';
import { useAvisos } from '../../hooks/useAvisos';
import { useModal } from '../../hooks/useModal';
import { useTienda } from '../../hooks/useTienda';
import type { Publicacion, Usuario } from '../../types';
import { clp, plural } from '../../utils/formato';
import { normalizar } from '../../utils/validaciones';
import { Link } from 'react-router';

/* Moderación: el administrador puede pausar, activar o eliminar cualquier publicación. */
export default function AdminPublicaciones({ admin }: { admin: Usuario }) {
  const { estado, actualizar } = useTienda();
  const { avisar } = useAvisos();
  const modal = useModal();
  const [texto, setTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const q = normalizar(texto);
  const lista = estado.publicaciones.filter((p) => {
    if (filtroEstado && estadoPublicacion(p).clave !== filtroEstado) return false;
    if (!q) return true;
    const v = usuarioPorId(estado, p.vendedorId);
    return normalizar(`${p.nombre} ${p.id} ${p.edicion} ${v ? v.nombre : ''}`).includes(q);
  }).sort((a, b) => b.creado - a.creado);

  const cambiarEstado = (p: Publicacion, nuevo: 'activa' | 'pausada') => {
    const r = actualizar((e) => cambiarEstadoPublicacion(e, admin, p.id, nuevo));
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(nuevo === 'pausada' ? `Pausaste ${p.nombre}: ya no aparece en el catálogo.` : `Activaste ${p.nombre}: vuelve a aparecer en el catálogo.`, 'exito');
  };

  const eliminar = async (p: Publicacion) => {
    const ok = await modal.confirmar({
      titulo: 'Eliminar publicación',
      mensaje: <p>Vas a eliminar <strong>{p.nombre}</strong> ({p.id}). Sus {p.stock} {plural(p.stock, 'unidad', 'unidades')} saldrán del stock y no se puede deshacer. Los pedidos ya hechos no cambian.</p>,
      confirmar: 'Eliminar publicación',
      peligro: true,
    });
    if (!ok) return;
    const r = actualizar((e) => eliminarPublicacion(e, admin, p.id));
    if (!r) return;
    if (!r.ok) avisar(r.error, 'error');
    else avisar(`Eliminaste ${p.nombre}.`, 'exito');
  };

  const filas = lista.map((p) => {
    const est = estadoPublicacion(p);
    const v = usuarioPorId(estado, p.vendedorId);
    return {
      clave: p.id,
      celdas: [
        <div className="celda-carta">
          <Carta carta={p} clase="carta--mini" />
          <div><span className="celda-carta__nombre">{p.nombre}</span><span className="celda-sub">{JUEGOS[p.juego].nombre} ({p.id})</span></div>
        </div>,
        <>{v ? v.nombre : 'Sin vendedor'}{v && v.estado !== 'activo' && <> <EstadoChip clave="bloqueado" texto="Bloqueado" /></>}</>,
        clp(p.precio),
        String(p.stock),
        <EstadoChip clave={est.clave} texto={est.texto} />,
        <div className="acciones">
          <Link className="btn btn--chico btn--fantasma" to={`/carta/${p.id}`} aria-label={`Ver ${p.nombre}`}>Ver</Link>
          {p.estado === 'activa' && (
            <button type="button" className="btn btn--chico btn--fantasma" data-accion="pausar" data-id={p.id} aria-label={`Pausar ${p.nombre}`}
              onClick={() => cambiarEstado(p, 'pausada')}>Pausar</button>
          )}
          {p.estado === 'pausada' && (
            <button type="button" className="btn btn--chico btn--fantasma" data-accion="activar" data-id={p.id} aria-label={`Activar ${p.nombre}`}
              onClick={() => cambiarEstado(p, 'activa')}>Activar</button>
          )}
          {p.estado !== 'eliminada' && (
            <button type="button" className="btn btn--chico btn--texto-peligro" data-accion="eliminar" data-id={p.id} aria-label={`Eliminar ${p.nombre}`}
              onClick={() => eliminar(p)}>Eliminar</button>
          )}
        </div>,
      ],
    };
  });

  return (
    <>
      <div className="barra-herramientas">
        <div className="campo">
          <label htmlFor="adm-pub-texto">Buscar</label>
          <input id="adm-pub-texto" type="search" name="pubTexto" value={texto} placeholder="Carta, ID o vendedor" onChange={(ev) => setTexto(ev.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="adm-pub-estado">Estado</label>
          <select id="adm-pub-estado" name="pubEstado" value={filtroEstado} onChange={(ev) => setFiltroEstado(ev.target.value)}>
            <option value="">Todos</option>
            <option value="activa">Activas</option>
            <option value="agotada">Agotadas</option>
            <option value="pausada">Pausadas</option>
            <option value="eliminada">Eliminadas</option>
          </select>
        </div>
      </div>
      <div id="adm-resultados">
        <p className="nota">{lista.length} {plural(lista.length, 'publicación', 'publicaciones')}</p>
        <Tabla columnas={[{ t: 'Carta' }, { t: 'Vendedor' }, { t: 'Precio', num: true }, { t: 'Stock', num: true }, { t: 'Estado' }, { t: 'Acciones' }]}
          filas={filas} vacio="No hay publicaciones con esos filtros." leyenda="Publicaciones" />
      </div>
    </>
  );
}
