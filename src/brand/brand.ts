import type { Branding } from '@/api/types';

export const DEFAULT_COLORS = {
  primary: '#E682AC',
  secondary: '#5DA882',
  ink: '#1A1A1A',
  background: '#F4F1EC',
} as const;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const pick = (v: string | undefined, fallback: string) => (v && HEX.test(v) ? v : fallback);

export function resolveColors(branding: Branding | undefined) {
  const c = branding?.colors ?? {};
  return {
    primary: pick(c.primary, DEFAULT_COLORS.primary),
    secondary: pick(c.secondary, DEFAULT_COLORS.secondary),
    ink: pick(c.ink, DEFAULT_COLORS.ink),
    background: pick(c.background ?? c.bg, DEFAULT_COLORS.background),
  };
}

/** Applies branding to the document: CSS variables, theme-color and title. */
export function applyBranding(branding: Branding | undefined, fallbackName?: string): void {
  const colors = resolveColors(branding);
  const root = document.documentElement.style;
  root.setProperty('--brand-primary', colors.primary);
  root.setProperty('--brand-secondary', colors.secondary);
  root.setProperty('--brand-ink', colors.ink);
  root.setProperty('--brand-bg', colors.background);
  setThemeColor(colors.primary);
  const name = branding?.display_name ?? fallbackName;
  if (name) document.title = name;
}

export function setThemeColor(color: string): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

/** Wheel segment color token ("primary" | "secondary" | "ink" | hex) → CSS color. */
export function segmentColor(token: string | null | undefined, index: number): string {
  if (token && HEX.test(token)) return token;
  switch (token) {
    case 'primary':
      return 'var(--brand-primary)';
    case 'secondary':
      return 'var(--brand-secondary)';
    case 'ink':
      return 'var(--brand-ink)';
    default:
      return ['var(--brand-primary)', 'white', 'var(--brand-secondary)', 'var(--brand-ink)'][index % 4]!;
  }
}

/** Readable text color for a segment background token. */
export function segmentTextColor(token: string | null | undefined, index: number): string {
  const bg = segmentColor(token, index);
  if (bg === 'var(--brand-ink)' || bg === 'var(--brand-secondary)') return 'white';
  return 'var(--brand-ink)';
}
