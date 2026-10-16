// Relative swept interval prevents tunnelling at low/mobile frame rates.
export function crossesDepth(from, to, targetFrom, targetTo, radius) {
  const a = from - targetFrom,
    b = to - targetTo;
  return Math.min(a, b) <= radius && Math.max(a, b) >= -radius;
}
