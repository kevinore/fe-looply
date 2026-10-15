import { segmentColor, segmentTextColor } from '@/brand/brand';
import { Logo } from '@/brand/Mascot';
import type { Ref } from 'react';
import type { WheelSegment } from '@/api/types';

const R = 88; // segment radius inside the rim

function point(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)] as const;
}

function slicePath(i: number, n: number) {
  const seg = 360 / n;
  const [x1, y1] = point(i * seg, R);
  const [x2, y2] = point((i + 1) * seg, R);
  const large = seg > 180 ? 1 : 0;
  return `M0 0 L${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

/**
 * Equal-segment wheel (segments don't reflect probabilities). Pointer at the top.
 * The spin is driven frame by frame through `rotorRef` (lib/wheel createSpinner),
 * so it can start before the server has drawn the prize.
 */
export function Wheel({ segments, rotorRef }: { segments: WheelSegment[]; rotorRef?: Ref<HTMLDivElement> }) {
  const n = Math.max(1, segments.length);
  const seg = 360 / n;
  const dots = Array.from({ length: 24 }, (_, i) => point((i * 360) / 24, 95));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(340px,78vw)]">
      {/* Pointer */}
      <svg
        viewBox="0 0 24 20"
        className="absolute top-[-6px] left-1/2 z-10 w-7 -translate-x-1/2 drop-shadow"
        aria-hidden="true"
      >
        <path d="M2 2h20L12 18z" fill="var(--brand-primary)" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div ref={rotorRef} className="size-full will-change-transform">
        <svg viewBox="-100 -100 200 200" className="size-full" role="img" aria-label="Ruleta de premios">
          <circle r="99" fill="var(--brand-ink)" />
          {dots.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill="white" opacity="0.9" />
          ))}
          {segments.map((s, i) => (
            <path key={s.id} d={slicePath(i, n)} fill={segmentColor(s.color, i)} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          ))}
          {segments.map((s, i) => {
            const center = i * seg + seg / 2;
            return (
              <text
                key={s.id}
                transform={`rotate(${center}) translate(0 ${-R * 0.64})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={segmentTextColor(s.color, i)}
                fontFamily="var(--font-sans)"
                fontWeight="700"
                fontSize={n > 6 ? 9 : 11}
              >
                {s.short_label}
              </text>
            );
          })}
        </svg>
      </div>
      {/* Hub stays upright */}
      <div className="absolute top-1/2 left-1/2 flex size-[22%] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-brand-ink bg-white">
        <Logo size={72} className="size-full object-contain" />
      </div>
    </div>
  );
}
