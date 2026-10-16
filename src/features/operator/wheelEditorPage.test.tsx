import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CatalogPrize } from '@/api/types';
import { renderRoutes } from '@/features/customer/test-utils';
import { Toaster } from '@/ui';
import WheelEditorPage from './pages/WheelEditorPage';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function me(role: 'owner' | 'operator') {
  return {
    operator: { id: 'o1', name: 'Kevin', email: 'k@x.co', role },
    business: { id: 'b1', name: 'Biz', slug: 'biz', timezone: 'America/Bogota', branding: {}, milestone_every: 5 },
  };
}

const prize = (over: Partial<CatalogPrize>): CatalogPrize => ({
  id: 'p1',
  name: '10% de descuento',
  short_label: '10% dto',
  type: 'percent_off',
  value: 10,
  max_value_cop: 16000,
  category_id: null,
  weight: 60,
  expires_days: 90,
  color: 'primary',
  sort_order: 1,
  active: true,
  awarded: false,
  ...over,
});

const CATALOG = [
  prize({}),
  prize({ id: 'p2', name: 'Bebida gratis', short_label: 'Gratis', type: 'free_item', value: 0, weight: 40, awarded: true }),
];

function mockApi(role: 'owner' | 'operator' = 'owner', put?: (body: unknown) => Response) {
  const bodies: unknown[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const req = input instanceof Request ? input : new Request(new URL(String(input), 'http://localhost'), init);
    const key = `${req.method} ${new URL(req.url).pathname}`;
    if (key === 'GET /api/admin/auth/me') return json(me(role));
    if (key === 'GET /api/admin/prizes/catalog') return json(CATALOG);
    if (key === 'PUT /api/admin/prizes/catalog') {
      const body = await req.json();
      bodies.push(body);
      return put ? put(body) : json(CATALOG);
    }
    return json({ error: { code: 'internal_error' } }, 500);
  });
  return bodies;
}

const renderPage = () =>
  renderRoutes(
    [
      {
        path: '/admin/wheel',
        element: (
          <>
            <WheelEditorPage />
            <Toaster />
          </>
        ),
      },
    ],
    { pathname: '/admin/wheel' },
  );

afterEach(() => vi.restoreAllMocks());

describe('Ruleta de premios (editor)', () => {
  it('shows each prize as a percentage of 100 % and nothing to save', async () => {
    mockApi();
    renderPage();
    expect(await screen.findByLabelText('Probabilidad de 10% de descuento')).toHaveValue('60');
    expect(screen.getByLabelText('Probabilidad de Bebida gratis')).toHaveValue('40');
    expect(screen.getByRole('status')).toHaveTextContent('Total 100 %');
    expect(screen.getByRole('button', { name: 'Sin cambios' })).toBeDisabled();
    expect(screen.getByText('ganado')).toBeInTheDocument();
  });

  it('blocks saving until the active prizes add up to 100 %, then sends the wheel', async () => {
    const bodies = mockApi();
    renderPage();
    const first = await screen.findByLabelText('Probabilidad de 10% de descuento');
    await userEvent.clear(first);
    await userEvent.type(first, '50');
    expect(screen.getByRole('status')).toHaveTextContent('faltan 10 %');
    expect(screen.getByRole('alert')).toHaveTextContent('Faltan 10 % para llegar a 100 %.');
    expect(screen.getByRole('button', { name: 'Guardar ruleta' })).toBeDisabled();

    const second = screen.getByLabelText('Probabilidad de Bebida gratis');
    await userEvent.clear(second);
    await userEvent.type(second, '50');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ruleta' }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      prizes: [
        { id: 'p1', weight: 5000 },
        { id: 'p2', weight: 5000 },
      ],
    });
    expect(await screen.findByText(/Ruleta guardada/)).toBeInTheDocument();
  });

  it('adds a prize from the sheet and shares the chance evenly', async () => {
    const bodies = mockApi();
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Agregar premio/ }));
    const sheet = await screen.findByRole('dialog');
    await userEvent.type(within(sheet).getByLabelText('Nombre'), 'Galleta gratis');
    await userEvent.type(within(sheet).getByLabelText('Texto en la ruleta'), 'Galleta');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Extra gratis' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Agregar a la ruleta' }));

    await userEvent.click(screen.getByRole('button', { name: 'Repartir igual' }));
    expect(screen.getByRole('status')).toHaveTextContent('Total 100 %');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ruleta' }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect((bodies[0] as { prizes: unknown[] }).prizes).toEqual([
      expect.objectContaining({ id: 'p1', weight: 3334 }),
      expect.objectContaining({ id: 'p2', weight: 3333 }),
      expect.objectContaining({ id: null, name: 'Galleta gratis', type: 'extra_item', weight: 3333 }),
    ]);
  });

  it('locks the reward of a prize already won', async () => {
    mockApi();
    renderPage();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[1]!);
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByText(/ya fue ganado/)).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: '% de descuento' })).toBeDisabled();
    expect(within(sheet).getByLabelText('Tope (opcional)')).toBeDisabled();
  });

  it('shows the server message when saving fails', async () => {
    mockApi('owner', () =>
      json({ error: { code: 'prize_locked', message: 'x', extra: {} } }, 409),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Repartir igual' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ruleta' }));
    expect(await screen.findByText(/no puedes cambiar su tipo ni su valor/)).toBeInTheDocument();
  });

  it('is only for the owner', async () => {
    mockApi('operator');
    renderPage();
    expect(await screen.findByText('Solo el dueño puede editar la ruleta.')).toBeInTheDocument();
  });
});
