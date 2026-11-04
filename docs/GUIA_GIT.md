# Guía paso a paso: subir HoloMarket a GitHub

Esta guía parte desde la carpeta `holomarket-react` descomprimida y termina con el proyecto en un
repositorio de GitHub, con un historial de commits ordenado.

Los comandos funcionan igual en la terminal de VS Code (PowerShell), Git Bash, macOS y Linux.
Escribe los comandos **dentro de la carpeta del proyecto** (donde está `package.json`).

---

## Paso 0. Revisar las herramientas

```bash
node -v     # 20.19 o superior (o 22.12+)
npm -v
git --version
```

Si `git` no existe, instálalo desde https://git-scm.com y vuelve a abrir VS Code.
Necesitas una cuenta en https://github.com.

## Paso 1. Abrir el proyecto y probarlo

1. Descomprime `holomarket-react.zip`.
2. En VS Code: **Archivo › Abrir carpeta…** y elige `holomarket-react`.
3. Abre la terminal: **Terminal › Nueva terminal** (o `Ctrl + ñ`).

```bash
npm install
```

Como en el ejemplo de la Pokédex, se necesitan **dos terminales** (en VS Code, el botón **+** de la terminal):

```bash
# Terminal 1: la API (json-server con db.json) -> http://127.0.0.1:3000
npm run api
```

```bash
# Terminal 2: la app (Vite) -> http://localhost:5173
npm run dev
```

Abre http://localhost:5173 y revisa que la tienda funcione. Detén cada servidor con `Ctrl + C`.

Antes del primer commit, comprueba que todo compila y que las pruebas pasan:

```bash
npm run build
npm run test
```

> `npm install` crea dos cosas: la carpeta `node_modules/` (**no** se sube, está en `.gitignore`)
> y el archivo `package-lock.json` (**sí** se sube: fija las versiones exactas de las dependencias).

## Paso 2. Configurar tu identidad en Git (solo la primera vez en el computador)

```bash
git config --global user.name "Tu Nombre Apellido"
git config --global user.email "tu-correo@duocuc.cl"
git config --global init.defaultBranch main
```

Usa el mismo correo de tu cuenta de GitHub para que los commits queden asociados a tu perfil.
Revisa con `git config --global --list`.

## Paso 3. Crear el repositorio local

```bash
git init
git status
```

`git status` muestra los archivos “sin seguimiento” (en rojo). **Revisa que no aparezcan**
`node_modules/`, `dist/` ni `.env.local`: el archivo `.gitignore` los excluye.

Para confirmarlo:

```bash
git check-ignore -v node_modules .env.local
```

Si responde con la línea de `.gitignore` que los ignora, todo está bien.

## Paso 4. Hacer los commits por etapas

En vez de un solo commit con todo, sube el proyecto en etapas: así el historial cuenta cómo se
construyó y el docente puede revisarlo por partes. Los mensajes siguen el formato
*Conventional Commits* (`tipo: descripción`), como en el manual:

| Tipo | Se usa para |
|---|---|
| `chore:` | Configuración, dependencias, tareas que no cambian la funcionalidad |
| `feat:` | Funcionalidad nueva |
| `fix:` | Corrección de un error |
| `style:` | Estilos o formato |
| `test:` | Pruebas |
| `docs:` | Documentación |
| `refactor:` | Reorganizar código sin cambiar lo que hace |

Ejecuta cada bloque y revisa con `git status` antes de seguir.

**4.1 Proyecto base (lo que crea Vite)**

```bash
git add package.json package-lock.json index.html vite.config.ts eslint.config.js tsconfig.json tsconfig.app.json tsconfig.node.json .gitignore .env.example public .vscode
git commit -m "chore: proyecto inicial React + TS con Vite"
```

**4.2 Tipos, datos y utilidades**

```bash
git add src/types src/data src/utils src/vite-env.d.ts
git commit -m "feat: tipos, datos de demostración y validaciones (RUT, Luhn, SHA-256)"
```

**4.3 Servicios y lógica de negocio**

```bash
git add src/services src/logica
git commit -m "feat: servicios de localStorage, sesión y API TCG, y lógica de stock, compras y retiros"
```

**4.4 Estado global, hooks y componentes**

```bash
git add src/context src/hooks src/components
git commit -m "feat: Context API, hooks personalizados y componentes reutilizables"
```

**4.5 Páginas, rutas y estilos**

```bash
git add src/pages src/App.tsx src/main.tsx src/index.css
git commit -m "feat: páginas de catálogo, compra, venta, inventario, pedidos, retiros y administración"
```

**4.6 Documentación y publicación automática**

```bash
git add README.md docs .github
git commit -m "docs: README, guía de Git y arquitectura"
```

Comprueba que no quedó nada pendiente y revisa el historial:

```bash
git status            # debe decir "nothing to commit, working tree clean"
git log --oneline     # 6 commits, del más nuevo al más antiguo
```

> ¿Te equivocaste en el mensaje del **último** commit? `git commit --amend -m "mensaje corregido"`
> (solo antes de hacer `git push`).

## Paso 5. Crear el repositorio en GitHub

