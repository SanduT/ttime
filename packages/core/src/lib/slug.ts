const FALLBACK_SLUG = 'item';

/** Slug pattern for client and project IDs: lowercase words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Turns a display name into a slug: lowercase ASCII, diacritics dropped, words joined by `-`. */
export const slugify = (name: string): string => {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? FALLBACK_SLUG : slug;
};

/** A slug for `name` not in `taken`, adding `-2`, `-3`, ... on collision. */
export const uniqueSlug = (name: string, taken: ReadonlySet<string>): string => {
  const base = slugify(name);
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${String(suffix)}`)) {
    suffix += 1;
  }
  return `${base}-${String(suffix)}`;
};
