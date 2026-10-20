/**
 * resourceCalculations.test.ts
 * ----------------------------
 * Unit tests for the pure numeric helpers: clamping, bounds, and rejection of
 * invalid numbers (spec 4 & 5 support).
 */

import { describe, expect, it } from 'vitest';
import {
  applyDelta,
  applyResourceChanges,
  clamp,
  isValidNumber,
  sanitizeResourceChanges,
} from '../features/simulation/resourceCalculations';

describe('clamp', () => {
  it('clamps into [0,100] by default', () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(42)).toBe(42);
  });

  it('throws on NaN and Infinity', () => {
    expect(() => clamp(Number.NaN)).toThrow();
    expect(() => clamp(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('applyDelta', () => {
  it('adds and subtracts within bounds', () => {
    expect(applyDelta(50, 10)).toBe(60);
    expect(applyDelta(5, -20)).toBe(0);
    expect(applyDelta(95, 20)).toBe(100);
  });

  it('rejects a non-finite delta', () => {
    expect(() => applyDelta(50, Number.NaN)).toThrow();
  });
});

describe('applyResourceChanges', () => {
  it('returns a new object and leaves the input unchanged', () => {
    const resources = { power: 50, water: 50, food: 50, oxygen: 50 };
    const next = applyResourceChanges(resources, { power: 10, food: -5 });
    expect(next).not.toBe(resources);
    expect(resources.power).toBe(50); // unchanged
    expect(next.power).toBe(60);
    expect(next.food).toBe(45);
  });
});

describe('sanitizeResourceChanges', () => {
  it('rejects non-finite values', () => {
    expect(() => sanitizeResourceChanges({ power: Number.NaN })).toThrow();
  });

  it('passes through finite values (including negatives)', () => {
    expect(sanitizeResourceChanges({ power: -5, water: 3 })).toEqual({ power: -5, water: 3 });
  });
});

describe('isValidNumber', () => {
  it('distinguishes finite numbers from junk', () => {
    expect(isValidNumber(1)).toBe(true);
    expect(isValidNumber(Number.NaN)).toBe(false);
    expect(isValidNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidNumber('5')).toBe(false);
  });
});
