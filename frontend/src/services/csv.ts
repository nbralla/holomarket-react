/* =========================================================================
   Exportación del historial de stock a CSV (para abrir en Excel)
   ========================================================================= */
import { JUEGOS } from '../data/catalogo';
import { TIPOS_MOVIMIENTO, usuarioPorId } from '../logica/consultas';
import type { Estado, Movimiento } from '../types';
import { fechaHora } from '../utils/formato';

/* Escapa una celda: comillas, separador y saltos de línea. Un texto que empieza con
   = + - @ se antepone con ' para que Excel no lo ejecute como fórmula (inyección CSV). */
export function celdaCsv(valor: unknown): string {
  let s = String(valor ?? '');
  if (/^[=+@-]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* Separador ; y BOM al inicio para que Excel en español muestre bien columnas y tildes. */
export function csvMovimientos(e: Estado, movs: Movimiento[]): string {
  const cabecera = ['ID', 'Fecha', 'Publicación', 'Carta', 'Juego', 'Vendedor', 'Tipo', 'Cantidad', 'Stock antes', 'Stock después', 'Referencia', 'Registrado por'];
  const filas = movs.map((m) => {
    const vendedor = usuarioPorId(e, m.vendedorId);
    const autor = usuarioPorId(e, m.uid);
    return [m.id, fechaHora(m.fecha), m.pubId, m.carta, JUEGOS[m.juego]?.nombre ?? m.juego,
      vendedor ? vendedor.nombre : '', TIPOS_MOVIMIENTO[m.tipo] ?? m.tipo, m.cantidad, m.antes, m.despues, m.ref, autor ? autor.nombre : 'Sistema'];
  });
  return `\uFEFF${[cabecera, ...filas].map((f) => f.map(celdaCsv).join(';')).join('\r\n')}`;
}

/* Descarga un texto como archivo desde el navegador. */
export function descargarArchivo(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8'): void {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 2000);
}
