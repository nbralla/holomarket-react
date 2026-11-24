export interface Indicador {
  valor: string;
  etiqueta: string;
  detalle: string;
  variante?: 'alerta' | 'destacado';
}

/* Fila de tarjetas con números clave (inventario, retiros y administración). */
export default function Indicadores({ items, id }: { items: Indicador[]; id?: string }) {
  return (
    <div className="indicadores" id={id}>
      {items.map((x) => (
        <div key={x.etiqueta} className={`indicador${x.variante ? ` indicador--${x.variante}` : ''}`}>
          <p className="indicador__valor">{x.valor}</p>
          <p className="indicador__etiqueta">{x.etiqueta}</p>
          <p className="indicador__detalle">{x.detalle}</p>
        </div>
      ))}
    </div>
  );
}
