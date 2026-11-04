/* Precio: props y renderizado condicional de la oferta. */
import { render, screen } from '@testing-library/react';
import { clp } from '../utils/formato';
import Precio from './Precio';

describe('Precio', () => {
  it('sin oferta muestra solo el precio', () => {
    const { container } = render(<Precio precio={5990} precioAnterior={null} />);
    expect(container.textContent).toBe(clp(5990));
    expect(container.querySelector('s')).toBeNull();
    expect(container.querySelector('.badge')).toBeNull();
  });

  it('con oferta tacha el precio anterior y muestra el descuento en un badge', () => {
    const { container } = render(<Precio precio={4490} precioAnterior={5490} />);
    expect(container.querySelector('.precio__actual')?.textContent).toBe(clp(4490));
    expect(container.querySelector('s')?.textContent).toBe(`Antes: ${clp(5490)}`);
    expect(screen.getByText('-18%').classList).toContain('badge');
    expect(container.querySelector('.precio')?.classList).toContain('precio--oferta');
  });

  it('un precio anterior menor o igual no cuenta como oferta', () => {
    const { container } = render(<Precio precio={4490} precioAnterior={4490} />);
    expect(container.querySelector('.precio--oferta')).toBeNull();
  });
});
