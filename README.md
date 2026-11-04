# HoloMarket · Marketplace de cartas TCG en React

Proyecto de **DSY1104 Desarrollo FullStack II** (Duoc UC). Es la misma tienda HoloMarket de la
Evaluación Parcial 1, rehecha con el mismo stack del ejemplo del curso (Pokédex CRUD):
**React 19 + TypeScript + Vite + React Router + Bootstrap 5 + json-server 0.17.4**.

Personas que compran y venden cartas sueltas de Pokémon, Magic, Yu-Gi-Oh!, One Piece y Mitos y
Leyendas: catálogo con filtros, carrito, pago simulado, stock automático con historial, publicación
de cartas, inventario, pedidos con seguimiento, retiro de ganancias y panel de administración.
Los datos (usuarios, publicaciones, pedidos, stock, retiros...) viven en **`db.json`** y se leen y
modifican con una API REST que levanta **json-server**. La sesión y el carrito quedan en el navegador.

## Requisitos para ejecutarlo

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20.19 o superior (o 22.12+) | Ejecutar Vite y npm |
| npm | El que viene con Node | Instalar dependencias |
| Git | Cualquiera reciente | Control de versiones (ver [docs/GUIA_GIT.md](docs/GUIA_GIT.md)) |
| VS Code | Recomendado | Editor, con las extensiones ESLint y Prettier |

Comprueba las versiones con `node -v`, `npm -v` y `git --version`.

## Instalación y ejecución

Igual que en el ejemplo de la Pokédex:

1. Abrir una terminal en esta carpeta (donde está `package.json`).
2. `npm install`
3. **Terminal 1:** `npm run api`  → http://127.0.0.1:3000/publicaciones
4. **Terminal 2:** `npm run dev`  → http://localhost:5173

