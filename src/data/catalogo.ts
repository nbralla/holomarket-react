/* =========================================================================
   Datos fijos del negocio: juegos, condiciones, regiones, bancos y la
   configuración inicial. En una versión con backend vendrían de la API.
   ========================================================================= */
import type { Condicion, Configuracion, Juego, JuegoId, Region } from '../types';

export const JUEGOS: Record<JuegoId, Juego> = {
  pokemon: {
    nombre: 'Pokémon',
    ediciones: ['Scarlet & Violet', 'Scarlet & Violet 151', 'Paldea Evolved', 'Obsidian Flames',
      'Surging Sparks', 'Evolving Skies', 'Lost Origin', 'Silver Tempest'],
  },
  magic: {
    nombre: 'Magic: The Gathering',
    ediciones: ['Commander Masters', 'Dominaria United', 'Modern Horizons 2',
      'The Lord of the Rings: Tales of Middle-earth', 'Magic 2010'],
  },
  yugioh: {
    nombre: 'Yu-Gi-Oh!',
    ediciones: ['Legend of Blue Eyes White Dragon', 'Maximum Crisis', 'Metal Raiders'],
  },
  onepiece: {
    nombre: 'One Piece',
    ediciones: ['Romance Dawn (OP-01)', 'Paramount War (OP-02)', 'Pillars of Strength (OP-03)'],
  },
  myl: {
    nombre: 'Mitos y Leyendas',
    ediciones: ['Espada Sagrada', 'Helénica', 'Hijos de Daana', 'Dominios de Ra'],
  },
};

export const IDS_JUEGOS = Object.keys(JUEGOS) as JuegoId[];
export const esJuego = (valor: string): valor is JuegoId => Object.prototype.hasOwnProperty.call(JUEGOS, valor);

/* Abreviatura que aparece al pie de la carta dibujada. */
export const JUEGO_CORTO: Record<JuegoId, string> = { pokemon: 'PKM', magic: 'MTG', yugioh: 'YGO', onepiece: 'OPCG', myl: 'MyL' };

/* Escala de condición del mercado TCG, de mejor a peor (nombres en inglés, como se usan en el mercado). */
export const CONDICIONES: Condicion[] = [
  { id: 'MT', nombre: 'Mint', detalle: 'Perfecta, sin ningún desgaste.', equivalente: 'Mint' },
  { id: 'NM', nombre: 'Near Mint', detalle: 'Recién salida del sobre.', equivalente: 'Near Mint' },
  { id: 'EX', nombre: 'Excellent', detalle: 'Desgaste menor en bordes o esquinas.', equivalente: 'Slightly Played / Excellent' },
  { id: 'GD', nombre: 'Good', detalle: 'Desgaste visible.', equivalente: 'Moderately Played / Very Good' },
  { id: 'LP', nombre: 'Light Played', detalle: 'Desgaste severo.', equivalente: 'Played / Good' },
  { id: 'PL', nombre: 'Played', detalle: 'Dañada: pliegues, marcas o dobleces.', equivalente: 'Heavily Played' },
  { id: 'PO', nombre: 'Poor', detalle: 'Destruida: roturas o manchas importantes.', equivalente: 'Poor' },
];

export const condicionDe = (id: string): Condicion =>
  CONDICIONES.find((c) => c.id === id) ?? { id: 'NM', nombre: id, detalle: '', equivalente: '' };

/* Rarezas oficiales de cada juego, de la más común a la más escasa. Son los mismos nombres que
   entrega API TCG (Pokémon y Yu-Gi-Oh! con el nombre completo; Magic y One Piece en siglas, que
   rarezaDesde() traduce). Mitos y Leyendas no viene en la API: se usan sus frecuencias oficiales. */
export const RAREZAS: Record<JuegoId, string[]> = {
  pokemon: ['Common', 'Uncommon', 'Rare', 'Double Rare', 'Ultra Rare', 'Illustration Rare',
    'Special Illustration Rare', 'Hyper Rare', 'Mega Hyper Rare', 'ACE SPEC Rare', 'Shiny Rare',
    'Shiny Ultra Rare', 'Secret Rare', 'Promo'],
  magic: ['Common', 'Uncommon', 'Rare', 'Mythic Rare', 'Special', 'Land', 'Promo'],
  yugioh: ['Common', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare', 'Ultimate Rare', 'Ghost Rare',
    'Starlight Rare', "Collector's Rare", 'Quarter Century Secret Rare', 'Platinum Secret Rare',
    "Prismatic Collector's Rare", 'Prismatic Ultimate Rare'],
  onepiece: ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Secret Rare', 'Leader', 'Special Card',
    'Treasure Rare', 'Promo', 'DON!!'],
  myl: ['Vasallo', 'Cortesano', 'Real', 'Mega Real', 'Ultra Real', 'Legendaria', 'Promo'],
};

/* Rarezas del juego elegido (vacía si aún no se elige). */
export const rarezasDe = (juego: string): string[] => (esJuego(juego) ? RAREZAS[juego] : []);

/* Todas las rarezas sin repetir (para validar el filtro del catálogo cuando no hay juego elegido). */
export const TODAS_RAREZAS: string[] = [...new Set(Object.values(RAREZAS).flat())];
export const ACABADOS = ['Normal', 'Holo', 'Reverse holo', 'Foil / Full art'];
export const IDIOMAS: Record<string, string> = { ES: 'Español', EN: 'Inglés', JP: 'Japonés', PT: 'Portugués' };

