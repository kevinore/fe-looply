import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { claimPath, createSale, ensureWorkdayOpen, operatorLogin, operatorLoginUI, randomPhone } from './helpers.ts';

/** Each flow uses fresh browser contexts: one for the operator, one for the customer. */
async function newPage(browser: Browser, project: { use: object }): Promise<Page> {
  const ctx = await browser.newContext(project.use);
  return ctx.newPage();
}

async function register(page: Page, phone: string, alias: string) {
  await expect(page.getByRole('heading', { name: 'Tu compra ya cuenta.' })).toBeVisible();
  const submit = page.getByRole('button', { name: 'Girar la ruleta' });
  await page.getByLabel('Celular').fill(phone);
  await page.getByLabel('¿Cómo te llamas?').fill(alias);
  await expect(submit).toBeDisabled(); // consent is unchecked by default
  await page.getByRole('checkbox').check();
  await expect(submit).toBeEnabled();
  await submit.click();
}

test.describe.configure({ mode: 'serial' });

let phone = '';
let alias = '';
/** Logged-in operator API session shared by all flows. */
let request: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  request = await playwright.request.newContext({ baseURL });
  await operatorLogin(request);
  await ensureWorkdayOpen(request);
  phone = randomPhone();
  alias = `Ana${phone.slice(-3)}`;
});