Si abres la app sin la terminal 1, la página muestra **“Sin conexión con la API”** con un botón
para reintentar. Cada vez que guardas un archivo, la página se actualiza sola.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run api` | Levanta json-server con `db.json` en http://127.0.0.1:3000 |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. **No revisa tipos.** |
| `npm run build` | Revisa los tipos con TypeScript (`tsc -b`) y genera la versión final en `dist/` |
| `npm run preview` | Sirve la carpeta `dist/` para probar el build |
| `npm run lint` | Revisa el código con ESLint |
| `npm run test` | Ejecuta todas las pruebas: lógica (Vitest) y componentes (Karma + Jasmine) |
| `npm run test:componentes` | Pruebas de componentes React con **Karma + Jasmine** en Chrome, con reporte de cobertura |
| `npm run test:componentes:ver` | Igual, pero abre Chrome y vuelve a ejecutar al guardar |
| `npm run test:logica` | Pruebas de la lógica del negocio con Vitest |

Antes de entregar o subir cambios, ejecuta `npm run build` y `npm run test`: `npm run dev` puede
funcionar aunque haya errores de tipos.

## Cuentas de prueba

| Rol | Correo | Contraseña | Qué muestra |
|---|---|---|---|
| Administrador | admin@holomarket.cl | Admin1234 | Indicadores, moderación, usuarios, CSV, retiros y configuración |
| Cliente | camila@demo.cl | Demo1234 | Compradora con pedidos en curso |
| Cliente | diego@demo.cl | Demo1234 | Vendedor con ventas por enviar y saldo para retirar |
| Cliente | valentina@demo.cl | Demo1234 | Compra y vende; sirve para probar el bloqueo |

- La página **Ingresar** no muestra estas cuentas (el sitio se ve como una tienda real): escríbelas a mano.
- Tarjeta de prueba aprobada: `4111 1111 1111 1111`, vencimiento futuro (por ejemplo `12/29`), código `123`.
- Tarjetas de prueba **rechazadas** (llevan a la vista "No se pudo realizar el pago", sin cobrar ni tocar el stock):
  `4000 0000 0000 0002` (el banco no autoriza) y `4000 0000 0000 9995` (sin fondos o cupo).
- RUT de prueba para registrarse: `21.456.789-K`.

## Guion de demostración (5 a 7 minutos)

1. **Visitante:** entra al catálogo, busca “charizard”, filtra por condición EX y abre el Charizard ex de Valentina.
2. **Compra (Camila):** agrega 2 unidades, paga con la tarjeta de prueba y muestra en la confirmación cómo el stock baja de 3 a 1.
3. **Venta (Diego):** en Pedidos › Mis ventas marca el pedido como enviado; en Mi inventario usa + / −, “Ajustar” y el historial de stock; en Vender publica una carta con foto.
4. **Recepción (Camila):** en Pedidos confirma que recibió el pedido.
5. **Retiros (Diego):** registra una cuenta bancaria, prueba un monto menor a $5.000 (da error), pide $20.000 y anula la solicitud para ver cómo vuelve el saldo.
6. **Administración:** revisa los indicadores, transfiere y rechaza retiros, exporta los movimientos a CSV, bloquea y reactiva a Valentina y cambia la comisión.
7. **Registro:** crea una cuenta con el RUT de prueba y muestra las validaciones.

Para volver a los datos iniciales: Administración › Configuración › **Restablecer datos de demostración**
(reescribe `db.json` a través de la API).

## Cartas, vendedores e historial de precios

Inspirado en TCGplayer:

- **Catálogo por carta:** si varias personas venden la misma carta (mismo juego, nombre, edición y número),
  se muestra una sola ficha: “3 publicaciones desde $4.490”, con el precio de mercado como referencia
  (`src/logica/productos.ts`, `src/components/FichaProducto.tsx`).
- **Página de la carta** (`/carta/:id`): detalles de la carta desde API TCG (tipo, HP, ataques, artista...),
  recuadro de compra con la oferta elegida y cantidad “1 de N”, y abajo todas las publicaciones con su
  condición, idioma, envío a tu región, vendedor, región y ventas completadas.
- **Historial de precios:** gráfico del precio de mercado diario de TCGplayer (`GET /api/history-prices/{id}`
  de API TCG) en 1M, 3M, 6M o todo, convertido a pesos con el **dólar en vivo** (`src/services/dolar.ts`):
  primero el tipo de cambio de [open.er-api.com](https://open.er-api.com) (responde al instante) y, cuando
  llega, el dólar observado oficial del Banco Central vía [mindicador.cl](https://mindicador.cl) (más lento).
  Ambas son gratis y sin clave. Si fallan, se usa el dólar de respaldo de Administración › Configuración. Se puede explorar con el puntero o con las flechas del teclado, y
  tiene una tabla con los mismos datos. Mitos y Leyendas no tiene precios en la API.
- **Ventas en HoloMarket:** segunda pestaña del historial, con cada venta de la carta (fecha, condición, idioma,
  cantidad y precio unitario; sin el vendedor) y un resumen: última venta, precio promedio, rango y unidades vendidas.
  Se arma con los pedidos no cancelados (`ventasDeProducto` en `src/logica/productos.ts`).
  Los datos de demostración traen 18 ventas entregadas de las últimas semanas (HM-1001 a HM-1018), así la
  tabla tiene datos en cartas como Charizard ex, Pikachu, Blue-Eyes, Shanks o Umbreon VMAX. Los pedidos en
  curso para probar el flujo son HM-1019 a HM-1022.

## Diseño responsivo con Bootstrap 5

Bootstrap se importa en `src/main.tsx` **antes** de `index.css`, así nuestros estilos lo personalizan sin perder la estética.

| Qué se usa | Dónde |
|---|---|
| **Grilla** (`row`, `col-*`, `row-cols-*`, `g-*`) | Inicio (portada, juegos, recién publicadas, pasos), catálogo (filtros `col-lg-3` + resultados `col-lg-9`), página de la carta, carrito y checkout (`col-lg-8` + `col-lg-4`), historial de precios, formularios (`row-cols-1 row-cols-sm-2`) |
| **Orden por pantalla** (`order-*`) | Página de la carta: en celular carta → compra → detalles; en escritorio carta \| detalles \| compra |
| **Componente botón** (`.btn`) | Todos los botones: nuestras variantes (`btn--primario`, `btn--suave`…) definen las variables CSS de Bootstrap (`--bs-btn-bg`, `--bs-btn-hover-bg`…) |
| **Badge** y **spinner** | Contadores del carrito y de pedidos; "Cargando HoloMarket..." |
| **Utilidades flex** (`d-flex`, `justify-content-between`, `gap-4`) | Pie de página |

Puntos de quiebre de Bootstrap: `sm` 576 px, `md` 768 px, `lg` 992 px, `xl` 1200 px, `xxl` 1400 px.
Nuestras clases `.modal` y `.nav` se renombraron a `.ventana` y `.menu` porque Bootstrap ya usa esos nombres.

## Ofertas

Una publicación está en oferta si tiene un **precio anterior** mayor que su precio actual (campo opcional
"Precio antes de la oferta" al publicar). Se muestra con el precio anterior tachado y un badge con el
descuento en el catálogo, el inicio, la página de la carta y la vista `/ofertas`. Los datos de demostración
traen 8 cartas en oferta. Lógica en `src/logica/ofertas.ts`.

## Condiciones y rarezas

- **Condición** (escala del mercado, en inglés): `MT` Mint, `NM` Near Mint, `EX` Excellent, `GD` Good,
  `LP` Light Played, `PL` Played y `PO` Poor. La guía del sitio muestra también su equivalente en EE. UU.
- **Rareza:** cada juego tiene su lista oficial (`src/data/catalogo.ts`), con los mismos nombres que entrega
  API TCG: Pokémon (Common… Special Illustration Rare, Hyper Rare), Magic (Common… Mythic Rare),
  Yu-Gi-Oh! (Common… Starlight Rare, Quarter Century Secret Rare), One Piece (Common… Leader, Treasure Rare)
  y Mitos y Leyendas (Vasallo, Cortesano, Real, Mega Real, Ultra Real, Legendaria).

## API REST (json-server)

`vite.config.ts` tiene un proxy: todo lo que la app pide a `/api/...` se reenvía a json-server
(`/api/publicaciones` → `http://127.0.0.1:3000/publicaciones`), igual que en la Pokédex.

