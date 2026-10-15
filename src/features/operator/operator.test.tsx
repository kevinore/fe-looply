import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Product, Workday } from '@/api/types';
import { useState, type ReactNode } from 'react';
import { renderRoutes, Where } from '@/features/customer/test-utils';
import { Toaster } from '@/ui';
import { useCart } from './cart';
import { ClaimNotices } from './ClaimNotices';
import { useClaimNotices } from './notifications';
import { usePendingSales } from './pendingSales';
import { ApplyPrizeSheet } from './ApplyPrizeSheet';
import { CheckoutSheet } from './CheckoutSheet';
import SaleQrPage from './pages/SaleQrPage';
import SearchPage from './pages/SearchPage';
import WorkdayDetailPage from './pages/WorkdayDetailPage';
import { todayYmd } from '@/lib/dates';
import { RedeemPrizeSheet } from './RedeemPrizeSheet';
import { HourlyChart } from './HourlyChart';
import { SaleScreen } from './SaleScreen';
import { SaleWatcher } from './SaleWatcher';

const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Matcha latte',
    price_cop: 14000,
    photo_url: null,
    description: null,
    category: null,
    prize_eligible: true,
    option_groups: [],
  },
  {
    id: 'p2',
    name: 'Cold brew',
    price_cop: 12000,
    photo_url: null,
    description: null,
    category: null,
    prize_eligible: true,
    option_groups: [],
  },
];

/** A product that needs options: Base (1 of 2, Avena +$1.000) and Té (1 of 2). */
const LAYERED: Product = {
  id: 'p3',
  name: 'Berry Bliss',
  price_cop: 14000,
  photo_url: null,
  description: 'Frutos rojos',
  category: null,
  prize_eligible: true,
  option_groups: [
    {
      id: 'g1',
      name: 'Base',
      min_select: 1,
      max_select: 1,
      options: [
        { id: 'yog', name: 'Yogurt griego', price_delta_cop: 0 },
        { id: 'ave', name: 'Avena', price_delta_cop: 1000 },
      ],
    },
    {
      id: 'g2',
      name: 'Té',
      min_select: 1,
      max_select: 1,
      options: [
        { id: 'chai', name: 'Chai pistacho', price_delta_cop: 0 },
        { id: 'mat', name: 'Matcha', price_delta_cop: 0 },
      ],
    },
  ],
};

/** Cart lines as { key: qty }, for short assertions. */
const qtys = () =>
  Object.fromEntries(Object.entries(useCart.getState().lines).map(([k, l]) => [k, l.qty]));

const WORKDAY: Workday = {
  id: 'w1',
  local_date: '2026-10-04',
  day_type: 'sunday',
  status: 'open',
  opened_at: '2026-10-04T13:00:00Z',
  opened_by: 'o1',
  closed_at: null,
  weather_temp_c: null,
  weather_code: null,
};

function sale(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    workday_id: 'w1',
    status: 'paid',
    total_cop: 28000,
    payment_method: 'cash',
    items: [],
    claim_url: 'http://localhost/c/claim/tok',
    claim_expires_at: '2026-10-05T05:00:00Z',
    claim_method: null,
    paid_at: '2026-10-04T15:00:00Z',
    claimed_at: null,
    voided_at: null,
    void_reason: null,
    customer: null,
    ...over,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Handler = (req: Request) => Response | Promise<Response>;

/** Routes fetch calls by "METHOD /path" and records every request. */
function mockApi(handlers: Record<string, Handler>) {
  const calls: Request[] = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const req = input instanceof Request ? input : new Request(new URL(String(input), 'http://localhost'), init);
    calls.push(req.clone());
    const key = `${req.method} ${new URL(req.url).pathname}`;
    const h = handlers[key];
    if (!h) return json({ error: { code: 'internal_error' } }, 500);
    return h(req);
  });
  return { calls, spy, count: (key: string) => calls.filter((r) => `${r.method} ${new URL(r.url).pathname}` === key).length };
}

