/**
 * missionEvents.test.ts
 * ---------------------
 * Tests for the mission-specific crisis events. Covers:
 *  - mission eligibility (each site's events only appear on that site),
 *  - per-event consequences for each choice (exact resource/system/crew deltas),
 *  - occupation interactions (the appended mitigation + its effect),
 *  - determinism (same state + choice → same result),
 *  - game-over safety (a legitimate fatal consequence ends the run normally),
 *  - a mission-identity integration test (mission events are actually reachable
 *    through the scheduler on their site, and not on others).
 */

import { describe, expect, it } from 'vitest';
import {
  advanceSimulationDay,
  applyPlayerDecision,
  createInitialGameState,
  resolveEvent,
} from '../features/simulation/simulationEngine';
import {
  calculateEventWeights,
  resolveEventForState,
} from '../features/events/eventTriggers';
import {
  MISSION_EVENTS_BY_SITE,
  MISSION_EVENT_IDS,
  missionEventVariant,
  siteForMissionEvent,
} from '../features/events/missionEvents';
import { findEvent } from '../features/events/eventCatalog';
import { MISSION_TYPES, type GameState, type MissionType, type Occupation } from '../features/simulation/simulationTypes';
import { FIXED_CONFIG } from './helpers';

/**
 * A quiet post-story state (Sol 16+, no active event) on a given site, where
 * random mission events are eligible. Metrics are comfortable so nothing fails.
 */
