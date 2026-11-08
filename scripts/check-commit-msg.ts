/**
 * commit-msg hook: enforces Conventional Commits (`type(scope)!: subject`).
 * Usage: bun scripts/check-commit-msg.ts <path to the commit message file>
 */
import { argv, exit, stderr } from 'node:process';

const TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
] as const;

const HEADER = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: \\S.*$`);
const MERGE_PREFIX = 'Merge ';

const path = argv[2];
if (path === undefined) {
  stderr.write('check-commit-msg: missing commit message file argument\n');
  exit(1);
}

const message = await Bun.file(path).text();
const header = message.split('\n')[0] ?? '';

if (!HEADER.test(header) && !header.startsWith(MERGE_PREFIX)) {
  stderr.write(
    `Commit message must follow Conventional Commits, for example "feat(core): add timer service".\n` +
      `Allowed types: ${TYPES.join(', ')}.\nGot: "${header}"\n`,
  );
  exit(1);
}
