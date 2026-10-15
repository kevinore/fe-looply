import type { Branding } from '@/api/types';
import { useBrand } from './BrandProvider';

export type MascotPose = 'drink' | 'matcha' | 'counter';

const LOCAL: Record<MascotPose, string> = {
  drink: '/brand/mascot-drink',
  matcha: '/brand/mascot-matcha',
  counter: '/brand/mascot-counter',
};

const FROM_BRANDING: Record<MascotPose, keyof NonNullable<Branding['mascots']>> = {
  drink: 'hero',
  matcha: 'celebrate',
  counter: 'welcome',
};

const WIDTHS = [320, 640, 960];

/**
 * Brand mascot illustration. Uses branding.mascots when the API provides them,
 * otherwise the optimized local files (AVIF → WebP, responsive sizes).
 */
export function Mascot({
  pose,
  className,
  sizes = '(max-width: 480px) 60vw, 280px',
  priority = false,
  alt = '',
}: {
  pose: MascotPose;
  className?: string;
  sizes?: string;
  priority?: boolean;
  alt?: string;
}) {
  const { branding } = useBrand();
  const remote = branding.mascots?.[FROM_BRANDING[pose]];
  const common = {
    alt,
    className,
    decoding: 'async' as const,
    loading: priority ? ('eager' as const) : ('lazy' as const),
    fetchPriority: priority ? ('high' as const) : ('auto' as const),
    width: 640,
    height: 640,
    draggable: false,
  };
  if (remote) return <img src={remote} {...common} />;
  const base = LOCAL[pose];
  const set = (ext: string) => WIDTHS.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img src={`${base}-640.webp`} {...common} />
    </picture>
  );
}

/** Business logo: branding.logo_url, or the bundled default. `size` is the display size in CSS px. */
export function Logo({ className, size = 64 }: { className?: string; size?: number }) {
  const { branding, name } = useBrand();
  const common = { alt: name, className, width: size, height: size, decoding: 'async' as const };
  if (branding.logo_url) return <img src={branding.logo_url} {...common} />;
  return (
    <picture>
      <source
        type="image/webp"
        srcSet="/brand/logo-128.webp 128w, /brand/logo-256.webp 256w, /brand/logo-512.webp 512w"
        sizes={`${size}px`}
      />
      <img src="/brand/logo-256.png" {...common} />
    </picture>
  );
}
