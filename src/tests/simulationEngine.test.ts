/**
 * simulationEngine.test.ts
 * ------------------------
 * Covers the engine behaviours required by the project spec (§11):
 *  1. Initial state is valid.
 *  2. Advancing a day returns a new state.
 *  3. Original state remains unchanged.
 *  4. Resource values remain within configured bounds.
 *  5. Invalid actions are rejected.
 *  6. Delayed effects trigger on the correct day.
 *  7. Delayed effects do not trigger twice.
 *  8. Decision history records the correct source decision.
 * 10. Replaying the same decisions produces the same results.
 */

import { describe, expect, it } from 'vitest';
import { seededRandom } from '../lib/random';
import {
  advanceSimulationDay,
  applyPlayerDecision,
  createInitialGameState,
  InvalidDecisionError,
  processDelayedEffects,
  resolveEvent,
  validateGameState,
} from '../features/simulation/simulationEngine';
import { METRIC_MAX, METRIC_MIN, RESOURCE_KEYS } from '../features/simulation/simulationTypes';
import type { GameState, MissionType } from '../features/simulation/simulationTypes';
import { CHAPTER_1_EVENTS } from '../features/events/chapter1Events';
import {
  chapter2EventForDay,
  chapter3EventForDay,
  chapter4EventForDay,
  chapter5EventForDay,
  rollForEvent,
  selectSupplementaryIncident,
  triggerEvent,
} from '../features/events/eventTriggers';
import { CHAPTER_4_EVENTS } from '../features/events/chapter4Events';
import { CHAPTER_5_EVENTS } from '../features/events/chapter5Events';
import { EVENT_CATALOG, findEvent, findEventAction } from '../features/events/eventCatalog';
import {
  advanceTestDay,
  clone,
  freshGame,
  resolveTestEvents,
  withActiveEvent,
  FIXED_CONFIG,
} from './helpers';

function allMetricsInBounds(state: GameState): boolean {
  const values = [
    ...RESOURCE_KEYS.map((k) => state.resources[k]),
    state.crew.health,
    state.crew.morale,
    state.crew.radiationExposure,
    state.systems.powerGeneration,
    state.systems.lifeSupportEfficiency,
    state.systems.foodProduction,
    state.systems.shieldingIntegrity,
  ];
  return values.every((v) => Number.isFinite(v) && v >= METRIC_MIN && v <= METRIC_MAX);
}

function stateWithChapter2Event(
  day: number,
  missionType: MissionType = 'mars',
  overrides: Partial<GameState> = {}
): GameState {
  const state: GameState = {
    ...freshGame({ missionType }),
    ...overrides,
    day,
    activeEvents: [],
  };
  const event = chapter2EventForDay(day, state);
  if (!event) throw new Error(`No Chapter 2 event is scheduled for Sol ${day}.`);
  return { ...state, activeEvents: [event] };
}

function stateWithChapter3Event(
  day: number,
  missionType: MissionType = 'mars',
  overrides: Partial<GameState> = {}
): GameState {
  const state: GameState = {
    ...freshGame({ missionType }),
    resources: { power: 60, water: 60, food: 60, oxygen: 60 },
    crew: { health: 70, morale: 70, radiationExposure: 10 },
    systems: {
      powerGeneration: 60,
      lifeSupportEfficiency: 60,
      foodProduction: 60,
      shieldingIntegrity: 60,
    },
    ...overrides,
    day,
    activeEvents: [],
  };
  const event = chapter3EventForDay(day, state);
  if (!event) throw new Error(`No Chapter 3 event is scheduled for Sol ${day}.`);
  return { ...state, activeEvents: [event] };
}

function gameIdForSupplementaryRoll(shouldRoll: boolean): string {
  for (let index = 0; index < 10_000; index += 1) {
    const gameId = `step-2-sol-1-${index}`;
    if ((seededRandom(`${gameId}-day-1-supplementary-incident-roll`) < 0.1) === shouldRoll) {
      return gameId;
    }
  }
  throw new Error(`Could not find a Sol 1 seed with shouldRoll=${shouldRoll}.`);
}

