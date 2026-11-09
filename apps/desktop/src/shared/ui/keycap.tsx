/** Keys of a shortcut drawn as small keycaps, like `⌘` `K`. */
export const Keycaps = ({ keys }: { readonly keys: readonly string[] }) => (
  <span className="inline-flex gap-[3px]" aria-label={keys.join(' ')}>
    {keys.map((key) => (
      <kbd
        key={key}
        className="min-w-[18px] rounded-[5px] border border-(--color-border) bg-(--color-control) px-[5px] py-px text-center font-sans text-[11px] leading-4 text-(--color-text) shadow-[0_1px_0_var(--color-border)]"
      >
        {key}
      </kbd>
    ))}
  </span>
);
