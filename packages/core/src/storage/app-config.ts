import { z } from 'zod';

import { TTimeError } from '../lib/errors';
import { stringifyStable, tryParseJson } from '../lib/json';
import { joinPath } from '../lib/path';
import type { EnvPort } from '../ports/env-port';
import type { FsPort } from '../ports/fs-port';

/**
 * `<configDir>/config.json`: which vault the app, CLI and MCP server use. Not part of the
 * vault. Unknown keys are kept when the app rewrites it.
 */
export const appConfigSchema = z.looseObject({
  vault: z.string().min(1).optional(),
});

/** The app config file. */
export type AppConfig = z.infer<typeof appConfigSchema>;

/** Absolute path of the config file. */
export const appConfigPath = (env: EnvPort): string => joinPath(env.configDir, 'config.json');

/**
 * Reads the config file. Missing gives null; a file that is not valid JSON or has a wrong
 * shape throws `config.parse_failed`, so it is never silently replaced.
 */
export const readAppConfig = async (fs: FsPort, env: EnvPort): Promise<AppConfig | null> => {
  const path = appConfigPath(env);
  const text = await fs.readText(path);
  if (text === null) {
    return null;
  }
  const json = tryParseJson(text);
  const parsed = json.ok ? appConfigSchema.safeParse(json.value) : null;
  if (parsed?.success !== true) {
    const reason = json.ok ? (parsed?.error.issues[0]?.message ?? 'invalid') : json.message;
    throw new TTimeError('config.parse_failed', `${path} is invalid: ${reason}`, {
      details: { file: path },
    });
  }
  return parsed.data;
};

/** Saves `vault` as the vault to use, keeping every other key of the existing file. */
export const writeAppConfig = async (
  fs: FsPort,
  env: EnvPort,
  change: { readonly vault: string },
): Promise<AppConfig> => {
  const current = (await readAppConfig(fs, env)) ?? {};
  const next = appConfigSchema.parse({ ...current, vault: change.vault });
  await fs.mkdirp(env.configDir);
  await fs.writeAtomic(appConfigPath(env), stringifyStable(next));
  return next;
};
