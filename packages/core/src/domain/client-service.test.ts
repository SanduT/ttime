import { describe, expect, test } from 'bun:test';

import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';

describe('ClientService', () => {
  test('create makes a unique slug', async () => {
    const t = await createDomainTestVault();
    const client = await t.clients.create({
      name: 'Acme GmbH',
      defaultRate: { amount: '50.00', currency: 'EUR' },
    });
    expect(client).toMatchObject({ id: 'acme-gmbh', notes: '', archived: false });
    expect((await t.clients.create({ name: 'Acme GmbH' })).id).toBe('acme-gmbh-2');
    expect(await errorCodeOf(t.clients.create({ name: '' }))).toBe('input.invalid');
  });

  test('update, archive and unarchive', async () => {
    const t = await createDomainTestVault();
    expect(await t.clients.update('acme', { name: 'Acme AG', notes: 'n' })).toMatchObject({
      id: 'acme',
      name: 'Acme AG',
      notes: 'n',
    });
    expect((await t.clients.archive('acme')).archived).toBe(true);
    expect((await t.clients.unarchive('acme')).archived).toBe(false);
    expect(await errorCodeOf(t.clients.archive('nope'))).toBe('client.not_found');
  });
});
