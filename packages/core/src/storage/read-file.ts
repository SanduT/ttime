import type { z } from 'zod';

import { SCHEMA_VERSION } from '../lib/constants';
import { tryParseJson } from '../lib/json';
import type { FsPort } from '../ports/fs-port';
import type { VaultIssue } from './issues';

/** The outcome of reading one vault file. */
export type FileRead<T> =
  | { readonly status: 'missing' }
  | { readonly status: 'ok'; readonly value: T }
  | { readonly status: 'invalid'; readonly issues: readonly VaultIssue[] };

const MAX_SCHEMA_ISSUES = 5;

const declaredSchemaVersion = (value: unknown): number | null => {
  if (typeof value !== 'object' || value === null || !('schema' in value)) {
    return null;
  }
  return typeof value.schema === 'number' ? value.schema : null;
};

/**
 * Reads, parses and validates one vault file. Never throws for bad content: broken JSON, a newer
 * schema version and schema violations come back as issues.
 */
export const readVaultFile = async <S extends z.ZodType>(
  fs: FsPort,
  path: string,
  relativePath: string,
  schema: S,
): Promise<FileRead<z.output<S>>> => {
  const text = await fs.readText(path);
  if (text === null) {
    return { status: 'missing' };
  }
  const issue = (code: VaultIssue['code'], message: string, at: VaultIssue['path'] = []) => ({
    code,
    severity: 'error' as const,
    file: relativePath,
    path: at,
    message,
  });
  const json = tryParseJson(text);
  if (!json.ok) {
    return { status: 'invalid', issues: [issue('file.invalid_json', json.message)] };
  }
  const version = declaredSchemaVersion(json.value);
  if (version !== null && version > SCHEMA_VERSION) {
    const message = `Schema ${String(version)} is newer than this app supports (${String(SCHEMA_VERSION)})`;
    return { status: 'invalid', issues: [issue('file.newer_schema', message, ['schema'])] };
  }
  const parsed = schema.safeParse(json.value);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, MAX_SCHEMA_ISSUES).map((zodIssue) =>
      issue(
        'file.invalid_schema',
        zodIssue.message,
        zodIssue.path.map((key) => (typeof key === 'number' ? key : String(key))),
      ),
    );
    return { status: 'invalid', issues };
  }
  return { status: 'ok', value: parsed.data };
};
