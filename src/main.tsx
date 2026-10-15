import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/fraunces/soft.css';
import './index.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { queryClient } from './app/queryClient';
import { router } from './app/router';
import { captureInstallPrompt } from './lib/installPrompt';
import { setupSilentUpdates } from './lib/swUpdate';

// Capture Android's install prompt before anything renders (plan §7.10).
captureInstallPrompt();

// New versions install in the background and switch only while the app is hidden.
setupSilentUpdates();

// Last resort: a lazy chunk is gone (e.g. never-cached operator screen after a
// deploy). Load the screen the user was going to as a normal page load, once.
const RELOAD_KEY = 'chunk-reload';
window.addEventListener('vite:preloadError', (event) => {
  const key = RELOAD_KEY;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  event.preventDefault();
  const target = router.state.navigation.location;
  if (target) location.assign(target.pathname + target.search + target.hash);
  else location.reload();
});
// Clear the guard once the app has been stable for a while (avoids reload loops).
window.setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 15_000);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
