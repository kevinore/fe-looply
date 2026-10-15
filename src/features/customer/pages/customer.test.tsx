import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/errors';
import type { ClaimResult, SpinResult } from '@/api/types';
import { claimApi } from '../api';
import { makeCard, renderRoutes } from '../test-utils';
import ClaimedPage from './ClaimedPage';
import ConfirmPage from './ConfirmPage';
import RegisterPage from './RegisterPage';
import SpinPage from './SpinPage';

vi.mock('@/lib/events', () => ({ sendEvent: vi.fn(), reportPageLoaded: vi.fn() }));
import { sendEvent } from '@/lib/events';

const preview = {
  state: 'claimable' as const,
  sale: { items_count: 2, total_cop: 28000, paid_at: '2026-09-27T15:00:00Z' },
  business: { name: 'Negocio', branding: {} },
};

const result = (over: Partial<ClaimResult> = {}): ClaimResult => ({
  card: makeCard(),
  counted: true,
  new_spins: [],
  stamp_eligible: true,
  ...over,
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('C1 · Registro', () => {
  const setup = () =>
    renderRoutes([{ path: '/c/register/:token', element: <RegisterPage /> }], {
      pathname: '/c/register/tok',
      state: { preview },
    });

  it('keeps the button disabled until phone, name and consent are valid', async () => {
    const user = userEvent.setup();
    setup();
    const button = screen.getByRole('button', { name: 'Girar la ruleta' });
    const consent = screen.getByRole('checkbox');
    expect(button).toBeDisabled();
    expect(consent).not.toBeChecked();
    expect(screen.getByText(/2 bebidas · \$28\.000/)).toBeInTheDocument();
    expect(sendEvent).toHaveBeenCalledWith('register_viewed');

    await user.type(screen.getByLabelText('Celular'), '3101234567');
    expect(screen.getByLabelText('Celular')).toHaveValue('310 123 4567');
    await user.type(screen.getByLabelText('¿Cómo te llamas?'), 'Ana');
    expect(button).toBeDisabled();
    await user.click(consent);
    expect(button).toBeEnabled();

    await user.clear(screen.getByLabelText('Celular'));
    await user.type(screen.getByLabelText('Celular'), '6011234567');
    expect(button).toBeDisabled();
  });

  it('registers with +57 and goes to ¿Eres …? on customer_exists', async () => {
    const user = userEvent.setup();
    const register = vi
      .spyOn(claimApi, 'register')
      .mockRejectedValue(new ApiError('customer_exists', 409, { alias: 'Ana', phone_last4: '4567' }));
    setup();
    await user.type(screen.getByLabelText('Celular'), '3101234567');
    await user.type(screen.getByLabelText('¿Cómo te llamas?'), 'Anita');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Girar la ruleta' }));
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({ phone: '+573101234567', alias: 'Anita', consent: true, claim_token: 'tok' });
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/c/confirm/tok'));
    expect(screen.getByTestId('state')).toHaveTextContent('"alias":"Ana"');
    expect(screen.getByTestId('state')).toHaveTextContent('"last4":"4567"');
  });

  it('shows invalid_phone under the field', async () => {
    const user = userEvent.setup();
    vi.spyOn(claimApi, 'register').mockRejectedValue(new ApiError('invalid_phone', 422));
    setup();
    await user.type(screen.getByLabelText('Celular'), '3101234567');
    await user.type(screen.getByLabelText('¿Cómo te llamas?'), 'Ana');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Girar la ruleta' }));
    expect(await screen.findByText('Ese número no parece un celular colombiano.')).toBeInTheDocument();
    expect(screen.getByLabelText('Celular')).toHaveAttribute('aria-invalid', 'true');
  });

  it('goes to the spin when the result unlocks one', async () => {
    const user = userEvent.setup();
    vi.spyOn(claimApi, 'register').mockResolvedValue(
      result({ new_spins: [{ id: 'sp1', reason: 'welcome', milestone_n: null }] }),
    );
    setup();
    await user.type(screen.getByLabelText('Celular'), '3101234567');
    await user.type(screen.getByLabelText('¿Cómo te llamas?'), 'Ana');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Girar la ruleta' }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/c/spin/sp1'));
  });
});

describe('C2 · ¿Eres …?', () => {
  const state = { phone: '+573101234567', digits: '3101234567', alias: 'Ana', last4: '4567', typedAlias: 'Anita', preview };
  const setup = (s: unknown = state) =>
    renderRoutes([{ path: '/c/confirm/:token', element: <ConfirmPage /> }], { pathname: '/c/confirm/tok', state: s });

  it('confirms and sums the purchase', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(claimApi, 'confirm').mockResolvedValue(result());
    setup();
    expect(screen.getByRole('heading', { name: '¿Eres Ana?' })).toBeInTheDocument();
    expect(screen.getByText('310 ••• 4567')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sí, soy yo' }));
    expect(confirm).toHaveBeenCalledWith({ phone: '+573101234567', claim_token: 'tok' });
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/c/claimed'));
  });

  it('"No" goes back to C1 keeping the name', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'No, corregir número' }));
    expect(sendEvent).toHaveBeenCalledWith('identity_rejected');
    expect(screen.getByTestId('path')).toHaveTextContent('/c/register/tok');
    expect(screen.getByTestId('state')).toHaveTextContent('"alias":"Anita"');
    expect(screen.getByTestId('state')).toHaveTextContent('"focusPhone":true');
  });

  it('without state (reload) restarts from the QR entry', () => {
    setup(null);
    expect(screen.getByTestId('path')).toHaveTextContent('/c/claim/tok');
  });
});

