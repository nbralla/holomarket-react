import { condicionDe } from '../data/catalogo';

/* Etiqueta de condición (MT, NM, EX, GD, LP, PL, PO) con su nombre completo al pasar el puntero. */
export function CondicionChip({ id }: { id: string }) {
  return (
    <span className={`cond cond--${id}`}>
      <abbr title={condicionDe(id).nombre}>{id}</abbr>
    </span>
  );
}

/* Píldora de estado: activa, pausada, pagado, enviado, bloqueado... */
export function EstadoChip({ clave, texto }: { clave: string; texto: string }) {
  return <span className={`estado estado--${clave}`}>{texto}</span>;
}
