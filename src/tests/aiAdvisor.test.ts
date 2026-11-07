
import { describe, expect, it } from 'vitest';
import { ruleBasedAdvisor } from '../features/ai-advisor/advisorInterface';
import type { AdvisorConfidence } from '../features/ai-advisor/advisorTypes';
import { freshGame, withActiveEvent } from './helpers';

describe('AI Mission Controller', () => {
  const eventIds = ['dust-storm', 'solar-storm'];

  it.each(eventIds)(
    'recommends a valid action for %s',
    (eventId) => {
      const state = withActiveEvent(freshGame(), eventId);

      const recommendation = ruleBasedAdvisor.recommend({
        state,
        eventId,
      });

      const event = state.activeEvents.find(
        (candidate) => candidate.id === eventId
      );

      expect(event).toBeDefined();
      expect(recommendation).not.toBeNull();
      expect(
        event?.availableActions.some(
          (action) => action.id === recommendation?.actionId
        )
      ).toBe(true);
      expect(recommendation?.eventId).toBe(eventId);
    }
  );

  it('includes a valid confidence level and explanation', () => {
    const state = withActiveEvent(freshGame(), 'dust-storm');

    const recommendation = ruleBasedAdvisor.recommend({
      state,
      eventId: 'dust-storm',
    });

    const validConfidenceLevels: AdvisorConfidence[] = [
      'low',
      'medium',
      'high',
    ];

    expect(recommendation).not.toBeNull();
    expect(validConfidenceLevels).toContain(recommendation?.confidence);
    expect(recommendation?.rationale.trim().length).toBeGreaterThan(0);
  });

  it('does not mutate the game state when making a recommendation', () => {
    const state = withActiveEvent(freshGame(), 'solar-storm');
    const originalState = JSON.stringify(state);

    ruleBasedAdvisor.recommend({
      state,
      eventId: 'solar-storm',
    });

    expect(JSON.stringify(state)).toBe(originalState);
  });

  it('returns null for an event that is not active', () => {
    const state = freshGame();

    const recommendation = ruleBasedAdvisor.recommend({
      state,
      eventId: 'event-that-is-not-active',
    });

    expect(recommendation).toBeNull();
  });

  it('returns null when the mission has failed', () => {
    const state = freshGame();
    const failedState = {
      ...state,
      mission: {
        ...state.mission,
        status: 'failed' as const,
      },
    };

    const recommendation = ruleBasedAdvisor.recommend({
      state: failedState,
      eventId: 'dust-storm',
    });

    expect(recommendation).toBeNull();
  });

it('prioritizes shielding when crew radiation exposure is high', () => {
  const baseState = freshGame();
  const stressedState = {
    ...baseState,
    crew: {
      ...baseState.crew,
      radiationExposure: 80,
    },
  };

  const state = withActiveEvent(stressedState, 'solar-storm');

  const recommendation = ruleBasedAdvisor.recommend({
    state,
    eventId: 'solar-storm',
  });

  expect(recommendation?.actionId).toBe(
    'solar-storm--activate-shielding'
  );

  expect(recommendation?.rationale).toContain(
    'Potential benefit: power generation +8 after 2 days'
  );
});

it('explains delayed risks in its recommendation', () => {
  const baseState = freshGame();
  const stressedState = {
    ...baseState,
    crew: {
      ...baseState.crew,
      radiationExposure: 35,
    },
  };

  const state = withActiveEvent(stressedState, 'solar-storm');

  const recommendation = ruleBasedAdvisor.recommend({
    state,
    eventId: 'solar-storm',
  });

  expect(recommendation?.actionId).toBe('solar-storm--shutdown-systems');
  expect(recommendation?.rationale).toContain('Potential risk: food production -5 after 3 days');
  expect(recommendation?.rationale).toContain('Potential risk: health -8 after 1 days');
});

it('prioritizes oxygen recovery when oxygen is critically low', () => {
  const baseState = freshGame();
  const lowOxygenState = {
    ...baseState,
    resources: {
      ...baseState.resources,
      oxygen: 10,
    },
  };

  const state = withActiveEvent(
    lowOxygenState,
    'story-sol-13-emergency-resource-allocation'
  );

  const recommendation = ruleBasedAdvisor.recommend({
    state,
    eventId: 'story-sol-13-emergency-resource-allocation',
  });

  expect(recommendation?.actionId).toBe(
    'story-sol-13-prioritise-oxygen'
  );
});


it('prioritizes oxygen when multiple survival resources are low', () => {
  const baseState = freshGame();
  const stressedState = {
    ...baseState,
    resources: {
      ...baseState.resources,
      oxygen: 10,
      food: 25,
      water: 25,
      power: 50,
    },
  };
  const state = withActiveEvent(
    stressedState,
    'story-sol-13-emergency-resource-allocation'
  );
  const recommendation = ruleBasedAdvisor.recommend({
    state,
    eventId: 'story-sol-13-emergency-resource-allocation',
  });
  expect(recommendation?.actionId).toBe(
    'story-sol-13-prioritise-oxygen'
  );
});

it('prioritizes oxygen recovery when oxygen and power are both critical', () => {
  const baseState = freshGame();
  const stressedState = {
    ...baseState,
    resources: {
      ...baseState.resources,
      oxygen: 10,
      power: 14,
      food: 70,
      water: 70,
    },
  };
  const state = withActiveEvent(
    stressedState,
    'story-sol-13-emergency-resource-allocation'
  );
  const recommendation = ruleBasedAdvisor.recommend({
    state,
    eventId: 'story-sol-13-emergency-resource-allocation',
  });
  expect(recommendation?.actionId).toBe(
    'story-sol-13-prioritise-oxygen'
  );
});;
});


