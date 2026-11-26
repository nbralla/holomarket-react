# Despliegue de HoloMarket en AWS (Learner Lab)

Basado en la *Guía de despliegue PokéStore en AWS* del curso, adaptado a este repositorio y con HTTPS.

| Pieza | Dónde corre | Cómo llega ahí |
|---|---|---|
| Front (React + Vite) | Amazon S3, hosting de sitio estático | `npm run build` en tu PC y se suben los archivos de `frontend/dist/` |
| Entrada HTTPS (Caddy 2.8) | EC2, contenedor `caddy` (puertos 80 y 443) | El mismo `docker-compose.prod.yml` |
| Backend (Spring Boot) | EC2, contenedor `api` (solo red interna) | `git clone` + `docker compose up` en la EC2 |
| Base de datos (MySQL 8.4) | EC2, contenedor `mysql` (sin puertos abiertos) | El mismo compose; los datos quedan en el volumen `mysql_data` |

```
Navegador ──HTTPS──► Caddy (EC2) ──► /api/*  → contenedor api → contenedor mysql
                                 └─► resto   → bucket S3 (index.html y assets)
```

**Orden:** primero la EC2 y el backend, después el front. Anota los datos en
[URL_PROYECTO.txt](URL_PROYECTO.txt) a medida que los obtengas.

**Valores de este proyecto** (reemplázalos por los tuyos si despliegas otra copia):

| Dato | Valor |
|---|---|
| IP elástica | `3.218.125.149` |
| Dominio HTTPS (sslip.io) | `holomarket.3-218-125-149.sslip.io` |
| Bucket S3 | `holomarket-tienda-tcg` |
| Punto de enlace del bucket | `holomarket-tienda-tcg.s3-website-us-east-1.amazonaws.com` |

## Fase 1 · Probar producción en tu PC (opcional, recomendado)

En `backend/`, con Docker Desktop encendido, se pueden probar `mysql` y `api` sin Caddy:

```powershell
Copy-Item .env.prod.example .env.prod
notepad .env.prod
```

Para la prueba local: contraseñas cualquiera (distintas), `JWT_SECRET` de 32+ caracteres,
`CORS_ORIGINS=http://localhost:4173`, `ADMIN_PASSWORD` y `DEMO_USER_PASSWORD` a elección, y en
`DOMINIO`, `IP_PUBLICA` y `FRONT_S3_HOST` cualquier valor (Caddy no se usa en esta prueba).

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build mysql api
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api   # esperar "Started HolomarketApplication"
```

Al terminar: `docker compose -f docker-compose.prod.yml --env-file .env.prod down`.
`.env.prod` no se sube a GitHub (está en `.gitignore`).

## Fase 2 · GitHub

El código está en https://github.com/nbralla/holomarket-react (público). Antes de cada `git push`,
revisa con `git status` que no aparezcan `.env`, `.env.prod`, `.env.local`, `.env.production`,
`target/` ni `node_modules/`. Cada push ejecuta la integración continua (pestaña **Actions**).

## Fase 3 · Learner Lab

1. AWS Academy → curso → **Iniciar el Laboratorio de aprendizaje** → **Start Lab** → esperar el círculo verde → **AWS**.
2. Región **N. Virginia (us-east-1)**.
3. **AWS Details → Download PEM** (`labsuser.pem`). En PowerShell, en la carpeta del archivo:

   ```powershell
   icacls labsuser.pem /inheritance:r
   icacls labsuser.pem /grant:r "$($env:USERNAME):(R)"
   ```

   (En CMD, cambia `$($env:USERNAME)` por `%USERNAME%`.)

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
| Grupo de seguridad (`holomarket-sg`) | SSH 22 desde **Mi IP** · HTTP 80 y HTTPS 443 desde `0.0.0.0/0` · **nada más** (ni 3306 ni 8080) |

Luego **Red y seguridad → Direcciones IP elásticas → Asignar** y **Asociar** con `holomarket-api`.
La IP elástica no cambia al reiniciar el lab, así que el dominio tampoco.

**Dominio:** Let's Encrypt necesita un nombre, no una IP. [sslip.io](https://sslip.io) es un servicio
gratuito donde `holomarket.3-218-125-149.sslip.io` apunta a `3.218.125.149`: solo cambia los puntos de
tu IP por guiones.

## Fase 5 · Backend, base de datos y HTTPS en la EC2

**5.1 Entrar** (desde la carpeta de `labsuser.pem`):

```bash
ssh -i labsuser.pem ec2-user@3.218.125.149
```

**5.2 Docker, Git, Compose y swap:**

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

**5.3 Código y secretos:**

```bash
git clone https://github.com/nbralla/holomarket-react.git
cd holomarket-react/backend
cp .env.prod.example .env.prod
openssl rand -base64 48        # copia el resultado: es tu JWT_SECRET
nano .env.prod
chmod 600 .env.prod
```

Completa (evita el símbolo `$` en los valores):

| Variable | Valor |
|---|---|
| `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Largas y distintas |
| `JWT_SECRET` | El resultado de `openssl rand` |
| `DOMINIO` | `holomarket.3-218-125-149.sslip.io` |
| `IP_PUBLICA` | `3.218.125.149` |
| `FRONT_S3_HOST` | `holomarket-tienda-tcg.s3-website-us-east-1.amazonaws.com` |
| `CORS_ORIGINS` | `https://holomarket.3-218-125-149.sslip.io,http://holomarket-tienda-tcg.s3-website-us-east-1.amazonaws.com` (sin `/` final) |
| `ADMIN_PASSWORD`, `DEMO_USER_PASSWORD` | Nuevas (reemplazan a las de desarrollo) |
| `APITCG_KEY` | Opcional: imágenes y precios de las cartas |

