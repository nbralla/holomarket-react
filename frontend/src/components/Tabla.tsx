import type { ReactNode } from 'react';

export interface Columna {
  t: string;
  num?: boolean;
}

export interface Fila {
  clave: string;
  celdas: ReactNode[];
}

interface Props {
  columnas: Columna[];
  filas: Fila[];
  vacio?: string;
  leyenda?: string;
  clase?: string;
}

/* Tabla accesible. En pantallas angostas cada fila se muestra como tarjeta con la etiqueta
   de la columna (la CSS la lee del atributo data-label). */
export default function Tabla({ columnas, filas, vacio = 'No hay registros para mostrar.', leyenda, clase }: Props) {
  if (!filas.length) return <p className="vacio">{vacio}</p>;
  return (
    <div className="tabla-envoltorio">
      <table className={`tabla${clase ? ` ${clase}` : ''}`}>
        {leyenda && <caption className="solo-lector">{leyenda}</caption>}
        <thead>
          <tr>
            {columnas.map((c) => <th key={c.t} scope="col" className={c.num ? 'num' : undefined}>{c.t}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.clave}>
              {f.celdas.map((celda, i) => (
                <td key={columnas[i]?.t ?? i} data-label={columnas[i]?.t} className={columnas[i]?.num ? 'num' : undefined}>{celda}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