| Recurso | Operaciones |
|---|---|
| `/api/usuarios`, `/api/publicaciones`, `/api/pedidos`, `/api/movimientos`, `/api/actividad`, `/api/retiros` | `GET` (lista), `POST` (crear), `PUT /:id` (actualizar), `DELETE /:id` (eliminar) |
| `/api/config` | `GET` y `PUT` (un solo objeto: comisión, IVA, envíos, secuencias de ids) |

Cómo se guardan los cambios (`src/services/datos.ts` y `src/context/TiendaProvider.tsx`):

1. Al abrir el sitio se piden todas las colecciones (`GET`) y se muestra “Cargando HoloMarket...”.
2. Cada acción (comprar, publicar, ajustar stock...) aplica una regla de `src/logica/` sobre una copia del estado y la pantalla se actualiza al tiro.
3. `cambiosEntre(antes, después)` calcula qué registros son nuevos (`POST`), cuáles cambiaron (`PUT`) y cuáles se borraron (`DELETE`), y los envía en orden. La configuración (con las secuencias de ids) va primero.
4. Si la API falla, se avisa y se vuelven a leer los datos de `db.json`. Si un guardado quedó a medias, al cargar se corrigen las secuencias para no repetir ids.

## Estructura del proyecto

Se usa la estructura del ejemplo y del manual (`components`, `pages`, `services`, `types`, `hooks`) y se
agregan carpetas para los datos, la lógica de negocio y el estado global.

```
holomarket-react/
├── index.html              Página única: React se monta en <div id="root">
├── package.json            Dependencias y scripts (dev, api, build, test...)
├── db.json                 Base de datos de json-server (npm run api)
├── vite.config.ts          Configuración de Vite (proxy /api -> json-server y /apitcg -> API TCG)
├── tsconfig*.json          Configuración de TypeScript (modo estricto)
├── eslint.config.js        Reglas de ESLint
├── .env.example            Plantilla para tu clave de API TCG (copiar como .env.local)
├── public/                 Archivos estáticos (favicon)
├── docs/
│   ├── GUIA_GIT.md         Paso a paso para subir el proyecto a GitHub
│   └── ARQUITECTURA.md     Cómo está organizado el código y por qué
└── src/
    ├── main.tsx            Punto de entrada: BrowserRouter + Providers + Arranque (carga la API)
    ├── App.tsx             <Routes> con cada <Route> (/catalogo, /carta/:id...) y control de acceso por rol
    ├── index.css           Estilos globales y diseño responsivo
    ├── types/              Tipos de TypeScript (Usuario, Publicacion, Pedido, Retiro...)
    ├── data/               Catálogo de juegos, regiones, bancos y datos de demostración
    ├── utils/              Validaciones (RUT, Luhn...), formato CLP, SHA-256, navegación
    ├── services/           API json-server (datos.ts), sesión, API TCG, localStorage y CSV
    ├── logica/             Reglas del negocio como funciones puras (+ pruebas Vitest)
    ├── context/            Estado global con Context API: tienda, avisos y ventana modal
    ├── hooks/              Hooks personalizados: useTienda, useRuta, useFormulario, useCarrito...
    ├── components/         Componentes reutilizables: Cabecera, Carta, Ficha, Tabla, Campo...
    └── pages/              Una página por ruta (Catalogo, Detalle, Carrito, Vender, admin/...)
```

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Rutas

