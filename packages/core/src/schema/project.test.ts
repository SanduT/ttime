import { expect, test } from 'bun:test';
import type { z } from 'zod';

import { clientSchema } from './client';
import { type Project, projectSchema } from './project';

const project: Project = {
  schema: 1,
  id: 'acme-website',
  name: 'Acme Website',
  client: 'acme',
  color: '#4F7CFF',
  billable: true,
  rate: { amount: '50.00', currency: 'EUR' },
  billingPeriod: 'monthly',
  target: { hours: 30, per: 'week' },
  status: 'active',
  invoicedThrough: null,
  createdAt: '2026-11-08T12:00:00+02:00',
};

test('the ARCHITECTURE project example parses unchanged', () => {
  expect(projectSchema.parse(project)).toEqual(project);
});

test('optional project fields can be left out and defaults apply', () => {
  const parsed = projectSchema.parse({
    schema: 1,
    id: 'internal',
    name: 'Internal',
    color: '#000000',
    createdAt: project.createdAt,
  });
  expect(parsed.billable).toBe(true);
  expect(parsed.status).toBe('active');
  expect(parsed.billingPeriod).toBe('monthly');
  expect(parsed.client).toBeUndefined();
});

test('money is a decimal string, never a number', () => {
  expect(
    projectSchema.safeParse({ ...project, rate: { amount: 50, currency: 'EUR' } }).success,
  ).toBe(false);
  expect(
    projectSchema.safeParse({ ...project, rate: { amount: '50.0.0', currency: 'EUR' } }).success,
  ).toBe(false);
});

test('the ARCHITECTURE client example parses and defaults notes and archived', () => {
  const client = {
    schema: 1,
    id: 'acme',
    name: 'Acme GmbH',
    defaultRate: { amount: '50.00', currency: 'EUR' },
    createdAt: '2026-11-08T12:00:00+02:00',
  } satisfies z.input<typeof clientSchema>;
  expect(clientSchema.parse(client)).toEqual({ ...client, notes: '', archived: false });
});
