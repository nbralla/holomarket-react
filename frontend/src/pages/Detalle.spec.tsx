/* Página de una carta: lista de vendedores, orden, pestañas del historial y carrito. */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { estadoDemo, montar, simularFetch, tiendaFalsa, usuarioDemo } from '../pruebas/montar';
import { clp } from '../utils/formato';
import Detalle from './Detalle';

/* Camila (U01) mira el Charizard ex de Diego (P001). Lo venden 3 personas. */
function montarDetalle(id = 'P001') {
  const estado = estadoDemo();
  const tienda = tiendaFalsa({ estado, usuario: usuarioDemo(estado, 'U01') });
  return montar(<Detalle id={id} />, { tienda, ruta: `/carta/${id}` });
}

const preciosDeLaLista = () =>
  Array.from(document.querySelectorAll('.publicacion__precio strong')).map((p) => p.textContent);

describe('Detalle de una carta', () => {
  beforeEach(() => { simularFetch(); });

  it('lista todas las publicaciones de la carta, de menor a mayor precio', () => {
    montarDetalle();
    expect(screen.getByRole('heading', { name: '3 publicaciones' })).toBeTruthy();
    expect(preciosDeLaLista()).toEqual([clp(4490), clp(5990), clp(6490)]);
  });

  it('al ordenar por "Mejor condición" las Near Mint pasan antes que la Excellent', async () => {
    const usuario = userEvent.setup();
    montarDetalle();
    await usuario.selectOptions(screen.getByLabelText('Ordenar por'), 'condicion');
    expect(preciosDeLaLista()).toEqual([clp(5990), clp(6490), clp(4490)]);
  });

  it('la pestaña "Ventas en HoloMarket" muestra la tabla de ventas y oculta el gráfico', async () => {
    const usuario = userEvent.setup();
    montarDetalle();
    const pestanaVentas = screen.getByRole('tab', { name: /Ventas en HoloMarket/ });
    const panelVentas = document.getElementById('panel-ventas') as HTMLElement;
    expect(pestanaVentas.getAttribute('aria-selected')).toBe('false');
    expect(panelVentas.hidden).toBeTrue();

    await usuario.click(pestanaVentas);
    expect(pestanaVentas.getAttribute('aria-selected')).toBe('true');
    expect(panelVentas.hidden).toBeFalse();
    expect((document.getElementById('panel-mercado') as HTMLElement).hidden).toBeTrue();
    // 6 ventas demo de este Charizard (de Diego, Valentina y Camila)
    expect(within(panelVentas).getAllByRole('row').length).toBe(1 + 6);
    expect(within(panelVentas).queryByText('Vendedor')).toBeNull();
  });

  it('"Agregar al carrito" guarda la carta elegida con la cantidad del selector', async () => {
    const usuario = userEvent.setup();
    const { tienda } = montarDetalle();
    const oferta = screen.getByRole('complementary', { name: 'Oferta seleccionada' });
    await usuario.click(within(oferta).getByRole('button', { name: 'Agregar al carrito' }));
    expect(tienda.guardarCarrito).toHaveBeenCalledOnceWith([{ pubId: 'P001', cantidad: 1 }]);
  });

  it('en su propia publicación, quien vende ve "Editar mi publicación" en vez de comprar', () => {
    montarDetalle('P003');   // P003 es de Camila
    const oferta = screen.getByRole('complementary');
    expect(within(oferta).getByRole('link', { name: 'Editar mi publicación' }).getAttribute('href')).toBe('/vender/P003');
    expect(within(oferta).queryByRole('button', { name: 'Agregar al carrito' })).toBeNull();
  });

  it('si la publicación no existe, avisa y ofrece volver al catálogo', () => {
    montarDetalle('P999');
    expect(screen.getByRole('heading', { name: 'Esta publicación no está disponible' })).toBeTruthy();
  });
});
