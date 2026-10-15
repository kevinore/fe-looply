import catalog from '../../error_codes.json';

/**
 * User-facing messages for every error code (backend table 14.2, exported to
 * error_codes.json by the backend). Never show a technical code, an HTTP
 * number or English text to the user.
 */
const MESSAGES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(catalog).map(([code, v]) => [code, v.message])),
  network_error: 'Sin conexión. Revisa tu señal e intenta de nuevo.',
};

export const FALLBACK_MESSAGE = 'Algo salió mal. Intenta de nuevo.';

export function messageFor(code: string): string {
  return MESSAGES[code] ?? FALLBACK_MESSAGE;
}

export const KNOWN_ERROR_CODES = Object.keys(MESSAGES);

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly extra: Record<string, unknown>;

  constructor(code: string, status = 0, extra: Record<string, unknown> = {}) {
    super(messageFor(code));
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

export function isApiError(e: unknown, code?: string): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}

/** Message to show for any thrown value. */
export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : FALLBACK_MESSAGE;
}
