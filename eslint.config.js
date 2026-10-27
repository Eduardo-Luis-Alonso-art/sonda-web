import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // Checagem com tipos: pega promise sem await, comparacao sempre falsa, etc.
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      // Em eslint-plugin-react-hooks 7.x os configs flat ficam sob `configs.flat`;
      // `configs['recommended-latest']` na raiz ainda e o formato legado (plugins como array).
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      // Por ultimo: desliga as regras de estilo que brigariam com o Prettier.
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
)
