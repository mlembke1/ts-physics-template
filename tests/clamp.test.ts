import { describe, expect, it } from 'vitest';

import { clamp } from '../src/domain/clamp.js';

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to the lower bound', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it('clamps to the upper bound', () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('throws when min exceeds max', () => {
    expect(() => clamp(1, 10, 0)).toThrow(RangeError);
  });
});
