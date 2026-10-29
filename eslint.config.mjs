import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.context/**',
      'docs/.vitepress/dist/**',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/miragon/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      curly: ['error', 'all'],

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'id-length': [
        'error',
        {
          min: 3,
          properties: 'never',
          exceptions: ['el', 'id', 'is', 'x', 'y', 'fs', 'os'],
        },
      ],
      'id-denylist': [
        'error',
        'data',
        'info',
        'item',
        'obj',
        'res',
        'ret',
        'temp',
        'tmp',
        'val',
        'foo',
        'bar',
      ],
    },
  },
  {
    // Classes first: behaviour lives in classes, pure helpers in a `utils/` folder.
    files: ['src/**/*.ts'],
    ignores: ['**/utils/**'],
    rules: {
      'max-classes-per-file': ['error', 1],
      'no-restricted-syntax': [
        'error',
        ...[
          'Program > FunctionDeclaration',
          'Program > ExportNamedDeclaration > FunctionDeclaration',
          'Program > ExportDefaultDeclaration > FunctionDeclaration',
          'Program > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)',
          'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)',
        ].map((selector) => ({
          selector,
          message:
            'Top-level functions belong in a class, or in a utils/ module when they are pure helpers.',
        })),
      ],
    },
  },
  {
    files: ['test/**/*.spec.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    // Plain CommonJS: the distro smoke test and the dependency-cruiser config.
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