Con **React Router** (`BrowserRouter` en `main.tsx`, `<Routes>` y `<Route>` en `App.tsx`, `<Link>` para
los enlaces), igual que en la Pokédex:

| Ruta | Página | Acceso |
|---|---|---|
| `/` | Inicio | Todos |
| `/catalogo` | Catálogo con búsqueda y filtros (se guardan en la URL) | Todos |
| `/categorias` | Categorías: una tarjeta por juego | Todos |
| `/categoria/:juego` | Cartas de un juego, con pestañas de rareza (`/categoria/pokemon?rareza=...`) | Todos |
| `/ofertas` | Cartas con descuento, filtrables por juego y ordenables | Todos |
| `/carta/:id` | Detalle de una publicación (`/carta/P001`) | Todos |
| `/ingresar`, `/registro` | Ingreso y creación de cuenta | Solo visitantes |
| `/carrito`, `/checkout`, `/confirmacion/:id` | Compra (compra exitosa) | Cliente |
| `/pago-rechazado?motivo=...` | No se pudo realizar el pago: motivo, total pendiente y reintentar | Cliente |
| `/vender`, `/vender/:id` | Publicar o editar una carta (misma página) | Cliente |
| `/inventario` | Mi inventario e historial de stock | Cliente |
| `/pedidos?tab=compras` / `?tab=ventas` | Pedidos y seguimiento | Cliente |
| `/retiros` | Retiro de ganancias | Cliente |
| `/admin?tab=resumen` | Administración (7 pestañas) | Administrador |
| `*` | Página no encontrada | Todos |

## Requisitos implementados

| Planilla | ERS | Requisito | Dónde se ve |
|---|---|---|---|
| R.1 | RF-01 | Registro de usuario | `pages/Registro.tsx` |
| R.2 | RF-02 | Inicio y cierre de sesión por rol | `pages/Ingresar.tsx`, `context/TiendaProvider.tsx` |
| R.3 | RF-03 | Catálogo con búsqueda, filtros y detalle | `pages/Catalogo.tsx`, `pages/Detalle.tsx` |
| R.4 | RF-04 | Carrito de compras | `pages/Carrito.tsx`, `hooks/useCarrito.ts` |
| R.5 | RF-05 | Checkout y pago simulado | `pages/Checkout.tsx` |
| R.6 | RF-06 | Stock automático e historial | `logica/compras.ts`, `pages/Confirmacion.tsx`, `pages/Inventario.tsx` |
| R.7 | RF-07 | Publicación de cartas | `pages/Vender.tsx` |
| R.8 | RF-08 | Gestión de inventario | `pages/Inventario.tsx` |
| R.9 | RF-09 | Pedidos y seguimiento | `pages/Pedidos.tsx` |
| R.10 | RF-10 | Panel de administración | `pages/admin/` |
| R.18 | RF-11 | Retiro de ganancias | `pages/Retiros.tsx`, `pages/admin/AdminRetiros.tsx` |
| R.11 a R.17 | RNF-01 a RNF-07 | Responsivo y accesible, rendimiento, seguridad, estándares, datos personales, fiabilidad y disponibilidad | Todo el sitio |

## Imágenes de cartas con API TCG

Sin clave, las cartas se dibujan con CSS y todo funciona igual. Para ver las imágenes reales:

1. Crea una cuenta gratis en https://apitcg.com/register y copia tu clave desde https://apitcg.com/platform/api-key.
2. Copia `.env.example` como `.env.local` (en la misma carpeta que `package.json`).
3. Pega tu clave: `APITCG_KEY=tu-clave`
4. Detén `npm run dev` (Ctrl + C) y vuelve a ejecutarlo.
5. Entra como administrador y prueba en **Administración › Configuración › Imágenes de cartas › Probar conexión**.