function postStoryState(missionType: MissionType, overrides: Partial<GameState> = {}): GameState {
  const base = createInitialGameState({ ...FIXED_CONFIG, missionType, gameId: `t-${missionType}` });
  return {
    ...base,
    day: 16,
    activeEvents: [],
    resources: { power: 70, water: 70, food: 70, oxygen: 70 },
    crew: { health: 90, morale: 80, radiationExposure: 10 },
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Mission eligibility
// ───────────────────────────────────────────────────────────────────────────

describe('mission eligibility', () => {
  it('only the active site contributes mission events to the weight pool', () => {
    for (const site of MISSION_TYPES) {
      const weights = calculateEventWeights(postStoryState(site));
      const missionIdsInPool = weights
        .map((w) => w.eventId)
        .filter((id) => MISSION_EVENT_IDS.has(id));

      const expected = MISSION_EVENTS_BY_SITE[site].map((e) => e.id).sort();
      expect(missionIdsInPool.sort()).toEqual(expected);

      // No other site's mission events appear.
      for (const other of MISSION_TYPES) {
        if (other === site) continue;
        for (const e of MISSION_EVENTS_BY_SITE[other]) {
          expect(missionIdsInPool).not.toContain(e.id);
        }
      }
    }
  });

  it('resolveEventForState refuses a mission event on the wrong site', () => {
    const lunarState = postStoryState('lunar');
    // A Mars event id cannot resolve on a lunar run.
    expect(resolveEventForState('mission-mars-dust-storm', lunarState)).toBeUndefined();
    // Its own site resolves fine.
    expect(resolveEventForState('mission-lunar-power-instability', lunarState)?.id).toBe(
      'mission-lunar-power-instability'
    );
  });

  it('siteForMissionEvent maps each event to its site', () => {
    expect(siteForMissionEvent('mission-lunar-thermal-emergency')).toBe('lunar');
    expect(siteForMissionEvent('mission-mars-radiation-spike')).toBe('mars');
    expect(siteForMissionEvent('mission-deep-space-anomaly')).toBe('deep-space');
    expect(siteForMissionEvent('solar-storm')).toBeUndefined();
  });

  it('registers every mission event in the shared catalog', () => {
    for (const id of MISSION_EVENT_IDS) {
      expect(findEvent(id)?.id).toBe(id);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Per-event consequences (apply each choice via the engine, assert deltas)
// ───────────────────────────────────────────────────────────────────────────

/** Put a specific mission event (with the given occupation variant) on state. */
function withMissionEvent(
  missionType: MissionType,
  eventId: string,
  occupation: Occupation = 'commander'
): GameState {
  const base = MISSION_EVENTS_BY_SITE[missionType].find((e) => e.id === eventId);
  if (!base) throw new Error(`No such mission event: ${eventId}`);
  const variant = missionEventVariant(base, occupation);
  const game = createInitialGameState({ ...FIXED_CONFIG, missionType, occupation, gameId: `t-${missionType}` });
  return {
    ...game,
    day: 16,
    resources: { power: 70, water: 70, food: 70, oxygen: 70 },
    crew: { health: 90, morale: 80, radiationExposure: 10 },
    activeEvents: [variant],
  };
}

describe('Lunar Power Instability consequences', () => {
  it('Conserve Power: small power dip + morale dip, no system damage', () => {
    const s = withMissionEvent('lunar', 'mission-lunar-power-instability');
    const next = resolveEvent(s, 'mission-lunar-power-instability', 'mission-lunar-power-instability--conserve');
    expect(next.resources.power).toBe(s.resources.power - 3);
    expect(next.crew.morale).toBe(s.crew.morale - 2);
    expect(next.systems.powerGeneration).toBe(s.systems.powerGeneration); // unchanged
    expect(next.pendingEffects).toHaveLength(0);
  });

  it('Push Systems: immediate boost but schedules a delayed array-degradation', () => {
    const s = withMissionEvent('lunar', 'mission-lunar-power-instability');
    const next = resolveEvent(s, 'mission-lunar-power-instability', 'mission-lunar-power-instability--push');
    expect(next.systems.powerGeneration).toBe(s.systems.powerGeneration + 3);
    expect(next.pendingEffects).toHaveLength(1);
    expect(next.pendingEffects[0]!.parameters).toEqual({
      kind: 'system',
      changes: { powerGeneration: -8 },
    });
  });
});

describe('Mars Dust Storm consequences', () => {
  it('Conservation Mode: small generation + morale dip, preserves stored power', () => {
    const s = withMissionEvent('mars', 'mission-mars-dust-storm');
    const next = resolveEvent(s, 'mission-mars-dust-storm', 'mission-mars-dust-storm--conservation');
    expect(next.resources.power).toBe(s.resources.power); // stored power preserved
    expect(next.systems.powerGeneration).toBe(s.systems.powerGeneration - 3);
    expect(next.crew.morale).toBe(s.crew.morale - 2);
  });

  it('Normal Operations: draws down stored power', () => {
    const s = withMissionEvent('mars', 'mission-mars-dust-storm');
    const next = resolveEvent(s, 'mission-mars-dust-storm', 'mission-mars-dust-storm--normal-ops');
    expect(next.resources.power).toBe(s.resources.power - 12);
  });
});

describe('Mars Radiation Spike consequences (uses existing radiation system)', () => {
  it('Shelter: lowers radiationExposure, costs life-support resources', () => {
    const s = withMissionEvent('mars', 'mission-mars-radiation-spike');
    const next = resolveEvent(s, 'mission-mars-radiation-spike', 'mission-mars-radiation-spike--shelter');
    expect(next.crew.radiationExposure).toBe(s.crew.radiationExposure - 6);
    expect(next.resources.power).toBe(s.resources.power - 6);
    expect(next.resources.oxygen).toBe(s.resources.oxygen - 4);
  });

  it('Continue: raises radiationExposure now and schedules more', () => {
    const s = withMissionEvent('mars', 'mission-mars-radiation-spike');
    const next = resolveEvent(s, 'mission-mars-radiation-spike', 'mission-mars-radiation-spike--continue');
    expect(next.crew.radiationExposure).toBe(s.crew.radiationExposure + 10);
    expect(next.pendingEffects[0]!.parameters).toEqual({
      kind: 'crew',
      changes: { radiationExposure: 6 },
    });
  });
});

describe('Deep-Space consequences', () => {
  it('Anomaly Investigate: costs power now, schedules a resource recovery', () => {
    const s = withMissionEvent('deep-space', 'mission-deep-space-anomaly');
    const next = resolveEvent(s, 'mission-deep-space-anomaly', 'mission-deep-space-anomaly--investigate');
    expect(next.resources.power).toBe(s.resources.power - 8);
    expect(next.pendingEffects[0]!.parameters).toEqual({
      kind: 'resource',
      changes: { water: 10, food: 8 },
    });
  });

  it('Anomaly Ignore: no state change (safe, forgoes benefit)', () => {
    const s = withMissionEvent('deep-space', 'mission-deep-space-anomaly');
    const next = resolveEvent(s, 'mission-deep-space-anomaly', 'mission-deep-space-anomaly--ignore');
    expect(next.resources).toEqual(s.resources);
    expect(next.systems).toEqual(s.systems);
    expect(next.pendingEffects).toHaveLength(0);
  });

  it('Systems Failure Reroute: saves power now but schedules life-support loss', () => {
    const s = withMissionEvent('deep-space', 'mission-deep-space-systems-failure');
    const next = resolveEvent(s, 'mission-deep-space-systems-failure', 'mission-deep-space-systems-failure--reroute');
    expect(next.resources.power).toBe(s.resources.power + 3);
    expect(next.pendingEffects[0]!.parameters).toEqual({
      kind: 'system',
      changes: { lifeSupportEfficiency: -9 },
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Occupation interactions
// ───────────────────────────────────────────────────────────────────────────

describe('occupation interactions', () => {
  it('Engineer gains a mitigation action on Lunar Power Instability', () => {
    const base = MISSION_EVENTS_BY_SITE.lunar.find((e) => e.id === 'mission-lunar-power-instability')!;
    const forEngineer = missionEventVariant(base, 'engineer');
    const forBotanist = missionEventVariant(base, 'botanist');
    expect(forEngineer.availableActions.length).toBe(base.availableActions.length + 1);
    expect(forEngineer.availableActions.some((a) => a.id.endsWith('--engineer'))).toBe(true);
    // Botanist has no fit here → no extra action (not universally relevant).
    expect(forBotanist.availableActions.length).toBe(base.availableActions.length);
  });

  it('Engineer mitigation stabilises the array for less than Push Systems risk', () => {
    const s = withMissionEvent('lunar', 'mission-lunar-power-instability', 'engineer');
    const next = resolveEvent(
      s,
      'mission-lunar-power-instability',
      'mission-lunar-power-instability--engineer'
    );
    expect(next.systems.powerGeneration).toBe(s.systems.powerGeneration + 4);
    expect(next.resources.power).toBe(s.resources.power - 2);
    expect(next.pendingEffects).toHaveLength(0); // no delayed damage, unlike Push
  });

  it('Medical Officer gets a stronger, cheaper shelter on the Mars radiation spike', () => {
    const s = withMissionEvent('mars', 'mission-mars-radiation-spike', 'medicalOfficer');
    const medic = resolveEvent(s, 'mission-mars-radiation-spike', 'mission-mars-radiation-spike--medic');
    expect(medic.crew.radiationExposure).toBe(s.crew.radiationExposure - 10); // vs -6 for the generic shelter
  });

  it('does not grant unrelated occupations a bonus action', () => {
    const radiation = MISSION_EVENTS_BY_SITE.mars.find((e) => e.id === 'mission-mars-radiation-spike')!;
    // A geologist has no radiation mitigation here.
    expect(missionEventVariant(radiation, 'geologist').availableActions.length).toBe(
      radiation.availableActions.length
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Determinism
// ───────────────────────────────────────────────────────────────────────────

describe('determinism', () => {
  it('same state + same choice → identical result', () => {
    const run = (): GameState => {
      const s = withMissionEvent('mars', 'mission-mars-dust-storm', 'engineer');
      return resolveEvent(s, 'mission-mars-dust-storm', 'mission-mars-dust-storm--engineer');
    };
    expect(run()).toEqual(run());
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Game-over safety
// ───────────────────────────────────────────────────────────────────────────

describe('game-over safety', () => {
  it('a legitimate fatal radiation consequence ends the run via the normal rule', () => {
    // Put the character at the brink, then Continue through a radiation spike.
    let s = withMissionEvent('mars', 'mission-mars-radiation-spike', 'commander');
    s = { ...s, crew: { ...s.crew, radiationExposure: 95 } };
    const next = resolveEvent(s, 'mission-mars-radiation-spike', 'mission-mars-radiation-spike--continue');
    // radiationExposure clamps to 100 and the mission fails by the standard rule.
    expect(next.crew.radiationExposure).toBe(100);
    expect(next.mission.status).toBe('failed');
  });

  it('cannot resolve a mission event after the mission has ended', () => {
    const s = withMissionEvent('deep-space', 'mission-deep-space-systems-failure', 'engineer');
    const ended: GameState = { ...s, mission: { ...s.mission, status: 'failed' } };
    expect(() =>
      applyPlayerDecision(ended, {
        eventId: 'mission-deep-space-systems-failure',
        actionId: 'mission-deep-space-systems-failure--repair',
        playerChoice: 'self-directed',
      })
    ).toThrow();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Mission-identity integration: events are reachable on their site via the
// scheduler, and never on another site. We advance days and collect any
// mission events the scheduler produces.
// ───────────────────────────────────────────────────────────────────────────

describe('mission identity integration', () => {
  function collectMissionEventIds(
    missionType: MissionType,
    days: number,
    gameId = `integ-${missionType}`
  ): Set<string> {
    // Start a real run and play straight through, resolving every event with
    // its first action, collecting any mission-specific events encountered.
    let state = createInitialGameState({
      ...FIXED_CONFIG,
      missionType,
      gameId,
    });
    const seen = new Set<string>();
    for (let i = 0; i < days && state.mission.status === 'active'; i++) {
      // Keep the crew alive so we can observe many Sols.
      state = {
        ...state,
        crew: { ...state.crew, health: 90, radiationExposure: Math.min(state.crew.radiationExposure, 30) },
        resources: {
          power: Math.max(state.resources.power, 60),
          water: Math.max(state.resources.water, 60),
          food: Math.max(state.resources.food, 60),
          oxygen: Math.max(state.resources.oxygen, 60),
        },
      };
      const active = state.activeEvents[0];
      if (active) {
        if (MISSION_EVENT_IDS.has(active.id)) seen.add(active.id);
        const firstAction = active.availableActions[0]!;
        state = resolveEvent(state, active.id, firstAction.id);
      } else {
        state = advanceSimulationDay(state).state;
      }
    }
    return seen;
  }

  it('encounters only its own site mission events across a long run', () => {
    for (const site of MISSION_TYPES) {
      const seen = collectMissionEventIds(site, 80);
      // Every mission event seen belongs to this site.
      for (const id of seen) {
        expect(siteForMissionEvent(id)).toBe(site);
      }
      // And none belong to another site.
      for (const other of MISSION_TYPES) {
        if (other === site) continue;
        for (const e of MISSION_EVENTS_BY_SITE[other]) {
          expect(seen.has(e.id)).toBe(false);
        }
      }
    }
  });

  it('can actually surface at least one mission-specific event on each site', () => {
    // Chapter 4 uses eight Sols before random events return, so try a few
    // deterministic game IDs to find a roll that surfaces each site's event.
    for (const site of MISSION_TYPES) {
      let surfacedMissionEvent = false;
      for (let seed = 0; seed < 25 && !surfacedMissionEvent; seed += 1) {
        const seen = collectMissionEventIds(site, 120, `integ-${site}-${seed}`);
        surfacedMissionEvent = seen.size > 0;
      }
      expect(surfacedMissionEvent).toBe(true);
    }
  });
});
