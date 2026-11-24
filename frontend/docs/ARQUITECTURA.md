# Arquitectura de HoloMarket en React

Este documento explica cómo está organizado el código, cómo viajan los datos y qué conceptos de
React se usan en cada parte. Sirve para estudiar el proyecto y para defenderlo en la presentación.

## 1. Del HTML de la EP1 a componentes de React

| En la versión EP1 (HTML + JS) | En esta versión (React + TS) |
|---|---|
| Un `index.html` con todas las vistas ocultas con `hidden` | `index.html` solo tiene `<div id="root">`; cada vista es un componente en `src/pages/` |
| `innerHTML` con plantillas de texto | JSX: React crea los elementos y escapa el texto (protege contra XSS) |
| Un objeto global `estado` que se modifica y se “repinta” | Estado en `TiendaProvider` (Context API); React vuelve a dibujar cuando cambia |
| `router()` que lee `location.hash` | React Router: `<Routes>` y `<Route>` en `App.tsx`, `<Link>` en los enlaces |
| Datos en `localStorage` | API REST con json-server (`db.json`) |
| Funciones sueltas en `app.js` (3.600 líneas) | Módulos pequeños por responsabilidad, con tipos |
| `data-accion` + un listener global | `onClick`, `onChange` y `onSubmit` en cada elemento |

Los `id` y las clases CSS se mantuvieron iguales, así se reutilizó la hoja de estilos completa.

## 2. Capas

```
            ┌─────────────────────────────────────────────┐
  Vista     │ pages/  ←  components/                       │  JSX, eventos, formularios
            └───────────────┬─────────────────────────────┘
                            │ hooks/ (useTienda, useFormulario, useCarrito, useRuta...)
            ┌───────────────▼─────────────────────────────┐
  Estado    │ context/ TiendaProvider · AvisosProvider ·   │  Context API
            │          ModalProvider                       │
            └───────────────┬─────────────────────────────┘
                            │ actualizar(e => logica(e, ...))
            ┌───────────────▼─────────────────────────────┐
  Negocio   │ logica/  (funciones puras + pruebas Vitest)  │  stock, compras, retiros...
            └───────────────┬─────────────────────────────┘
            ┌───────────────▼─────────────────────────────┐
  Servicios │ services/ datos (fetch a /api) · sesion ·   │  todo lo que toca el
            │   almacen (localStorage) · apiTcg · csv       │  navegador o la red
            └───────────────┬─────────────────────────────┘
                            │ GET / POST / PUT / DELETE  /api/...  (proxy de Vite)
            ┌───────────────▼─────────────────────────────┐
  API       │ json-server :3000  ·  db.json                │  npm run api
            └─────────────────────────────────────────────┘
  Transversal: types/ (tipos), data/ (datos fijos y demo), utils/ (validaciones, formato)
```

- **`logica/`** no importa React: recibe el estado y lo modifica. Por eso se puede probar con Vitest
  sin abrir el navegador (`src/logica/tienda.test.ts`).
- **`services/`** concentra lo que depende del entorno (la API, localStorage, `fetch`, descargas).
- **`pages/`** y **`components/`** solo muestran datos y llaman a la lógica.

## 3. Flujo de un cambio: ejemplo “marcar pedido como enviado”

1. En `pages/Pedidos.tsx` el botón llama a `enviar(pedido)`.
2. `useModal().abrir(...)` muestra la ventana con el número de seguimiento y espera la respuesta (promesa).
3. Se llama a `actualizar((e) => marcarEnviado(e, usuario.id, pedido.id, seguimiento))`.
4. `actualizar` (en `TiendaProvider`):
   - hace una copia del estado con `structuredClone` y le aplica `marcarEnviado`,
   - llama a `setEstado` con la copia (la pantalla cambia al tiro),
   - con `cambiosEntre(antes, copia)` calcula qué cambió (aquí: `PUT /api/pedidos/HM-1003` y
     `POST /api/actividad`) y lo envía a json-server con `enviarCambios`.
   - Si la API falla, avisa y vuelve a leer `db.json` (`cargarEstado`).
5. React vuelve a dibujar: el pedido aparece “En camino” y la cabecera actualiza el contador de ventas por enviar.
6. `useAvisos().avisar(...)` muestra el aviso de éxito.

Todas las funciones de `logica/` devuelven `Resultado<T>`: `{ ok: true, valor }` o `{ ok: false, error }`.
La página decide qué aviso mostrar.

## 4. Conceptos de React que se usan

