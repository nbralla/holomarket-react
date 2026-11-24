/* Catálogo: una ficha por carta y filtros que viven en la URL. */
import { fireEvent, screen } from '@testing-library/react';
import { useRuta } from '../hooks/useRuta';
import { filtrarPublicaciones, FILTROS_VACIOS } from '../logica/consultas';
import { agruparProductos } from '../logica/productos';
import { estadoDemo, montar, simularFetch, tiendaFalsa } from '../pruebas/montar';
import Catalogo from './Catalogo';

/* En la app, App.tsx le pasa la ruta actual; aquí se hace lo mismo con el hook. */
function CatalogoConRuta() {
  return <Catalogo ruta={useRuta()} />;
}

const fichas = () => document.querySelectorAll('.producto-ficha');
const resumen = () => document.getElementById('catalogo-resumen')?.textContent;

describe('Catálogo', () => {
  beforeEach(() => { simularFetch(); });

  it('dibuja una ficha por carta, no una por publicación', () => {
    const estado = estadoDemo();
    const publicaciones = filtrarPublicaciones(estado, FILTROS_VACIOS);
    const cartas = agruparProductos(publicaciones);
    montar(<CatalogoConRuta />, { tienda: tiendaFalsa({ estado }), ruta: '/catalogo' });

    expect(cartas.length).toBeLessThan(publicaciones.length);   // hay cartas con varios vendedores
    expect(fichas().length).toBe(cartas.length);
    expect(resumen()).toBe(`${cartas.length} cartas · ${publicaciones.length} publicaciones`);
  });

  it('al elegir un juego filtra las cartas y lo guarda en la URL', () => {
    montar(<CatalogoConRuta />, { ruta: '/catalogo' });
    fireEvent.click(screen.getByRole('radio', { name: 'One Piece' }));
    expect(screen.getByTestId('url').textContent).toBe('/catalogo?juego=onepiece');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('One Piece');
    expect(fichas().length).toBe(2);
  });

  it('lee los filtros desde la URL al abrir la página (búsqueda + condición)', () => {
    montar(<CatalogoConRuta />, { ruta: '/catalogo?q=charizard&cond=EX' });
    expect(resumen()).toContain('1 carta · 1 publicación');
    expect((screen.getByRole('checkbox', { name: /Excellent/ }) as HTMLInputElement).checked).toBeTrue();
  });

  it('si ningún resultado cumple los filtros, muestra el aviso y "Limpiar filtros" los quita', () => {
    montar(<CatalogoConRuta />, { ruta: '/catalogo?q=carta-que-no-existe' });
    expect(screen.getByRole('heading', { name: 'No encontramos cartas con esos filtros' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[1]);
    expect(screen.getByTestId('url').textContent).toBe('/catalogo');
    expect(fichas().length).toBeGreaterThan(0);
  });
});