**5.4 Compilar y levantar** (5 a 10 minutos la primera vez):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api     # "Started HolomarketApplication"
docker compose -f docker-compose.prod.yml --env-file .env.prod logs caddy      # "certificate obtained successfully"
```

Sal de los logs con Ctrl+C (los contenedores siguen corriendo). `docker ps` debe mostrar
`mysql`, `api` y `caddy` como **Up**.

**5.5 Probar:** https://holomarket.3-218-125-149.sslip.io/api/estado debe responder un JSON.

**5.6 Revisar las tablas:**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec mysql mysql -u holomarket -p holomarket -e "SHOW TABLES;"
```

Debe listar `actividad`, `configuracion`, `movimientos`, `pedido_historial`, `pedido_items`,
`pedidos`, `publicaciones`, `retiro_historial`, `retiros` y `usuarios`.

## Fase 6 · Front en S3

**6.1 Compilar** (en tu PC, en `frontend/`):

```powershell
Copy-Item .env.production.example .env.production     # deja VITE_API_URL=/api
npm install
npm run build
```

`/api` funciona porque Caddy sirve el sitio y la API desde el mismo dominio.

**6.2 Bucket:** S3 → Crear bucket → región us-east-1, nombre `holomarket-tienda-tcg`, ACL
deshabilitadas, **desmarcar** “Bloquear todo el acceso público” (y confirmar).

**6.3 Hosting:** Propiedades → Alojamiento de sitios web estáticos → Habilitar → documento de índice
`index.html` y documento de error `index.html`.

