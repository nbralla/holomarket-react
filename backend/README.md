# HoloMarket · Backend (Spring Boot + MySQL)

API REST de HoloMarket: **Spring Boot 3.5 · Java 21 · JPA / Hibernate · Spring Security + JWT ·
BCrypt · Bean Validation · Swagger · MySQL 8.4**. Sigue la estructura del ejemplo del curso
(PokéStore): `controller → service → repository → entity`, con `dto`, `security`, `config` y `exception`.

## 1. Levantar MySQL (puerto 3308)

```bash
docker compose up -d
```

Crea la base `holomarket` con el usuario `holomarket` / `holomarket123`, en `127.0.0.1:3308`
(solo accesible desde tu PC). Se usa el 3308 para no chocar con el MySQL de la PokéStore (3307).

## 2. Ejecutar el backend

- **IntelliJ:** abre `backend/pom.xml` y ejecuta `HolomarketApplication`. Las variables opcionales
  están en `.env.example` (*Run › Edit Configurations › Environment variables*).
- **Terminal con Maven:** `mvn spring-boot:run`
- **Sin Maven instalado (con Docker):**

  ```bash
  docker run --rm -p 8080:8080 -e DB_HOST=host.docker.internal -v "$PWD":/app -v holomarket-m2:/root/.m2 -w /app maven:3.9-eclipse-temurin-21 mvn spring-boot:run
  ```

La API queda en `http://localhost:8080/api`. En el primer arranque (base vacía) carga la demo desde
`src/main/resources/datos-demo.json`: 4 cuentas, 25 publicaciones, 22 pedidos con su historial,
retiros, kardex y auditoría. Las fechas se ajustan para que la demo se vea reciente.

| Rol | Correo | Contraseña (desarrollo) |
|---|---|---|
| Administrador | admin@holomarket.cl | `ADMIN_PASSWORD` (Admin1234 por defecto) |
| Cliente | camila@demo.cl, diego@demo.cl, valentina@demo.cl | `DEMO_USER_PASSWORD` (Demo1234 por defecto) |

En producción esas contraseñas salen de `.env.prod`: las de desarrollo dejan de funcionar.

### Swagger

Con el backend encendido: **http://localhost:8080/swagger-ui.html** (y el JSON en `/v3/api-docs`,
importable en Postman). Para los endpoints protegidos: ejecuta `POST /api/auth/login`, copia el
`token` y pégalo en **Authorize 🔒** (sin la palabra `Bearer`). En producción se apaga con
`SWAGGER_ENABLED=false`.

## 3. Endpoints

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| POST | `/api/auth/login` | Público | Token JWT + usuario. 3 fallos → 30 s de bloqueo (429) |
| POST | `/api/auth/registro` | Público | Crea un cliente (RUT módulo 11, correo único, BCrypt) |
| GET | `/api/auth/yo` | Logueado | Usuario del token |
| POST | `/api/auth/salir` | Logueado | Registra el cierre de sesión |
| GET | `/api/estado` | Público / según rol | Todo lo que ese usuario puede ver, con la forma que usa el front |
| POST | `/api/publicaciones` | Cliente | Publicar una carta (alta en el kardex) |
| PUT | `/api/publicaciones/{id}` | Dueño | Editar |
| POST | `/api/publicaciones/{id}/stock` | Dueño | Entrada o salida de stock con motivo |
| PUT | `/api/publicaciones/{id}/precio` | Dueño | Cambiar precio |
| PUT | `/api/publicaciones/{id}/estado` | Dueño o admin | Pausar / activar |
| DELETE | `/api/publicaciones/{id}` | Dueño o admin | Baja lógica (stock 0) |
| POST | `/api/pedidos` | Cliente | Pagar el carrito: 201, 402 (banco rechaza) o 409 (stock cambió) |
| POST | `/api/pedidos/{id}/enviar` | Vendedor | Marcar enviado (con seguimiento) |
| POST | `/api/pedidos/{id}/recibir` | Comprador | Confirmar recepción (libera el saldo) |
| POST | `/api/pedidos/{id}/cancelar` | Comprador | Cancelar si está pagado (devuelve el stock) |
| PUT | `/api/usuarios/yo/cuenta` | Cliente | Cuenta bancaria para retiros |
| POST | `/api/retiros` | Cliente | Solicitar retiro (mínimo y saldo) |
| POST | `/api/retiros/{id}/anular` | Dueño | Anular mientras está en proceso |
| POST | `/api/retiros/{id}/transferir` · `/rechazar` | Admin | Gestionar la solicitud |
| PUT | `/api/usuarios/{id}/estado` | Admin | Bloquear / reactivar |
| PUT | `/api/config` | Admin | Comisión, IVA, envíos, stock bajo, sesión, retiro mínimo, dólar |
| POST | `/api/admin/restablecer` | Admin | Borra todo y recarga la demo |
| POST | `/api/actividad` | Logueado | Registrar una acción del navegador (por ejemplo, exportar CSV) |
| GET | `/api/tcg/**` | Público | Proxy a API TCG con `APITCG_KEY` (503 si no hay clave) |

Errores en JSON uniforme: `{ "status": 409, "message": "...", "errors": { ... } }`.

Probar con curl:

```bash
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"diego@demo.cl","clave":"Demo1234"}' | jq -r .token)
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/estado
```

## 4. Variables de entorno

| Variable | Por defecto (desarrollo) | Para qué |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | localhost, 3308, holomarket, holomarket, holomarket123 | Conexión a MySQL |
| `DB_PARAMS` | `createDatabaseIfNotExist=true&useSSL=false&...` | Parámetros JDBC (en RDS: `sslMode=REQUIRED`) |
| `JWT_SECRET` | vacío = clave aleatoria al iniciar | Firma de los tokens (mínimo 32 caracteres) |
| `JWT_EXPIRATION_MINUTES` | 120 | Duración del token |
| `CORS_ORIGINS` | http://localhost:5173 | Orígenes que pueden llamar a la API |
| `ADMIN_PASSWORD`, `DEMO_USER_PASSWORD` | Admin1234, Demo1234 | Contraseñas de las cuentas demo (solo al cargar la demo) |
| `APITCG_KEY` | vacío | Clave de API TCG para el proxy `/api/tcg` |
| `SWAGGER_ENABLED` | true | Swagger UI y `/v3/api-docs` |

## 5. Producción con Docker

```bash
cp .env.prod.example .env.prod      # y completar los valores
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api
```

Levanta MySQL (sin puertos hacia afuera) y el backend en el puerto 80. El paso a paso en AWS está en
[../DESPLIEGUE_AWS.md](../DESPLIEGUE_AWS.md).
