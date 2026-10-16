import { screen } from '@testing-library/react';
import { BrandProvider } from '@/brand/BrandProvider';
import { renderRoutes } from '../test-utils';
import PrivacyPage from './PrivacyPage';

describe('Política de tratamiento de datos', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ name: 'Biz', slug: 'biz', branding: {}, privacy_policy_version: '2026-10-v1' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('names the responsible party from branding.legal, with its contact and version', async () => {
    const branding = {
      legal: {
        legal_name: 'Biz S.A.S.',
        id_number: '900.123.456-7',
        city: 'Bogotá D.C.',
        email: 'datos@biz.co',
        effective_date: '2026-10-16',
      },
    };
    renderRoutes(
      [
        {
          path: '/client/privacy',
          element: (
            <BrandProvider branding={branding} name="Biz">
              <PrivacyPage />
            </BrandProvider>
          ),
        },
      ],
      { pathname: '/client/privacy' },
    );
    expect(screen.getByRole('heading', { name: 'Política de tratamiento de datos personales' })).toBeInTheDocument();
    expect(screen.getByText('Biz S.A.S.')).toBeInTheDocument();
    expect(screen.getByText(/NIT: 900\.123\.456-7/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'datos@biz.co' })[0]).toHaveAttribute('href', 'mailto:datos@biz.co');
    expect(await screen.findByText(/Versión 2026-10-v1/)).toHaveTextContent('Vigente desde el 16 de octubre de 2026');
  });
});
