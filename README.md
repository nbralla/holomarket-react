# HoloMarket · Marketplace de cartas TCG (fullstack)

Proyecto de **DSY1104 Desarrollo FullStack II** (Duoc UC), Evaluación Parcial 3.
Personas que compran y venden cartas sueltas de Pokémon, Magic, Yu-Gi-Oh!, One Piece y Mitos y
Leyendas: catálogo con filtros, carrito multivendedor, pago simulado, stock con historial (kardex),
publicación de cartas, pedidos con seguimiento, retiro de ganancias y panel de administración.

| Carpeta | Tecnología | Detalle |
|---|---|---|
| [`frontend/`](frontend) | React 19 + TypeScript + Vite + React Router + Bootstrap 5 | [frontend/README.md](frontend/README.md) |
| [`backend/`](backend) | Spring Boot 3.5 + Java 21 + JPA + Spring Security (JWT) + Swagger | [backend/README.md](backend/README.md) |
| Base de datos | MySQL 8.4 en Docker | `backend/docker-compose.yml` (desarrollo) y `docker-compose.prod.yml` (producción) |
| Despliegue | AWS Learner Lab: front en S3, backend + MySQL en EC2 con Docker Compose | [DESPLIEGUE_AWS.md](DESPLIEGUE_AWS.md) |

Cómo está armado y por qué: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Ejecutar en tu PC

Requisitos: Docker Desktop, Java 21 (o IntelliJ), Node.js 20+ y Git.

```bash
# 1. Base de datos (desde backend/)
docker compose up -d

# 2. Backend (desde backend/): IntelliJ › HolomarketApplication, o bien
mvn spring-boot:run                     # API en http://localhost:8080/api

# 3. Frontend (desde frontend/)
npm install
npm run dev                             # http://localhost:5173
```

En desarrollo, Vite reenvía `/api` al backend (sin CORS). Swagger: http://localhost:8080/swagger-ui.html

### Cuentas y datos de prueba (desarrollo)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@holomarket.cl | Admin1234 |
| Cliente | camila@demo.cl · diego@demo.cl · valentina@demo.cl | Demo1234 |

- Tarjeta aprobada: `4111 1111 1111 1111`, vencimiento futuro, código `123`.
- Tarjetas rechazadas por el "banco" (respuesta 402): `4000 0000 0000 0002` y `4000 0000 0000 9995`.
- RUT de prueba para registrarse: `21.456.789-K`.

En producción las contraseñas demo se reemplazan por `ADMIN_PASSWORD` y `DEMO_USER_PASSWORD` de `.env.prod`.

## Pruebas

| Dónde | Comando | Qué cubre |
|---|---|---|
| `frontend/` | `npm test` | 82 pruebas de componentes (Jasmine + Karma) y 40 de lógica y cliente de la API (Vitest) |
| `backend/` | `curl` / Swagger | Endpoints, permisos (401/403), pago rechazado (402), stock (409), CORS |

## Entrega

- Código backend + frontend + base de datos + Docker: este repositorio.
- Despliegue en AWS: [DESPLIEGUE_AWS.md](DESPLIEGUE_AWS.md).
- URL del proyecto en la nube: [URL_PROYECTO.txt](URL_PROYECTO.txt).
