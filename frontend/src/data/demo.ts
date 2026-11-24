/* =========================================================================
   Datos de demostración
   -------------------------------------------------------------------------
   Con ellos se generó el archivo db.json que sirve json-server (npm run api)
   (ver src/logica/estado.ts). Desde Administración › Configuración se pueden
   restablecer antes de presentar.
   ========================================================================= */
import type { CondicionId, EstadoPedido, EstadoPublicacion, EstadoRetiro, JuegoId, MetodoEntrega, MetodoPago, Rol } from '../types';

export interface UsuarioDemo {
  id: string;
  rut: string;
  nombre: string;
  email: string;
  clave: string;        // se muestra solo porque son cuentas públicas de prueba: se guarda su hash
  rol: Rol;
  region: string;
  comuna: string;
  telefono: string;
  direccion: string;
  diasAtras: number;
  demo: string;
  cuenta?: { banco: string; tipo: string; numero: string };
}

export interface PublicacionDemo {
  id: string;
  vendedor: string;
  juego: JuegoId;
  nombre: string;
  edicion: string;
  numero: string;
  rareza: string;
  acabado: string;
  idioma: string;
  condicion: CondicionId;
  precio: number;
  precioAnterior?: number;   // si está en oferta: el precio de antes
  stock: number;        // unidades disponibles HOY (ya descontadas las ventas de abajo)
  estado: EstadoPublicacion;
  diasAtras: number;
  descripcion: string;
}

export interface PedidoDemo {
  id: string;
  comprador: string;
  vendedor: string;
  items: { pub: string; cantidad: number; precio?: number }[];   // precio = lo pagado ese día (si no, el precio actual)
  entrega: MetodoEntrega;
  pago: MetodoPago;
  estados: [EstadoPedido, number][];   // [estado, hace cuántos días]
  seguimiento: string;
}

export interface RetiroDemo {
  id: string;
  usuario: string;
  monto: number;
  estados: [EstadoRetiro, number][];
  comprobante?: string;
}

export const USUARIOS_DEMO: UsuarioDemo[] = [
  { id: 'U00', rut: '11.111.111-1', nombre: 'Equipo HoloMarket', email: 'admin@holomarket.cl', clave: 'Admin1234',
    rol: 'admin', region: 'Metropolitana de Santiago', comuna: 'Santiago', telefono: '+56 2 2345 6789',
    direccion: '', diasAtras: 120, demo: 'Administra usuarios, modera publicaciones y revisa métricas y movimientos de stock.' },
  { id: 'U01', rut: '12.345.678-5', nombre: 'Camila Rojas', email: 'camila@demo.cl', clave: 'Demo1234',
    rol: 'cliente', region: 'Metropolitana de Santiago', comuna: 'Ñuñoa', telefono: '+56 9 8765 4321',
    direccion: 'Av. Irarrázaval 3450, depto. 1204', diasAtras: 60, demo: 'Compradora. Tiene pedidos en curso y algunas cartas publicadas.' },
  { id: 'U02', rut: '17.654.321-3', nombre: 'Diego Muñoz', email: 'diego@demo.cl', clave: 'Demo1234',
    rol: 'cliente', region: 'Valparaíso', comuna: 'Viña del Mar', telefono: '+56 9 7654 3210',
    direccion: 'Av. Libertad 1180', diasAtras: 90, demo: 'Vendedor con inventario grande y un pedido pendiente de envío.' },
  { id: 'U03', rut: '19.876.543-0', nombre: 'Valentina Soto', email: 'valentina@demo.cl', clave: 'Demo1234',
    rol: 'cliente', region: 'Biobío', comuna: 'Concepción', telefono: '+56 9 6543 2109',
    direccion: "O'Higgins 940, of. 32", diasAtras: 75, demo: 'Vendedora de Pokémon, Yu-Gi-Oh! y Mitos y Leyendas. Tiene un retiro pendiente.',
    cuenta: { banco: 'BancoEstado', tipo: 'Cuenta vista / CuentaRUT', numero: '19876543' } },
];

