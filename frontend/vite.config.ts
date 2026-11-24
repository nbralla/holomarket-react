/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // loadEnv lee .env, .env.local, etc. Con el prefijo '' también lee APITCG_KEY, que NO
  // empieza con VITE_: por eso Vite nunca la copia al código que llega al navegador.
  const env = loadEnv(mode, '.', '')
  const claveApi = (env.APITCG_KEY ?? '').trim()

  // Las imágenes de API TCG solo se activan con "npm run dev" y una clave en .env.local.
  const imagenesActivas = command === 'serve' && claveApi !== ''

  return {
    plugins: [react()],

    // Vitest prueba la lógica (*.test.ts). Los componentes se prueban con Karma + Jasmine (*.spec.tsx).
    test: {
      include: ['src/**/*.test.ts'],
      // npm run test:logica:cobertura → reporte en coverage-logica/ (la cobertura de componentes la mide Karma en coverage/)
      coverage: {
        provider: 'v8',
        reportsDirectory: 'coverage-logica',
        include: ['src/logica/**', 'src/utils/**', 'src/services/**'],
        exclude: ['**/*.test.ts', '**/*.spec.tsx'],
        reporter: ['text-summary', 'html', 'json-summary'],
      },
    },

    // Constante que el código de src/ puede leer (ver src/vite-env.d.ts).
    define: {
      __IMAGENES_API__: JSON.stringify(imagenesActivas),
    },

    server: {
      port: 5173,          // puerto de la app
      strictPort: true,    // si el puerto está ocupado, avisa en vez de cambiarlo solo
      proxy: {
        // Todo lo que React pida a /api/... Vite lo reenvía a json-server (npm run api).
        // Con la barra final: así /apitcg/... (las imágenes) no entra por aquí.
        '/api/': {
          // 127.0.0.1 y no "localhost": en Windows "localhost" a veces apunta a IPv6 (::1)
          // y json-server escucha en IPv4, entonces no se encuentran (error ECONNREFUSED)
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          // json-server no conoce el prefijo /api: /api/publicaciones -> /publicaciones
          rewrite: (ruta) => ruta.replace(/^\/api/, ''),
        },

        // El navegador llama a /apitcg/... y el servidor de Vite reenvía la consulta a
        // https://api.apitcg.com agregando la cabecera x-api-key. Así la clave queda en tu
        // computador y no hay bloqueo de CORS.
        ...(imagenesActivas
          ? {
              '/apitcg': {
                target: 'https://api.apitcg.com',
                changeOrigin: true,
                rewrite: (ruta: string) => ruta.replace(/^\/apitcg/, ''),
                headers: { 'x-api-key': claveApi },
              },
            }
          : {}),
      },
    },
  }
})
