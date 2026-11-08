/** Joins path segments with `/`, collapsing duplicate separators. Core never builds OS paths itself. */
export const joinPath = (...segments: readonly string[]): string =>
  segments
    .filter((segment) => segment !== '')
    .join('/')
    .replace(/\/{2,}/g, '/');

/** The directory part of a `/`-separated path. */
export const dirName = (path: string): string => {
  const index = path.lastIndexOf('/');
  return index <= 0 ? (index === 0 ? '/' : '.') : path.slice(0, index);
};
