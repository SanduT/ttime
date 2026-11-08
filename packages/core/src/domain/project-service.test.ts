import { describe, expect, test } from 'bun:test';

import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';

describe('ProjectService', () => {
  test('create makes a unique slug and fills defaults', async () => {
    const t = await createDomainTestVault();
    const project = await t.projects.create({ name: ' Acme  Website ', client: 'acme' });
    expect(project).toMatchObject({
      id: 'acme-website-2',
      name: 'Acme Website',
      client: 'acme',
      billable: true,
      billingPeriod: 'monthly',
      status: 'active',
      createdAt: '2026-11-08T10:00:00+02:00',
    });
    expect(project.color).toMatch(/^#[0-9A-F]{6}$/);
    expect((await t.vault.read()).projects.has('acme-website-2')).toBe(true);
  });

  test('create keeps optional fields and checks the client', async () => {
    const t = await createDomainTestVault();
    const project = await t.projects.create({
      name: 'Globex',
      color: '#123456',
      billable: false,
      rate: { amount: '80.00', currency: 'EUR' },
      billingPeriod: 'weekly',
      target: { hours: 10, per: 'week' },
    });
    expect(project).toMatchObject({
      color: '#123456',
      rate: { amount: '80.00' },
      target: { hours: 10 },
    });
    expect(await errorCodeOf(t.projects.create({ name: 'X', client: 'nobody' }))).toBe(
      'client.not_found',
    );
    expect(await errorCodeOf(t.projects.create({ name: '  ' }))).toBe('input.invalid');
  });

  test('update changes fields but never the ID', async () => {
    const t = await createDomainTestVault();
    const updated = await t.projects.update('internal', {
      name: 'Internal work',
      color: '#000000',
    });
    expect(updated).toMatchObject({ id: 'internal', name: 'Internal work', color: '#000000' });
    expect(await errorCodeOf(t.projects.update('nope', {}))).toBe('project.not_found');
  });

  test('archive and unarchive toggle the status', async () => {
    const t = await createDomainTestVault();
    expect((await t.projects.archive('internal')).status).toBe('archived');
    expect((await t.projects.unarchive('legacy')).status).toBe('active');
  });
});
