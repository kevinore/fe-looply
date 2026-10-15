import { useSyncExternalStore } from 'react';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Call once at startup (main.tsx), before React renders. */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export function useInstallPrompt(): BeforeInstallPromptEvent | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => deferred,
    () => null,
  );
}

/** Shows the native prompt. Resolves true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  deferred = null;
  emit();
  return outcome === 'accepted';
}

const SEEN_COOKIE = 'install_prompt_seen';

export function installPromptSeen(): boolean {
  return document.cookie.split('; ').some((c) => c === `${SEEN_COOKIE}=1`);
}

/** Non-sensitive frontend cookie, 180 days (plan §7.4). */
export function markInstallPromptSeen(): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SEEN_COOKIE}=1; Max-Age=${180 * 86400}; Path=/; SameSite=Lax${secure}`;
}
