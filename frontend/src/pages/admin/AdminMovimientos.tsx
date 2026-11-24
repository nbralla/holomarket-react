import { useState } from 'react';
import TablaMovimientos from '../../components/TablaMovimientos';
import { IDS_JUEGOS, JUEGOS } from '../../data/catalogo';
import { TIPOS_MOVIMIENTO } from '../../logica/consultas';
import { registrarActividad } from '../../logica/estado';
import { csvMovimientos, descargarArchivo } from '../../services/csv';
import { useAvisos } from '../../hooks/useAvisos';
import { useTienda } from '../../hooks/useTienda';
import type { TipoMovimiento, Usuario } from '../../types';
import { plural } from '../../utils/formato';
import { normalizar } from '../../utils/validaciones';

const LIMITE = 100;

/* Todos los movimientos de stock, con filtros y exportación a CSV (Excel). */
export default function AdminMovimientos({ admin }: { admin: Usuario }) {
  const { estado, actualizar } = useTienda();
  const { avisar } = useAvisos();
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState('');
  const [juego, setJuego] = useState('');

  const q = normalizar(texto);
  const lista = estado.movimientos.filter((m) => (!tipo || m.tipo === tipo) && (!juego || m.juego === juego)
    && (!q || normalizar(`${m.carta} ${m.pubId} ${m.ref} ${m.id}`).includes(q))).slice().reverse();

  const exportar = () => {
    descargarArchivo(`holomarket-movimientos-${new Date().toISOString().slice(0, 10)}.csv`, csvMovimientos(estado, lista));
    actualizar((e) => registrarActividad(e, 'Exportación de movimientos', `${lista.length} registros en CSV`, admin.id));
    avisar(`Descargaste ${lista.length} ${plural(lista.length, 'movimiento', 'movimientos')} en CSV.`, 'exito');
  };

  return (
    <>
      <div className="barra-herramientas">
        <div className="campo">
          <label htmlFor="adm-mov-texto">Buscar</label>
          <input id="adm-mov-texto" type="search" name="movTexto" value={texto} placeholder="Carta, ID o referencia" onChange={(ev) => setTexto(ev.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="adm-mov-tipo">Tipo</label>
          <select id="adm-mov-tipo" name="movTipo" value={tipo} onChange={(ev) => setTipo(ev.target.value)}>
            <option value="">Todos</option>
            {(Object.entries(TIPOS_MOVIMIENTO) as [TipoMovimiento, string][]).map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="adm-mov-juego">Juego</label>
          <select id="adm-mov-juego" name="movJuego" value={juego} onChange={(ev) => setJuego(ev.target.value)}>
            <option value="">Todos</option>
            {IDS_JUEGOS.map((id) => <option key={id} value={id}>{JUEGOS[id].nombre}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn--suave" data-accion="exportar-csv" onClick={exportar}>Exportar CSV</button>
      </div>
      <div id="adm-resultados">
        <p className="nota">
          {lista.length} {plural(lista.length, 'movimiento', 'movimientos')}
          {lista.length > LIMITE ? `. Se muestran los ${LIMITE} más recientes; el CSV incluye todos` : ''}.
        </p>
        <TablaMovimientos movimientos={lista} conVendedor limite={LIMITE} />
      </div>
    </>
  );
}
