/** Restricted syntax, globals, properties and imports shared by the ESLint config. */

export const restrictedSyntax = [
  { selector: 'TSEnumDeclaration', message: 'Use a string literal union or an `as const` object.' },
  { selector: 'TSModuleDeclaration[kind="namespace"]', message: 'Use ES modules.' },
  { selector: 'ForInStatement', message: 'Use for...of over Object.entries/keys.' },
];

export const jsonParseBan = {
  object: 'JSON',
  property: 'parse',
  message: "Use core's parseJson, which returns unknown.",
};

export const mathRandomBan = {
  object: 'Math',
  property: 'random',
  message: 'Use the IdGenerator port.',
};

export const coreGlobalBans = [
  { name: 'Date', message: 'Use Temporal through the time helpers and ClockPort.' },
  { name: 'console', message: 'Use the Logger port.' },
  { name: 'process', message: 'Use EnvPort.' },
  { name: 'window', message: 'Core has no DOM.' },
  { name: 'document', message: 'Core has no DOM.' },
];

const pattern = (group: readonly string[], message: string) => ({ group, message });

const PLATFORM_FREE = 'Core is platform-free; use a port.';

export const coreImportBans = [
  pattern(['node:*', 'bun', 'bun:*', '@tauri-apps/*'], PLATFORM_FREE),
  pattern(['react', 'react-dom', 'react-dom/*'], 'Core has no UI.'),
];

export const coreTestImportBans = [
  pattern(['node:*', 'bun', '@tauri-apps/*'], 'Core tests stay platform-free; use MemoryFs.'),
  pattern(['react', 'react-dom', 'react-dom/*'], 'Core has no UI.'),
];

export const cliImportBans = [
  pattern(['@tauri-apps/*'], 'The CLI runs on Bun, not Tauri.'),
  pattern(['react', 'react-dom', 'react-dom/*'], 'The CLI has no React UI.'),
];

const NO_NODE = pattern(['node:*'], 'The webviews have no Node built-ins.');

export const desktopImportBans = [
  pattern(['@tauri-apps/*'], 'Only shared/bridge and shared/adapters talk to Tauri.'),
  NO_NODE,
];

export const desktopBridgeImportBans = [NO_NODE];
