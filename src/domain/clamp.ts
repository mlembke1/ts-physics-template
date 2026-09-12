/**
 * Constrain a number to the inclusive range [min, max].
 *
 * @throws RangeError when `min` is greater than `max`.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError('min must not exceed max');
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
