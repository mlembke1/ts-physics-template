/**
 * Constrain a number to the inclusive range [min, max].
 *
 * @throws RangeError when `min` is greater than `max`.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError('min must not exceed max');
  }
  // Inclusive bounds: mutating `<`/`>` to `<=`/`>=` is an equivalent mutant.
  // Stryker disable next-line EqualityOperator
  if (value < min) {
    return min;
  }
  // Stryker disable next-line EqualityOperator
  if (value > max) {
    return max;
  }
  return value;
}
