import { TIPOS_MOVIMIENTO, usuarioPorId } from '../logica/consultas';
import { useTienda } from '../hooks/useTienda';
import type { Movimiento } from '../types';
import { fechaHora, nombreCorto } from '../utils/formato';
import Tabla, { type Columna } from './Tabla';

import { Link } from 'react-router';
export function Tiempo({ t }: { t: number }) {
  return <time dateTime={new Date(t).toISOString()}>{fechaHora(t)}</time>;
}

export function CantidadMovimiento({ cantidad }: { cantidad: number }) {
  const clase = cantidad > 0 ? 'mas' : cantidad < 0 ? 'menos' : 'cero';
  return <span className={`mov mov--${clase}`}>{cantidad > 0 ? '+' : ''}{cantidad}</span>;
}

interface Props {
  movimientos: Movimiento[];
  conCarta?: boolean;
  conVendedor?: boolean;
  limite?: number;
}

/* Historial de stock (kardex): cada fila muestra el stock antes y después del cambio. */
export default function TablaMovimientos({ movimientos, conCarta = true, conVendedor = false, limite = 0 }: Props) {
  const { estado } = useTienda();
  const lista = limite ? movimientos.slice(0, limite) : movimientos;
  const columnas: Columna[] = [{ t: 'Fecha' }];
  if (conCarta) columnas.push({ t: 'Carta' });
  if (conVendedor) columnas.push({ t: 'Vendedor' });
  columnas.push({ t: 'Movimiento' }, { t: 'Cantidad', num: true }, { t: 'Stock antes → después', num: true }, { t: 'Referencia' });

  const filas = lista.map((m) => {
    const celdas = [<Tiempo key="f" t={m.fecha} />];
    if (conCarta) celdas.push(<><Link to={`/carta/${m.pubId}`}>{m.carta}</Link><span className="celda-sub">{m.pubId}</span></>);
    if (conVendedor) celdas.push(<>{nombreCorto(usuarioPorId(estado, m.vendedorId))}</>);
    celdas.push(
      <span className="mov-tipo">{TIPOS_MOVIMIENTO[m.tipo] ?? m.tipo}</span>,
      <CantidadMovimiento cantidad={m.cantidad} />,
      <>{m.antes} → <strong>{m.despues}</strong></>,
      <>{m.ref}</>,
    );
    return { clave: m.id, celdas };
  });

  return <Tabla columnas={columnas} filas={filas} vacio="Todavía no hay movimientos de stock." leyenda="Movimientos de stock" />;
}
