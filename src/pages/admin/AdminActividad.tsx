import { useState } from 'react';
import Tabla from '../../components/Tabla';
import { Tiempo } from '../../components/TablaMovimientos';
import { usuarioPorId } from '../../logica/consultas';
import { useTienda } from '../../hooks/useTienda';
import { plural } from '../../utils/formato';
import { normalizar } from '../../utils/validaciones';

const LIMITE = 150;

/* Registro de actividad: ingresos, compras, cambios de stock, moderación... */
export default function AdminActividad() {
  const { estado } = useTienda();
  const [texto, setTexto] = useState('');
  const q = normalizar(texto);
  const lista = estado.actividad.slice().reverse().filter((a) => {
    if (!q) return true;
    const u = usuarioPorId(estado, a.uid);
    return normalizar(`${a.accion} ${a.detalle} ${u ? u.nombre : ''}`).includes(q);
  });

  return (
    <>
      <div className="barra-herramientas">
        <div className="campo">
          <label htmlFor="adm-act-texto">Buscar</label>
          <input id="adm-act-texto" type="search" name="actTexto" value={texto} placeholder="Acción, usuario o detalle" onChange={(ev) => setTexto(ev.target.value)} />
        </div>
      </div>
      <div id="adm-resultados">
        <p className="nota">{lista.length} {plural(lista.length, 'registro', 'registros')}{lista.length > LIMITE ? `. Se muestran los ${LIMITE} más recientes` : ''}.</p>
        <Tabla columnas={[{ t: 'Fecha' }, { t: 'Usuario' }, { t: 'Acción' }, { t: 'Detalle' }]} leyenda="Registro de actividad" vacio="No hay registros con ese texto."
          filas={lista.slice(0, LIMITE).map((a) => {
            const u = usuarioPorId(estado, a.uid);
            return { clave: a.id, celdas: [<Tiempo t={a.fecha} />, u ? u.nombre : 'Visitante', a.accion, a.detalle] };
          })} />
      </div>
    </>
  );
}