/* Regiones y comunas de Chile (selección para el MVP). */
export const REGIONES: Region[] = [
  { nombre: 'Arica y Parinacota', comunas: ['Arica', 'Camarones', 'Putre'] },
  { nombre: 'Tarapacá', comunas: ['Iquique', 'Alto Hospicio', 'Pozo Almonte'] },
  { nombre: 'Antofagasta', comunas: ['Antofagasta', 'Calama', 'Mejillones', 'Tocopilla'] },
  { nombre: 'Atacama', comunas: ['Copiapó', 'Caldera', 'Chañaral', 'Vallenar'] },
  { nombre: 'Coquimbo', comunas: ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel'] },
  { nombre: 'Valparaíso', comunas: ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'Quillota', 'San Antonio', 'Los Andes'] },
  { nombre: 'Metropolitana de Santiago', comunas: ['Santiago', 'Providencia', 'Ñuñoa', 'Las Condes', 'Maipú', 'Puente Alto', 'La Florida', 'San Miguel', 'Estación Central', 'Recoleta', 'Pudahuel', 'Quilicura', 'San Bernardo', 'Vitacura'] },
  { nombre: "Libertador General Bernardo O'Higgins", comunas: ['Rancagua', 'Machalí', 'Rengo', 'San Fernando'] },
  { nombre: 'Maule', comunas: ['Talca', 'Curicó', 'Linares', 'Constitución'] },
  { nombre: 'Ñuble', comunas: ['Chillán', 'Chillán Viejo', 'San Carlos'] },
  { nombre: 'Biobío', comunas: ['Concepción', 'Talcahuano', 'San Pedro de la Paz', 'Chiguayante', 'Coronel', 'Los Ángeles'] },
  { nombre: 'La Araucanía', comunas: ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol'] },
  { nombre: 'Los Ríos', comunas: ['Valdivia', 'La Unión', 'Panguipulli'] },
  { nombre: 'Los Lagos', comunas: ['Puerto Montt', 'Puerto Varas', 'Osorno', 'Castro', 'Ancud'] },
  { nombre: 'Aysén del General Carlos Ibáñez del Campo', comunas: ['Coyhaique', 'Puerto Aysén'] },
  { nombre: 'Magallanes y de la Antártica Chilena', comunas: ['Punta Arenas', 'Puerto Natales', 'Porvenir'] },
];

export const comunasDe = (region: string): string[] => REGIONES.find((r) => r.nombre === region)?.comunas ?? [];

/* Bancos e instituciones para recibir retiros. */
export const BANCOS = ['BancoEstado', 'Banco de Chile', 'Banco Santander', 'Bci', 'Scotiabank', 'Banco Itaú', 'Banco Falabella',
  'Banco Ripley', 'Banco BICE', 'Banco Security', 'Banco Consorcio', 'Banco Internacional', 'Coopeuch', 'Tenpo', 'Mercado Pago'];
export const TIPOS_CUENTA = ['Cuenta corriente', 'Cuenta vista / CuentaRUT', 'Cuenta de ahorro'];

/* Parámetros del negocio (el administrador los puede cambiar en Configuración). */
export const CONFIGURACION_INICIAL: Configuracion = {
  comision: 8,             // % que cobra HoloMarket al vendedor por cada venta
  iva: 19,                 // % de IVA que se aplica sobre la comisión
  envioMismaRegion: 2990,  // costo de despacho cuando vendedor y comprador están en la misma región
  envioOtraRegion: 4990,   // costo de despacho entre regiones distintas
  stockBajo: 1,            // desde cuántas unidades se muestra la alerta de stock bajo
  sesionMinutos: 30,       // minutos de inactividad antes de cerrar la sesión
  retiroMinimo: 5000,      // monto mínimo (CLP) que un vendedor puede retirar a su cuenta
  dolar: 950,              // CLP por USD de respaldo, si no responden las APIs del dólar (services/dolar.ts)
};

/* Campos editables en Administración › Configuración: [campo, etiqueta, mínimo, máximo, ayuda]. */
export const CAMPOS_CONFIGURACION: [keyof Configuracion, string, number, number, string][] = [
  ['comision', 'Comisión por venta (%)', 0, 30, 'Se descuenta al vendedor en cada venta.'],
  ['iva', 'IVA sobre la comisión (%)', 0, 30, 'En Chile corresponde al 19 %.'],
  ['envioMismaRegion', 'Envío a la misma región (CLP)', 0, 50000, 'Por paquete, cuando vendedor y comprador están en la misma región.'],
  ['envioOtraRegion', 'Envío a otra región (CLP)', 0, 50000, 'Por paquete, entre regiones distintas.'],
  ['stockBajo', 'Aviso de stock bajo (unidades)', 0, 20, 'Se avisa cuando una publicación activa llega a esta cantidad o menos.'],
  ['retiroMinimo', 'Monto mínimo de retiro (CLP)', 1000, 100000, 'Los vendedores no pueden retirar menos que este monto.'],
  ['sesionMinutos', 'Cierre de sesión por inactividad (minutos)', 5, 240, 'Entre 5 y 240 minutos.'],
  ['dolar', 'Dólar de respaldo (CLP)', 300, 3000, 'El dólar se obtiene en vivo (Banco Central vía mindicador.cl). Este valor se usa solo si esa consulta falla.'],
];
