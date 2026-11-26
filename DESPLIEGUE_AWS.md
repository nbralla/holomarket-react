# Despliegue de HoloMarket en AWS (Learner Lab)

Basado en la *Guía de despliegue PokéStore en AWS* del curso, adaptado a este repositorio.

| Pieza | Dónde corre | Cómo llega ahí |
|---|---|---|
| Front (React + Vite) | Amazon S3, hosting de sitio estático | `npm run build` en tu PC y se suben los archivos de `frontend/dist/` |
| Backend (Spring Boot) | EC2 t3.small, contenedor `api` (puerto 80) | `git clone` + `docker compose up` en la EC2 |
| Base de datos (MySQL 8.4) | Misma EC2, contenedor `mysql` (sin puertos abiertos) | El mismo compose; los datos quedan en el volumen `mysql_data` |

**Orden:** primero el backend (el front necesita su IP al compilarse), después el front.
Anota los datos en [URL_PROYECTO.txt](URL_PROYECTO.txt) a medida que los obtengas.

## Fase 1 · Probar producción en tu PC (opcional, recomendado)

En `backend/`, con Docker Desktop encendido:

```powershell
Copy-Item .env.prod.example .env.prod
notepad .env.prod
```

Para la prueba local: contraseñas cualquiera (distintas), `JWT_SECRET` de 32+ caracteres,
`CORS_ORIGINS=http://localhost:4173`, `ADMIN_PASSWORD` y `DEMO_USER_PASSWORD` a elección.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api   # esperar "Started HolomarketApplication"
```

Abre http://localhost/api/estado (JSON con la tienda). Para probar el front compilado, en `frontend/`:

```bash
VITE_API_URL=http://localhost/api npm run build
npx vite preview --port 4173      # http://localhost:4173
```

Al terminar: `docker compose -f docker-compose.prod.yml --env-file .env.prod down`.
`.env.prod` no se sube a GitHub (está en `.gitignore`).

## Fase 2 · GitHub

El código ya está en https://github.com/nbralla/holomarket-react (público). Antes de cada `git push`,
revisa con `git status` que no aparezcan `.env`, `.env.prod`, `.env.local`, `.env.production`,
`target/` ni `node_modules/`.

## Fase 3 · Learner Lab

1. AWS Academy → curso → **Iniciar el Laboratorio de aprendizaje** → **Start Lab** → esperar el círculo verde → **AWS**.
2. Región **N. Virginia (us-east-1)**.
3. **AWS Details → Download PEM** (`labsuser.pem`). En PowerShell, en la carpeta del archivo:

   ```powershell
   icacls labsuser.pem /inheritance:r
   icacls labsuser.pem /grant:r "$($env:USERNAME):(R)"
   ```

`labsuser.pem` y las credenciales del lab **nunca** se suben a GitHub ni se comparten.

## Fase 4 · EC2 e IP fija

**EC2 → Lanzar instancias:**

| Campo | Valor |
|---|---|
| Nombre | `holomarket-api` |
| AMI | Amazon Linux 2023 |
| Tipo | `t3.small` (2 GB; la t3.micro no alcanza para Spring + MySQL) |
| Par de claves | `vockey` |
| Almacenamiento | 20 GiB gp3 |
| Grupo de seguridad (`holomarket-sg`) | SSH 22 desde **Mi IP** · HTTP 80 desde `0.0.0.0/0` · **nada más** (ni 3306 ni 8080) |

Luego **Red y seguridad → Direcciones IP elásticas → Asignar** y **Asociar** con `holomarket-api`.
Anota la IP (`TU_ELASTIC_IP`).

## Fase 5 · Backend y base de datos en la EC2

**5.1 Elige el nombre del bucket** (único, minúsculas), por ejemplo `holomarket-nbralla-2026`.
La URL del front será `http://NOMBRE-BUCKET.s3-website-us-east-1.amazonaws.com`.

**5.2 Entrar:**

```bash
ssh -i labsuser.pem ec2-user@TU_ELASTIC_IP
```

**5.3 Docker, Git, Compose y swap:**

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
sudo dd if=/dev/zero of=/swapfile bs=128M count=16
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
exit
```

Vuelve a entrar por SSH y confirma con `docker compose version`.

**5.4 Código y secretos:**

```bash
git clone https://github.com/nbralla/holomarket-react.git
cd holomarket-react/backend
cp .env.prod.example .env.prod
openssl rand -base64 48        # copia el resultado: es tu JWT_SECRET
nano .env.prod
chmod 600 .env.prod
```

Completa: `DB_PASSWORD` y `MYSQL_ROOT_PASSWORD` (largas y distintas), `JWT_SECRET`,
`CORS_ORIGINS=http://NOMBRE-BUCKET.s3-website-us-east-1.amazonaws.com` (sin `/` final),
`ADMIN_PASSWORD` y `DEMO_USER_PASSWORD` (nuevas) y, si quieres imágenes de cartas, `APITCG_KEY`.
Evita el símbolo `$` en los valores.

**5.5 Compilar y levantar** (5 a 10 minutos la primera vez):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api
```

Cuando aparezca `Started HolomarketApplication`, sal con Ctrl+C (sigue corriendo).

**5.6 Probar:** `curl http://localhost/api/estado` en la EC2 y http://TU_ELASTIC_IP/api/estado en tu navegador.

