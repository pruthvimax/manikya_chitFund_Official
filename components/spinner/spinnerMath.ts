/* =========================================================
   SPINNER MATH (pure functions, no React)

   Geometry:
   - Slice i covers wheel-angles [i*seg, (i+1)*seg), measured
     clockwise from the TOP of the wheel.
   - The pointer is fixed at the top.
   - If the wheel is rotated clockwise by R degrees, the point of
     the wheel that sits under the pointer is  (360 - R % 360) % 360.

   Every device receives the same inputs from the server
   (candidate count, winnerIndex, rotations, seed), so every device
   computes the same final rotation and stops on the same slice.
========================================================= */

export const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

// Fast start, long smooth slow-down, gentle stop.
export const easeOutQuart = (p: number) => 1 - Math.pow(1 - clamp01(p), 4);

/*
  Total clockwise rotation (degrees) for the wheel.
  `seed` (0..1) moves the stopping point inside the winning slice,
  so the pointer does not always land dead-centre. It is kept away
  from the slice edges (uses only the middle 70% of the slice).
*/
export const computeTotalRotation = (opts: {
  count: number;
  winnerIndex: number;
  rotations: number;
  seed: number;
}) => {
  const count = Math.max(1, Math.floor(opts.count));
  const seg = 360 / count;
  const index = Math.min(Math.max(Math.floor(opts.winnerIndex), 0), count - 1);
  const offsetInSlice = 0.5 + (clamp01(opts.seed) - 0.5) * 0.7; // 0.15 .. 0.85
  const targetAngle = (index + offsetInSlice) * seg; // wheel-angle that must end under the pointer
  const rest = (360 - targetAngle) % 360;
  return Math.max(0, Math.floor(opts.rotations)) * 360 + rest;
};

// Which slice is under the pointer after rotating by `rotation` degrees.
export const sliceUnderPointer = (rotation: number, count: number) => {
  const seg = 360 / Math.max(1, count);
  const wheelAngle = (((360 - (rotation % 360)) % 360) + 360) % 360;
  return Math.min(Math.floor(wheelAngle / seg), count - 1);
};

// Rotation at a moment in time.
export const rotationAt = (opts: {
  now: number; // server-synchronised time (ms)
  startsAt: number;
  durationMs: number;
  total: number;
}) => {
  const p = clamp01((opts.now - opts.startsAt) / Math.max(1, opts.durationMs));
  return opts.total * easeOutQuart(p);
};