export const PUBLICACIONES_DEMO: PublicacionDemo[] = [
  { id: 'P001', vendedor: 'U02', juego: 'pokemon', nombre: 'Charizard ex', edicion: 'Obsidian Flames', numero: '125/197', rareza: 'Double Rare', acabado: 'Holo', idioma: 'ES', condicion: 'NM', precio: 5990, stock: 3, estado: 'activa', diasAtras: 50, descripcion: 'Sacada del sobre directo a sleeve y toploader.' },
  { id: 'P002', vendedor: 'U03', juego: 'pokemon', nombre: 'Charizard ex', edicion: 'Obsidian Flames', numero: '125/197', rareza: 'Double Rare', acabado: 'Holo', idioma: 'EN', condicion: 'EX', precio: 4490, precioAnterior: 5490, stock: 1, estado: 'activa', diasAtras: 45, descripcion: 'Pequeño blanqueo en una esquina del reverso.' },
  { id: 'P003', vendedor: 'U01', juego: 'pokemon', nombre: 'Charizard ex', edicion: 'Obsidian Flames', numero: '125/197', rareza: 'Double Rare', acabado: 'Holo', idioma: 'ES', condicion: 'NM', precio: 6490, stock: 2, estado: 'activa', diasAtras: 35, descripcion: '' },
  { id: 'P004', vendedor: 'U02', juego: 'pokemon', nombre: 'Umbreon VMAX (arte alternativo)', edicion: 'Evolving Skies', numero: '215/203', rareza: 'Secret Rare', acabado: 'Foil / Full art', idioma: 'EN', condicion: 'EX', precio: 1249990, precioAnterior: 1399990, stock: 1, estado: 'activa', diasAtras: 30, descripcion: 'Centrado aproximado 55/45. Se envía con seguro, en caja rígida.' },
  { id: 'P005', vendedor: 'U02', juego: 'magic', nombre: 'Sol Ring', edicion: 'Commander Masters', numero: '', rareza: 'Uncommon', acabado: 'Normal', idioma: 'EN', condicion: 'NM', precio: 2490, stock: 5, estado: 'activa', diasAtras: 35, descripcion: '' },
  { id: 'P006', vendedor: 'U03', juego: 'pokemon', nombre: 'Charizard ex (ilustración especial)', edicion: 'Scarlet & Violet 151', numero: '199/165', rareza: 'Special Illustration Rare', acabado: 'Foil / Full art', idioma: 'EN', condicion: 'NM', precio: 139990, precioAnterior: 159990, stock: 1, estado: 'activa', diasAtras: 45, descripcion: 'Nunca jugada. Guardada en carpeta de 9 bolsillos.' },
  { id: 'P007', vendedor: 'U03', juego: 'pokemon', nombre: 'Pikachu ex (ilustración especial)', edicion: 'Surging Sparks', numero: '238/191', rareza: 'Special Illustration Rare', acabado: 'Foil / Full art', idioma: 'EN', condicion: 'NM', precio: 279990, stock: 1, estado: 'activa', diasAtras: 5, descripcion: '' },
  { id: 'P008', vendedor: 'U02', juego: 'pokemon', nombre: 'Gardevoir ex (ilustración especial)', edicion: 'Scarlet & Violet', numero: '245/198', rareza: 'Special Illustration Rare', acabado: 'Foil / Full art', idioma: 'ES', condicion: 'NM', precio: 44990, stock: 1, estado: 'activa', diasAtras: 25, descripcion: '' },
  { id: 'P009', vendedor: 'U03', juego: 'pokemon', nombre: 'Iono (ilustración especial)', edicion: 'Paldea Evolved', numero: '269/193', rareza: 'Special Illustration Rare', acabado: 'Foil / Full art', idioma: 'EN', condicion: 'NM', precio: 64990, stock: 0, estado: 'activa', diasAtras: 14, descripcion: '' },
  { id: 'P010', vendedor: 'U02', juego: 'pokemon', nombre: 'Giratina V (arte alternativo)', edicion: 'Lost Origin', numero: '186/196', rareza: 'Ultra Rare', acabado: 'Foil / Full art', idioma: 'EN', condicion: 'NM', precio: 229990, stock: 1, estado: 'activa', diasAtras: 22, descripcion: '' },
  { id: 'P011', vendedor: 'U03', juego: 'pokemon', nombre: 'Lugia V (arte alternativo)', edicion: 'Silver Tempest', numero: '186/195', rareza: 'Ultra Rare', acabado: 'Foil / Full art', idioma: 'EN', condicion: 'NM', precio: 169990, stock: 1, estado: 'activa', diasAtras: 11, descripcion: '' },
  { id: 'P012', vendedor: 'U02', juego: 'pokemon', nombre: 'Pikachu', edicion: 'Scarlet & Violet 151', numero: '025/165', rareza: 'Common', acabado: 'Normal', idioma: 'ES', condicion: 'NM', precio: 590, precioAnterior: 790, stock: 8, estado: 'activa', diasAtras: 40, descripcion: '' },
  { id: 'P013', vendedor: 'U03', juego: 'pokemon', nombre: 'Pikachu', edicion: 'Scarlet & Violet 151', numero: '025/165', rareza: 'Common', acabado: 'Reverse holo', idioma: 'ES', condicion: 'NM', precio: 890, stock: 12, estado: 'activa', diasAtras: 30, descripcion: 'Versión reverse holo.' },
  { id: 'P014', vendedor: 'U01', juego: 'pokemon', nombre: 'Mew ex (dorada)', edicion: 'Scarlet & Violet 151', numero: '205/165', rareza: 'Hyper Rare', acabado: 'Foil / Full art', idioma: 'EN', condicion: 'NM', precio: 24990, stock: 1, estado: 'pausada', diasAtras: 6, descripcion: 'Pausada mientras decido si la cambio.' },
  { id: 'P015', vendedor: 'U02', juego: 'magic', nombre: 'The One Ring', edicion: 'The Lord of the Rings: Tales of Middle-earth', numero: '', rareza: 'Mythic Rare', acabado: 'Normal', idioma: 'EN', condicion: 'NM', precio: 54990, stock: 1, estado: 'activa', diasAtras: 16, descripcion: '' },
  { id: 'P016', vendedor: 'U02', juego: 'magic', nombre: 'Sheoldred, the Apocalypse', edicion: 'Dominaria United', numero: '', rareza: 'Mythic Rare', acabado: 'Normal', idioma: 'EN', condicion: 'NM', precio: 49990, precioAnterior: 59990, stock: 2, estado: 'activa', diasAtras: 13, descripcion: '' },
  { id: 'P017', vendedor: 'U03', juego: 'magic', nombre: 'Lightning Bolt', edicion: 'Magic 2010', numero: '', rareza: 'Common', acabado: 'Normal', idioma: 'EN', condicion: 'NM', precio: 1490, stock: 6, estado: 'activa', diasAtras: 32, descripcion: '' },
  { id: 'P018', vendedor: 'U01', juego: 'magic', nombre: 'Ragavan, Nimble Pilferer', edicion: 'Modern Horizons 2', numero: '', rareza: 'Mythic Rare', acabado: 'Normal', idioma: 'EN', condicion: 'NM', precio: 39990, stock: 1, estado: 'activa', diasAtras: 3, descripcion: '' },
  { id: 'P019', vendedor: 'U03', juego: 'yugioh', nombre: 'Blue-Eyes White Dragon', edicion: 'Legend of Blue Eyes White Dragon', numero: 'LOB-EN001', rareza: 'Ultra Rare', acabado: 'Holo', idioma: 'EN', condicion: 'EX', precio: 74990, stock: 1, estado: 'activa', diasAtras: 40, descripcion: 'Edición Unlimited.' },
  { id: 'P020', vendedor: 'U03', juego: 'yugioh', nombre: 'Dark Magician', edicion: 'Legend of Blue Eyes White Dragon', numero: 'LOB-EN005', rareza: 'Ultra Rare', acabado: 'Holo', idioma: 'EN', condicion: 'GD', precio: 39990, precioAnterior: 44990, stock: 1, estado: 'activa', diasAtras: 17, descripcion: '' },
  { id: 'P021', vendedor: 'U02', juego: 'yugioh', nombre: 'Ash Blossom & Joyous Spring', edicion: 'Maximum Crisis', numero: '', rareza: 'Secret Rare', acabado: 'Foil / Full art', idioma: 'EN', condicion: 'NM', precio: 12990, precioAnterior: 15990, stock: 3, estado: 'activa', diasAtras: 10, descripcion: '' },
  { id: 'P022', vendedor: 'U02', juego: 'onepiece', nombre: 'Monkey.D.Luffy (líder)', edicion: 'Romance Dawn (OP-01)', numero: 'OP01-003', rareza: 'Leader', acabado: 'Normal', idioma: 'JP', condicion: 'NM', precio: 3490, stock: 4, estado: 'activa', diasAtras: 8, descripcion: '' },
  { id: 'P023', vendedor: 'U02', juego: 'onepiece', nombre: 'Shanks', edicion: 'Romance Dawn (OP-01)', numero: 'OP01-120', rareza: 'Secret Rare', acabado: 'Foil / Full art', idioma: 'JP', condicion: 'NM', precio: 54990, stock: 1, estado: 'activa', diasAtras: 30, descripcion: '' },
  { id: 'P024', vendedor: 'U03', juego: 'myl', nombre: 'Excalibur', edicion: 'Espada Sagrada', numero: '', rareza: 'Ultra Real', acabado: 'Normal', idioma: 'ES', condicion: 'NM', precio: 14990, precioAnterior: 17990, stock: 2, estado: 'activa', diasAtras: 25, descripcion: 'Clásico del TCG chileno.' },
  { id: 'P025', vendedor: 'U03', juego: 'myl', nombre: 'Aquiles', edicion: 'Helénica', numero: '', rareza: 'Real', acabado: 'Normal', idioma: 'ES', condicion: 'EX', precio: 4990, stock: 3, estado: 'activa', diasAtras: 6, descripcion: '' },
];