| Concepto | Dónde |
|---|---|
| Componentes funcionales y props tipadas | Todos los archivos `.tsx` (por ejemplo `Carta`, `Tabla`, `Campo`) |
| `useState` | Formularios, filtros del inventario y de administración, pestañas |
| `useEffect` con limpieza | Carga inicial de la API (`Arranque`), sugerencias con `AbortController`, temporizadores, eventos `storage` y `visibilitychange` |
| `useMemo` / `useCallback` | `TiendaProvider` (usuario actual, funciones estables para el contexto) |
| `useRef` | Foco de campos, referencias al `<dialog>` y valores que no deben redibujar |
| React Router | `BrowserRouter`, `Routes`, `Route`, `Link`, `Navigate`, `useParams`, `useLocation`, `useNavigate` |
| Context API | `TiendaContext`, `AvisosContext`, `ModalContext` |
| Hooks personalizados | `useTienda`, `useRuta`, `useNavegar`, `useFormulario`, `useCarrito`, `useDebounce`, `useImagenCarta`, `useHolo`, `useLegal`, `useModal`, `useAvisos` |
| Renderizado condicional y listas con `key` | Catálogo, tablas, pedidos, sugerencias |
| Formularios controlados | Registro, Ingresar, Checkout, Vender, Retiros, Configuración |
| `key` para reiniciar un componente | `App.tsx` usa `<Routes key={ruta.camino}>`: al cambiar de página el formulario parte limpio |

## 5. Rutas y control de acceso

`main.tsx` envuelve la app en `BrowserRouter`. `App.tsx` declara un `<Route>` por página y la envuelve
en uno de estos componentes:

- **`Vista`**: página pública; solo cambia el título de la pestaña.
- **`SoloVisitante`** (Ingresar, Registro): quien llega con sesión va al catálogo o a administración.
- **`Privada`** (rol `cliente` o `admin`): sin sesión, `IrAIngresar` guarda el destino con
  `recordarDestino()` y envía a `/ingresar`; al ingresar vuelve a donde estaba. Con otro rol, “Sin acceso”.
- `path="*"` muestra “Página no encontrada”.

Al cambiar de página el foco pasa al `<h1>` (accesibilidad). Los filtros del catálogo y las pestañas
viven en la URL (`/catalogo?juego=pokemon`, `/admin?tab=usuarios`): se leen con `useRuta()` y se
cambian con `useNavegar().reemplazar()` (sin agregar entradas al historial).

## 6. Persistencia y sesión

- `db.json` es la base de datos; `npm run api` la sirve con json-server en el puerto 3000 y
  `vite.config.ts` reenvía `/api/...` hacia allá.
- `components/Arranque.tsx` pide los datos al abrir el sitio (`cargarEstado`); si la API no responde,
  muestra “Sin conexión con la API” y un botón para reintentar.
- `services/datos.ts`: `cargarEstado` (GET), `cambiosEntre` (qué enviar), `enviarCambios` (cola en orden)
  y `restablecerDatosDemo`. La configuración se envía primero y `reconciliarSecuencias` corrige los ids
  al cargar, así un guardado cortado a la mitad nunca produce ids repetidos.
- `services/almacen.ts` envuelve `localStorage` (claves `hm_*`) para la sesión, el carrito y las cachés.
- `services/sesion.ts`: sesión con vencimiento, carrito por usuario y bloqueo de 30 s tras 3 intentos fallidos.
- `TiendaProvider` renueva la sesión con la actividad (clics y teclas), la cierra por inactividad y
  vuelve a leer `db.json` cuando regresas a la pestaña.

## 7. Imágenes de API TCG

```
Navegador ── GET /apitcg/api/products?tcg=pokemon&set=...&name=... ──► Servidor de Vite (npm run dev)
                                                                   │ agrega x-api-key (de .env.local)
                                                                   ▼
                                                          https://api.apitcg.com/api/products
```

- `vite.config.ts` define el proxy y la constante `__IMAGENES_API__` (true solo con `npm run dev` y clave).
- `services/apiTcg.ts` busca por código exacto (One Piece, Yu-Gi-Oh!), luego por nombre dentro del set
  (`/api/{tcg}/sets`, guardado 30 días) y luego solo por nombre; elige la carta con el mismo número
  (`elegirImagen`) y descarta resultados de otro nombre.
- También tiene cola de 3 consultas simultáneas, caché de 30 días, deja de insistir si la clave
  es rechazada (401/403) o se acaba el plan (429), y solo acepta URLs `http(s)`.
- `hooks/useImagenCarta.ts` pide la imagen cuando una carta se dibuja; `components/Carta.tsx` la muestra.
- La foto subida por el vendedor siempre tiene prioridad sobre la imagen de la API.

## 8. Seguridad (RNF-03)

- JSX escapa todo el texto: un nombre de carta como `<img src=x onerror=...>` se muestra como texto.
- Contraseñas con SHA-256 y sal (`utils/sha256.ts`), nunca en texto plano.
- De la tarjeta solo se guardan los 4 últimos dígitos; de la cuenta bancaria se muestran los 4 últimos.
- El CSV antepone `'` a celdas que empiezan con `=`, `+`, `-` o `@` (evita fórmulas en Excel).
- La clave de API TCG vive en `.env.local` (ignorado por Git) y solo la usa el servidor de Vite.
- Las acciones vuelven a validar con los datos guardados (por ejemplo, el saldo antes de un retiro).
