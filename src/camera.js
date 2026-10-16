// Preserve a minimum horizontal field of view on portrait displays.
export function cameraPose(aspect, boosted = false) {
  const minHorizontal = (68 * Math.PI) / 180;
  const base = boosted ? 72 : 58;
  return {
    fov: Math.max(
      base,
      (2 *
        Math.atan(Math.tan(minHorizontal / 2) / Math.max(0.25, aspect)) *
        180) /
        Math.PI,
    ),
    z: aspect < 1 ? 20 : 17,
  };
}
