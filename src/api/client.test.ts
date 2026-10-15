import catalog from '../../error_codes.json';
import { unwrap } from './client';
import { ApiError, KNOWN_ERROR_CODES, messageFor } from './errors';

const res = (status: number) => new Response(null, { status });

describe('unwrap', () => {
  it('returns data on success', async () => {
    await expect(unwrap(Promise.resolve({ data: { ok: 1 }, response: res(200) }))).resolves.toEqual({ ok: 1 });
  });

  it('throws ApiError with code, status and extra', async () => {
    const error = { error: { code: 'customer_exists', message: 'x', extra: { alias: 'Ana', phone_last4: '4567' } } };
    const p = unwrap(Promise.resolve({ error, response: res(409) }));
    await expect(p).rejects.toMatchObject({ code: 'customer_exists', status: 409, extra: { alias: 'Ana' } });
  });

  it('maps a network failure to network_error', async () => {
    await expect(unwrap(Promise.reject(new TypeError('Failed to fetch')))).rejects.toMatchObject({ code: 'network_error' });
  });

  it('unknown bodies fall back to a safe code', async () => {
    await expect(unwrap(Promise.resolve({ error: 'boom', response: res(502) }))).rejects.toMatchObject({ code: 'internal_error' });
  });
});

describe('error messages', () => {
  it('every backend code (table 14.2) has a Spanish message', () => {
    for (const code of Object.keys(catalog)) {
      expect(KNOWN_ERROR_CODES).toContain(code);
      expect(messageFor(code)).not.toMatch(/^[a-z_]+$/);
    }
    expect(messageFor('network_error')).toBe('Sin conexión. Revisa tu señal e intenta de nuevo.');
  });

  it('never exposes a technical code for unknown errors', () => {
    const e = new ApiError('some_new_code', 418);
    expect(e.message).toBe('Algo salió mal. Intenta de nuevo.');
  });
});