**6.4 Política (solo lectura):** Permisos → Política del bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "LecturaPublica",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::holomarket-tienda-tcg/*"
  }]
}
```

**6.5 Subir:** Objetos → Cargar → arrastra el **contenido** de `dist/` (`index.html`, `favicon.svg` y `assets/`).

**6.6 Abrir** https://holomarket.3-218-125-149.sslip.io (con candado).

## Fase 7 · Prueba de punta a punta

- [ ] El inicio y el catálogo muestran las cartas, en PC y en celular.
- [ ] Registrar una cuenta nueva (RUT de prueba `21.456.789-K`).
- [ ] Comprar con `4111 1111 1111 1111` → confirmación con “stock antes → después”.
- [ ] Pagar con `4000 0000 0000 9995` → “No se pudo realizar el pago”, el carrito sigue.
- [ ] Como vendedor: marcar el pedido como enviado; publicar una carta; ajustar stock.
- [ ] Como admin (con el `ADMIN_PASSWORD` de `.env.prod`): actividad, bloquear un usuario, cambiar la comisión.
- [ ] Recargar estando en `/carrito` no da error. En F12 no hay errores de consola.

Pruebas de seguridad (todas deben "fallar" para el atacante):

```powershell
$U = "https://holomarket.3-218-125-149.sslip.io"
curl.exe -s -o NUL -w "%{http_code}`n" -X PUT "$U/api/config"          # 401: sin token
curl.exe -s -o NUL -w "%{http_code}`n" "$U/api/tcg/api/users"          # 404: fuera de la lista blanca
curl.exe -sI "$U/catalogo" | Select-String "strict-transport|content-security|x-frame"   # cabeceras presentes
Test-NetConnection 3.218.125.149 -Port 3306                            # TcpTestSucceeded : False
```

- [ ] `admin@holomarket.cl` / `Admin1234` no funciona (se reemplazó por `ADMIN_PASSWORD`).

## Por qué Caddy y no CloudFront

El Learner Lab **no permite CloudFront** (`cloudfront:CreateDistribution` está bloqueado). Caddy, en
la misma EC2, cumple ese papel:

| Ruta | Caddy la envía a |
|---|---|
| `/api/*` | Contenedor `api` (Spring Boot, red interna) |
| Todo lo demás | Sitio estático del bucket S3 (`FRONT_S3_HOST`); las rutas de React reciben `index.html` con 200 |
| `http://3.218.125.149/...` | Contenedor `api` (compatibilidad con pruebas por IP) |

Además agrega a todas las respuestas `Strict-Transport-Security`, `Content-Security-Policy`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`, y oculta la
cabecera `Server` (ver [`backend/Caddyfile`](backend/Caddyfile)). El certificado queda en el volumen
`caddy_data` y Caddy lo renueva solo.

## Día a día

- **Nueva sesión del lab:** Start Lab; la EC2 y los contenedores arrancan solos (`restart: unless-stopped`).
  Espera 1-2 minutos. Una sesión dura unas 4 horas: presiona **Start Lab** de nuevo antes de que termine
  para reiniciar el contador. Con el lab apagado, el sitio no responde.
- **Actualizar el backend o Caddy:** `git push` en tu PC; en la EC2:

  ```bash
  cd ~/holomarket-react/backend && git pull
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate api caddy
  ```

- **Actualizar el front:** `npm run build`, borra los objetos del bucket y sube de nuevo `dist/`.
- **Cambiar un secreto, la clave de API TCG o el CORS:** edita `.env.prod` y ejecuta
  `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`.

## Problemas comunes

| Síntoma | Solución |
|---|---|
| “Sin conexión con la API” en el sitio | Abre `https://DOMINIO/api/estado`. Si no responde: ¿está iniciado el lab? `docker ps` en la EC2 |
| El sitio da 502 | Caddy no llega al bucket o a la api: revisa `FRONT_S3_HOST` y `logs api` |
| Sin candado / error de certificado | `logs caddy`; el puerto 80 y el 443 deben estar abiertos (Let's Encrypt valida por el 80) |
| Error de CORS en F12 | `CORS_ORIGINS` debe incluir exactamente el origen (https, sin `/` final) |
| S3 da 403 | Falta desmarcar el bloqueo público o la política tiene otro nombre de bucket |
| El contenedor `api` dice `Restarting` | `logs api` y revisa el swap con `free -h` |
| `permission denied` con docker | Sal con `exit` y vuelve a entrar por SSH |
| SSH: Connection timed out | Inicia el lab; si tu IP cambió, actualiza la regla del puerto 22 con **Mi IP** |
| Las cartas se ven dibujadas | Falta `APITCG_KEY` en `.env.prod` (el resto funciona igual) |
| El celular muestra la versión anterior | Recarga la página o ábrela en incógnito |
