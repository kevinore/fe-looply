import { createSpinner, FREE_SPEED, landingTarget, RAMP_MS, segmentAtPointer } from './wheel';

describe('landingTarget', () => {
  for (const n of [4, 5, 6, 8]) {
    const seg = 360 / n;
    for (let index = 0; index < n; index++) {
      it(`n=${n} index=${index}: segment center lands under the pointer`, () => {
        for (const r of [0, 0.5, 0.999]) {
          for (const current of [0, 137, 1800 + 45, 12345.6]) {
            const rot = landingTarget(current, index, n, () => r);
            // Angle on the wheel currently under the pointer (top, 0°).
            const under = (((360 - (rot % 360)) % 360) + 360) % 360;
            const center = index * seg + seg / 2;
            const diff = Math.abs(((under - center + 540) % 360) - 180);
            expect(diff).toBeLessThanOrEqual(seg * 0.3 + 1e-9);
            expect(segmentAtPointer(rot, n)).toBe(index);
            // Always forward, at least 2 full turns, less than 3.
            expect(rot - current).toBeGreaterThanOrEqual(720);
            expect(rot - current).toBeLessThan(1080);
          }
        }
      });
    }
  }
});

/** Manual clock: each step() runs one animation frame `ms` later. */
function fakeClock() {
  let t = 0;
  let cb: (() => void) | null = null;
  return {
    clock: {
      now: () => t,
      frame: (f: () => void) => {
        cb = f;
        return 1;
      },
      cancel: () => {
        cb = null;
      },
    },
    step(ms = 16) {
      t += ms;
      const f = cb;
      cb = null;
      f?.();
    },
    get scheduled() {
      return cb !== null;
    },
  };
}

describe('createSpinner', () => {
  it('moves from the first frame, before the result arrives', () => {
    const c = fakeClock();
    const seen: number[] = [];
    const s = createSpinner((d) => seen.push(d), c.clock);
    s.start();
    c.step(50);
    c.step(50);
    expect(seen.length).toBe(2);
    expect(seen[1]!).toBeGreaterThan(seen[0]!);
    expect(seen[0]!).toBeGreaterThan(0);
    // Keeps spinning for as long as the server takes.
    for (let i = 0; i < 100; i++) c.step(50);
    expect(s.phase).toBe('free');
    expect(s.rotation).toBeGreaterThan(FREE_SPEED * 4); // ~5 s at 2 turns/s
  });

  it('lands on the server segment without a speed jump, then calls done once', () => {
    const c = fakeClock();
    const s = createSpinner(() => {}, c.clock);
    const done = vi.fn();
    s.start();
    for (let i = 0; i < 40; i++) c.step(16); // past the speed-up
    s.land(3, 5, done);
    c.step(16); // landing starts on this frame
    expect(s.phase).toBe('landing');
    // Speed right after landing starts ≈ free speed (no visible jerk).
    const a = s.rotation;
    c.step(16);
    const speed = ((s.rotation - a) / 16) * 1000;
    expect(speed).toBeGreaterThan(FREE_SPEED * 0.9);
    expect(speed).toBeLessThanOrEqual(FREE_SPEED * 1.01);
    for (let i = 0; i < 1000 && s.phase !== 'idle'; i++) c.step(16);
    expect(s.phase).toBe('idle');
    expect(segmentAtPointer(s.rotation, 5)).toBe(3);
    expect(done).toHaveBeenCalledTimes(1);
    expect(c.scheduled).toBe(false);
  });

  it('a fast answer still waits for the speed-up before landing', () => {
    const c = fakeClock();
    const s = createSpinner(() => {}, c.clock);
    s.start();
    s.land(0, 4, () => {});
    c.step(RAMP_MS / 2);
    expect(s.phase).toBe('free');
    c.step(RAMP_MS / 2);
    expect(s.phase).toBe('landing');
  });

  it('stop() freezes the wheel (failed request) and it can start again', () => {
    const c = fakeClock();
    const s = createSpinner(() => {}, c.clock);
    s.start();
    c.step(100);
    s.stop();
    const at = s.rotation;
    expect(c.scheduled).toBe(false);
    expect(s.phase).toBe('idle');
    s.start();
    c.step(100);
    expect(s.rotation).toBeGreaterThan(at);
  });
});