it('prioritizes crew protection when radiation is high and health is low', () => {
  const baseState = freshGame();
  const stressedState = {
    ...baseState,
    crew: {
      ...baseState.crew,
      health: 20,
      radiationExposure: 80,
    },
  };
  const state = withActiveEvent(stressedState, 'solar-storm');
  const recommendation = ruleBasedAdvisor.recommend({ state, eventId: 'solar-storm' });
  expect(recommendation?.actionId).toBe('solar-storm--activate-shielding');
});

it('prioritizes emergency repairs when life support is critically weak', () => {
  const baseState = freshGame();
  const stressedState = {
    ...baseState,
    resources: {
      ...baseState.resources,
      oxygen: 60,
      power: 60,
    },
    systems: {
      ...baseState.systems,
      lifeSupportEfficiency: 15,
      powerGeneration: 50,
    },
    crew: {
      ...baseState.crew,
      health: 70,
      radiationExposure: 20,
      morale: 70,
    },
  };
  const state = withActiveEvent(stressedState, 'catastrophic-system-failure');
  const recommendation = ruleBasedAdvisor.recommend({ state, eventId: 'catastrophic-system-failure' });
  expect(recommendation?.actionId).toBe('system-failure--emergency-repairs');
});

it('balances critical oxygen and power against failing life support', () => {
  const baseState = freshGame();
  const stressedState = {
    ...baseState,
    resources: {
      ...baseState.resources,
      oxygen: 10,
      power: 14,
      food: 70,
      water: 70,
    },
    systems: {
      ...baseState.systems,
      lifeSupportEfficiency: 15,
      powerGeneration: 50,
    },
    crew: {
      ...baseState.crew,
      health: 70,
      radiationExposure: 20,
      morale: 70,
    },
  };
  const state = withActiveEvent(stressedState, 'catastrophic-system-failure');
  const recommendation = ruleBasedAdvisor.recommend({ state, eventId: 'catastrophic-system-failure' });
  expect(recommendation?.actionId).toBe('system-failure--conserve');
});


it('explains why shielding is recommended based on mission conditions', () => {
  const baseState = freshGame();
  const stressedState = {
    ...baseState,
    crew: {
      ...baseState.crew,
      radiationExposure: 80,
    },
  };
  const state = withActiveEvent(stressedState, 'solar-storm');
  const recommendation = ruleBasedAdvisor.recommend({ state, eventId: 'solar-storm' });

  expect(recommendation?.actionId).toBe('solar-storm--activate-shielding');
  expect(recommendation?.rationale).toContain('Mission context: crew radiation exposure is high (80/100).');
});
