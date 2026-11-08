import { describe, expect, test } from 'bun:test';

import { createTestVault } from '../testing/test-vault';

describe('issue line numbers', () => {
  test('point at a syntax error', async () => {
    const tv = await createTestVault();
    await tv.writeRaw('projects/broken.json', '{\n  "schema": 1,\n  oops\n}\n');
    const { issues } = await tv.vault.read();
    expect(issues.find((i) => i.file === 'projects/broken.json')).toMatchObject({
      code: 'file.invalid_json',
      line: 3,
    });
  });

  test('point at the invalid value', async () => {
    const tv = await createTestVault();
    await tv.writeRaw(
      'projects/bad-color.json',
      '{\n  "schema": 1,\n  "id": "bad-color",\n  "name": "Bad",\n  "color": "red",\n  "createdAt": "2026-11-01T09:00:00+02:00"\n}\n',
    );
    const { issues } = await tv.vault.read();
    expect(issues.find((i) => i.file === 'projects/bad-color.json')).toMatchObject({
      path: ['color'],
      line: 5,
    });
  });
});
