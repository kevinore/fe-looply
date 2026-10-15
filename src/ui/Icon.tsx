import type { SVGProps } from 'react';

const PATHS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  scan: 'M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-3.5-3.5',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1s3.5 1 5 1zm0 0c1.5-3 5-3.5 5-1s-3.5 1-5 1z',
  card: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 10h18',
  history: 'M12 8v4l3 2M3.5 12a8.5 8.5 0 102.5-6M3 4v4h4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  share: 'M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
  plusSquare: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2zM12 8v8M8 12h8',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  logout: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10',
  wifiOff: 'M3 3l18 18M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 015.5-2.7M19 12.5a10 10 0 00-3-2M2 8.8a15 15 0 014.2-2.6M22 8.8A15 15 0 0010.7 5M12 20h.01',
  camera: 'M4 8a2 2 0 012-2h2l2-2h4l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2zM12 17a4 4 0 100-8 4 4 0 000 8z',
  backspace: 'M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7zM12 9l6 6M18 9l-6 6',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
