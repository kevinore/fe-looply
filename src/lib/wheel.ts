/**
 * n equal segments, pointer at the top (0°), the wheel spins clockwise.
 * Segment i spans [i·seg, (i+1)·seg) measured clockwise from the top.
 */

/**
 * Rotation that stops segment `index` under the pointer, at least `minTurns`
 * full turns ahead of `current` (always forward), slightly off-center.
 */
export function landingTarget(
  current: number,
  index: number,
  n: number,
  random: () => number = Math.random,
  minTurns = 2,
): number {
  const seg = 360 / n;
  const center = index * seg + seg / 2;
  const jitter = (random() - 0.5) * seg * 0.6; // never land exactly on the center
  const want = mod360(360 - center + jitter); // rotation (mod 360) that puts it under the pointer
  return current + minTurns * 360 + mod360(want - mod360(current));
}

/** Which segment sits under the pointer for a given rotation. */
export function segmentAtPointer(rotation: number, n: number): number {
  const seg = 360 / n;
  return Math.floor(mod360(360 - mod360(rotation)) / seg) % n;
}

function mod360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Steady speed of the free spin, in degrees per second (2 turns/s). */
export const FREE_SPEED = 720;
/** Speed-up time from rest to FREE_SPEED; the landing waits for it to finish. */
export const RAMP_MS = 350;

type Clock = {
  now: () => number;
  frame: (cb: () => void) => number;
  cancel: (id: number) => void;
};

const browserClock: Clock = {
  now: () => performance.now(),
  frame: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

/**
 * Drives the wheel so it starts moving the instant the customer taps, while the
 * server is still drawing the prize (R12: the server always decides):
 *
 * 1. `start()`: speeds up over RAMP_MS, then spins at FREE_SPEED.
 * 2. `land(index, n, done)`: when the result arrives, decelerates from the current
 *    speed (ease-out cubic whose starting slope equals FREE_SPEED, so there is
 *    no visible jump) and stops on segment `index`, then calls `done`.
 * 3. `stop()`: freezes where it is (e.g. the request failed).
 *
 * `apply` receives the rotation in degrees on every frame.
 */
export function createSpinner(apply: (deg: number) => void, clock: Clock = browserClock) {
  let rotation = 0;
  let phase: 'idle' | 'free' | 'landing' = 'idle';
  let raf = 0;
  let freeStart = 0;
  let freeFrom = 0;
  let pending: { index: number; n: number; done: () => void } | null = null;
  let landing = { from: 0, to: 0, start: 0, duration: 1, done: (() => {}) as () => void };

  const freeDistance = (elapsed: number) =>
    elapsed < RAMP_MS
      ? (FREE_SPEED * elapsed * elapsed) / (2 * RAMP_MS) / 1000
      : (FREE_SPEED * (RAMP_MS / 2 + (elapsed - RAMP_MS))) / 1000;

  const beginLanding = (index: number, n: number, done: () => void, t: number) => {
    const to = landingTarget(rotation, index, n);
    // Ease-out cubic starts at slope 3·distance/duration: match the spin speed.
    const duration = ((3 * (to - rotation)) / FREE_SPEED) * 1000;
    landing = { from: rotation, to, start: t, duration, done };
    phase = 'landing';
  };

  const tick = () => {
    const t = clock.now();
    if (phase === 'free') {
      const elapsed = t - freeStart;
      rotation = freeFrom + freeDistance(elapsed);
      apply(rotation);
      if (pending && elapsed >= RAMP_MS) {
        const p = pending;
        pending = null;
        beginLanding(p.index, p.n, p.done, t);
      }
    } else if (phase === 'landing') {
      const k = Math.min(1, (t - landing.start) / landing.duration);
      rotation = landing.from + (landing.to - landing.from) * (1 - (1 - k) ** 3);
      apply(rotation);
      if (k >= 1) {
        phase = 'idle';
        landing.done();
        return;
      }
    } else {
      return;
    }
    raf = clock.frame(tick);
  };

  return {
    start() {
      if (phase !== 'idle') return;
      phase = 'free';
      freeStart = clock.now();
      freeFrom = rotation;
      raf = clock.frame(tick);
    },
    land(index: number, n: number, done: () => void) {
      if (phase === 'free') pending = { index, n, done };
    },
    stop() {
      clock.cancel(raf);
      phase = 'idle';
      pending = null;
    },
    get rotation() {
      return rotation;
    },
    get phase() {
      return phase;
    },
  };
}