**5.7 Revisar las tablas:**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec mysql mysql -u holomarket -p holomarket -e "SHOW TABLES;"
```

Debe listar `actividad`, `configuracion`, `movimientos`, `pedido_historial`, `pedido_items`,
`pedidos`, `publicaciones`, `retiro_historial`, `retiros` y `usuarios`.

## Fase 6 · Front en S3

**6.1 Compilar** (en tu PC, en `frontend/`):

```powershell
Copy-Item .env.production.example .env.production
notepad .env.production          # VITE_API_URL=http://TU_ELASTIC_IP/api
npm install
npm run build
```

**6.2 Bucket:** S3 → Crear bucket → región us-east-1, el nombre de 5.1, ACL deshabilitadas,
**desmarcar** “Bloquear todo el acceso público” (y confirmar).

**6.3 Hosting:** Propiedades → Alojamiento de sitios web estáticos → Habilitar → documento de índice
`index.html` y documento de error `index.html` (así React Router funciona al recargar `/carrito`).

**6.4 Política (solo lectura):** Permisos → Política del bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "LecturaPublica",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::NOMBRE-BUCKET/*"
  }]
}
```

**6.5 Subir:** Objetos → Cargar → arrastra el **contenido** de `dist/` (`index.html` y `assets/`).

**6.6 Abrir** el *Punto de enlace del sitio web* (Propiedades). Debe coincidir exactamente con `CORS_ORIGINS`.

## Fase 7 · Prueba de punta a punta

- [ ] El inicio y el catálogo muestran las cartas.
- [ ] Registrar una cuenta nueva (RUT de prueba `21.456.789-K`).
- [ ] Comprar con `4111 1111 1111 1111` → confirmación con “stock antes → después”.
- [ ] Pagar con `4000 0000 0000 9995` → “No se pudo realizar el pago”, el carrito sigue.
- [ ] Como vendedor: marcar el pedido como enviado; publicar una carta; ajustar stock.
- [ ] Como admin (con el `ADMIN_PASSWORD` de `.env.prod`): actividad, bloquear un usuario, cambiar la comisión.
- [ ] Recargar estando en `/carrito` no da error. En F12 no hay errores de CORS.

Pruebas de seguridad (deben fallar):

- [ ] `http://TU_ELASTIC_IP/api/config` con `PUT` sin token → 401.
- [ ] `http://TU_ELASTIC_IP/swagger-ui.html` → 404.
- [ ] `Test-NetConnection TU_ELASTIC_IP -Port 3306` → `TcpTestSucceeded : False`.
- [ ] `admin@holomarket.cl` / `Admin1234` no funciona (se reemplazó por `ADMIN_PASSWORD`).

## Fase 8 · HTTPS con Caddy (en vez de CloudFront)

El Learner Lab **no permite CloudFront** (`cloudfront:CreateDistribution` está bloqueado). Para tener
HTTPS se agrega **Caddy** en la misma EC2: obtiene solo un certificado de Let's Encrypt y es la única
entrada del servidor.

| Ruta | Caddy la envía a |
|---|---|
| `/api/*` | Contenedor `api` (Spring Boot, red interna) |
| Todo lo demás | Sitio estático del bucket S3 (`FRONT_S3_HOST`); las rutas de React reciben `index.html` |
| `http://TU_ELASTIC_IP/...` | Contenedor `api` (compatibilidad con pruebas por IP) |

Como Let's Encrypt necesita un nombre de dominio, se usa **sslip.io**, un servicio gratuito donde
`holomarket.3-218-125-149.sslip.io` apunta a `3.218.125.149`.

1. **Grupo de seguridad:** agrega **HTTPS 443 → 0.0.0.0/0** (quedan 22 desde Mi IP, 80 y 443).
2. **En la EC2**, dentro de `holomarket-react/backend`, agrega a `.env.prod` (con tu IP):

   ```bash
   DOMINIO=holomarket.3-218-125-149.sslip.io
   IP_PUBLICA=3.218.125.149
   FRONT_S3_HOST=holomarket-tienda-tcg.s3-website-us-east-1.amazonaws.com
   CORS_ORIGINS=https://holomarket.3-218-125-149.sslip.io,http://holomarket-tienda-tcg.s3-website-us-east-1.amazonaws.com
   ```

   y levanta: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`.
   En `logs caddy` debe aparecer `certificate obtained successfully`.
3. **Front:** compílalo con `VITE_API_URL=/api` (misma dirección que el sitio), borra los objetos del
   bucket y sube el nuevo `dist/`.
4. Abre **https://holomarket.3-218-125-149.sslip.io** (con candado).

## Día a día

- **Nueva sesión del lab:** Start Lab; la EC2 y los contenedores arrancan solos (`restart: unless-stopped`). Espera 1-2 minutos.
- **Actualizar el backend:** `git push` en tu PC; en la EC2: `cd holomarket-react/backend && git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`.
- **Actualizar el front:** `npm run build`, borra los objetos del bucket y sube de nuevo `dist/`.
- **Cambiar un secreto o el CORS:** edita `.env.prod` y repite el `up -d`.

## Problemas comunes

| Síntoma | Solución |
|---|---|
| “Sin conexión con la API” en el sitio | Abre http://TU_ELASTIC_IP/api/estado. Si responde, revisa `.env.production`, recompila y sube |
| Error de CORS en F12 | `CORS_ORIGINS` debe ser idéntico a la URL del bucket (http, sin `/` final) |
| S3 da 403 | Falta desmarcar el bloqueo público o la política tiene otro nombre de bucket |
| El contenedor `api` se reinicia | `logs api` y revisa el swap con `free -h` |
| `permission denied` con docker | Sal con `exit` y vuelve a entrar por SSH |
| SSH: Connection timed out | Inicia el lab y actualiza la regla del puerto 22 con **Mi IP** |
| Las cartas se ven dibujadas | Falta `APITCG_KEY` en `.env.prod` (el resto funciona igual) |
