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
  computeDailyResourceDelta,
  isValidNumber,
  lifeSupportProductionFactor,
  sanitizeResourceChanges,
  shortageCrewChanges,
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

describe('lifeSupportProductionFactor', () => {
  it.each([
    [36, 1],
    [35, 0.85],
    [16, 0.85],
    [15, 0.65],
    [1, 0.65],
    [0, 0.5],
  ])('uses the expected factor when power is %s', (power, expected) => {
    expect(lifeSupportProductionFactor(power)).toBe(expected);
  });

  it('reduces gross life-support production without scaling consumption', () => {
    const systems = {
      powerGeneration: 100,
      lifeSupportEfficiency: 100,
      foodProduction: 100,
      shieldingIntegrity: 100,
    };
    const crew = { health: 100, morale: 100, radiationExposure: 0 };
    const normal = computeDailyResourceDelta(systems, crew, 1);
    const impaired = computeDailyResourceDelta(systems, crew, 1, 0.5);

    expect(normal.oxygen).toBe(1);
    expect(normal.water).toBe(0.5);
    expect(impaired.oxygen).toBe(-3.5);
    expect(impaired.water).toBe(-3.25);
  });
});

describe('shortageCrewChanges', () => {
  it.each([
    [16, 16, {}],
    [15, 16, { health: -0.5, morale: -1 }],
    [1, 16, { health: -0.5, morale: -1 }],
    [0, 16, { health: -1, morale: -2 }],
    [16, 15, { health: -1 }],
    [16, 1, { health: -1 }],
    [16, 0, { health: -2 }],
    [0, 0, { health: -3, morale: -2 }],
  ])('calculates shortage effects at food %s and water %s', (food, water, expected) => {
    expect(shortageCrewChanges({ power: 50, oxygen: 50, food, water })).toEqual(expected);
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
