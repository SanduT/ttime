import js from '@eslint/js';
import { recommended as eslintCommentsRecommended } from '@eslint-community/eslint-plugin-eslint-comments/configs';
import eslintReact from '@eslint-react/eslint-plugin';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import boundaries from 'eslint-plugin-boundaries';
import { importX } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicorn from 'eslint-plugin-unicorn';
import { configs as tsConfigs } from 'typescript-eslint';

import { boundaryElements, boundaryPolicies } from './eslint/boundaries';
import {
  cliImportBans,
  coreGlobalBans,
  coreImportBans,
  coreTestImportBans,
  desktopBridgeImportBans,
  desktopImportBans,
  jsonParseBan,
  mathRandomBan,
  restrictedSyntax,
} from './eslint/restrictions';

const CORE_SRC = ['packages/core/src/**/*.ts'];
const DESKTOP_SRC = ['apps/desktop/src/**/*.ts', 'apps/desktop/src/**/*.tsx'];

const restrictImports = (patterns: readonly object[]): Linter.RulesRecord => ({
  '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
});

const namingConvention: Linter.RuleEntry = [
  'error',
  { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
  { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
  { selector: 'function', format: ['camelCase', 'PascalCase'] },
  { selector: 'typeLike', format: ['PascalCase'] },
  { selector: ['objectLiteralProperty', 'objectLiteralMethod'], format: null },
  { selector: 'typeProperty', format: ['camelCase'] },
  { selector: 'import', format: null },
];

const typeSafetyRules: Linter.RulesRecord = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/ban-ts-comment': [
    'error',
    { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true },
  ],
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/strict-boolean-expressions': 'error',
  '@typescript-eslint/return-await': ['error', 'in-try-catch'],
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
  '@typescript-eslint/prefer-readonly': 'error',
  '@typescript-eslint/naming-convention': namingConvention,
};

const hygieneRules: Linter.RulesRecord = {
  '@eslint-community/eslint-comments/require-description': 'error',
  '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
  '@eslint-community/eslint-comments/no-unused-disable': 'error',
  'import-x/no-default-export': 'error',
  'import-x/no-cycle': 'error',
  'import-x/no-duplicates': 'error',
  'import-x/no-extraneous-dependencies': 'error',
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'unicorn/filename-case': ['error', { case: 'kebabCase' }],
  'unicorn/prefer-node-protocol': 'error',
  'unicorn/throw-new-error': 'error',
  'unicorn/no-useless-undefined': 'error',
  'no-restricted-syntax': ['error', ...restrictedSyntax],
  'no-restricted-properties': ['error', jsonParseBan],
  'no-console': 'error',
  'no-empty': 'error',
  eqeqeq: 'error',
  'no-param-reassign': ['error', { props: true }],
  'prefer-const': 'error',
  'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
  complexity: ['warn', 12],
};

export default defineConfig(
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '.tsbuild/**',
    'apps/desktop/src-tauri/**',
    'apps/desktop/src/shared/bridge/bindings.ts',
  ]),

  // Base for all TypeScript.
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      js.configs.recommended,
      tsConfigs.strictTypeChecked,
      tsConfigs.stylisticTypeChecked,
      eslintCommentsRecommended,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'simple-import-sort': simpleImportSort, unicorn, boundaries },
    settings: {
      'import-x/resolver': { typescript: { alwaysTryTypes: true } },
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/include': ['packages/*/src/**/*', 'apps/desktop/src/**/*'],
      'boundaries/elements': boundaryElements,
    },
    rules: {
      ...typeSafetyRules,
      ...hygieneRules,
      'boundaries/dependencies': ['error', { default: 'disallow', policies: boundaryPolicies }],
    },
  },

  // Core and CLI: explicit public types.
  {
    files: [...CORE_SRC, 'packages/cli/src/**/*.ts'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
  },

  // Core: pure TypeScript, no platform APIs. Tests may add bun:test only.
  {
    files: CORE_SRC,
    rules: {
      ...restrictImports(coreImportBans),
      'no-restricted-globals': ['error', ...coreGlobalBans],
      'no-restricted-properties': ['error', jsonParseBan, mathRandomBan],
    },
  },
  { files: ['packages/core/src/**/*.test.ts'], rules: restrictImports(coreTestImportBans) },

  // CLI: no Tauri, no React. Only the output module and the logger write to the console.
  { files: ['packages/cli/**/*.ts'], rules: restrictImports(cliImportBans) },
  {
    files: ['packages/cli/src/runtime/output.ts', 'packages/cli/src/runtime/logger.ts'],
    rules: { 'no-console': 'off' },
  },

  // Desktop: React, accessibility, and Tauri only behind the bridge and adapters.
  {
    files: DESKTOP_SRC,
    extends: [
      reactHooks.configs.flat['recommended-latest'],
      eslintReact.configs['recommended-type-checked'],
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite(),
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      ...restrictImports(desktopImportBans),
    },
  },
  {
    files: ['apps/desktop/src/shared/bridge/**', 'apps/desktop/src/shared/adapters/**'],
    rules: restrictImports(desktopBridgeImportBans),
  },

  // Tests may import dev dependencies.
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**/*.ts'],
    rules: { 'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }] },
  },

  // Config files and ambient declarations need default exports.
  {
    files: ['*.config.ts', 'apps/desktop/vite.config.ts', 'types/**/*.d.ts'],
    rules: { 'import-x/no-default-export': 'off' },
  },
);