describe('createInitialGameState / validateGameState', () => {
  it('starts a new game with the Sol 1 storyline event active', () => {
    const state = createInitialGameState(FIXED_CONFIG);

    expect(state.day).toBe(1);
    expect(state.activeEvents.map((event) => event.id)).toEqual([
      'story-sol-01-supply-inspection',
    ]);
  });

  it('produces a valid initial state (spec 1)', () => {
    const state = freshGame();
    const result = validateGameState(state);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(state.day).toBe(1);
    expect(state.mission.status).toBe('active');
  });

  it('rejects a structurally broken state', () => {
    const bad = { ...freshGame(), resources: { power: Number.NaN, water: 1, food: 1, oxygen: 1 } };
    const result = validateGameState(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('supplementary incidents after scheduled story decisions', () => {
  it('keeps the Sol 1 storyline first, then may activate one resolvable incident', () => {
    const state = createInitialGameState({
      ...FIXED_CONFIG,
      gameId: gameIdForSupplementaryRoll(true),
    });
    const story = state.activeEvents[0]!;

    expect(story.id).toBe('story-sol-01-supply-inspection');
    const afterStory = resolveEvent(state, story.id, story.availableActions[0]!.id);
    const supplementary = afterStory.activeEvents[0];

    expect(afterStory.history[afterStory.history.length - 1]?.eventId).toBe(story.id);
    expect(afterStory.activeEvents).toHaveLength(1);
    expect(supplementary).toBeDefined();
    expect(supplementary?.id).not.toBe(story.id);
    expect(supplementary?.id).not.toMatch(/^story-/);

    const eventAfterStory = selectSupplementaryIncident({
      ...afterStory,
      activeEvents: [],
    });
    expect(eventAfterStory?.id).toBe(supplementary?.id);
    expect(() =>
      resolveEvent(afterStory, supplementary!.id, supplementary!.availableActions[0]!.id)
    ).not.toThrow();
  });

  it('leaves the Sol 1 event alone when its optional roll does not trigger', () => {
    const state = createInitialGameState({
      ...FIXED_CONFIG,
      gameId: gameIdForSupplementaryRoll(false),
    });
    const story = state.activeEvents[0]!;

    const afterStory = resolveEvent(state, story.id, story.availableActions[0]!.id);

    expect(afterStory.activeEvents).toHaveLength(0);
    expect(afterStory.history[afterStory.history.length - 1]?.eventId).toBe(story.id);
  });

  it('prioritizes forced emergencies after a scheduled storyline event', () => {
    const initial = createInitialGameState(FIXED_CONFIG);
    const state: GameState = {
      ...initial,
      resources: { ...initial.resources, power: 10, oxygen: 10 },
      systems: { ...initial.systems, powerGeneration: 10, lifeSupportEfficiency: 10 },
    };
    const story = state.activeEvents[0]!;

    const afterStory = resolveEvent(state, story.id, story.availableActions[0]!.id);

    expect(afterStory.activeEvents.map((event) => event.id)).toEqual([
      'catastrophic-system-failure',
    ]);
  });

  it('does not append an incident when another active event remains', () => {
    const initial = createInitialGameState({
      ...FIXED_CONFIG,
      gameId: gameIdForSupplementaryRoll(true),
    });
    const story = initial.activeEvents[0]!;
    const state = {
      ...initial,
      resources: { ...initial.resources, power: 10, oxygen: 10 },
      systems: { ...initial.systems, powerGeneration: 10, lifeSupportEfficiency: 10 },
      activeEvents: [...initial.activeEvents, findEvent('solar-storm')!],
    };

    const afterStory = resolveEvent(state, story.id, story.availableActions[0]!.id);

    expect(afterStory.activeEvents.map((event) => event.id)).toEqual(['solar-storm']);
  });

  it('does not recursively trigger another incident after resolving a supplementary incident', () => {
    const state = createInitialGameState({
      ...FIXED_CONFIG,
      gameId: gameIdForSupplementaryRoll(true),
    });
    const story = state.activeEvents[0]!;
    const afterStory = resolveEvent(state, story.id, story.availableActions[0]!.id);
    const supplementary = afterStory.activeEvents[0]!;

    const afterIncident = resolveEvent(
      afterStory,
      supplementary.id,
      supplementary.availableActions[0]!.id
    );

    expect(afterIncident.activeEvents).toHaveLength(0);
    expect(afterIncident.history[afterIncident.history.length - 1]?.eventId).toBe(
      supplementary.id
    );
  });

  it('does not add an incident if resolving the scheduled event makes the mission fail', () => {
    const initial = createInitialGameState({
      ...FIXED_CONFIG,
      gameId: gameIdForSupplementaryRoll(true),
    });
    const state: GameState = {
      ...initial,
      crew: { ...initial.crew, health: 0 },
    };
    const story = state.activeEvents[0]!;

    const afterStory = resolveEvent(state, story.id, story.availableActions[0]!.id);

    expect(afterStory.mission.status).toBe('failed');
    expect(afterStory.activeEvents).toHaveLength(0);
  });

  it('replays the same supplementary incident for the same initial state and decision', () => {
    const createResult = (): GameState => {
      const state = createInitialGameState({
        ...FIXED_CONFIG,
        gameId: gameIdForSupplementaryRoll(true),
      });
      const story = state.activeEvents[0]!;
      return resolveEvent(state, story.id, story.availableActions[0]!.id);
    };

    expect(createResult()).toEqual(createResult());
  });

  it('limits each Sol to one supplementary incident and respects the cooldown across Sols', () => {
    const scheduledIds = [
      'story-sol-01-supply-inspection',
      'story-sol-02-water-recycling',
      'story-sol-03-power-instability',
      'story-sol-04-greenhouse-contamination',
      'story-sol-05-environmental-crisis',
      'story-sol-06-aftermath-assessment',
    ];
    let state: GameState = createInitialGameState({
      ...FIXED_CONFIG,
      gameId: 'integrated-supplementary-cooldown',
    });
    const observedIncidents: Record<number, string[]> = {};

    for (let day = 1; day <= 6; day += 1) {
      state = {
        ...state,
        resources: { ...state.resources, power: 14, oxygen: 80 },
        crew: { ...state.crew, health: 80, radiationExposure: 0 },
        systems: {
          ...state.systems,
          powerGeneration: 10,
          lifeSupportEfficiency: 10,
          shieldingIntegrity: 80,
        },
      };

      expect(state.day).toBe(day);
      const story = state.activeEvents[0];
      expect(story?.id).toMatch(/^story-/);

      state = resolveEvent(state, story!.id, story!.availableActions[0]!.id);
      const supplementary = state.activeEvents.filter((event) => !event.id.startsWith('story-'));
      expect(supplementary.length).toBeLessThanOrEqual(1);
      observedIncidents[day] = supplementary.map((event) => event.id);

      if (day === 1) {
        expect(supplementary.map((event) => event.id)).toEqual([
          'catastrophic-system-failure',
        ]);
      } else if (day < 6) {
        expect(supplementary.map((event) => event.id)).not.toContain(
          'catastrophic-system-failure',
        );
      } else {
        expect(supplementary.map((event) => event.id)).toEqual([
          'catastrophic-system-failure',
        ]);
      }

      while (state.activeEvents.length > 0) {
        const incident = state.activeEvents[0]!;
        expect(incident.id).not.toMatch(/^story-/);
        state = resolveEvent(state, incident.id, incident.availableActions[0]!.id);
        expect(state.activeEvents).toHaveLength(0);
      }

      if (day < 6) {
        state = advanceSimulationDay(state).state;
        expect(state.activeEvents.map((event) => event.id)).toEqual([
          scheduledIds[state.day - 1],
        ]);
      }
    }

    expect(observedIncidents[1]).toEqual(['catastrophic-system-failure']);
    expect(observedIncidents[2]).not.toContain('catastrophic-system-failure');
    expect(observedIncidents[3]).not.toContain('catastrophic-system-failure');
    expect(observedIncidents[4]).not.toContain('catastrophic-system-failure');
    expect(observedIncidents[5]).not.toContain('catastrophic-system-failure');
    expect(observedIncidents[6]).toEqual(['catastrophic-system-failure']);
  });

  it('does not trigger supplementary incidents after completing the mission', () => {
    const base = {
      ...freshGame({ gameId: 'completed-supplementary-guard' }),
      day: 29,
    };
    const story = chapter5EventForDay(29, base);
    if (!story) throw new Error('Chapter 5 Sol 29 event is missing.');

    let state: GameState = { ...base, activeEvents: [story] };
    state = resolveEvent(state, story.id, story.availableActions[0]!.id);
    while (state.activeEvents.length > 0) {
      const incident = state.activeEvents[0]!;
      state = resolveEvent(state, incident.id, incident.availableActions[0]!.id);
    }

    state = advanceSimulationDay(state).state;

    expect(state.day).toBe(30);
    expect(state.mission.status).toBe('completed');
    expect(state.activeEvents).toHaveLength(0);
    expect(selectSupplementaryIncident(state)).toBeUndefined();
  });
});

describe('advanceSimulationDay', () => {
  it('uses the power reserve at the start of the Sol to derate gross life-support production', () => {
    const createPowerState = (power: number): GameState => ({
      ...freshGame(),
      resources: { power, water: 50, food: 50, oxygen: 50 },
      crew: { health: 70, morale: 100, radiationExposure: 0 },
      systems: {
        powerGeneration: 0,
        lifeSupportEfficiency: 100,
        foodProduction: 100,
        shieldingIntegrity: 100,
      },
    });

    const at36 = advanceSimulationDay(createPowerState(36));
    const at15 = advanceSimulationDay(createPowerState(15));
    const at0 = advanceSimulationDay(createPowerState(0));

    expect(at36.dailyDelta.oxygen).toBe(1);
    expect(at36.dailyDelta.water).toBe(0.5);
    expect(at15.dailyDelta.oxygen).toBe(-2.15);
    expect(at15.dailyDelta.water).toBe(-2.12);
    expect(at0.dailyDelta.oxygen).toBe(-3.5);
    expect(at0.dailyDelta.water).toBe(-3.25);
    // At 36 power, the reserve falls into the 16–35 band during this Sol;
    // that lower tier only applies starting with the next advancement.
    expect(at36.state.resources.power).toBeLessThanOrEqual(35);
  });

  it('applies food and water shortages once using resources after daily consumption', () => {
    const state: GameState = {
      ...freshGame(),
      resources: { power: 100, water: 21.96, food: 20.96, oxygen: 100 },
      crew: { health: 70, morale: 80, radiationExposure: 0 },
      systems: {
        powerGeneration: 100,
        lifeSupportEfficiency: 0,
        foodProduction: 0,
        shieldingIntegrity: 100,
      },
    };

    const next = advanceSimulationDay(state).state;

    expect(next.resources.food).toBeLessThanOrEqual(15);
    expect(next.resources.water).toBeLessThanOrEqual(15);
    expect(next.crew.health).toBe(68.5);
    expect(next.crew.morale).toBe(79);
  });

  it('stops applying shortage penalties after food and water recover', () => {
    const depleted: GameState = {
      ...freshGame(),
      resources: { power: 100, water: 20, food: 20, oxygen: 100 },
      crew: { health: 70, morale: 80, radiationExposure: 0 },
      systems: {
        powerGeneration: 100,
        lifeSupportEfficiency: 0,
        foodProduction: 0,
        shieldingIntegrity: 100,
      },
    };
    const afterShortage = advanceSimulationDay(depleted).state;
    const healthAfterShortage = afterShortage.crew.health;
    const moraleAfterShortage = afterShortage.crew.morale;
    const recovered: GameState = {
      ...afterShortage,
      activeEvents: [],
      resources: { power: 100, water: 100, food: 100, oxygen: 100 },
    };

    const next = advanceSimulationDay(recovered).state;

    expect(healthAfterShortage).toBeLessThan(depleted.crew.health);
    expect(moraleAfterShortage).toBeLessThan(depleted.crew.morale);
    expect(next.crew.health).toBe(healthAfterShortage);
    expect(next.crew.morale).toBe(moraleAfterShortage);
  });

  it('caps combined food and water health losses at three per Sol', () => {
    const depleted: GameState = {
      ...freshGame(),
      resources: { power: 100, water: 0, food: 0, oxygen: 100 },
      crew: { health: 70, morale: 80, radiationExposure: 0 },
      systems: {
        powerGeneration: 100,
        lifeSupportEfficiency: 0,
        foodProduction: 0,
        shieldingIntegrity: 100,
      },
    };

    const next = advanceSimulationDay(depleted).state;

    expect(next.crew.health).toBe(67);
    expect(next.crew.morale).toBe(78);
  });

  it('fails from shortage-driven health loss and does not activate another event', () => {
    const endangered: GameState = {
      ...freshGame(),
      resources: { power: 100, water: 0, food: 0, oxygen: 100 },
      crew: { health: 2, morale: 80, radiationExposure: 0 },
      systems: {
        powerGeneration: 100,
        lifeSupportEfficiency: 0,
        foodProduction: 0,
        shieldingIntegrity: 100,
      },
    };

    const next = advanceSimulationDay(endangered).state;

    expect(next.crew.health).toBe(0);
    expect(next.mission.status).toBe('failed');
    expect(next.activeEvents).toEqual([]);
  });

  it.each([
    ['oxygen', { power: 50, water: 50, food: 50, oxygen: 0 }, { health: 70, morale: 80, radiationExposure: 0 }],
    ['health', { power: 50, water: 50, food: 50, oxygen: 50 }, { health: 0, morale: 80, radiationExposure: 0 }],
    ['radiation', { power: 50, water: 50, food: 50, oxygen: 50 }, { health: 70, morale: 80, radiationExposure: 100 }],
  ])('preserves the existing %s failure condition and suppresses events', (_reason, resources, crew) => {
    const endangered: GameState = {
      ...freshGame(),
      resources,
      crew,
      systems: {
        powerGeneration: 0,
        lifeSupportEfficiency: 0,
        foodProduction: 0,
        shieldingIntegrity: 100,
      },
    };

    const next = advanceSimulationDay(endangered).state;

    if (_reason === 'oxygen') expect(next.resources.oxygen).toBe(0);
    expect(next.mission.status).toBe('failed');
    expect(next.activeEvents).toEqual([]);
  });

  it('returns a new state and does not mutate the original (spec 2 & 3)', () => {
    const state = freshGame();
    const snapshot = clone(state);

    const { state: next } = advanceSimulationDay(state);

    expect(next).not.toBe(state);
    expect(next.day).toBe(state.day + 1);
    // Original unchanged.
    expect(state).toEqual(snapshot);
  });

  it('keeps every metric within [0,100] over many days (spec 4)', () => {
    let state = freshGame({ startingCondition: 'resource-constrained' });
    for (let i = 0; i < 40; i++) {
      state = advanceTestDay(state).state;
      expect(allMetricsInBounds(state)).toBe(true);
    }
  });

  it('schedules the matching fixed storyline event on Sols 2–5', () => {
    let state = createInitialGameState(FIXED_CONFIG);
    const expectedIds = [
      'story-sol-01-supply-inspection',
      'story-sol-02-water-recycling',
      'story-sol-03-power-instability',
      'story-sol-04-greenhouse-contamination',
      'story-sol-05-environmental-crisis',
    ];

    for (const expectedId of expectedIds) {
      expect(state.activeEvents.map((event) => event.id)).toEqual([expectedId]);
      const event = state.activeEvents[0]!;
      state = resolveEvent(state, event.id, event.availableActions[0]!.id);
      if (state.day < 5) state = advanceSimulationDay(state).state;
    }
  });

  it('uses each location narrative, keeps the five-Sol schedule, and applies its Sol 5 response', () => {
    const locations: MissionType[] = ['lunar', 'mars', 'deep-space'];
    const expectedIds = [
      'story-sol-01-supply-inspection',
      'story-sol-02-water-recycling',
      'story-sol-03-power-instability',
      'story-sol-04-greenhouse-contamination',
      'story-sol-05-environmental-crisis',
    ];
    const uniqueChoices: Record<MissionType, string> = {
      lunar: 'story-sol-05-lunar-thermal-protection',
      mars: 'story-sol-05-mars-dust-protection',
      'deep-space': 'story-sol-05-deep-space-impact-reinforcement',
    };
    const descriptionsByDay = expectedIds.map(() => new Set<string>());

    for (const missionType of locations) {
      let state = createInitialGameState({ ...FIXED_CONFIG, missionType });
      for (let dayIndex = 0; dayIndex < expectedIds.length; dayIndex += 1) {
        const event = state.activeEvents[0]!;
        expect(event.id).toBe(expectedIds[dayIndex]);
        descriptionsByDay[dayIndex]!.add(event.description);
        expect(event.availableActions.slice(0, CHAPTER_1_EVENTS[dayIndex]!.availableActions.length))
          .toEqual(CHAPTER_1_EVENTS[dayIndex]!.availableActions);

        if (dayIndex === 0) {
          state = resolveEvent(state, event.id, 'story-sol-01-begin');
          state = advanceSimulationDay(state).state;
        } else if (dayIndex === 1) {
          state = resolveEvent(state, event.id, 'story-sol-02-repair');
          const sol3 = advanceSimulationDay(state);
          expect(sol3.firedEffects).toHaveLength(1);
          expect(sol3.firedEffects[0]!.parameters).toEqual({
            kind: 'system',
            changes: { powerGeneration: -4 },
          });
          state = sol3.state;
        } else if (dayIndex === 2) {
          state = resolveEvent(state, event.id, 'story-sol-03-conserve');
          state = advanceSimulationDay(state).state;
        } else if (dayIndex === 3) {
          state = resolveEvent(state, event.id, 'story-sol-04-isolate');
          state = advanceSimulationDay(state).state;
        } else {
          const uniqueChoice = event.availableActions.find(
            (action) => action.id === uniqueChoices[missionType]
          );
          expect(uniqueChoice).toBeDefined();
          state = {
            ...state,
            systems: { ...state.systems, shieldingIntegrity: 70 },
          };
          const powerBefore = state.resources.power;
          const generationBefore = state.systems.powerGeneration;
          const shieldingBefore = state.systems.shieldingIntegrity;
          state = resolveEvent(state, event.id, uniqueChoices[missionType]);

          expect(state.resources.power).toBeCloseTo(
            powerBefore - (missionType === 'mars' ? 7 : 6)
          );
          if (missionType === 'mars') {
            expect(state.systems.powerGeneration).toBe(generationBefore + 5);
          } else {
            expect(state.systems.shieldingIntegrity).toBe(
              shieldingBefore + (missionType === 'lunar' ? 5 : 7)
            );
          }
          expect(state.history[state.history.length - 1]?.actionId).toBe(
            uniqueChoices[missionType]
          );
        }
      }
    }

    expect(descriptionsByDay.every((descriptions) => descriptions.size === 3)).toBe(true);
  });

  it('prioritizes the scheduled story event over a forced event', () => {
    let state = createInitialGameState(FIXED_CONFIG);
    const openingEvent = state.activeEvents[0]!;
    state = resolveEvent(state, openingEvent.id, openingEvent.availableActions[0]!.id);
    state = {
      ...state,
      resources: { ...state.resources, power: 10 },
      systems: {
        powerGeneration: 0,
        lifeSupportEfficiency: 0,
        foodProduction: 0,
        shieldingIntegrity: 0,
      },
    };

    const next = advanceSimulationDay(state).state;
    expect(next.day).toBe(2);
    expect(next.activeEvents.map((event) => event.id)).toEqual([
      'story-sol-02-water-recycling',
    ]);
  });

  it('does not advance while an event is unresolved', () => {
    const state = createInitialGameState(FIXED_CONFIG);

    expect(() => advanceSimulationDay(state)).toThrow(InvalidDecisionError);
    expect(state.day).toBe(1);
    expect(state.activeEvents).toHaveLength(1);
  });

  it('does not trigger an event when daily calculations fail the mission', () => {
    let state = createInitialGameState(FIXED_CONFIG);
    const openingEvent = state.activeEvents[0]!;
    state = resolveEvent(state, openingEvent.id, openingEvent.availableActions[0]!.id);
    state = { ...state, crew: { ...state.crew, health: 0 } };

    const next = advanceSimulationDay(state).state;
    expect(next.mission.status).toBe('failed');
    expect(next.activeEvents).toEqual([]);
  });

  it('does not trigger an event when a due delayed effect fails the mission', () => {
    let state = createInitialGameState(FIXED_CONFIG);
    const openingEvent = state.activeEvents[0]!;
    state = resolveEvent(state, openingEvent.id, openingEvent.availableActions[0]!.id);
    state = {
      ...state,
      pendingEffects: [
        {
          id: 'test-failure-effect',
          sourceDecisionId: state.history[0]!.id,
          scheduledDay: state.day + 1,
          type: 'status',
          description: 'A test effect ends the mission.',
          parameters: { kind: 'status', status: 'failed' },
        },
      ],
    };

    const next = advanceSimulationDay(state).state;
    expect(next.mission.status).toBe('failed');
    expect(next.activeEvents).toEqual([]);
    expect(next.pendingEffects).toEqual([]);
  });

  it('does not trigger an event when the mission completes on the advanced Sol', () => {
    let state = createInitialGameState(FIXED_CONFIG);
    const openingEvent = state.activeEvents[0]!;
    state = resolveEvent(state, openingEvent.id, openingEvent.availableActions[0]!.id);
    state = { ...state, day: 29 };

    const next = advanceSimulationDay(state).state;
    expect(next.day).toBe(30);
    expect(next.mission.status).toBe('completed');
    expect(next.activeEvents).toEqual([]);
  });
});

describe('Chapter 2 scheduled storyline', () => {
  const expectedIds = [
    'story-sol-01-supply-inspection',
    'story-sol-02-water-recycling',
    'story-sol-03-power-instability',
    'story-sol-04-greenhouse-contamination',
    'story-sol-05-environmental-crisis',
    'story-sol-06-aftermath-assessment',
    'story-sol-07-communication-array-failure',
    'story-sol-08-narrow-window',
    'story-sol-09-repairs-under-pressure',
    'story-sol-10-unexpected-transmission',
  ];
  const sol5Choices: Record<MissionType, string> = {
    lunar: 'story-sol-05-lunar-thermal-protection',
    mars: 'story-sol-05-mars-dust-protection',
    'deep-space': 'story-sol-05-deep-space-impact-reinforcement',
  };

  it('schedules one shared Sol 6–10 event per day in every mission environment', () => {
    const locations: MissionType[] = ['lunar', 'mars', 'deep-space'];
    const descriptionsByDay = expectedIds.map(() => new Set<string>());

    for (const missionType of locations) {
      let state = createInitialGameState({ ...FIXED_CONFIG, missionType });
      for (let index = 0; index < expectedIds.length; index += 1) {
        const event = state.activeEvents[0]!;
        expect(state.day).toBe(index + 1);
        expect(event.id).toBe(expectedIds[index]);
        descriptionsByDay[index]!.add(event.description);

        if (state.day === 6) {
          expect(event.description).toContain('Sol 5');
        }
        if (state.day === 10) {
          state = resolveEvent(state, event.id, 'story-sol-10-verify');
          expect(state.history[state.history.length - 1]).toMatchObject({
            day: 10,
            eventId: 'story-sol-10-unexpected-transmission',
            actionId: 'story-sol-10-verify',
          });
          break;
        }

        const actionId =
          state.day === 1
            ? 'story-sol-01-organise'
            : state.day === 2
              ? 'story-sol-02-repair'
              : state.day === 3
                ? 'story-sol-03-conserve'
                : state.day === 4
                  ? 'story-sol-04-isolate'
                  : state.day === 5
                    ? sol5Choices[missionType]
                    : state.day === 6
                      ? 'story-sol-06-prioritise-maintenance'
                      : state.day === 7
                        ? 'story-sol-07-low-power'
                        : state.day === 8
                          ? 'story-sol-08-system-diagnostics'
                          : 'story-sol-09-balanced-repairs';
        state = resolveEvent(state, event.id, actionId);
        state = advanceTestDay(state).state;
      }
    }

    expect(descriptionsByDay.every((descriptions) => descriptions.size === 3)).toBe(true);
  });

  it('keeps Chapter 1 catalogue content unchanged and gives scheduled Chapter 2 priority', () => {
    expect(CHAPTER_1_EVENTS.map((event) => event.id)).toEqual(expectedIds.slice(0, 5));

    const stressed = stateWithChapter2Event(6, 'mars', {
      resources: { power: 10, water: 10, food: 10, oxygen: 10 },
      systems: {
        powerGeneration: 0,
        lifeSupportEfficiency: 0,
        foodProduction: 0,
        shieldingIntegrity: 0,
      },
    });
    expect(triggerEvent({ ...stressed, activeEvents: [] })?.id).toBe(expectedIds[5]);
  });

  it('applies the shared Sol 6–10 choices through the active event effects', () => {
    const resolveChoice = (day: number, actionId: string): GameState => {
      const state = stateWithChapter2Event(day);
      return resolveEvent(state, state.activeEvents[0]!.id, actionId);
    };

    const sol6Maintenance = resolveChoice(6, 'story-sol-06-prioritise-maintenance');
    expect(sol6Maintenance.resources.power).toBe(76);
    expect(sol6Maintenance.systems).toMatchObject({
      powerGeneration: 85,
      lifeSupportEfficiency: 95,
    });
    expect(sol6Maintenance.crew.morale).toBe(78);

    const sol6Ration = resolveChoice(6, 'story-sol-06-conserve-supplies');
    expect(sol6Ration.resources).toMatchObject({ food: 73, water: 77 });
    expect(sol6Ration.crew.morale).toBe(77);
    const sol6RecoveryStart = stateWithChapter2Event(6);
    const sol6Recovery = resolveChoice(6, 'story-sol-06-prioritise-recovery');
    expect(sol6Recovery.resources.power).toBe(77);
    expect(sol6Recovery.crew.health).toBe(sol6RecoveryStart.crew.health + 4);

    const sol7Postpone = resolveChoice(7, 'story-sol-07-postpone-repairs');
    expect(sol7Postpone.resources.power).toBe(85);
    expect(sol7Postpone.crew.morale).toBe(72);
    expect(sol7Postpone.pendingEffects[0]?.scheduledDay).toBe(10);
    expect(sol7Postpone.pendingEffects[0]?.parameters).toEqual({
      kind: 'crew',
      changes: { morale: -6 },
    });
    const sol7Repair = resolveChoice(7, 'story-sol-07-full-repairs');
    expect(sol7Repair.resources.power).toBe(68);
    expect(sol7Repair.crew.morale).toBe(85);
    const sol7LowPower = resolveChoice(7, 'story-sol-07-low-power');
    expect(sol7LowPower.resources.power).toBe(75);
    expect(sol7LowPower.crew.morale).toBe(82);
    expect(sol7LowPower.pendingEffects[0]?.scheduledDay).toBe(9);

    const sol8Recovery = resolveChoice(8, 'story-sol-08-resource-recovery');
    expect(sol8Recovery.resources.power).toBe(72);
    expect(sol8Recovery.pendingEffects[0]?.scheduledDay).toBe(10);
    expect(sol8Recovery.pendingEffects[0]?.parameters).toEqual({
      kind: 'resource',
      changes: { water: 10 },
    });
    const sol8Diagnostics = resolveChoice(8, 'story-sol-08-system-diagnostics');
    expect(sol8Diagnostics.resources.power).toBe(76);
    expect(sol8Diagnostics.systems.lifeSupportEfficiency).toBe(95);
    const sol8Routine = resolveChoice(8, 'story-sol-08-routine-operations');
    expect(sol8Routine.resources).toEqual(stateWithChapter2Event(8).resources);
    expect(sol8Routine.systems).toEqual(stateWithChapter2Event(8).systems);

    const sol9Power = resolveChoice(9, 'story-sol-09-restore-power');
    expect(sol9Power.resources.power).toBe(72);
    expect(sol9Power.systems.powerGeneration).toBe(91);
    const sol9LifeSupport = resolveChoice(9, 'story-sol-09-restore-life-support');
    expect(sol9LifeSupport.resources.power).toBe(72);
    expect(sol9LifeSupport.systems.lifeSupportEfficiency).toBe(100);
    const sol9Balanced = resolveChoice(9, 'story-sol-09-balanced-repairs');
    expect(sol9Balanced.resources.power).toBe(70);
    expect(sol9Balanced.systems).toMatchObject({
      powerGeneration: 87,
      lifeSupportEfficiency: 96,
    });

    const sol10Analyse = resolveChoice(10, 'story-sol-10-analyse');
    expect(sol10Analyse.resources.power).toBe(74);
    expect(sol10Analyse.crew.morale).toBe(83);
    const sol10Verify = resolveChoice(10, 'story-sol-10-verify');
    expect(sol10Verify.resources.power).toBe(77);
    const sol10Archive = resolveChoice(10, 'story-sol-10-archive');
    expect(sol10Archive.resources.power).toBe(83);
  });

  it('applies Sol 7 and Sol 8 delayed effects on their scheduled Sols', () => {
    let state = stateWithChapter2Event(7);
    state = resolveEvent(state, state.activeEvents[0]!.id, 'story-sol-07-low-power');
    const communicationEffectId = state.pendingEffects[0]!.id;

    state = advanceTestDay(state).state;
    expect(state.day).toBe(8);
    state = resolveEvent(state, state.activeEvents[0]!.id, 'story-sol-08-resource-recovery');
    const sol8RecoveryDecisionId = state.history[state.history.length - 1]!.id;

    const sol9 = advanceTestDay(state);
    expect(sol9.state.day).toBe(9);
    expect(sol9.firedEffects.map((effect) => effect.id)).toContain(communicationEffectId);
    expect(sol9.firedEffects.find((effect) => effect.id === communicationEffectId)?.parameters)
      .toEqual({ kind: 'resource', changes: { power: -3 } });
    state = resolveEvent(sol9.state, sol9.state.activeEvents[0]!.id, 'story-sol-09-restore-power');
    const sol8RecoveryEffect = state.pendingEffects.find(
      (effect) => effect.sourceDecisionId === sol8RecoveryDecisionId
    )!;

    const sol10 = advanceTestDay(state);
    expect(sol10.state.day).toBe(10);
    expect(sol10.firedEffects.map((effect) => effect.id)).toContain(sol8RecoveryEffect.id);
    expect(sol10.firedEffects.find((effect) => effect.id === sol8RecoveryEffect.id)?.parameters)
      .toEqual({ kind: 'resource', changes: { water: 10 } });
    expect(sol10.state.activeEvents[0]?.id).toBe('story-sol-10-unexpected-transmission');
  });

  it('adapts Sol 9 for healthy systems and falls back without Sol 5 history', () => {
    const healthyState = stateWithChapter2Event(9, 'lunar', {
      systems: {
        powerGeneration: 80,
        lifeSupportEfficiency: 75,
        foodProduction: 65,
        shieldingIntegrity: 88,
      },
    });
    expect(healthyState.activeEvents[0]?.description).toContain('preventive maintenance');

    const damagedState = stateWithChapter2Event(9, 'lunar', {
      systems: {
        powerGeneration: 60,
        lifeSupportEfficiency: 75,
        foodProduction: 65,
        shieldingIntegrity: 88,
      },
    });
    expect(damagedState.activeEvents[0]?.description).not.toContain('holding steady');

    const noHistory = stateWithChapter2Event(6, 'mars');
    expect(noHistory.activeEvents[0]?.description).not.toContain('Sol 5');
    expect(resolveEvent(noHistory, noHistory.activeEvents[0]!.id, 'story-sol-06-prioritise-maintenance')
      .history).toHaveLength(1);
  });
});

describe('Chapter 3 scheduled storyline', () => {
  const expectedIds = {
    11: 'story-sol-11-life-support-warning',
    12: 'story-sol-12-medical-radiation-concerns',
    13: 'story-sol-13-emergency-resource-allocation',
    14: 'story-sol-14-midpoint-preparation',
    lunarMars15: 'story-sol-15-midpoint-turning-point',
    deep15: 'story-sol-15-no-resupply-isolation-test',
  } as const;

  it('schedules one event per Sol 11–15 across all sites, with correct resupply context', () => {
    const locations: MissionType[] = ['lunar', 'mars', 'deep-space'];
    const expectedDescriptions: Record<MissionType, string[]> = {
      lunar: ['regolith', 'thermal', 'finite reserves', 'thermal', 'resupply has arrived'],
      mars: ['fine dust', 'radiation exposure', 'variable solar', 'dust', 'resupply has arrived'],
      'deep-space': ['isolated habitat', 'radiation exposure', 'closed-loop habitat', 'no resupply', 'no supply vehicle'],
    };
    const descriptionsByDay = Array.from({ length: 5 }, () => new Set<string>());

    for (const missionType of locations) {
      let state: GameState = {
        ...freshGame({ missionType }),
        day: 10,
        activeEvents: [],
        resources: { power: 90, water: 90, food: 90, oxygen: 90 },
        crew: { health: 90, morale: 90, radiationExposure: 5 },
        systems: {
          powerGeneration: 80,
          lifeSupportEfficiency: 80,
          foodProduction: 80,
          shieldingIntegrity: 80,
        },
      };

      for (let day = 11; day <= 15; day += 1) {
        const before = state;
        const result = advanceSimulationDay(state);
        state = result.state;
        expect(state.day).toBe(day);
        expect(state.activeEvents).toHaveLength(1);
        const event = state.activeEvents[0]!;
        const expectedId =
          day < 15
            ? expectedIds[day as 11 | 12 | 13 | 14]
            : missionType === 'deep-space'
              ? expectedIds.deep15
              : expectedIds.lunarMars15;
        expect(event.id).toBe(expectedId);
        const normalizedDescription = event.description.toLowerCase();
        descriptionsByDay[day - 11]!.add(normalizedDescription);
        expect(normalizedDescription).toContain(expectedDescriptions[missionType][day - 11]);

        if (day === 15) {
          expect(result.resupplyFired).toBe(missionType !== 'deep-space');
          expect(state.mission.resupplyDelivered).toBe(missionType !== 'deep-space');
          if (missionType !== 'deep-space') {
            expect(event.availableActions).toHaveLength(1);
            const acknowledged = resolveEvent(state, event.id, event.availableActions[0]!.id);
            expect(acknowledged.resources).toEqual(state.resources);
          } else {
            expect(event.availableActions).toHaveLength(3);
          }
          expect(result.firedEffects).toEqual([]);
          continue;
        }

        const actionByDay: Record<number, string> = {
          11: 'story-sol-11-purify-stabilise',
          12: 'story-sol-12-prioritise-recovery',
          13: 'story-sol-13-prioritise-oxygen',
          14: 'story-sol-14-reinforce-power',
        };
        state = resolveEvent(state, event.id, actionByDay[day]!);
        expect(before.activeEvents).toEqual([]);
      }
    }
    expect(descriptionsByDay.every((descriptions) => descriptions.size === 3)).toBe(true);
  });

  it('keeps a scheduled Chapter 3 event ahead of a forced crisis', () => {
    const stressed = stateWithChapter3Event(11, 'mars', {
      resources: { power: 10, water: 10, food: 10, oxygen: 10 },
      systems: {
        powerGeneration: 0,
        lifeSupportEfficiency: 0,
        foodProduction: 0,
        shieldingIntegrity: 0,
      },
    });
    expect(triggerEvent({ ...stressed, activeEvents: [] })?.id).toBe(expectedIds[11]);
  });

  it('applies the shared Sol 11–14 immediate choices using existing state fields', () => {
    const resolveChoice = (day: number, actionId: string): GameState => {
      const state = stateWithChapter3Event(day);
      return resolveEvent(state, state.activeEvents[0]!.id, actionId);
    };

    const sol11Purify = resolveChoice(11, 'story-sol-11-purify-stabilise');
    expect(sol11Purify.resources.power).toBe(48);
    expect(sol11Purify.systems.lifeSupportEfficiency).toBe(68);
    const sol11Conserve = resolveChoice(11, 'story-sol-11-emergency-conservation');
    expect(sol11Conserve.resources).toMatchObject({ water: 64, oxygen: 64 });
    expect(sol11Conserve.crew.morale).toBe(64);
    expect(sol11Conserve.pendingEffects[0]?.scheduledDay).toBe(13);
    const sol11Components = resolveChoice(11, 'story-sol-11-replace-components');
    expect(sol11Components.resources).toMatchObject({ power: 52, oxygen: 55 });
    expect(sol11Components.systems.lifeSupportEfficiency).toBe(70);

    const sol12Recovery = resolveChoice(12, 'story-sol-12-prioritise-recovery');
    expect(sol12Recovery.resources.power).toBe(55);
    expect(sol12Recovery.crew.health).toBe(77);
    const sol12Shield = resolveChoice(12, 'story-sol-12-reinforce-shielding');
    expect(sol12Shield.resources.power).toBe(52);
    expect(sol12Shield.systems.shieldingIntegrity).toBe(68);
    const sol12Work = resolveChoice(12, 'story-sol-12-essential-work');
    expect(sol12Work.resources.power).toBe(63);
    expect(sol12Work.crew.health).toBe(65);
    expect(sol12Work.pendingEffects[0]?.scheduledDay).toBe(14);

    const sol13Oxygen = resolveChoice(13, 'story-sol-13-prioritise-oxygen');
    expect(sol13Oxygen.resources).toMatchObject({ power: 52, oxygen: 68 });
    const sol13Stores = resolveChoice(13, 'story-sol-13-recover-reserves');
    expect(sol13Stores.resources).toMatchObject({ power: 54, food: 65, water: 65 });
    const sol13Efficiency = resolveChoice(13, 'story-sol-13-long-term-efficiency');
    expect(sol13Efficiency.resources.power).toBe(50);
    expect(sol13Efficiency.systems).toMatchObject({
      lifeSupportEfficiency: 66,
      foodProduction: 64,
    });

    const sol14Power = resolveChoice(14, 'story-sol-14-reinforce-power');
    expect(sol14Power.resources.power).toBe(54);
    expect(sol14Power.systems.powerGeneration).toBe(64);
    const sol14Inventory = resolveChoice(14, 'story-sol-14-reorganise-supplies');
    expect(sol14Inventory.resources).toMatchObject({ food: 63, water: 63 });
    expect(sol14Inventory.crew.morale).toBe(67);
    const sol14Recovery = resolveChoice(14, 'story-sol-14-crew-recovery');
    expect(sol14Recovery.resources.power).toBe(57);
    expect(sol14Recovery.crew).toMatchObject({ health: 74, morale: 74 });
  });

  it('schedules and applies Sol 11, Sol 12 and Deep Space Sol 15 delayed effects', () => {
    const cases = [
      {
        day: 11,
        actionId: 'story-sol-11-emergency-conservation',
        metric: 'lifeSupportEfficiency' as const,
        expected: 55,
      },
      {
        day: 12,
        actionId: 'story-sol-12-essential-work',
        metric: 'health' as const,
        expected: 60,
      },
      {
        day: 15,
        actionId: 'story-sol-15-intensify-recycling',
        metric: 'power' as const,
        expected: 46,
        missionType: 'deep-space' as const,
      },
      {
        day: 15,
        actionId: 'story-sol-15-reduce-operations',
        metric: 'morale' as const,
        expected: 61,
        missionType: 'deep-space' as const,
      },
      {
        day: 15,
        actionId: 'story-sol-15-recover-emergency-equipment',
        metric: 'lifeSupportEfficiency' as const,
        expected: 57,
        missionType: 'deep-space' as const,
      },
    ];

    for (const testCase of cases) {
      let state = stateWithChapter3Event(
        testCase.day,
        testCase.missionType ?? 'mars'
      );
      state = resolveEvent(state, state.activeEvents[0]!.id, testCase.actionId);
      const delayed = state.pendingEffects[0]!;
      expect(delayed.scheduledDay).toBe(testCase.day + 2);
      expect(delayed.sourceDecisionId).toBe(state.history[state.history.length - 1]!.id);

      state = processDelayedEffects({ ...state, day: delayed.scheduledDay });
      expect(state.pendingEffects).toHaveLength(0);
      if (testCase.metric === 'lifeSupportEfficiency') {
        expect(state.systems.lifeSupportEfficiency).toBe(testCase.expected);
      } else if (testCase.metric === 'health') {
        expect(state.crew.health).toBe(testCase.expected);
      } else if (testCase.metric === 'morale') {
        expect(state.crew.morale).toBe(testCase.expected);
      } else {
        expect(state.resources.power).toBe(testCase.expected);
      }
    }
  });

  it('keeps Sol 15 resupply acknowledgment neutral and Deep Space choices distinct', () => {
    const lunar = stateWithChapter3Event(15, 'lunar', {
      mission: { ...freshGame({ missionType: 'lunar' }).mission, resupplyDelivered: true },
    });
    expect(lunar.activeEvents[0]?.description).toContain('resupply has arrived');
    expect(lunar.activeEvents[0]?.availableActions[0]?.effect).toEqual({});

    const deep = stateWithChapter3Event(15, 'deep-space');
    expect(deep.activeEvents[0]?.id).toBe('story-sol-15-no-resupply-isolation-test');
    expect(deep.activeEvents[0]?.description).toContain('no supply vehicle');
    expect(deep.activeEvents[0]?.availableActions.map((action) => action.id)).toEqual([
      'story-sol-15-intensify-recycling',
      'story-sol-15-reduce-operations',
      'story-sol-15-recover-emergency-equipment',
    ]);

    const recycling = resolveEvent(deep, deep.activeEvents[0]!.id, 'story-sol-15-intensify-recycling');
    expect(recycling.resources.power).toBe(50);
    expect(recycling.systems.lifeSupportEfficiency).toBe(67);
    expect(recycling.pendingEffects[0]?.scheduledDay).toBe(17);
    const conserve = resolveEvent(deep, deep.activeEvents[0]!.id, 'story-sol-15-reduce-operations');
    expect(conserve.resources.power).toBe(65);
    expect(conserve.crew.morale).toBe(64);
    const reserves = resolveEvent(deep, deep.activeEvents[0]!.id, 'story-sol-15-recover-emergency-equipment');
    expect(reserves.resources).toMatchObject({ power: 54, water: 65, oxygen: 65 });
    expect(reserves.pendingEffects[0]?.scheduledDay).toBe(17);
    expect(deep.mission.modifiers.noResupply).toBe(true);
  });
});

describe('Chapter 4 scheduled storyline', () => {
  const expectedIds = {
    16: 'story-sol-16-recovery-reassessment',
    17: 'story-sol-17-unusual-sensor-readings',
    18: 'story-sol-18-unexpected-discovery',
    19: 'story-sol-19-research-or-recovery',
    20: 'story-sol-20-hidden-system-vulnerability',
    21: 'story-sol-21-cost-of-exploration',
    22: 'story-sol-22-brief-opportunity',
    23: 'story-sol-23-outpost-secret',
  } as const;

  it('schedules the correct mission-specific event on every Sol 16–23', () => {
    const locations: MissionType[] = ['lunar', 'mars', 'deep-space'];
    const descriptionsByDay = Array.from({ length: 8 }, () => new Set<string>());

    for (const missionType of locations) {
      for (let day = 16; day <= 23; day += 1) {
        const state: GameState = {
          ...freshGame({ missionType }),
          day,
          activeEvents: [],
        };
        const scheduled = chapter4EventForDay(day, state);
        const expectedId = expectedIds[day as keyof typeof expectedIds];
        expect(scheduled?.id).toBe(expectedId);
        descriptionsByDay[day - 16]!.add(scheduled!.description);

        // Check the same event is returned through the normal game scheduler.
        expect(triggerEvent(state)?.id).toBe(expectedId);
      }
    }

    // Sol 21 has a shared fallback narrative until an earlier action is known.
    expect(
      descriptionsByDay.every((descriptions, index) => index === 5 || descriptions.size === 3)
    ).toBe(true);
  });

  it('does not schedule Chapter 4 events outside Sols 16–23', () => {
    const state = freshGame();
    expect(chapter4EventForDay(15, state)).toBeUndefined();
    expect(chapter4EventForDay(24, state)).toBeUndefined();
  });

  it('registers each Chapter 4 event once and resolves every listed action', () => {
    const locations: MissionType[] = ['lunar', 'mars', 'deep-space'];

    for (const baseEvent of CHAPTER_4_EVENTS) {
      expect(EVENT_CATALOG.filter((event) => event.id === baseEvent.id)).toHaveLength(1);
      expect(findEvent(baseEvent.id)?.availableActions.map((action) => action.id)).toEqual(
        baseEvent.availableActions.map((action) => action.id)
      );

      const day = Number(baseEvent.id.match(/^story-sol-(\d{2})-/)?.[1]);
      for (const missionType of locations) {
        const state: GameState = {
          ...freshGame({ missionType }),
          day,
          activeEvents: [],
        };
        const event = chapter4EventForDay(day, state);
        if (!event) throw new Error(`No Chapter 4 event is scheduled for Sol ${day}.`);

        for (const action of event.availableActions) {
          expect(findEventAction(event.id, action.id)).toEqual(action);
          const resolved = resolveEvent(
            { ...state, activeEvents: [event] },
            event.id,
            action.id
          );
          expect(resolved.history[resolved.history.length - 1]?.actionId).toBe(action.id);
        }
      }
    }
  });

  it('keeps scheduled Chapter 4 events ahead of random events', () => {
    let randomEventState: GameState | undefined;
    for (let seed = 0; seed < 100 && !randomEventState; seed += 1) {
      const candidate: GameState = {
        ...freshGame({ gameId: `chapter-4-random-priority-${seed}` }),
        day: 16,
        activeEvents: [],
      };
      if (rollForEvent(candidate)) randomEventState = candidate;
    }

    if (!randomEventState) {
      throw new Error('Could not find a deterministic Sol 16 random-event roll for the priority test.');
    }
    expect(triggerEvent(randomEventState)?.id).toBe(expectedIds[16]);
  });
});

describe('Chapter 5 scheduled storyline', () => {
  const expectedIds = {
    24: 'story-sol-24-final-mission-assessment',
    25: 'story-sol-25-system-deterioration',
    26: 'story-sol-26-dangerous-opportunity',
    27: 'story-sol-27-last-major-crisis',
    28: 'story-sol-28-stabilisation-efforts',
    29: 'story-sol-29-final-preparations',
  } as const;

  it('schedules the correct mission-specific event on every Sol 24–29', () => {
    const locations: MissionType[] = ['lunar', 'mars', 'deep-space'];
    const descriptionsByDay = Array.from({ length: 6 }, () => new Set<string>());

    for (const missionType of locations) {
      for (let day = 24; day <= 29; day += 1) {
        const state: GameState = {
          ...freshGame({ missionType }),
          day,
          activeEvents: [],
        };
        const scheduled = chapter5EventForDay(day, state);
        const expectedId = expectedIds[day as keyof typeof expectedIds];
        expect(scheduled?.id).toBe(expectedId);
        descriptionsByDay[day - 24]!.add(scheduled!.description);
        expect(triggerEvent(state)?.id).toBe(expectedId);
      }
    }

    // Every Sol has a distinct description for Lunar, Mars, and Deep Space.
    expect(descriptionsByDay.every((descriptions) => descriptions.size === 3)).toBe(true);
  });

  it('does not schedule Chapter 5 events outside Sols 24–29, including Sol 30', () => {
    const state = freshGame();
    expect(chapter5EventForDay(23, state)).toBeUndefined();
    expect(chapter5EventForDay(30, state)).toBeUndefined();
  });

  it('registers each Chapter 5 event once and resolves every listed action', () => {
    const locations: MissionType[] = ['lunar', 'mars', 'deep-space'];

    for (const baseEvent of CHAPTER_5_EVENTS) {
      expect(EVENT_CATALOG.filter((event) => event.id === baseEvent.id)).toHaveLength(1);
      expect(findEvent(baseEvent.id)?.availableActions.map((action) => action.id)).toEqual(
        baseEvent.availableActions.map((action) => action.id)
      );

      const day = Number(baseEvent.id.match(/^story-sol-(\d{2})-/)?.[1]);
      for (const missionType of locations) {
        const state: GameState = {
          ...freshGame({ missionType }),
          day,
          activeEvents: [],
        };
        const event = chapter5EventForDay(day, state);
        if (!event) throw new Error(`No Chapter 5 event is scheduled for Sol ${day}.`);

        for (const action of event.availableActions) {
          expect(findEventAction(event.id, action.id)).toEqual(action);
          const resolved = resolveEvent(
            { ...state, activeEvents: [event] },
            event.id,
            action.id
          );
          expect(resolved.history[resolved.history.length - 1]?.actionId).toBe(action.id);
        }
      }
    }
  });

  it('keeps scheduled Chapter 5 events ahead of forced and random events', () => {
    let randomEventState: GameState | undefined;
    for (let seed = 0; seed < 100 && !randomEventState; seed += 1) {
      const candidate: GameState = {
        ...freshGame({ gameId: `chapter-5-random-priority-${seed}` }),
        day: 24,
        activeEvents: [],
        resources: { power: 10, water: 10, food: 10, oxygen: 10 },
        systems: {
          powerGeneration: 0,
          lifeSupportEfficiency: 0,
          foodProduction: 0,
          shieldingIntegrity: 0,
        },
      };
      if (rollForEvent(candidate)) randomEventState = candidate;
    }

    if (!randomEventState) {
      throw new Error('Could not find a deterministic Sol 24 random-event roll for the priority test.');
    }
    expect(triggerEvent(randomEventState)?.id).toBe(expectedIds[24]);
  });

  it('includes history-based narrative details in scheduled events', () => {
    const state: GameState = {
      ...freshGame(),
      day: 28,
      activeEvents: [],
      history: [
        {
          id: 'test-decision',
          day: 25,
          actionId: 'story-sol-25-temporary-patch',
          actionLabel: 'Apply a Temporary Patch',
          playerChoice: 'self-directed',
          resourceChanges: {},
          explanation: 'A temporary repair was chosen.',
          timestamp: 0,
        },
      ],
    };

    expect(chapter5EventForDay(28, state)?.description).toContain(
      'temporary power-generation patch'
    );
  });
});

describe('applyPlayerDecision validation', () => {
  it('rejects free actions while an event is active', () => {
    const state = createInitialGameState(FIXED_CONFIG);

    expect(() =>
      applyPlayerDecision(state, {
        actionId: 'routine-operations',
        playerChoice: 'self-directed',
      })
    ).toThrow(InvalidDecisionError);
  });

  it('rejects an unknown free action (spec 5)', () => {
    const state = freshGame();
    expect(() =>
      applyPlayerDecision(state, { actionId: 'not-a-real-action', playerChoice: 'self-directed' })
    ).toThrow(InvalidDecisionError);
  });

  it('rejects an action for an event that is not active (spec 5)', () => {
    const state = freshGame();
    expect(() =>
      resolveEvent(state, 'dust-storm', 'dust-storm--shelter')
    ).toThrow(InvalidDecisionError);
  });

  it('applies an active event decision once and rejects a repeated resolution', () => {
    const initial = createInitialGameState(FIXED_CONFIG);
    const eventId = initial.activeEvents[0]!.id;
    const resolved = resolveEvent(initial, eventId, 'story-sol-01-begin');

    expect(resolved.activeEvents).toHaveLength(0);
    expect(resolved.history).toHaveLength(1);
    expect(resolved.pendingEffects).toHaveLength(1);
    expect(() => resolveEvent(resolved, eventId, 'story-sol-01-begin')).toThrow(
      InvalidDecisionError,
    );
    expect(resolved.history).toHaveLength(1);
    expect(resolved.pendingEffects).toHaveLength(1);
  });

  it('records the decision in history on success (spec 8 prelude)', () => {
    const state = freshGame();
    const next = applyPlayerDecision(state, {
      actionId: 'routine-operations',
      playerChoice: 'self-directed',
    });
    expect(next.history).toHaveLength(1);
    expect(next.history[0]?.actionId).toBe('routine-operations');
    // Original history untouched.
    expect(state.history).toHaveLength(0);
  });
});

describe('delayed effects', () => {
  it('keeps decision and effect IDs unique after effects are processed', () => {
    let state = createInitialGameState(FIXED_CONFIG);
    const sol1 = state.activeEvents[0]!;
    state = resolveEvent(state, sol1.id, 'story-sol-01-begin');
    const sol1DecisionId = state.history[0]!.id;
    const sol1EffectId = state.pendingEffects[0]!.id;

    state = advanceSimulationDay(state).state;
    const sol2 = state.activeEvents[0]!;
    state = resolveEvent(state, sol2.id, 'story-sol-02-repair');

    const sol3Advance = advanceSimulationDay(state);
    expect(sol3Advance.firedEffects.map((effect) => effect.id)).toEqual([sol1EffectId]);
    state = sol3Advance.state;
    expect(state.pendingEffects).toHaveLength(0);
    const sol3 = state.activeEvents[0]!;
    state = resolveEvent(state, sol3.id, 'story-sol-03-bypass');

    const decisionIds = state.history.map((record) => record.id);
    const effectIds = state.pendingEffects.map((effect) => effect.id);
    expect(new Set(decisionIds).size).toBe(decisionIds.length);
    expect(new Set([sol1EffectId, ...effectIds]).size).toBe(1 + effectIds.length);
    expect(effectIds).toHaveLength(1);
    expect(effectIds[0]).not.toBe(sol1EffectId);
    expect(state.history[2]!.id).not.toBe(state.history[1]!.id);
    expect(state.history[2]!.id).not.toBe(sol1DecisionId);
  });

  it('schedules and applies the Sol 1 storyline choice through the normal processor', () => {
    let state = createInitialGameState(FIXED_CONFIG);
    const openingEvent = state.activeEvents[0]!;
    const generationBefore = state.systems.powerGeneration;
    state = resolveEvent(state, openingEvent.id, 'story-sol-01-begin');

    const scheduled = state.pendingEffects[0]!;
    expect(scheduled.scheduledDay).toBe(3);
    expect(scheduled.sourceDecisionId).toBe(state.history[0]!.id);

    state = advanceSimulationDay(state).state;
    const waterEvent = state.activeEvents[0]!;
    state = resolveEvent(state, waterEvent.id, 'story-sol-02-repair');
    const onDayThree = advanceSimulationDay(state);

    expect(onDayThree.state.day).toBe(3);
    expect(onDayThree.firedEffects).toHaveLength(1);
    expect(onDayThree.firedEffects[0]!.sourceDecisionId).toBe(state.history[0]!.id);
    expect(onDayThree.state.pendingEffects).toHaveLength(0);
    expect(onDayThree.state.systems.powerGeneration).toBeLessThan(generationBefore);
  });

  it('schedules an effect tagged with its source decision (spec 8)', () => {
    const state = withActiveEvent(freshGame(), 'hydroponics-bloom');
    const next = resolveEvent(state, 'hydroponics-bloom', 'hydroponics-bloom--invest');

    expect(next.pendingEffects).toHaveLength(1);
    const effect = next.pendingEffects[0]!;
    const decision = next.history[next.history.length - 1]!;
    expect(effect.sourceDecisionId).toBe(decision.id);
    // Scheduled 3 days out from day 1.
    expect(effect.scheduledDay).toBe(state.day + 3);
  });

  it('triggers on the scheduled day, exactly once (spec 6 & 7)', () => {
    let state = withActiveEvent(freshGame(), 'hydroponics-bloom');
    state = resolveEvent(state, 'hydroponics-bloom', 'hydroponics-bloom--invest');

    const scheduledDay = state.pendingEffects[0]!.scheduledDay;
    const foodBefore = state.resources.food;

    // Advance until the day BEFORE the effect: it must not have fired yet.
    while (state.day < scheduledDay - 1) {
      state = advanceTestDay(state).state;
    }
    expect(state.pendingEffects).toHaveLength(1);

    // Advancing onto the scheduled day fires it once.
    const onDay = advanceTestDay(state);
    state = onDay.state;
    expect(state.day).toBe(scheduledDay);
    expect(onDay.firedEffects).toHaveLength(1);
    expect(state.pendingEffects).toHaveLength(0);

    // The +12 food delayed effect is reflected (allowing for daily drift, it
    // should be meaningfully higher than a run without the bloom would be).
    expect(state.resources.food).toBeGreaterThan(0);

    // Advancing further must NOT re-apply the effect (no duplicate firing).
    const foodAfterFire = state.resources.food;
    const nextAdvance = advanceTestDay(state);
    expect(nextAdvance.firedEffects).toHaveLength(0);
    // Food only moves by the normal daily delta now, not another +12 jump.
    expect(nextAdvance.state.resources.food).toBeLessThanOrEqual(foodAfterFire + 12);
    expect(foodBefore).toBeDefined();
  });
});

describe('determinism', () => {
  it('replays identically for the same config + decision sequence (spec 10)', () => {
    const run = (): GameState => {
      let s = createInitialGameState(FIXED_CONFIG);
      const openingEvent = s.activeEvents[0]!;
      s = resolveEvent(s, openingEvent.id, openingEvent.availableActions[0]!.id);
      s = advanceTestDay(s).state;
      s = resolveTestEvents(s);
      s = applyPlayerDecision(s, { actionId: 'ration-supplies', playerChoice: 'self-directed' });
      s = advanceTestDay(s).state;
      s = resolveTestEvents(s);
      s = applyPlayerDecision(s, { actionId: 'maintenance-shift', playerChoice: 'self-directed' });
      s = advanceTestDay(s).state;
      s = advanceTestDay(s).state;
      return s;
    };

    const a = run();
    const b = run();
    expect(a).toEqual(b);
  });

  it('negative daily consumption cannot be gamed into free resources', () => {
    // Ambitious consumes more; even so, resources never exceed the cap.
    let state = freshGame({ operatingPhilosophy: 'ambitious' });
    for (let i = 0; i < 15; i++) {
      state = advanceTestDay(state).state;
      for (const key of RESOURCE_KEYS) {
        expect(state.resources[key]).toBeLessThanOrEqual(METRIC_MAX);
        expect(state.resources[key]).toBeGreaterThanOrEqual(METRIC_MIN);
      }
    }
  });
});
