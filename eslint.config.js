// Max-strict flat config. Every plugin starts at its strictest preset;
// an individual rule is relaxed ONLY with a real false-positive in hand.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';
import promise from 'eslint-plugin-promise';
import * as regexp from 'eslint-plugin-regexp';
import n from 'eslint-plugin-n';
import vitest from '@vitest/eslint-plugin';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.dependency-cruiser.cjs',
      '**/*.config.*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  unicorn.configs.recommended,
  sonarjs.configs.recommended,
  security.configs.recommended,
  promise.configs['flat/recommended'],
  regexp.configs['flat/recommended'],
  n.configs['flat/recommended-module'],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'unused-imports/no-unused-imports': 'error',
    },
  },
  {
    ...vitest.configs.recommended,
    files: ['tests/**/*.ts'],
  },
  {
    files: ['tests/**/*.ts'],
    plugins: { 'no-only-tests': noOnlyTests },
    rules: {
      'no-only-tests/no-only-tests': 'error',
    },
  },
  prettier,
);
