import type { CliContext } from '../runtime/context';

/** Problems found in the vault files. */
export type DoctorResult = {
  readonly root: string;
  readonly issues: readonly {
    readonly severity: string;
    readonly file: string;
    readonly line: number | null;
    readonly message: string;
  }[];
};

/** Reads every vault file and lists what does not parse or validate. */
export const doctor = async (ctx: CliContext): Promise<DoctorResult> => {
  const snapshot = await ctx.vault.read();
  return {
    root: ctx.vault.root,
    issues: snapshot.issues.map((issue) => ({
      severity: issue.severity,
      file: issue.file,
      line: issue.line ?? null,
      message: issue.message,
    })),
  };
};
