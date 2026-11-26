# Arquitectura de HoloMarket (fullstack)

Este documento explica cómo está organizado el código, cómo viajan los datos entre el front, el
backend y la base de datos, y qué conceptos se usan en cada parte. Sirve para estudiar el proyecto
y para defenderlo en la presentación.

## 1. Evolución del proyecto

| Entrega | Front | Datos y reglas |
|---|---|---|
| EP1 | HTML + CSS + JavaScript | `localStorage` del navegador |
| EP2 | React + TypeScript + Vite + Bootstrap | json-server (`db.json`); las reglas en el navegador |
| **EP3** | El mismo front en React | **Backend Spring Boot + MySQL**: las reglas, los permisos y las contraseñas viven en el servidor |

## 2. Piezas y despliegue

```
                 ┌──────────────────────── Navegador ────────────────────────┐
                 │ https://holomarket.3-218-125-149.sslip.io                 │
                 └──────────────┬──────────────────────────────┬─────────────┘
                                │ HTTPS (443)                  │ dólar: mindicador.cl / open.er-api.com
┌─────────────── EC2 t3.small · Docker Compose ───────────────┐
│ caddy  (80/443, certificado Let's Encrypt, cabeceras HSTS/CSP)│
│   ├── /api/*  ──────► api: Spring Boot :8080 ──── /api/tcg ──┼──► api.apitcg.com (agrega APITCG_KEY)
│   │                     │ JPA / Hibernate (red interna)        │
│   │                   mysql: MySQL 8.4 (sin puertos afuera)   │
│   └── todo lo demás ──────────────────────────────────────────┼──► Bucket S3 (index.html + assets)
└───────────────────────────────────────────────────────────────┘
```

| Pieza | Desarrollo (tu PC) | Producción (AWS Learner Lab) |
|---|---|---|
| Front | `npm run dev` en http://localhost:5173 (proxy `/api` → 8080) | Archivos de `dist/` en un bucket S3 con hosting estático, servidos a través de Caddy |
| Entrada HTTPS | — | Contenedor `caddy` en la EC2 (puertos 80 y 443) |
| Backend | IntelliJ o `mvn spring-boot:run` en el puerto 8080 | Contenedor `api` en la misma EC2, solo en la red interna |
| Base de datos | `docker compose up -d` → MySQL en `127.0.0.1:3308` | Contenedor `mysql` en la misma EC2, sin puertos abiertos |

Por qué Caddy y no CloudFront: el Learner Lab bloquea la creación de distribuciones de CloudFront.
Caddy obtiene y renueva solo el certificado, y como el sitio y la API quedan en el mismo dominio
(`/api`), el navegador no necesita CORS para las llamadas normales. Las rutas de React (`/catalogo`,
`/carrito`...) no existen como archivos en S3: Caddy pide `index.html` y responde 200.

## 3. Backend: capas (como el ejemplo de la PokéStore)

```
controller/   Recibe la petición HTTP, valida el cuerpo (@Valid) y llama al servicio
   │
service/      Reglas del negocio en transacciones (@Transactional)
   │            AuthService, PublicacionService, PedidoService, RetiroService,
   │            AdminService, EstadoService, AuditoriaService, DatosDemoService
repository/   Spring Data JPA (consultas, SELECT ... FOR UPDATE)
   │
entity/       Tablas: usuarios, publicaciones, pedidos (+ pedido_items, pedido_historial),
              retiros (+ retiro_historial), movimientos, actividad, configuracion
```

Transversal: `dto/` (lo que entra y sale en JSON), `security/` (JWT, filtro, límite de intentos),
`config/` (Spring Security, CORS, Swagger, carga inicial) y `exception/` (errores en JSON uniforme).

### Ejemplo: pagar el carrito (`POST /api/pedidos`)

1. `JwtAuthFilter` lee el token, busca al usuario en MySQL (si está bloqueado, el token no sirve) y lo deja como `AuthUser`.
2. `PedidoController` valida el cuerpo (`CompraRequest`: ítems, entrega, pago...).
3. `PedidoService.comprar` revisa la tarjeta (Luhn). Las tarjetas de prueba rechazadas responden
   **402** con el motivo, sin tocar nada, y el intento queda en la auditoría.
4. En **una transacción**: bloquea cada publicación con `SELECT ... FOR UPDATE` (en orden de id, para
   evitar bloqueos cruzados), revisa estado y stock, agrupa por vendedor, calcula subtotal, envío,
   comisión e IVA **con los precios de la base**, crea un pedido por vendedor, descuenta el stock y
   registra cada movimiento en el kardex. Si algo falla responde **409** y no se guarda nada (rollback).
5. El front vuelve a pedir `GET /api/estado` y muestra la confirmación con “stock antes → después”.

Los ids son correlativos legibles (`U04`, `P026`, `HM-1023`, `RET-003`): se toman de la fila de
`configuracion`, bloqueada mientras dura la transacción, así dos compras simultáneas nunca reciben el
mismo número.

