// Max-strict flat config. Every plugin starts at its strictest preset;
// an individual rule is relaxed ONLY with a real false-positive in hand.
import { createRequire } from 'node:module';
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

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'reports/**',
      '.stryker-tmp/**',
      'scripts/**',
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
  // Web pack (accessibility) — active only when eslint-plugin-jsx-a11y is installed.
  ...optionalPack('eslint-plugin-jsx-a11y', (a11y) => ({
    files: ['**/*.{jsx,tsx}'],
    ...a11y.flatConfigs.recommended,
  })),
  prettier,
);
