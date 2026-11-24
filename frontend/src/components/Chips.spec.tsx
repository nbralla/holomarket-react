/* Etiquetas de condición y de estado: dependen solo de sus props. */
import { render, screen } from '@testing-library/react';
import { CONDICIONES } from '../data/catalogo';
import { CondicionChip, EstadoChip } from './Chips';

describe('CondicionChip', () => {
  it('muestra la sigla y, al pasar el puntero, el nombre en inglés de la condición', () => {
    render(<CondicionChip id="EX" />);
    const sigla = screen.getByText('EX');
    expect(sigla.tagName).toBe('ABBR');
    expect(sigla.getAttribute('title')).toBe('Excellent');
    expect(sigla.parentElement?.classList).toContain('cond--EX');
  });

  it('tiene una etiqueta distinta para cada una de las 7 condiciones (MT a PO)', () => {
    render(<>{CONDICIONES.map((c) => <CondicionChip key={c.id} id={c.id} />)}</>);
    expect(CONDICIONES.map((c) => c.id)).toEqual(['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO']);
    CONDICIONES.forEach((c) => expect(screen.getByTitle(c.nombre).textContent).toBe(c.id));
  });
});

describe('EstadoChip', () => {
  it('muestra el texto recibido con la clase de su estado', () => {
    render(<EstadoChip clave="pausada" texto="Pausada" />);
    const chip = screen.getByText('Pausada');
    expect(chip.classList).toContain('estado');
    expect(chip.classList).toContain('estado--pausada');
  });
});