Cómo encuentra la imagen correcta (`src/services/apiTcg.ts`). Una carta como “Charizard ex” tiene
decenas de versiones, así que se busca en este orden y se elige la que tiene **el mismo número**:

1. Por **código exacto** cuando la carta lo tiene (One Piece `OP01-120`, Yu-Gi-Oh! `LOB-EN001`).
2. Por **nombre dentro de la edición** (el set se reconoce aunque TCGplayer le anteponga el código, como `SV03: Obsidian Flames`).
3. Solo por **nombre**, hasta 100 resultados.

Si ningún resultado tiene el mismo nombre, se muestra la carta dibujada (nunca la imagen de otra carta).
El plan gratis tiene 1.000 consultas al mes; cada carta usa de 1 a 3 y queda guardada 30 días.

Cómo funciona y por qué es seguro:

- El navegador pide `/apitcg/api/products?...` y el **proxy de Vite** (`vite.config.ts`) reenvía la
  consulta a `https://api.apitcg.com` agregando la cabecera `x-api-key`. La clave nunca llega al
  navegador y no hay bloqueo de CORS.
- La variable **no** empieza con `VITE_`: Vite solo expone al navegador las variables con ese prefijo.
- `.env.local` está en `.gitignore`: **la clave no se sube a GitHub**.
- Cada imagen se guarda 30 días en el navegador para no gastar el límite mensual del plan.
- En **Vender**, al escribir 3 letras del nombre aparece una lista de cartas de API TCG; al elegir
  una se completan nombre, edición, número y rareza, y esa imagen queda en la publicación.
- Las imágenes solo se piden con `npm run dev` (el proxy es parte del servidor de desarrollo de Vite).

## Pruebas

### Componentes React: Karma + Jasmine (`npm run test:componentes`)

81 pruebas en 22 archivos `*.spec.tsx`, junto a cada componente. Karma abre Chrome sin ventana, esbuild
compila TypeScript/JSX y Istanbul mide la cobertura (reporte en `coverage/html/index.html`).

| Tipo de prueba (pauta del curso) | Ejemplos |
|---|---|
| Renderizado de listas | `Tabla` dibuja una fila por dato; el catálogo dibuja una ficha por carta |
| Renderizado condicional | `Campo` muestra el error solo si hay error; carrito vacío o con cartas; "Sin conexión con la API" |
| Props | `CondicionChip`, `EstadoChip`, `GraficoPrecios` (dólar e impresión), `FichaProducto` |
| Estado | Formularios de Ingresar, Registro, Checkout y Vender cambian al escribir; período del gráfico; pestañas |
| Eventos | Clics, teclado (flechas en el gráfico), selects, envío de formularios, ventanas modales |
| Mocks | Tienda simulada con espías (`jasmine.createSpy`); `fetch` simulado con `spyOn` para json-server, el dólar y API TCG |

Herramientas: `karma.conf.cjs` (configuración), `src/pruebas/montar.tsx` (monta un componente con Router,
avisos, modal y la tienda simulada, y simula `fetch`). Cobertura actual: ~58 % de líneas del código de `src/`.

### Lógica del negocio: Vitest (`npm run test:logica`)

47 pruebas (`*.test.ts`) de validaciones, SHA-256, reglas del negocio (stock, compras, saldo, retiros),
agrupación de cartas, elección de imágenes de API TCG y operaciones que se envían a json-server.

### Manuales

Sigue el guion de demostración de arriba.

## Notas

- Los pagos son simulados: no hay cobros y solo se guardan los 4 últimos dígitos de la tarjeta.
- Las contraseñas se guardan como hash SHA-256 con sal; tras 3 intentos fallidos el ingreso se bloquea 30 segundos.
- La sesión se cierra tras 30 minutos sin actividad (configurable).
- Los datos viven en `db.json`: todos los navegadores ven lo mismo. Al volver a una pestaña se releen de la API.
- json-server es una API de práctica: no valida permisos. En un backend real, las reglas de `logica/` y las contraseñas se verificarían en el servidor.
- Las cartas se dibujan con CSS; no se usan imágenes oficiales de las marcas salvo las que entrega API TCG.

## Subir el proyecto a GitHub

Sigue [docs/GUIA_GIT.md](docs/GUIA_GIT.md): configurar Git, crear el repositorio, hacer los commits
por etapas y subirlo con `git push`. Sube también `db.json`; nunca `.env.local` ni `node_modules`.
