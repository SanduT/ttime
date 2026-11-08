import { TTimeError } from './errors';

/** Outcome of {@link tryParseJson}. */
export type JsonParseResult =
  { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly message: string };

/** Parses JSON without throwing. The value is `unknown` until a schema parses it. */
export const tryParseJson = (text: string): JsonParseResult => {
  try {
    // eslint-disable-next-line no-restricted-properties -- parseJson is the wrapper the ban points to
    const value: unknown = JSON.parse(text);
    return { ok: true, value };
  } catch (error: unknown) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
};

/** Parses JSON or throws `input.invalid`. The value is `unknown` until a schema parses it. */
export const parseJson = (text: string): unknown => {
  const result = tryParseJson(text);
  if (!result.ok) {
    throw new TTimeError('input.invalid', `Invalid JSON: ${result.message}`);
  }
  return result.value;
};

const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (isPlainObject(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      if (child !== undefined) {
        sorted[key] = sortKeys(child);
      }
    }
    return sorted;
  }
  return value;
};

/** Vault file formatting: sorted keys, 2-space indent, trailing newline. Keeps git diffs small. */
export const stringifyStable = (value: unknown): string =>
  `${JSON.stringify(sortKeys(value), null, 2)}\n`;

/** One changelog line: sorted keys, no whitespace, no newline. */
export const stringifyLine = (value: unknown): string => JSON.stringify(sortKeys(value));
