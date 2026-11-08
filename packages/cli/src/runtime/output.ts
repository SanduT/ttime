import { stderr, stdout } from 'node:process';

/** Writes `text` and a newline to stdout. The only place the CLI prints results. */
export const writeOut = (text: string): void => {
  stdout.write(`${text}\n`);
};

/** Writes `text` and a newline to stderr (errors and log lines). */
export const writeErr = (text: string): void => {
  stderr.write(`${text}\n`);
};
