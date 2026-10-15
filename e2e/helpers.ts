import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const OPERATOR = {
  email: process.env.E2E_OPERATOR_EMAIL ?? 'kevin@local.test',
  password: process.env.E2E_OPERATOR_PASSWORD ?? 'localdev123',
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Random Colombian mobile so every run registers a brand-new customer. */
export function randomPhone(): string {
  return `3${Math.floor(100_000_000 + Math.random() * 899_999_999)}`;
}

/** Logs the operator in on an API request context (cookie is kept on it). */
export async function operatorLogin(request: APIRequestContext) {
  const res = await request.post('/api/op/auth/login', { data: OPERATOR, headers: JSON_HEADERS });
  expect(res.ok(), await res.text()).toBeTruthy();
}

/** Opens today's workday if needed. */
export async function ensureWorkdayOpen(request: APIRequestContext) {
  const current = await request.get('/api/op/workdays/current');
  if ((await current.json()) !== null) return;
  const res = await request.post('/api/op/workdays/open', { headers: JSON_HEADERS });
  expect(res.ok(), await res.text()).toBeTruthy();
}

type Sale = { id: string; claim_url: string; total_cop: number };

/** Creates a paid sale through the API and returns it (with claim_url). */
export async function createSale(request: APIRequestContext, lines = [{ index: 0, qty: 2 }]): Promise<Sale> {
  type Product = { id: string; option_groups: Array<{ min_select: number; options: Array<{ id: string }> }> };
  const products = (await (await request.get('/api/op/products')).json()) as Product[];
  // Products with options get the first choices that satisfy each group.
  const optionIds = (p: Product) => p.option_groups.flatMap((g) => g.options.slice(0, g.min_select).map((o) => o.id));
  const res = await request.post('/api/op/sales', {
    headers: { ...JSON_HEADERS, 'Idempotency-Key': randomUUID() },
    data: {
      items: lines.map((l) => ({
        product_id: products[l.index]!.id,
        qty: l.qty,
        option_ids: optionIds(products[l.index]!),
      })),
      payment_method: 'cash',
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()) as Sale;
}

/** Path part of a claim URL, so it works whatever PUBLIC_APP_URL host is used. */
export function claimPath(sale: Sale): string {
  return new URL(sale.claim_url).pathname;
}

/** Logs the operator in through the UI. */
export async function operatorLoginUI(page: Page) {
  await page.goto('/op/login');
  await page.getByLabel(/correo/i).fill(OPERATOR.email);
  await page.getByLabel(/contraseña/i).fill(OPERATOR.password);
  await page.getByRole('button', { name: /ingresar|entrar/i }).click();
  await page.waitForURL(/\/op(\?|$|\/(?!login))/);
}
