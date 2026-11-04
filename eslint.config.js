import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist', 'coverage', 'coverage-logica']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Pruebas de Karma + Jasmine: usan los globales de Jasmine y no participan de la recarga en caliente.
    files: ['src/**/*.spec.tsx', 'src/pruebas/**'],
    languageOptions: { globals: globals.jasmine },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Configuración de Karma (Node, CommonJS).
    files: ['karma.conf.cjs'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
])
