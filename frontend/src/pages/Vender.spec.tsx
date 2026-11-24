/* Publicar una carta: rarezas según el juego, validaciones y publicación. */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RAREZAS } from '../data/catalogo';
import { estadoDemo, montar, simularFetch, tiendaFalsa, usuarioDemo } from '../pruebas/montar';
import Vender from './Vender';

function montarVender() {
  const estado = estadoDemo();
  const diego = usuarioDemo(estado, 'U02');
  const tienda = tiendaFalsa({ estado, usuario: diego });
  return { ...montar(<Vender id="" usuario={diego} />, { tienda, ruta: '/vender' }), estado };
}

const opcionesRareza = () =>
  within(screen.getByLabelText('Rareza')).getAllByRole('option').map((o) => o.textContent).slice(1);

describe('Vender (publicar una carta)', () => {
  beforeEach(() => { simularFetch(); });

  it('las rarezas cambian según el juego elegido', async () => {
    const usuario = userEvent.setup();
    montarVender();
    expect(opcionesRareza()).toEqual([]);   // sin juego no hay rarezas

    await usuario.selectOptions(screen.getByLabelText('Juego'), 'onepiece');
    expect(opcionesRareza()).toEqual(RAREZAS.onepiece);

    await usuario.selectOptions(screen.getByLabelText('Juego'), 'myl');
    expect(opcionesRareza()).toEqual(['Vasallo', 'Cortesano', 'Real', 'Mega Real', 'Ultra Real', 'Legendaria', 'Promo']);
  });

  it('al cambiar de juego se limpia una rareza que no existe en el nuevo juego', async () => {
    const usuario = userEvent.setup();
    montarVender();
    await usuario.selectOptions(screen.getByLabelText('Juego'), 'pokemon');
    await usuario.selectOptions(screen.getByLabelText('Rareza'), 'Double Rare');
    await usuario.selectOptions(screen.getByLabelText('Juego'), 'magic');
    expect((screen.getByLabelText('Rareza') as HTMLSelectElement).value).toBe('');
  });

  it('sin datos no publica: marca el juego, el nombre y la condición', async () => {
    const usuario = userEvent.setup();
    const { tienda } = montarVender();
    await usuario.click(screen.getByRole('button', { name: 'Publicar carta' }));
    expect(screen.getByText('Elige el juego de la carta.')).toBeTruthy();
    expect(screen.getByText('Escribe el nombre de la carta (2 a 60 caracteres).')).toBeTruthy();
    expect(screen.getByText('Elige la condición de la carta.')).toBeTruthy();
    expect(tienda.actualizar).not.toHaveBeenCalled();
  });

  it('el precio antes de la oferta debe ser mayor que el precio actual', async () => {
    const usuario = userEvent.setup();
    montarVender();
    await usuario.type(screen.getByLabelText('Precio por unidad (CLP, IVA incluido)'), '8990');
    await usuario.type(screen.getByLabelText('Precio antes de la oferta (opcional)'), '7990');
    await usuario.click(screen.getByRole('button', { name: 'Publicar carta' }));
    expect(screen.getByText('Para mostrar una oferta, el precio anterior debe ser mayor que el precio actual.')).toBeTruthy();

    await usuario.clear(screen.getByLabelText('Precio antes de la oferta (opcional)'));
    await usuario.type(screen.getByLabelText('Precio antes de la oferta (opcional)'), '9990');
    expect(screen.getByText('Se mostrará con 10 % de descuento en Ofertas.')).toBeTruthy();
  });

  it('con los datos completos publica la carta y lleva al inventario', async () => {
    const usuario = userEvent.setup();
    const { tienda, estado } = montarVender();
    const antes = estado.publicaciones.length;

    await usuario.selectOptions(screen.getByLabelText('Juego'), 'pokemon');
    await usuario.type(screen.getByLabelText('Nombre de la carta'), 'Mewtwo ex');
    await usuario.type(screen.getByLabelText('Edición o set'), 'Scarlet & Violet 151');
    await usuario.type(screen.getByLabelText('Número (opcional)'), '150/165');
    await usuario.selectOptions(screen.getByLabelText('Rareza'), 'Double Rare');
    await usuario.click(screen.getByRole('radio', { name: /Near Mint/ }));
    await usuario.type(screen.getByLabelText('Precio por unidad (CLP, IVA incluido)'), '8990');
    await usuario.clear(screen.getByLabelText('Unidades disponibles'));
    await usuario.type(screen.getByLabelText('Unidades disponibles'), '2');
    await usuario.click(screen.getByRole('button', { name: 'Publicar carta' }));

    expect(tienda.actualizar).toHaveBeenCalledTimes(1);
    expect(estado.publicaciones.length).toBe(antes + 1);
    expect(estado.publicaciones[antes]).toEqual(jasmine.objectContaining({
      nombre: 'Mewtwo ex', juego: 'pokemon', rareza: 'Double Rare', condicion: 'NM', precio: 8990, stock: 2, vendedorId: 'U02',
    }));
    expect(screen.getByTestId('url').textContent).toBe('/inventario');
  });
});
