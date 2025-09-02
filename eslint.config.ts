import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { FlatCompat } from '@eslint/eslintrc';
import importX from 'eslint-plugin-import-x';
import js from '@eslint/js';
import style from '@stylistic/eslint-plugin';
import ts from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default ts.config(
  {
    ignores: ['dist/**/*', 'node_modules/**/*'],
  },
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  style.configs.customize({
    arrowParens: true,
    semi: true,
    flat: true,
  }),
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    settings: {
      'import-x/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      'import-x/no-named-as-default-member': ['off'],
      'import-x/no-unresolved': ['error', { ignore: ['\\.css$'] }],
      'import-x/order': [
        'warn',
        {
          'groups': [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'unknown',
            'type',
          ],
          'newlines-between': 'always',
        },
      ],
      "sort-imports": ["error", { "ignoreDeclarationSort": true }],
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);