beforeEach(() => {
  useCart.getState().reset();
  usePendingSales.setState({ items: {} });
  useClaimNotices.setState({ items: [] });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('02 · Venta (carrito)', () => {
  it('tap adds, long press removes, total is the catalog estimate, Cobrar disabled when empty', async () => {
    mockApi({ 'GET /api/op/products': () => json(PRODUCTS) });
    renderRoutes([{ path: '/op', element: <SaleScreen workday={WORKDAY} /> }], { pathname: '/op' });

    const cobrar = await screen.findByRole('button', { name: 'Cobrar' });
    expect(cobrar).toBeDisabled();

    const matcha = await screen.findByRole('button', { name: /Matcha latte/ });
    await userEvent.click(matcha);
    await userEvent.click(matcha);
    await userEvent.click(screen.getByRole('button', { name: /Cold brew/ }));
    expect(qtys()).toEqual({ p1: 2, p2: 1 });
    expect(screen.getByText('3 bebidas')).toBeInTheDocument();
    expect(screen.getAllByText('$40.000').length).toBeGreaterThan(0);
    expect(cobrar).toBeEnabled();

    // Long press (≥ 500 ms) removes one and does not also add one.
    vi.useFakeTimers();
    const tile = screen.getByRole('button', { name: /Matcha latte/ });
    fireEvent.pointerDown(tile);
    act(() => vi.advanceTimersByTime(520));
    fireEvent.pointerUp(tile);
    fireEvent.click(tile);
    vi.useRealTimers();
    expect(qtys()).toEqual({ p1: 1, p2: 1 });
    expect(screen.getAllByText('$26.000').length).toBeGreaterThan(0);
  });
});

describe('02 · Venta · opciones del producto', () => {
  it('a product with options opens the sheet; each combination is its own line', async () => {
    mockApi({ 'GET /api/op/products': () => json([...PRODUCTS, LAYERED]) });
    renderRoutes([{ path: '/op', element: <SaleScreen workday={WORKDAY} /> }], { pathname: '/op' });

    const tile = await screen.findByRole('button', { name: /Berry Bliss/ });
    expect(screen.getByText('Frutos rojos')).toBeInTheDocument();
    await userEvent.click(tile);
    // Nothing preselected: can't add until every required group has a choice.
    const add = await screen.findByRole('button', { name: /^Agregar/ });
    expect(add).toBeDisabled();
    expect(qtys()).toEqual({});

    await userEvent.click(screen.getByRole('radio', { name: /^Avena/ }));
    expect(add).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'Matcha' }));
    expect(add).toHaveTextContent('Agregar · $15.000');
    await userEvent.click(add);
    expect(qtys()).toEqual({ 'p3|ave|mat': 1 });

    // Same product, other options: a second line. The tile counts both.
    await userEvent.click(tile);
    await userEvent.click(await screen.findByRole('radio', { name: 'Yogurt griego' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Chai pistacho' }));
    await userEvent.click(screen.getByRole('button', { name: /^Agregar/ }));
    expect(qtys()).toEqual({ 'p3|ave|mat': 1, 'p3|chai|yog': 1 });
    expect(
      screen.getByRole('button', { name: /Berry Bliss.*2 en el carrito/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('$29.000').length).toBeGreaterThan(0);

    // Long press removes the most recently added combination.
    vi.useFakeTimers();
    fireEvent.pointerDown(tile);
    act(() => vi.advanceTimersByTime(520));
    fireEvent.pointerUp(tile);
    vi.useRealTimers();
    expect(qtys()).toEqual({ 'p3|ave|mat': 1 });
  });

  it('checkout sends option_ids per line and lists them', async () => {
    const api = mockApi({ 'POST /api/op/sales': () => json(sale(), 201) });
    useCart.getState().add('p3', ['mat', 'ave']);
    useCart.getState().add('p3', ['ave', 'mat']); // same combination, any order
    useCart.getState().add('p1');
    renderRoutes(
      [
        {
          path: '/op',
          element: <CheckoutSheet open onClose={() => {}} products={[...PRODUCTS, LAYERED]} />,
        },
        { path: '/op/sale/:id/qr', element: <Where /> },
      ],
      { pathname: '/op' },
    );
    expect(await screen.findByText('Avena · Matcha')).toBeInTheDocument();
    expect(screen.getByText('$44.000')).toBeInTheDocument(); // 2 × 15000 + 14000
    await userEvent.click(screen.getByRole('button', { name: 'Cobrar y mostrar QR' }));
    await waitFor(() => expect(api.count('POST /api/op/sales')).toBe(1));
    const body = await api.calls[0]!.json();
    expect(body.items).toEqual([
      { product_id: 'p3', qty: 2, option_ids: ['mat', 'ave'] },
      { product_id: 'p1', qty: 1, option_ids: [] },
    ]);
  });
});

describe('02 · Venta · secciones y premios', () => {
  const ICE: Product = {
    id: 'ice',
    name: 'Paleta',
    price_cop: 5000,
    photo_url: null,
    description: null,
    category: 'Helados',
    prize_eligible: false,
    option_groups: [],
  };
  const withCategory = (p: Product, category: string): Product => ({ ...p, category });

  it('shows one heading per category, in the order the API sends', async () => {
    mockApi({
      'GET /api/op/products': () =>
        json([withCategory(PRODUCTS[0]!, 'Bebidas'), withCategory(PRODUCTS[1]!, 'Bebidas'), ICE]),
    });
    renderRoutes([{ path: '/op', element: <SaleScreen workday={WORKDAY} /> }], { pathname: '/op' });
    const headings = await screen.findAllByRole('heading', { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(['Bebidas', 'Helados']);
    const helados = screen.getByRole('region', { name: 'Helados' });
    expect(helados).toHaveTextContent('Paleta');
    expect(helados).not.toHaveTextContent('Cold brew');
  });

  it('without categories there are no headings', async () => {
    mockApi({ 'GET /api/op/products': () => json(PRODUCTS) });
    renderRoutes([{ path: '/op', element: <SaleScreen workday={WORKDAY} /> }], { pathname: '/op' });
    await screen.findByRole('button', { name: /Matcha latte/ });
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('a prize never targets a product that does not take prizes', async () => {
    useCart.setState({
      lines: {
        ice: { productId: 'ice', optionIds: [], qty: 1 },
        p2: { productId: 'p2', optionIds: [], qty: 1 },
      },
      customer: {
        id: 'c1',
        alias: 'Ana',
        phone_last4: '4567',
        purchases: 1,
        milestone_every: 5,
        active_prizes: [
          {
            id: 'a1',
            name: '10% de descuento',
            short_label: '10% dto',
            type: 'percent_off',
            awarded_at: '2026-10-01T15:00:00Z',
            expires_at: '2026-12-30T15:00:00Z',
            value: 10,
            max_value_cop: 16000,
          },
        ],
      },
    });
    renderRoutes(
      [{ path: '/op', element: <ApplyPrizeSheet open onClose={() => {}} products={[...PRODUCTS, ICE]} /> }],
      { pathname: '/op' },
    );
    const drinks = await screen.findByRole('radiogroup', { name: 'Bebida' });
    expect(drinks).toHaveTextContent('Cold brew');
    expect(drinks).not.toHaveTextContent('Paleta');
  });
});

describe('03 · Cobrar (idempotencia)', () => {
  it('double tap sends ONE request; a retry after an error reuses the same Idempotency-Key', async () => {
    let fail = true;
    const api = mockApi({
      'POST /api/op/sales': async () => {
        await new Promise((r) => setTimeout(r, 30));
        if (fail) return json({ error: { code: 'internal_error', message: 'x', extra: {} } }, 500);
        return json(sale(), 201);
      },
      'GET /api/op/workdays/current': () => json(WORKDAY),
    });
    useCart.setState({ lines: { p1: { productId: 'p1', optionIds: [], qty: 2 } } });

    renderRoutes(
      [{ path: '/op', element: <CheckoutSheet open onClose={() => {}} products={PRODUCTS} /> }],
      { pathname: '/op' },
    );
    const pay = await screen.findByRole('button', { name: 'Cobrar y mostrar QR' });
    fireEvent.click(pay);
    fireEvent.click(pay);
    await waitFor(() => expect(api.count('POST /api/op/sales')).toBe(1));
    await screen.findByRole('button', { name: 'Cobrar y mostrar QR' }); // loading finished
    expect(qtys()).toEqual({ p1: 2 }); // cart kept on error
    const firstKey = api.calls[0]!.headers.get('Idempotency-Key');
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/);

    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Cobrar y mostrar QR' }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/op/sale/s1/qr'));
    const posts = api.calls.filter((r) => r.method === 'POST');
    expect(posts).toHaveLength(2);
    expect(posts[1]!.headers.get('Idempotency-Key')).toBe(firstKey);
    const body = await posts[1]!.json();
    expect(body).toMatchObject({ items: [{ product_id: 'p1', qty: 2 }], payment_method: 'cash' });
    expect(useCart.getState().lines).toEqual({}); // cleared only on success
    expect(useCart.getState().idempotencyKey).toBeNull();
  });

  it('"Cobrar sin cliente" registers an anonymous sale and stays on Venta (no QR)', async () => {
    const api = mockApi({
      'POST /api/op/sales': () => json(sale({ total_cop: 28000 }), 201),
      'POST /api/op/events': () => new Response(null, { status: 204 }),
    });
    useCart.setState({ lines: { p1: { productId: 'p1', optionIds: [], qty: 2 } } });
    renderRoutes(
      [
        {
          path: '/op',
          element: (
            <>
              <CheckoutSheet open onClose={() => {}} products={PRODUCTS} />
              <Toaster />
            </>
          ),
        },
      ],
      { pathname: '/op' },
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Cobrar sin cliente' }));
    await waitFor(() => expect(useCart.getState().lines).toEqual({}));
    expect(api.count('POST /api/op/sales')).toBe(1);
    const body = await api.calls.find((r) => r.url.endsWith('/api/op/sales'))!.json();
    expect(body).toMatchObject({ customer_id: null, prize_award_id: null });
    // Never went to the QR screen.
    expect(screen.queryByTestId('path')).not.toBeInTheDocument();
    expect(await screen.findByText('Venta registrada sin cliente · $28.000')).toBeInTheDocument();
    await waitFor(() => expect(api.count('POST /api/op/events')).toBe(1));
  });

  it('with a customer there is no anonymous option', async () => {
    useCart.setState({
      lines: { p1: { productId: 'p1', optionIds: [], qty: 1 } },
      customer: { id: 'c1', alias: 'Ana', phone_last4: '4567', purchases: 1, milestone_every: 5, active_prizes: [] },
    });
    renderRoutes([{ path: '/op', element: <CheckoutSheet open onClose={() => {}} products={PRODUCTS} /> }], {
      pathname: '/op',
    });
    expect(await screen.findByRole('button', { name: 'Cobrar $14.000' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cobrar sin cliente' })).not.toBeInTheDocument();
  });
});

describe('04 · QR de venta (sondeo en segundo plano)', () => {
  const CLAIMED = {
    status: 'claimed',
    customer: { id: 'c1', alias: 'Ana', phone_last4: '4567', purchases: 5, active_prizes: [] },
  };
  const DETAIL = {
    id: 'c1',
    alias: 'Ana',
    phone_last4: '4567',
    purchases: 5,
    milestone_every: 5,
    active_prizes: [],
    sales: [],
  };

  /** Like OperatorLayout: the watcher and notices live above every screen. */
  const shell = (el: ReactNode) => (
    <>
      {el}
      <SaleWatcher />
      <ClaimNotices />
    </>
  );
  const routes = [
    { path: '/op/sale/:saleId/qr', element: shell(<SaleQrPage />) },
    { path: '/op', element: shell(<Where />) },
  ];

  it('when the customer scans, returns to Venta with a notification and stops polling', async () => {
    let statusCalls = 0;
    const api = mockApi({
      'GET /api/op/sales/s1': () => json(sale()),
      'GET /api/op/sales/s1/status': () => {
        statusCalls++;
        return statusCalls < 2 ? json({ status: 'paid', customer: null }) : json(CLAIMED);
      },
      'GET /api/op/customers/c1': () => json(DETAIL),
      'POST /api/op/events': () => new Response(null, { status: 204 }),
    });

    renderRoutes(routes, { pathname: '/op/sale/s1/qr' });
    expect(await screen.findByText(/Esperando escaneo/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/op$/), {
      timeout: 6000,
    });

    expect(await screen.findByText('Ana sumó su compra')).toBeInTheDocument();
    expect(await screen.findByText('¡Giro desbloqueado!')).toBeInTheDocument();
    expect(usePendingSales.getState().items).toEqual({});

    const settled = api.count('GET /api/op/sales/s1/status');
    await new Promise((r) => setTimeout(r, 2500));
    expect(api.count('GET /api/op/sales/s1/status')).toBe(settled);
    expect(api.calls.some((r) => r.method === 'POST' && r.url.endsWith('/api/op/events'))).toBe(true);
  }, 15_000);

  it('"Siguiente venta" keeps watching: a later scan still notifies on Venta', async () => {
    let scanned = false;
    mockApi({
      'GET /api/op/sales/s1': () => json(sale()),
      'GET /api/op/sales/s1/status': () =>
        json(scanned ? CLAIMED : { status: 'paid', customer: null }),
      'GET /api/op/customers/c1': () => json(DETAIL),
      'POST /api/op/events': () => new Response(null, { status: 204 }),
    });

    renderRoutes(routes, { pathname: '/op/sale/s1/qr' });
    await userEvent.click(await screen.findByRole('button', { name: 'Siguiente venta' }));
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/op$/);
    expect(usePendingSales.getState().items.s1).toBeDefined();

    scanned = true;
    expect(
      await screen.findByText('Ana sumó su compra', {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByText('Ana sumó su compra')).not.toBeInTheDocument();
  }, 15_000);
});

describe('06 · Buscar cliente', () => {
  const RESULTS = [
    { id: 'c1', alias: 'Ana', phone_last4: '4567', purchases: 4, active_prizes_count: 2 },
    { id: 'c2', alias: 'Julián', phone_last4: '4567', purchases: 1, active_prizes_count: 0 },
  ];

  const typeDigits = async (digits: string) => {
    for (const d of digits) await userEvent.click(screen.getByRole('button', { name: d }));
  };

  it('searches after 4 digits and links the sale (?saleId=)', async () => {
    const api = mockApi({
      'GET /api/op/customers/search': (req) => json(new URL(req.url).searchParams.get('last4') === '4567' ? RESULTS : []),
      'POST /api/op/sales/s1/link': () => json({ card: {}, counted: true, new_spins: [] }),
    });
    renderRoutes([{ path: '/op/search', element: <SearchPage /> }], { pathname: '/op/search', search: '?saleId=s1' });
    await typeDigits('456');
    expect(api.count('GET /api/op/customers/search')).toBe(0);
    await typeDigits('7');

    expect(await screen.findByText('Julián')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Ana/ }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/op/sale/s1'));
    const link = api.calls.find((r) => r.method === 'POST')!;
    expect(await link.json()).toEqual({ customer_id: 'c1' });
  });

  it('shows the empty state', async () => {
    mockApi({ 'GET /api/op/customers/search': () => json([]) });
    renderRoutes([{ path: '/op/search', element: <SearchPage /> }], { pathname: '/op/search' });
    await typeDigits('0000');
    expect(await screen.findByText('Nadie con esos 4 dígitos.')).toBeInTheDocument();
  });

  it('attach mode puts the customer in the cart and returns to the sale', async () => {
    mockApi({
      'GET /api/op/customers/search': () => json(RESULTS),
      'GET /api/op/customers/c1': () =>
        json({ id: 'c1', alias: 'Ana', phone_last4: '4567', purchases: 4, milestone_every: 5, active_prizes: [], sales: [] }),
    });
    renderRoutes([{ path: '/op/search', element: <SearchPage /> }], { pathname: '/op/search', search: '?mode=attach' });
    await typeDigits('4567');
    await userEvent.click(await screen.findByRole('button', { name: /Ana/ }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/op$/));
    expect(useCart.getState().customer).toMatchObject({ id: 'c1', alias: 'Ana', foundBy: '4567' });
  });
});

describe('Jornada · detalle', () => {
  const summary = {
    workday_id: 'w1',
    local_date: todayYmd(),
    day_type: 'other',
    status: 'closed',
    opened_at: '2026-10-04T13:00:00Z',
    closed_at: '2026-10-04T22:00:00Z',
    weather_temp_c: null,
    weather_code: null,
    sales: 2,
    claimed_sales: 1,
    revenue_cop: 40000,
    cash_cop: 28000,
    digital_cop: 12000,
    drinks: 3,
    drinks_per_sale: 1.5,
    claimed_pct: 0.5,
  };
  const product = (id: string, label: string, units: number, net: number) => ({
    product_id: id,
    label,
    units,
    gross_cop: net,
    discount_cop: 0,
    net_cop: net,
    cost_incomplete: true,
    margin_cop: null,
  });
  const STATS = {
    summary,
    hourly: [{ local_hour: 10, sales: 2, revenue_cop: 40000 }],
    top_products: [product('p1', 'Matcha latte', 2, 28000), product('p2', 'Cold brew', 1, 12000)],
    products: [product('p1', 'Matcha latte', 2, 28000), product('p2', 'Cold brew', 1, 12000)],
    best_hour: 10,
    cost_incomplete: true,
    margin_cop: null,
    options: [
      { category: 'Helados', group_name: 'Sabor de leche', option_name: 'Coco', units: 3 },
      { category: 'Helados', group_name: 'Sabor paleta', option_name: 'Fresa', units: 1 },
    ],
  };
  const line = (label: string, qty: number) => ({
    label,
    qty,
    unit_price_cop: 14000,
    discount_cop: 0,
    is_prize: false,
    options: [],
  });
  const SALES = [
    {
      id: 's3',
      paid_at: '2026-10-04T16:00:00Z',
      status: 'void',
      payment_method: 'cash',
      total_cop: 14000,
      claim_method: null,
      void_reason: 'error de cobro',
      customer: null,
      items: [line('Matcha latte', 1)],
    },
    {
      id: 's2',
      paid_at: '2026-10-04T15:30:00Z',
      status: 'claimed',
      payment_method: 'transfer',
      total_cop: 12000,
      claim_method: 'qr',
      void_reason: null,
      customer: { id: 'c1', alias: 'Ana', phone_last4: '4567' },
      items: [line('Cold brew', 1)],
    },
    {
      id: 's1',
      paid_at: '2026-10-04T15:00:00Z',
      status: 'paid',
      payment_method: 'cash',
      total_cop: 28000,
      claim_method: null,
      void_reason: null,
      customer: null,
      items: [line('Matcha latte', 2)],
    },
  ];

  it("shows what was sold and every sale; today's closed jornada can be reopened", async () => {
    const api = mockApi({
      'GET /api/op/stats/workdays/w1': () => json(STATS),
      'GET /api/op/workdays/w1/sales': () =>
        json({ items: SALES, next_cursor: null, total: 2, voided: 1 }),
      'GET /api/op/workdays/current': () => json(null),
      'POST /api/op/workdays/open': () => json({ ...WORKDAY, local_date: todayYmd() }),
    });
    renderRoutes([{ path: '/op/workdays/:workdayId', element: <WorkdayDetailPage /> }], {
      pathname: '/op/workdays/w1',
    });

    expect(await screen.findByText('Productos vendidos')).toBeInTheDocument();
    // Average amount per sale instead of items per sale.
    expect(screen.getByText('ticket promedio')).toBeInTheDocument();
    expect(screen.getByText('$20.000')).toBeInTheDocument();
    expect(screen.queryByText('bebidas/venta')).not.toBeInTheDocument();
    // Flavors sold, by category.
    const flavors = screen.getByRole('heading', { name: 'Helados · lo más pedido' }).parentElement!;
    expect(flavors).toHaveTextContent(/1\.Coco · Sabor de leche3/);
    // Chart: the best hour is selected, with its numbers spelled out.
    expect(screen.getByText('2 ventas · $40.000').parentElement).toHaveTextContent('10–11 am');
    // Every hour's values are also in a table for screen readers.
    expect(screen.getByRole('table', { name: 'Ventas por hora' })).toHaveTextContent('10–11 am2$40.000');
    expect(screen.getByText('Cerrada')).toBeInTheDocument();
    expect(await screen.findByText('2 ventas · 1 anulada')).toBeInTheDocument();
    expect(screen.getByText('Anulada · error de cobro')).toBeInTheDocument();
    expect(screen.getByText('Ana · 4567')).toBeInTheDocument();
    expect(screen.getByText('2× Matcha latte')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2× Matcha latte/ })).toHaveAttribute(
      'href',
      '/op/sale/s1',
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir jornada' }));
    await waitFor(() => expect(api.count('POST /api/op/workdays/open')).toBe(1));
  });

  it('loads the sales a page at a time', async () => {
    const api = mockApi({
      'GET /api/op/stats/workdays/w1': () => json(STATS),
      'GET /api/op/workdays/w1/sales': (req) => {
        const cursor = new URL(req.url).searchParams.get('cursor');
        return cursor === 'next'
          ? json({ items: SALES.slice(2), next_cursor: null, total: 2, voided: 1 })
          : json({ items: SALES.slice(0, 2), next_cursor: 'next', total: 2, voided: 1 });
      },
      'GET /api/op/workdays/current': () => json(null),
    });
    renderRoutes([{ path: '/op/workdays/:workdayId', element: <WorkdayDetailPage /> }], {
      pathname: '/op/workdays/w1',
    });

    expect(await screen.findByText('Ana · 4567')).toBeInTheDocument();
    expect(screen.queryByText('2× Matcha latte')).not.toBeInTheDocument();
    const first = api.calls.find((r) => r.url.includes('/workdays/w1/sales'))!;
    expect(new URL(first.url).searchParams.get('limit')).toBe('20');

    await userEvent.click(screen.getByRole('button', { name: 'Ver más ventas' }));
    expect(await screen.findByText('2× Matcha latte')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver más ventas' })).not.toBeInTheDocument();
  });
});

describe('Ventas por hora', () => {
  it('"Mejor hora" is the hour with the most sales (the measure drawn), revenue breaks ties', async () => {
    renderRoutes(
      [
        {
          path: '/op',
          element: (
            <HourlyChart
              hourly={[
                { local_hour: 10, sales: 3, revenue_cop: 30000 },
                { local_hour: 11, sales: 2, revenue_cop: 90000 },
                { local_hour: 12, sales: 3, revenue_cop: 45000 },
              ]}
            />
          ),
        },
      ],
      { pathname: '/op' },
    );
    const status = screen.getByText('Mejor hora').closest('[role="status"]')!;
    expect(status).toHaveTextContent('12–1 pm');
    expect(status).toHaveTextContent('3 ventas · $45.000');
  });
});

describe('M3 · Redimir premio en venta cobrada', () => {
  const TOPPING = {
    id: 'a1',
    name: 'Cold foam o topping extra',
    short_label: 'Topping',
    type: 'extra_item',
    awarded_at: '2026-10-13T18:55:00Z',
    expires_at: '2027-01-11T18:55:00Z',
  };
  const linked = sale({
    status: 'claimed',
    claim_method: 'qr',
    customer: { id: 'c1', alias: 'Kevin', phone_last4: '1502' },
    items: [
      {
        product_id: 'p1',
        label: 'Amber Matcha Latte',
        qty: 1,
        unit_price_cop: 16000,
        discount_cop: 0,
        prize_award_id: null,
      },
    ],
  });

  it('extra item: no drink picker, sends no product, keeps its content while closing', async () => {
    let body: unknown = null;
    mockApi({
      'POST /api/op/sales/s1/redeem-prize': async (req) => {
        body = await req.json();
        return json(linked);
      },
    });
    function Harness() {
      const [prize, setPrize] = useState<typeof TOPPING | null>(TOPPING);
      return (
        <RedeemPrizeSheet
          sale={linked as never}
          prize={prize}
          onClose={() => setPrize(null)}
          onNeedsNewSale={() => {}}
        />
      );
    }
    renderRoutes([{ path: '/op/sale/s1', element: <Harness /> }], { pathname: '/op/sale/s1' });

    expect(await screen.findByText(/Se agrega gratis a su compra de hoy/)).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Entregar cold foam o topping extra' }),
    );
    await waitFor(() =>
      expect(body).toEqual({ prize_award_id: 'a1', product_id: null, option_ids: [] }),
    );
    // Closed by the parent (prize → null): the sheet still shows its last content.
    expect(screen.getByText(/Se agrega gratis a su compra de hoy/)).toBeInTheDocument();
  });
});
