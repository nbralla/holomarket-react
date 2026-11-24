/* Pedidos: pestañas de compras y ventas, y marcar una venta como enviada (con ventana modal). */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRuta } from '../hooks/useRuta';
import { estadoDemo, montar, simularFetch, tiendaFalsa, usuarioDemo } from '../pruebas/montar';
import type { Estado } from '../types';
import Pedidos from './Pedidos';

function montarPedidos(uid: string, ruta: string, estado: Estado = estadoDemo()) {
  const usuario = usuarioDemo(estado, uid);
  function PedidosConRuta() {
    return <Pedidos ruta={useRuta()} usuario={usuario} />;
  }
  return montar(<PedidosConRuta />, { tienda: tiendaFalsa({ estado, usuario }), ruta });
}

describe('Pedidos', () => {
  beforeEach(() => { simularFetch(); });

  it('"Mis compras" muestra solo los pedidos en que la persona compró', () => {
    const estado = estadoDemo();
    const compras = estado.pedidos.filter((o) => o.compradorId === 'U01');
    montarPedidos('U01', '/pedidos?tab=compras', estado);
    expect(document.getElementById('pedidos-n-compras')?.textContent).toBe(String(compras.length));
    compras.forEach((o) => expect(screen.getByRole('heading', { name: `Pedido ${o.id}` })).toBeTruthy());
  });

  it('al cambiar a "Mis ventas" cambia la pestaña activa en la URL', async () => {
    const usuario = userEvent.setup();
    montarPedidos('U02', '/pedidos?tab=compras');
    await usuario.click(screen.getByRole('link', { name: /Mis ventas/ }));
    expect(screen.getByTestId('url').textContent).toBe('/pedidos?tab=ventas');
    expect(screen.getByRole('link', { name: /Mis ventas/ }).getAttribute('aria-current')).toBe('page');
  });

  it('marcar como enviado pide el seguimiento en una ventana y actualiza el pedido', async () => {
    const usuario = userEvent.setup();
    const estado = estadoDemo();
    const pendiente = estado.pedidos.find((o) => o.vendedorId === 'U02' && o.estado === 'pagado');
    expect(pendiente).toBeDefined();
    const { tienda } = montarPedidos('U02', '/pedidos?tab=ventas', estado);

    await usuario.click(screen.getByRole('button', { name: `Marcar como enviado el pedido ${pendiente?.id}` }));
    const ventana = await screen.findByRole('dialog');
    await usuario.type(within(ventana).getByLabelText(/Número de seguimiento/), 'BX-7777');
    await usuario.click(within(ventana).getByRole('button', { name: 'Marcar como enviado' }));

    expect(tienda.actualizar).toHaveBeenCalledTimes(1);
    const pedido = estado.pedidos.find((o) => o.id === pendiente?.id);
    expect(pedido?.estado).toBe('enviado');
    expect(pedido?.seguimiento).toBe('BX-7777');
  });
});
