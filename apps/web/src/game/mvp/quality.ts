/** Keep large windows from rendering several times as many pixels as the game needs. */
export function maxPixelRatioForViewport(width: number, height: number, deviceRatio: number): number {
  const pixelBudget = 3_200_000;
  return Math.min(deviceRatio, 1.5, Math.sqrt(pixelBudget / Math.max(1, width * height)));
}

/** One step of the render-resolution controller; hysteresis avoids oscillation. */
export function nextPixelRatio(current: number, fps: number, maximum: number): number {
  const minimum = Math.min(.75, maximum);
  if (fps < 52) return Math.max(minimum, Math.round((current - (fps < 30 ? .25 : .18)) * 100) / 100);
  if (fps > 68) return Math.min(maximum, Math.round((current + .1) * 100) / 100);
  return current;
}
