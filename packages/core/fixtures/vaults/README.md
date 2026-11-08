# Fixture vaults

Small sample vaults in the exact byte format ttime writes (sorted keys, 2-space indent, trailing
newline). Prettier ignores this folder so the files stay byte-identical to real vault files.
Integration tests copy a fixture into a temporary directory before touching it.

- `basic`: a client, two projects, entries with notes and an unknown key, and an entry that
  crosses midnight.
- `broken`: a day file with invalid JSON and a project that violates the schema.
- `interrupted-stop`: the running entry is already in its day file (a stop that died between its
  two writes).
- `newer-schema`: `ttime.json` declares schema 2, so the vault opens read-only.