export const PEDIDOS_DEMO: PedidoDemo[] = [
  // Ventas ya entregadas: forman el historial de ventas de cada carta.
  { id: 'HM-1001', comprador: 'U03', vendedor: 'U02', items: [{ pub: 'P001', cantidad: 1, precio: 6490 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 46], ['enviado', 45], ['entregado', 43]], seguimiento: 'BX-4300731' },
  { id: 'HM-1002', comprador: 'U02', vendedor: 'U03', items: [{ pub: 'P006', cantidad: 1, precio: 154990 }], entrega: 'despacho', pago: 'transferencia',
    estados: [['pagado', 42], ['enviado', 41], ['entregado', 39]], seguimiento: 'BX-4301462' },
  { id: 'HM-1003', comprador: 'U01', vendedor: 'U02', items: [{ pub: 'P001', cantidad: 2, precio: 6290 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 38], ['enviado', 37], ['entregado', 35]], seguimiento: 'BX-4302193' },
  { id: 'HM-1004', comprador: 'U02', vendedor: 'U03', items: [{ pub: 'P019', cantidad: 1, precio: 69990 }], entrega: 'retiro', pago: 'transferencia',
    estados: [['pagado', 36], ['enviado', 36], ['entregado', 34]], seguimiento: '' },
  { id: 'HM-1005', comprador: 'U01', vendedor: 'U02', items: [{ pub: 'P012', cantidad: 3, precio: 550 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 35], ['enviado', 34], ['entregado', 32]], seguimiento: 'BX-4303655' },
  { id: 'HM-1006', comprador: 'U01', vendedor: 'U03', items: [{ pub: 'P002', cantidad: 1, precio: 4990 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 33], ['enviado', 32], ['entregado', 30]], seguimiento: 'BX-4304386' },
  { id: 'HM-1007', comprador: 'U03', vendedor: 'U02', items: [{ pub: 'P005', cantidad: 2, precio: 2290 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 31], ['enviado', 30], ['entregado', 28]], seguimiento: 'BX-4305117' },
  { id: 'HM-1008', comprador: 'U03', vendedor: 'U01', items: [{ pub: 'P003', cantidad: 1, precio: 6990 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 30], ['enviado', 29], ['entregado', 27]], seguimiento: 'BX-4305848' },
  { id: 'HM-1009', comprador: 'U02', vendedor: 'U03', items: [{ pub: 'P017', cantidad: 3, precio: 1390 }], entrega: 'despacho', pago: 'transferencia',
    estados: [['pagado', 29], ['enviado', 28], ['entregado', 26]], seguimiento: 'BX-4306579' },
  { id: 'HM-1010', comprador: 'U03', vendedor: 'U02', items: [{ pub: 'P004', cantidad: 1, precio: 1189990 }], entrega: 'despacho', pago: 'transferencia',
    estados: [['pagado', 28], ['enviado', 27], ['entregado', 25]], seguimiento: 'BX-4307310' },
  { id: 'HM-1011', comprador: 'U01', vendedor: 'U02', items: [{ pub: 'P023', cantidad: 1, precio: 59990 }], entrega: 'retiro', pago: 'tarjeta',
    estados: [['pagado', 26], ['enviado', 26], ['entregado', 24]], seguimiento: '' },
  { id: 'HM-1012', comprador: 'U01', vendedor: 'U03', items: [{ pub: 'P013', cantidad: 2, precio: 850 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 25], ['enviado', 24], ['entregado', 22]], seguimiento: 'BX-4308772' },
  { id: 'HM-1013', comprador: 'U01', vendedor: 'U03', items: [{ pub: 'P024', cantidad: 1, precio: 13990 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 22], ['enviado', 21], ['entregado', 19]], seguimiento: 'BX-4309503' },
  { id: 'HM-1014', comprador: 'U03', vendedor: 'U02', items: [{ pub: 'P001', cantidad: 1, precio: 5990 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 21], ['enviado', 20], ['entregado', 18]], seguimiento: 'BX-4310234' },
  { id: 'HM-1015', comprador: 'U01', vendedor: 'U02', items: [{ pub: 'P008', cantidad: 1, precio: 42990 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 19], ['enviado', 18], ['entregado', 16]], seguimiento: 'BX-4310965' },
  { id: 'HM-1016', comprador: 'U01', vendedor: 'U03', items: [{ pub: 'P006', cantidad: 1, precio: 144990 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 18], ['enviado', 17], ['entregado', 15]], seguimiento: 'BX-4311696' },
  { id: 'HM-1017', comprador: 'U02', vendedor: 'U03', items: [{ pub: 'P002', cantidad: 1, precio: 4690 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 12], ['enviado', 11], ['entregado', 9]], seguimiento: 'BX-4312427' },
  { id: 'HM-1018', comprador: 'U03', vendedor: 'U02', items: [{ pub: 'P012', cantidad: 4, precio: 590 }], entrega: 'despacho', pago: 'transferencia',
    estados: [['pagado', 9], ['enviado', 8], ['entregado', 6]], seguimiento: 'BX-4313158' },
  // Pedidos recientes, en distintos estados.
  { id: 'HM-1019', comprador: 'U01', vendedor: 'U02', items: [{ pub: 'P005', cantidad: 1 }, { pub: 'P016', cantidad: 1 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 6], ['enviado', 5], ['entregado', 3]], seguimiento: 'BX-4402193' },
  { id: 'HM-1020', comprador: 'U02', vendedor: 'U03', items: [{ pub: 'P009', cantidad: 1 }], entrega: 'despacho', pago: 'transferencia',
    estados: [['pagado', 4], ['enviado', 3], ['entregado', 1]], seguimiento: 'BX-4417520' },
  { id: 'HM-1021', comprador: 'U01', vendedor: 'U03', items: [{ pub: 'P017', cantidad: 2 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 2], ['enviado', 1]], seguimiento: 'BX-4431007' },
  { id: 'HM-1022', comprador: 'U03', vendedor: 'U02', items: [{ pub: 'P008', cantidad: 1 }], entrega: 'despacho', pago: 'tarjeta',
    estados: [['pagado', 1]], seguimiento: '' },
];

/* Valentina ya retiró parte de su venta HM-1002 y tiene una solicitud pendiente para el administrador. */
export const RETIROS_DEMO: RetiroDemo[] = [
  { id: 'RET-001', usuario: 'U03', monto: 30000, estados: [['solicitado', 0.8], ['pagado', 0.5]], comprobante: 'TRF-883201' },
  { id: 'RET-002', usuario: 'U03', monto: 20000, estados: [['solicitado', 0.2]] },
];
