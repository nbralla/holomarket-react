/* Categoría de un juego: rarezas como pestañas (nav-pills de Bootstrap) y filtro en la URL. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { montar, simularFetch } from '../pruebas/montar';
import Categoria from './Categoria';
import Categorias from './Categorias';

const fichas = () => document.querySelectorAll('#categoria-resultados .producto-ficha');

describe('Categoría', () => {
  beforeEach(() => { simularFetch(); });

  it('muestra solo las cartas del juego y una pestaña por cada rareza disponible', () => {
    montar(<Categoria juego="onepiece" />, { ruta: '/categoria/onepiece' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('One Piece');
    expect(fichas().length).toBe(2);
    expect(screen.getAllByRole('link').filter((l) => l.classList.contains('nav-link')).map((l) => l.textContent))
      .toEqual(['Todas', 'Secret Rare', 'Leader']);
  });

  it('al elegir una rareza filtra las cartas y marca la pestaña activa', async () => {
    const usuario = userEvent.setup();
    montar(<Categoria juego="pokemon" />, { ruta: '/categoria/pokemon' });
    await usuario.click(screen.getByRole('link', { name: 'Special Illustration Rare' }));
    expect(screen.getByTestId('url').textContent).toBe('/categoria/pokemon?rareza=Special%20Illustration%20Rare');
    expect(screen.getByRole('link', { name: 'Special Illustration Rare' }).classList).toContain('active');
    expect(document.getElementById('categoria-resumen')?.textContent).toContain('Special Illustration Rare');
  });

  it('un juego que no existe muestra la página no encontrada', () => {
    montar(<Categoria juego="digimon" />, { ruta: '/categoria/digimon' });
    expect(screen.getByRole('heading', { name: 'No encontramos esta página' })).toBeTruthy();
  });

  it('la página de categorías tiene una tarjeta por juego que lleva a su categoría', () => {
    montar(<Categorias />, { ruta: '/categorias' });
    const enlaces = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(enlaces).toEqual(['/categoria/pokemon', '/categoria/magic', '/categoria/yugioh', '/categoria/onepiece', '/categoria/myl']);
  });
});
