/* Gráfico del historial de precios: props, estado (período elegido) y eventos de teclado. */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PuntoPrecio } from '../services/apiTcg';
import { clp } from '../utils/formato';
import GraficoPrecios from './GraficoPrecios';

const DIA = 86400000;
const INICIO = Date.UTC(2026, 3, 1);
/* 200 días de precios: sube de US$10 a US$29,90. */
const puntos: PuntoPrecio[] = Array.from({ length: 200 }, (_, i) => ({ fecha: INICIO + i * DIA, usd: 10 + i * 0.1 }));
const filasDeLaTabla = (contenedor: HTMLElement) => contenedor.querySelectorAll('tbody tr').length;

describe('GraficoPrecios', () => {
  it('convierte el último precio a pesos con el dólar recibido por props', () => {
    const { container } = render(<GraficoPrecios puntos={puntos} dolar={1000} impresion="Holofoil" />);
    expect(container.querySelector('.grafico__valor strong')?.textContent).toBe(clp(29.9 * 1000));
    expect(screen.getByText('Precio de mercado · Holofoil')).toBeTruthy();
  });

  it('parte en 3 meses y al elegir otro período cambia el botón activo y los datos', async () => {
    const usuario = userEvent.setup();
    const { container } = render(<GraficoPrecios puntos={puntos} dolar={1000} />);
    const tresMeses = screen.getByRole('button', { name: '3M' });
    const unMes = screen.getByRole('button', { name: '1M' });
    expect(tresMeses.getAttribute('aria-pressed')).toBe('true');
    expect(filasDeLaTabla(container)).toBe(93);   // 92 días hacia atrás + el último

    await usuario.click(unMes);
    expect(unMes.getAttribute('aria-pressed')).toBe('true');
    expect(tresMeses.getAttribute('aria-pressed')).toBe('false');
    expect(filasDeLaTabla(container)).toBe(32);

    await usuario.click(screen.getByRole('button', { name: 'Todo' }));
    expect(filasDeLaTabla(container)).toBe(200);
  });

  it('con las flechas del teclado muestra el precio de cada día en un tooltip', () => {
    render(<GraficoPrecios puntos={puntos} dolar={1000} />);
    expect(screen.queryByRole('status')).toBeNull();
    const zona = screen.getByLabelText('Explorar el historial: usa las flechas izquierda y derecha');
    fireEvent.keyDown(zona, { key: 'End' });
    expect(screen.getByRole('status').textContent).toContain(clp(29.9 * 1000));
    fireEvent.keyDown(zona, { key: 'ArrowLeft' });
    expect(screen.getByRole('status').textContent).toContain(clp(29.8 * 1000));
    fireEvent.blur(zona);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('si hay menos de 2 días de historial, muestra un aviso en vez del gráfico', () => {
    render(<GraficoPrecios puntos={puntos.slice(0, 1)} dolar={1000} />);
    expect(screen.getByText('Aún no hay suficientes días de historial para dibujar el gráfico.')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
