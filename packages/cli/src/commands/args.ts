import { TTimeError } from '@ttime/core';

/** Parsed command-line arguments of one command (from `node:util` `parseArgs`). */
export type Args = {
  readonly positionals: readonly string[];
  readonly values: Readonly<Record<string, string | boolean | (string | boolean)[] | undefined>>;
};

/** Option specs for `parseArgs`. */
export type OptionSpec = Readonly<
  Record<string, { readonly type: 'string' | 'boolean'; readonly multiple?: boolean }>
>;

/** The string value of `--name`, if given. */
export const text = (args: Args, name: string): string | undefined => {
  const value = args.values[name];
  return typeof value === 'string' ? value : undefined;
};

/** True when the boolean flag `--name` is set. */
export const flag = (args: Args, name: string): boolean => args.values[name] === true;

/** Every value of a repeatable `--name`. */
export const list = (args: Args, name: string): string[] => {
  const value = args.values[name];
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string');
};

/** The value of `--name`, or an `input.invalid` error naming it. */
export const required = (args: Args, name: string): string => {
  const value = text(args, name);
  if (value === undefined || value.trim() === '') {
    throw new TTimeError('input.invalid', `Pass --${name}.`);
  }
  return value;
};

/** All positional words joined, or an error asking for `what`. */
export const words = (args: Args, what: string): string => {
  const joined = args.positionals.join(' ').trim();
  if (joined === '') {
    throw new TTimeError('input.invalid', `Pass ${what}.`);
  }
  return joined;
};