describe('S2 · +1 compra', () => {
  const setup = (counted: boolean) =>
    renderRoutes([{ path: '/c/claimed', element: <ClaimedPage /> }], {
      pathname: '/c/claimed',
      state: { result: result({ counted }), sale: preview.sale },
    });

  it('counted: shows +1 compra and progress', () => {
    setup(true);
    expect(screen.getByRole('heading', { name: '+1 compra' })).toBeInTheDocument();
    expect(screen.getByText('3 de 5 compras')).toBeInTheDocument();
    expect(screen.getByText('faltan 2 para girar')).toBeInTheDocument();
    expect(screen.queryByText(/Ya sumaste/)).not.toBeInTheDocument();
  });

  it('not counted: thanks the customer instead', () => {
    setup(false);
    expect(screen.queryByText('+1 compra')).not.toBeInTheDocument();
    expect(screen.getByText('Ya sumaste tu compra de hoy. ¡Gracias por volver!')).toBeInTheDocument();
  });

  it('a sale that earns no stamp (e.g. only ice cream) says so', () => {
    renderRoutes([{ path: '/c/claimed', element: <ClaimedPage /> }], {
      pathname: '/c/claimed',
      state: { result: result({ counted: false, stamp_eligible: false }), sale: preview.sale },
    });
    expect(screen.getByText('¡Gracias por tu compra! Esta compra no suma a tu tarjeta.')).toBeInTheDocument();
    expect(screen.queryByText(/Ya sumaste/)).not.toBeInTheDocument();
  });
});

describe('C3 · Ruleta', () => {
  const spinResult: SpinResult = {
    segment_index: 1,
    prize_award: { id: 'aw1', name: 'Topping extra', short_label: 'Topping', type: 'extra_item', expires_at: '2027-01-02T00:00:00Z' },
    card: makeCard(),
  };
  const wheel = {
    segments: [
      { id: 's1', short_label: '10% dto', color: 'primary' },
      { id: 's2', short_label: 'Topping', color: 'secondary' },
    ],
  };
  const setup = () =>
    renderRoutes([{ path: '/c/spin/:spinId', element: <SpinPage /> }], {
      pathname: '/c/spin/sp1',
      state: { result: result({ new_spins: [{ id: 'sp1', reason: 'welcome', milestone_n: null }] }) },
    });

  it('on reload with a stored key, re-POSTs and shows the prize without animating', async () => {
    sessionStorage.setItem('spin:sp1', 'existing-key');
    vi.spyOn(claimApi, 'wheel').mockResolvedValue(wheel);
    const spin = vi.spyOn(claimApi, 'spin').mockResolvedValue(spinResult);
    setup();
    expect(screen.getByText('Recuperando tu premio…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/c/prize/aw1'));
    expect(spin).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('state')).toHaveTextContent('"justWon":true');
    expect(sessionStorage.getItem('spin:sp1')).toBe('existing-key');
  });

  it('a double tap on Girar sends a single request and stores the key', async () => {
    const user = userEvent.setup();
    vi.spyOn(claimApi, 'wheel').mockResolvedValue(wheel);
    let resolve!: (r: SpinResult) => void;
    const spin = vi.spyOn(claimApi, 'spin').mockReturnValue(new Promise((r) => (resolve = r)));
    setup();
    expect(await screen.findByRole('heading', { name: 'Gira, Ana.' })).toBeInTheDocument();
    const button = await screen.findByRole('button', { name: 'Girar' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.dblClick(button);
    expect(spin).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('spin:sp1')).toMatch(/[0-9a-f-]{36}/);
    resolve(spinResult);
  });

  it('the wheel starts turning on the tap, before the server answers', async () => {
    const user = userEvent.setup();
    vi.spyOn(claimApi, 'wheel').mockResolvedValue(wheel);
    let resolve!: (r: SpinResult) => void;
    vi.spyOn(claimApi, 'spin').mockReturnValue(new Promise((r) => (resolve = r)));
    setup();
    const button = await screen.findByRole('button', { name: 'Girar' });
    await waitFor(() => expect(button).toBeEnabled());
    const rotor = screen.getByRole('img', { name: 'Ruleta de premios' }).parentElement!;
    expect(rotor.style.transform).toBe('');
    await user.click(button);
    // Still waiting for the server, but already spinning.
    await waitFor(() => expect(rotor.style.transform).toMatch(/^rotate\((?!0deg)[\d.]+deg\)$/));
    resolve(spinResult);
  });

  it('spin_not_available shows a message with a link to the card', async () => {
    const user = userEvent.setup();
    vi.spyOn(claimApi, 'wheel').mockResolvedValue(wheel);
    vi.spyOn(claimApi, 'spin').mockRejectedValue(new ApiError('spin_not_available', 409));
    setup();
    const button = await screen.findByRole('button', { name: 'Girar' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(await screen.findByText('Este giro ya no está disponible.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi tarjeta' })).toHaveAttribute('href', '/c');
  });
});
