// Max-strict flat config. Every plugin starts at its strictest preset;
// an individual rule is relaxed ONLY with a real false-positive in hand.
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import js from '@eslint/js';
import { createRequire } from 'node:module';
import globals from 'globals';
import n from 'eslint-plugin-n';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import prettier from 'eslint-config-prettier';
import promise from 'eslint-plugin-promise';
import * as regexp from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import vitest from '@vitest/eslint-plugin';

// Auto-arming packs: an ESLint-based pack activates the instant its plugin is
// installed — no config edit required. The required-gates check
// (scripts/check-required-gates.mjs) is what forces the install when the
// project's shape demands it. Install *is* wiring.
const require = createRequire(import.meta.url);
function optionalPack(spec, build) {
  try {
    const mod = require(spec);
    return [build(mod.default ?? mod)];
  } catch {
    return [];
  }
}

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];

function constrainToTs(configs) {
  return configs.map((config) => ({
    ...config,
    files: config.files ?? tsFiles,
  }));
}

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'reports/**',
      '.stryker-tmp/**',
      'node_modules/**',
      '.dependency-cruiser.cjs',
      '**/*.config.*',
    ],
  },
  comments.recommended,
  {
    rules: {
      '@eslint-community/eslint-comments/disable-enable-pair': 'error',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@eslint-community/eslint-comments/no-restricted-disable': ['error', '*'],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  ...constrainToTs([js.configs.recommended]),
  ...constrainToTs(tseslint.configs.strictTypeChecked),
  ...constrainToTs(tseslint.configs.stylisticTypeChecked),
  ...constrainToTs([unicorn.configs.recommended]),
  ...constrainToTs([sonarjs.configs.recommended]),
  ...constrainToTs([security.configs.recommended]),
  ...constrainToTs([promise.configs['flat/recommended']]),
  ...constrainToTs([regexp.configs['flat/recommended']]),
  ...constrainToTs([n.configs['flat/recommended-module']]),
  {
    files: tsFiles,
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
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': true,
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
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
  // Web pack (accessibility) — active only when eslint-plugin-jsx-a11y is installed.
  ...optionalPack('eslint-plugin-jsx-a11y', (a11y) => ({
    files: ['**/*.{jsx,tsx}'],
    ...a11y.flatConfigs.recommended,
  })),
  prettier,
);