### Qué ve cada usuario (`GET /api/estado`)

| Dato | Visitante | Cliente | Administrador |
|---|---|---|---|
| Publicaciones | Todas menos las eliminadas | + sus eliminadas (inventario) | Todas |
| Usuarios | Solo nombre y región de cada vendedor | + sus propios datos completos | Todos completos |
| Pedidos | Ventas anónimas (para el historial de precios) | + sus compras y ventas completas | Todos |
| Kardex | — | El de sus publicaciones y el de sus compras | Todo |
| Retiros / Actividad | — | Sus retiros | Todo |

## 4. Front: capas

```
pages/ ← components/        JSX, eventos y formularios
   │ hooks/ (useTienda, useFormulario, useCarrito, useRuta...)
context/ TiendaProvider     estado global (Context API): datos, sesión, carrito
   │ ejecutar(() => api.accion(...))  →  recarga GET /api/estado
services/datos.ts           cliente de la API REST (fetch + token JWT)
logica/                     cálculos para mostrar (catálogo, carrito, saldo) + pruebas Vitest
```

- **`ejecutar(llamada)`** llama al endpoint y, si responde bien, vuelve a cargar los datos. Devuelve
  `{ ok: true, valor }` o `{ ok: false, error }` con el mensaje del backend; la página decide el aviso.
- **`logica/`** ya no escribe datos: solo calcula lo que se muestra al instante (filtros, resumen del
  carrito, saldo). El backend vuelve a validar todo antes de guardar.

### Conceptos de React que se usan

| Concepto | Dónde |
|---|---|
| Componentes funcionales y props tipadas | Todos los `.tsx` (`Carta`, `Tabla`, `Campo`...) |
| `useState` / `useEffect` / `useMemo` / `useCallback` / `useRef` | Formularios, carga inicial, `TiendaProvider`, foco |
| React Router | `BrowserRouter`, `Routes`, `Route`, `Link`, `Navigate`, `useParams`, `useNavigate` |
| Context API | `TiendaContext`, `AvisosContext`, `ModalContext` |
| Hooks personalizados | `useTienda`, `useRuta`, `useFormulario`, `useCarrito`, `useImagenCarta`... |
| Bootstrap 5 | Grilla responsiva, pestañas, insignias e indicadores de carga |

## 5. Seguridad

| Riesgo | Cómo se cubre |
|---|---|
| Contraseñas filtradas | BCrypt en el backend; nunca viajan de vuelta ni se guardan en el navegador |
| Fuerza bruta en el login | 3 intentos fallidos bloquean ese correo 30 segundos (`LimiteIntentos`) |
| Saltarse permisos desde el navegador | Cada endpoint exige token y rol (`SecurityConfig`); el usuario sale del token, no del cuerpo |
| Usuario bloqueado con token vigente | El filtro JWT revisa el estado en MySQL en cada petición |
| Stock negativo o doble venta | Transacción + `SELECT ... FOR UPDATE` |
| Retirar dos veces el mismo saldo | El saldo se recalcula dentro de la transacción del retiro |
| Datos de otros usuarios | `GET /api/estado` filtra por rol (tabla de arriba) |
| Otro sitio llamando a la API | CORS con lista blanca (`CORS_ORIGINS`), nunca `*` |
| Base de datos expuesta | MySQL sin puertos hacia afuera en producción; solo la ve el contenedor `api` |
| Claves en el código | `.env.prod` y `.env.local` en `.gitignore`; `APITCG_KEY` solo en el servidor |
| XSS | React escapa el texto; el CSV antepone `'` a celdas que empiezan con `=`, `+`, `-` o `@` |
| Errores que revelan detalles | `GlobalExceptionHandler` responde JSON sin stack traces |
| Contenedor comprometido | El backend corre como usuario `app` sin privilegios (Dockerfile) |
| Datos interceptados en la red | HTTPS con Let's Encrypt (Caddy) y `Strict-Transport-Security` |
| Scripts inyectados, clickjacking | Cabeceras `Content-Security-Policy` (solo nuestro JavaScript), `X-Frame-Options: DENY`, `nosniff` |
| Gastar la clave de API TCG desde afuera | El proxy `/api/tcg` solo acepta las 3 consultas que usa el front (lista blanca) |
| Cuerpos enormes para saturar el login | Correo y contraseña con tope de 100 caracteres (400) |
| Manipular precio o cantidad desde el navegador | El servidor toma el precio de la base; cantidades fuera de 1 a 999 → 400 |

Todo lo anterior se comprueba con [`backend/pruebas/ataque.py`](../backend/pruebas/ataque.py) (37 pruebas).

Pendiente (fuera del alcance del Learner Lab): un dominio propio, respaldos automáticos (RDS), límite
de peticiones por IP y guardar el token en una cookie `HttpOnly` en vez de `localStorage` (la CSP ya
reduce el riesgo de que un script lo robe).