1. Entra a https://github.com/new.
2. **Repository name:** `holomarket-react`.
3. Elige **Public** (o Private si el docente lo pide; en ese caso agrégalo como colaborador en *Settings › Collaborators*).
4. **No marques** “Add a README file”, “.gitignore” ni “license”: el proyecto ya los tiene.
   Si los marcas, el primer `git push` será rechazado (ver Problemas frecuentes).
5. Pulsa **Create repository** y copia la URL HTTPS, por ejemplo `https://github.com/tu-usuario/holomarket-react.git`.

## Paso 6. Conectar y subir

```bash
git remote add origin https://github.com/tu-usuario/holomarket-react.git
git remote -v
git push -u origin main
```

- La primera vez se abre una ventana para iniciar sesión en GitHub (Git Credential Manager). Acepta.
- Si te pide usuario y contraseña en la terminal, la “contraseña” es un **token**: créalo en
  *GitHub › Settings › Developer settings › Personal access tokens › Tokens (classic)* con el permiso `repo`.
- `-u` deja asociada la rama: desde ahora basta con `git push`.

Recarga la página del repositorio: deberías ver los archivos, el README y los 6 commits.
**Revisa que no estén `node_modules/` ni `.env.local`.**

## Paso 7. Sobre publicar en GitHub Pages

Esta versión **no** se publica en GitHub Pages: la tienda necesita su API (json-server) corriendo,
y GitHub Pages solo sirve archivos estáticos. Para mostrarla, ejecuta `npm run api` y `npm run dev`
en tu computador, igual que en el ejemplo de la Pokédex.

## Paso 8. Trabajar con ramas (para los cambios siguientes)

Para cada mejora, crea una rama, haz tus commits y únela a `main` con un *Pull Request*:

```bash
git switch -c feature/filtro-por-edicion     # crea la rama y se cambia a ella
# ... editas archivos ...
npm run build && npm run test                # revisa antes de confirmar
git add .
git commit -m "feat: filtro por edición en el catálogo"
git push -u origin feature/filtro-por-edicion
```

En GitHub aparece **Compare & pull request**: créalo, revísalo y pulsa **Merge pull request**.
Después, en tu computador:

```bash
git switch main
git pull
git branch -d feature/filtro-por-edicion
```

Si trabajas en grupo, cada integrante hace `git clone https://github.com/tu-usuario/holomarket-react.git`,
luego `npm install`, y siempre `git pull` antes de empezar a trabajar.

## Paso 9. Usar tu clave de API TCG sin subirla

```bash
# PowerShell
Copy-Item .env.example .env.local
# Git Bash, macOS o Linux
cp .env.example .env.local
```

Edita `.env.local` (`APITCG_KEY=tu-clave`), guarda y vuelve a ejecutar `npm run dev`.
Comprueba que Git lo ignora: `git status` **no** debe mostrar `.env.local`.

> Si alguna vez subiste una clave por error, **regenérala** en apitcg.com: borrarla del repositorio
> no basta, porque queda en el historial.

## Resumen de comandos

| Comando | Para qué |
|---|---|
| `git init` | Crea el repositorio local |
| `git status` | Muestra qué cambió y qué está preparado |
| `git add <archivos>` / `git add .` | Prepara archivos para el commit |
| `git commit -m "tipo: mensaje"` | Guarda una versión |
| `git log --oneline` | Muestra el historial |
| `git diff` | Muestra los cambios aún no preparados |
| `git remote add origin <url>` | Conecta con GitHub |
| `git push -u origin main` | Sube la rama main (la primera vez) |
| `git push` / `git pull` | Sube / descarga cambios |
| `git switch -c <rama>` | Crea una rama y se cambia a ella |
| `git switch main` | Vuelve a main |
| `git restore <archivo>` | Descarta cambios no confirmados de un archivo |
| `git clone <url>` | Descarga un repositorio existente |

## Problemas frecuentes

| Mensaje | Solución |
|---|---|
| `fatal: not a git repository` | No estás en la carpeta del proyecto. Usa `cd holomarket-react` |
| `Author identity unknown` | Falta el Paso 2 (`git config --global user.name` y `user.email`) |
| `error: remote origin already exists` | `git remote set-url origin <url-correcta>` |
| `! [rejected] main -> main (fetch first)` | Creaste el repositorio con README. Ejecuta `git pull origin main --allow-unrelated-histories`, guarda el mensaje del merge y repite `git push` |
| `src refspec main does not match any` | Aún no hay commits o la rama se llama `master`: haz el Paso 4 o ejecuta `git branch -M main` |
| `Permission denied` / `Authentication failed` | Inicia sesión de nuevo o usa un token como contraseña (Paso 6) |
| Subiste `node_modules` por error | `git rm -r --cached node_modules`, luego `git commit -m "chore: quitar node_modules"` y `git push` |
| Avisos `LF will be replaced by CRLF` | Son normales en Windows; no afectan el proyecto |
| La página dice “Sin conexión con la API” | Falta la terminal con `npm run api`. Ábrela y pulsa **Reintentar** |
