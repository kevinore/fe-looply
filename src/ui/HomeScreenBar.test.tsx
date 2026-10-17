import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreenBar } from './HomeScreenBar';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('HomeScreenBar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('on a phone browser, offers the guide in friendly words', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_UA);
    render(<HomeScreenBar zone="client" name="Biz" />);
    expect(screen.getByText('Ten tu tarjeta a un toque')).toBeInTheDocument();
    expect(screen.queryByText(/instal/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver cómo' }));
    expect(await screen.findByText('Agrega Biz a tu pantalla de inicio')).toBeInTheDocument();
    expect(screen.getByText(/No descargas nada de ninguna tienda/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Toca Compartir en la barra de abajo');
  });

  it('"Ahora no" hides it for this visit', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_UA);
    const { unmount } = render(<HomeScreenBar zone="admin" name="Biz" />);
    expect(screen.getByText('Ten tu panel de admin a un toque')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByText('Ten tu panel de admin a un toque')).not.toBeInTheDocument();
    unmount();
    render(<HomeScreenBar zone="admin" name="Biz" />);
    expect(screen.queryByText('Ten tu panel de admin a un toque')).not.toBeInTheDocument();
  });

  it('shows nothing on a computer', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (X11; Linux x86_64) Chrome/140');
    const { container } = render(<HomeScreenBar zone="client" name="Biz" />);
    expect(container).toBeEmptyDOMElement();
  });
});
