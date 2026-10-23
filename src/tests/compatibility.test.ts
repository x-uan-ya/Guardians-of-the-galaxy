/**
 * compatibility.test.ts
 * ---------------------
 * Tests the advisory Occupation × Mission compatibility matrix:
 *  - known pairings return their configured rating + a non-empty reason,
 *  - unlisted pairings fall back to NEUTRAL,
 *  - every mission×occupation pair resolves to a valid rating (no gaps),
 *  - it is advisory data only (does not touch the engine).
 */

import { describe, expect, it } from 'vitest';
import {
  COMPAT_META,
  NEUTRAL_COMPAT,
  getCompatibility,
  type CompatRating,
} from '../features/mission/compatibility';
import { MISSION_TYPES, OCCUPATIONS } from '../features/simulation/simulationTypes';

describe('known pairings', () => {
  it('rates Engineer strong on Mars (dust-damaged machinery)', () => {
    const c = getCompatibility('mars', 'engineer');
    expect(c.rating).toBe('strong');
    expect(c.reason.length).toBeGreaterThan(0);
  });

  it('rates Botanist challenging on Mars (food is harder)', () => {
    expect(getCompatibility('mars', 'botanist').rating).toBe('challenging');
  });

  it('rates Botanist challenging in deep-space (feeble solar)', () => {
    expect(getCompatibility('deep-space', 'botanist').rating).toBe('challenging');
  });
});

describe('neutral fallback', () => {
  it('returns NEUTRAL for an unlisted pairing', () => {
    // Commander is not explicitly listed for lunar -> neutral fallback.
    const c = getCompatibility('lunar', 'commander');
    expect(c).toEqual(NEUTRAL_COMPAT);
    expect(c.rating).toBe('neutral');
  });
});

describe('completeness', () => {
  it('every mission × occupation pair resolves to a valid rating', () => {
    const valid: CompatRating[] = ['strong', 'neutral', 'challenging'];
    for (const mission of MISSION_TYPES) {
      for (const occ of OCCUPATIONS) {
        const c = getCompatibility(mission, occ);
        expect(valid).toContain(c.rating);
        expect(typeof c.reason).toBe('string');
        expect(c.reason.length).toBeGreaterThan(0);
        // Every rating has UI metadata.
        expect(COMPAT_META[c.rating]).toBeDefined();
      }
    }
  });
});
