/** `h:mm` for whole seconds. */
export const hours = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${String(Math.floor(minutes / 60))}:${String(minutes % 60).padStart(2, '0')}`;
};

/** `HH:MM` of an ISO timestamp, as written (its own offset). */
export const clock = (timestamp: string): string => timestamp.slice(11, 16);

/** `YYYY-MM-DD` of an ISO timestamp. */
export const day = (timestamp: string): string => timestamp.slice(0, 10);

/** Columns padded to the widest cell, two spaces apart. */
export const table = (rows: readonly (readonly string[])[]): string => {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, cell.length);
    });
  }
  return rows
    .map((row) =>
      row
        .map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index] ?? 0)))
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
};
