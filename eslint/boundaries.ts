/**
 * Layer rules from docs/CONVENTIONS.md section 6, enforced with eslint-plugin-boundaries.
 * Arrows point to what a layer may import.
 */

const CORE_LAYERS = ['core-lib', 'core-schema', 'core-ports', 'core-storage', 'core-domain'];

export const boundaryElements = [
  { type: 'core-lib', pattern: 'packages/core/src/lib' },
  { type: 'core-schema', pattern: 'packages/core/src/schema' },
  { type: 'core-ports', pattern: 'packages/core/src/ports' },
  { type: 'core-storage', pattern: 'packages/core/src/storage' },
  { type: 'core-domain', pattern: 'packages/core/src/domain' },
  { type: 'core-testing', pattern: 'packages/core/src/testing' },
  { type: 'cli-runtime', pattern: 'packages/cli/src/runtime' },
  { type: 'cli-commands', pattern: 'packages/cli/src/commands' },
  { type: 'cli-presenters', pattern: 'packages/cli/src/presenters' },
  { type: 'cli-mcp', pattern: 'packages/cli/src/mcp' },
  { type: 'cli-adapters', pattern: 'packages/cli/src/adapters' },
  { type: 'desktop-window', pattern: 'apps/desktop/src/windows/*' },
  { type: 'desktop-feature', pattern: 'apps/desktop/src/features/*' },
  { type: 'desktop-shared', pattern: 'apps/desktop/src/shared' },
  { type: 'desktop-dev', pattern: 'apps/desktop/src/dev' },
  // Matched last, so only files directly in src (the public index.ts and the CLI entry).
  { type: 'core-api', pattern: 'packages/core/src' },
  { type: 'cli-entry', pattern: 'packages/cli/src' },
];

const allow = (from: string | readonly string[], to: readonly string[]) => ({
  from: { element: { types: typeof from === 'string' ? [from] : from } },
  allow: { to: { element: { types: to } } },
});

export const boundaryPolicies = [
  { allow: { to: { origin: ['external', 'core'] } } },
  // packages/core: schema <- ports <- storage <- domain <- index.ts
  allow('core-lib', ['core-lib']),
  allow('core-schema', ['core-lib', 'core-schema']),
  allow('core-ports', ['core-lib', 'core-schema', 'core-ports']),
  allow('core-storage', ['core-lib', 'core-schema', 'core-ports', 'core-storage']),
  allow(['core-domain', 'core-testing'], [...CORE_LAYERS, 'core-testing']),
  allow('core-api', [...CORE_LAYERS, 'core-testing']),
  // packages/cli: other packages import only @ttime/core.
  allow('cli-entry', [
    'core-api',
    'cli-runtime',
    'cli-commands',
    'cli-presenters',
    'cli-mcp',
    'cli-adapters',
  ]),
  allow(['cli-commands', 'cli-mcp'], ['core-api', 'cli-runtime', 'cli-commands', 'cli-mcp']),
  allow('cli-runtime', ['core-api', 'cli-runtime', 'cli-adapters']),
  allow('cli-presenters', ['cli-presenters']),
  allow('cli-adapters', ['core-api', 'cli-adapters']),
  // apps/desktop: windows -> features -> shared -> @ttime/core
  allow('desktop-window', ['desktop-window', 'desktop-feature', 'desktop-shared']),
  allow('desktop-feature', ['desktop-feature', 'desktop-shared', 'core-api']),
  allow('desktop-shared', ['desktop-shared', 'core-api']),
  allow('desktop-dev', ['desktop-dev', 'desktop-shared', 'core-api']),
];
