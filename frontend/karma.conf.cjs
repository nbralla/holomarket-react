/* =========================================================================
   Karma + Jasmine: pruebas unitarias de los componentes React
   -------------------------------------------------------------------------
   npm run test:componentes          → ejecuta las pruebas una vez en Chrome sin ventana
   npm run test:componentes:ver      → abre Chrome y vuelve a ejecutar al guardar

   - Jasmine es el framework de pruebas (describe, it, expect, spyOn...).
   - Karma abre un navegador real (Chrome) y ejecuta ahí las pruebas.
   - karma-esbuild compila TypeScript y JSX de los archivos *.spec.tsx.
   - esbuild-plugin-istanbul instrumenta el código de src/ para medir la cobertura.
   - karma-coverage escribe el reporte en coverage/ (abrir coverage/html/index.html).
   ========================================================================= */
const fs = require('fs');
const esbuild = require('esbuild');
const { esbuildPluginIstanbul } = require('esbuild-plugin-istanbul');

// Solo se mide la cobertura del código de la app: ni las pruebas, ni la ayuda de pruebas, ni node_modules.
// El filtro de esbuild usa expresiones regulares de Go (sin "lookahead"), por eso lo excluido se revisa aquí.
const EXCLUIDO = /node_modules|[\\/]pruebas[\\/]|\.(spec|test)\.tsx?$/;

// Istanbul no entiende TypeScript ni JSX: primero esbuild los pasa a JavaScript (con mapa de origen,
// para que el reporte muestre las líneas del .tsx original) y después Istanbul instrumenta ese JavaScript.
async function aJavaScript(args) {
  const codigo = await fs.promises.readFile(args.path, 'utf8');
  const r = await esbuild.transform(codigo, {
    loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts', jsx: 'automatic', sourcemap: 'inline', sourcefile: args.path,
  });
  return { contents: r.code };
}

function soloCodigoApp(plugin) {
  return {
    name: plugin.name,
    // El setup del plugin es asíncrono: hay que devolver su promesa para que esbuild lo espere.
    setup(build) {
      return plugin.setup({
        ...build,
        onLoad: (opciones, cargar) => build.onLoad(opciones, (args) => (EXCLUIDO.test(args.path) ? undefined : cargar(args))),
      });
    },
  };
}

module.exports = (config) => {
  config.set({
    frameworks: ['jasmine'],

    files: [{ pattern: 'src/**/*.spec.tsx', watched: false }],
    preprocessors: { 'src/**/*.spec.tsx': ['esbuild'] },

    esbuild: {
      target: 'es2022',
      jsx: 'automatic',
      sourcemap: true,
      // Lo mismo que define vite.config.ts: en las pruebas no se piden imágenes a la API real.
      define: { __IMAGENES_API__: 'false', 'process.env.NODE_ENV': '"test"' },
      plugins: [
        soloCodigoApp(esbuildPluginIstanbul({ filter: /[\\/]src[\\/].*\.tsx?$/, loader: 'js', name: 'istanbul', preloader: aJavaScript })),
      ],
    },

    reporters: ['progress', 'coverage'],
    coverageReporter: {
      dir: 'coverage',
      reporters: [
        { type: 'html', subdir: 'html' },
        { type: 'text-summary' },
        { type: 'json-summary', subdir: '.', file: 'resumen.json' },
        { type: 'lcovonly', subdir: '.', file: 'lcov.info' },
      ],
    },
    // Cada ejecución en un documento limpio: así las búsquedas de Testing Library solo ven los componentes.
    client: { jasmine: { random: false }, clearContext: true },

    browsers: ['ChromeHeadless'],
    singleRun: true,
  });
};
