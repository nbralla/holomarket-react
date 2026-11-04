/* Ficha de una carta en el catálogo: resume todas sus publicaciones. */
import { screen } from '@testing-library/react';
import { filtrarPublicaciones, FILTROS_VACIOS } from '../logica/consultas';
import { agruparProductos } from '../logica/productos';
import { estadoDemo, montar, simularFetch, tiendaFalsa } from '../pruebas/montar';
import { clp } from '../utils/formato';
import FichaProducto from './FichaProducto';

const charizard = (estado = estadoDemo()) =>
  agruparProductos(filtrarPublicaciones(estado, { ...FILTROS_VACIOS, q: 'charizard obsidian', agotadas: true }))[0];

describe('FichaProducto', () => {
  beforeEach(() => { simularFetch(); });   // el valor del dólar no se pide a internet en las pruebas

  it('muestra la carta, cuántas publicaciones tiene y el precio más bajo', () => {
    montar(<FichaProducto producto={charizard()} />);
    expect(screen.getByRole('heading', { name: 'Charizard ex' })).toBeTruthy();
    expect(screen.getByText('Obsidian Flames')).toBeTruthy();
    expect(screen.getByText('Double Rare, #125/197')).toBeTruthy();
    expect(screen.getByText('3 publicaciones desde')).toBeTruthy();
    expect(screen.getByText(clp(4490))).toBeTruthy();
  });

  it('lleva a la página de la oferta más barata', () => {
    montar(<FichaProducto producto={charizard()} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/carta/P002');
  });

  it('si todas las publicaciones están agotadas muestra "Sin stock" y no un precio', () => {
    const estado = estadoDemo();
    estado.publicaciones.filter((p) => p.nombre === 'Charizard ex').forEach((p) => { p.stock = 0; });
    montar(<FichaProducto producto={charizard(estado)} />, { tienda: tiendaFalsa({ estado }) });
    expect(screen.getByText('Sin stock')).toBeTruthy();
    expect(screen.queryByText('3 publicaciones desde')).toBeNull();
    expect(screen.getByRole('article').classList).toContain('producto-ficha--agotada');
  });
});
