import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button, ButtonLink, Screen } from '@/ui';

export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <Screen className="items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-semibold">{notFound ? 'Esta página no existe' : 'Algo salió mal'}</h1>
      <p className="text-brand-muted">
        {notFound ? 'Revisa el enlace o vuelve al inicio.' : 'Recarga la página para intentarlo de nuevo.'}
      </p>
      <div className="grid w-full max-w-xs gap-2">
        {!notFound && <Button onClick={() => location.reload()}>Recargar</Button>}
        <ButtonLink to="/client" variant={notFound ? 'primary' : 'ghost'}>
          Ir al inicio
        </ButtonLink>
      </div>
    </Screen>
  );
}