test('F1 · primera compra: registro → ruleta → premio; el operador la ve vinculada', async ({ page }) => {
  const sale = await createSale(request);
  await page.goto(claimPath(sale));
  await page.waitForURL(/\/c\/register\//);
  await register(page, phone, alias);

  await page.waitForURL(/\/c\/spin\//);
  await expect(page.getByRole('heading', { name: `Gira, ${alias}.` })).toBeVisible();
  await page.getByRole('button', { name: 'Girar', exact: true }).click();

  await page.waitForURL(/\/c\/prize\//, { timeout: 15_000 });
  await expect(page.getByText('¡Ganaste!')).toBeVisible();
  await page.getByRole('link', { name: 'Guardar para otra visita' }).click();
  await page.waitForURL(/\/c(\/install)?$/);

  const status = await (await request.get(`/api/op/sales/${sale.id}/status`)).json();
  expect(status.status).toBe('claimed');
  expect(status.customer.alias).toBe(alias);
});

test('F2 · compra con sesión abierta: el QR suma sin pedir datos', async ({ browser }, info) => {
  // Same customer: reuse the session by registering first in this context.
  const first = await createSale(request);
  const customer = await newPage(browser, info.project);
  await customer.goto(claimPath(first));
  await customer.waitForURL(/\/c\/(register|confirm)\//);
  // New context has no cookie: identify through "¿Eres …?" to get a session.
  await register(customer, phone, alias);
  await customer.waitForURL(/\/c\/confirm\//);
  await customer.getByRole('button', { name: 'Sí, soy yo' }).click();
  await customer.waitForURL(/\/c\/(claimed|spin\/)/);

  const second = await createSale(request);
  await customer.goto(claimPath(second));
  await customer.waitForURL(/\/c\/(claimed|spin\/)/);
  if (customer.url().includes('/claimed')) {
    // R8: every sale is a stamp today; the "already counted" copy only appears if
    // the backend's stamp rule goes back to one per workday.
    await expect(customer.getByText(/\+1 compra|Ya sumaste tu compra de hoy/)).toBeVisible();
  }
  expect((await (await request.get(`/api/op/sales/${second.id}/status`)).json()).status).toBe('claimed');
});

test('F3 · cliente sin sesión con celular existente: ¿Eres …? → sí', async ({ browser }, info) => {
  const sale = await createSale(request);
  const customer = await newPage(browser, info.project);
  await customer.goto(claimPath(sale));
  await customer.waitForURL(/\/c\/register\//);
  await register(customer, phone, 'Otro');
  await customer.waitForURL(/\/c\/confirm\//);
  await expect(customer.getByRole('heading', { name: new RegExp(`¿Eres ${alias}\\?`) })).toBeVisible();
  await expect(customer.getByText(phone.slice(-4))).toBeVisible();
  await customer.getByRole('button', { name: 'Sí, soy yo' }).click();
  await customer.waitForURL(/\/c\/claimed/);
  await expect(customer.getByRole('button', { name: 'Listo' })).toBeVisible();
});

test('Errores · QR ya reclamado y QR anulado', async ({ browser }, info) => {
  const sale = await createSale(request);
  const customer = await newPage(browser, info.project);
  await customer.goto(claimPath(sale));
  await customer.waitForURL(/\/c\/register\//);
  await register(customer, phone, alias);
  await customer.waitForURL(/\/c\/confirm\//);
  await customer.getByRole('button', { name: 'Sí, soy yo' }).click();
  // 1 stamp per sale (R8): this is the customer's 5th purchase, which unlocks a spin.
  await customer.waitForURL(/\/c\/(claimed|spin\/)/);

  const again = await newPage(browser, info.project);
  await again.goto(claimPath(sale));
  await expect(again.getByText('Esta compra ya fue reclamada')).toBeVisible();

  const voided = await createSale(request);
  const res = await request.post(`/api/op/sales/${voided.id}/void`, {
    headers: { 'Content-Type': 'application/json' },
    data: { reason: 'Prueba e2e' },
  });
  expect(res.ok()).toBeTruthy();
  await again.goto(claimPath(voided));
  await expect(again.getByText('Esta compra fue anulada')).toBeVisible();
});

test('Errores · celular inválido no habilita el registro', async ({ page }) => {
  const sale = await createSale(request);
  await page.goto(claimPath(sale));
  await page.waitForURL(/\/c\/register\//);
  await page.getByLabel('Celular').fill('6011234567');
  await page.getByLabel('¿Cómo te llamas?').fill('Ana');
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button', { name: 'Girar la ruleta' })).toBeDisabled();
});

test('F4 · venta sin escaneo: cobrar → siguiente venta → buscar por 4 dígitos → vincular', async ({ page }) => {
  await operatorLoginUI(page);
  // A layered drink: base and tea are chosen before it goes into the cart.
  await page.getByRole('button', { name: /Berry Bliss/ }).click();
  await page.getByRole('radio', { name: 'Avena' }).click();
  await page.getByRole('radio', { name: 'Matcha' }).click();
  await page.getByRole('button', { name: /^Agregar/ }).click();
  await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
  await expect(page.getByText('Avena · Matcha')).toBeVisible();
  await page.getByRole('button', { name: 'Cobrar y mostrar QR' }).click();
  await page.waitForURL(/\/op\/sale\/[^/]+\/qr$/);
  const saleId = page.url().split('/').at(-2)!;
  await expect(page.getByText(/Esperando escaneo/)).toBeVisible();

  await page.getByRole('link', { name: 'Buscar cliente' }).or(page.getByRole('button', { name: 'Buscar cliente' })).click();
  await page.waitForURL(/\/op\/search/);
  for (const d of phone.slice(-4)) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: new RegExp(alias) }).click();
  await page.waitForURL(new RegExp(`/op/sale/${saleId}$`));
  await expect(page.getByText(alias).first()).toBeVisible();
});

test('F7 · resumen de la jornada', async ({ page }) => {
  // Reuse the API session (login is rate-limited per email).
  await page.context().addCookies((await request.storageState()).cookies);
  await page.goto('/op/summary');
  await expect(page.getByText('Ventas vinculadas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ventas por hora' })).toBeVisible();
  await expect(page.getByText('ticket promedio')).toBeVisible();
  await expect(page.getByText(/Cuadre: cuenta el efectivo de caja contra/)).toBeVisible();
  // Closing blocks sales for the rest of the day, so it only runs on demand.
  test.skip(!process.env.E2E_CLOSE_WORKDAY, 'Set E2E_CLOSE_WORKDAY=1 to also close the workday');
  await page.getByRole('button', { name: 'Cerrar jornada' }).click();
  await page.getByRole('button', { name: 'Sí, cerrar jornada' }).click();
  await expect(page.getByText('Cerrada')).toBeVisible();
});

test.afterAll(async () => {
  await request?.dispose();
});
