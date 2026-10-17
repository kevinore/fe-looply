import { screen } from '@testing-library/react';
import { renderRoutes } from '@/features/customer/test-utils';
import InstallPage from './pages/InstallPage';

const IPAD_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

describe('Instalar app del operador', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
  });

  it('on an iPad, explains Compartir → Agregar a pantalla de inicio', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPAD_UA);
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    renderRoutes([{ path: '/admin/install', element: <InstallPage /> }], { pathname: '/admin/install' });
    expect(screen.getByRole('heading', { name: 'Instala la app del operador' })).toBeInTheDocument();
    const steps = screen.getAllByRole('listitem');
    expect(steps[0]).toHaveTextContent('Toca Compartir arriba, junto a la barra de direcciones');
    expect(steps[1]).toHaveTextContent('Agregar a pantalla de inicio');
  });

  it('on a desktop, asks to open it on the device', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (X11; Linux x86_64) Chrome/140');
    renderRoutes([{ path: '/admin/install', element: <InstallPage /> }], { pathname: '/admin/install' });
    expect(screen.getByText(/Abre esta página en la tablet o el celular/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
