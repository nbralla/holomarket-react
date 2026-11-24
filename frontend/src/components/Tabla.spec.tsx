/* Tabla: renderizado de listas y renderizado condicional cuando no hay filas. */
import { render, screen, within } from '@testing-library/react';
import Tabla from './Tabla';

const columnas = [{ t: 'Carta' }, { t: 'Precio', num: true }];
const filas = [
  { clave: 'P001', celdas: ['Charizard ex', '$5.990'] },
  { clave: 'P012', celdas: ['Pikachu', '$590'] },
  { clave: 'P019', celdas: ['Blue-Eyes White Dragon', '$74.990'] },
];

describe('Tabla', () => {
  it('dibuja una fila por cada elemento del conjunto de datos', () => {
    render(<Tabla columnas={columnas} filas={filas} leyenda="Cartas" />);
    const cuerpo = screen.getAllByRole('rowgroup')[1];   // [0] = thead, [1] = tbody
    const filasDibujadas = within(cuerpo).getAllByRole('row');
    expect(filasDibujadas.length).toBe(3);
    expect(filasDibujadas.map((f) => f.textContent)).toEqual(['Charizard ex$5.990', 'Pikachu$590', 'Blue-Eyes White Dragon$74.990']);
  });

  it('usa las columnas recibidas: encabezados, etiqueta para celular y alineación numérica', () => {
    render(<Tabla columnas={columnas} filas={filas} />);
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Carta', 'Precio']);
    const celda = screen.getByText('$590');
    expect(celda.getAttribute('data-label')).toBe('Precio');
    expect(celda.classList).toContain('num');
  });

  it('muestra el mensaje de vacío (y no una tabla) cuando no hay filas', () => {
    render(<Tabla columnas={columnas} filas={[]} vacio="No hay cartas." />);
    expect(screen.getByText('No hay cartas.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
