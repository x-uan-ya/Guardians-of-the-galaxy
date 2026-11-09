/**
 * Every choice a player can make must be understood by the story and learning
 * features: the leadership profile must know what it says about the player, and
 * (unless it is a plain "carry on" choice) the debrief must have a lesson for it.
 * This stops new events from silently being left out of the second half of a run.
 */

import { describe, expect, it } from 'vitest';
import { EVENT_CATALOG, FREE_ACTIONS } from '../features/events/eventCatalog';
import { buildEducationalExplanation } from '../features/educational-explanations/explanationBuilder';
import { hasTopicMapping } from '../features/educational-explanations/topicMatcher';
import { classifyAction, isClassifiedAction } from '../features/leadership-profile/actionClassifier';
import { scoreLeadershipProfile } from '../features/leadership-profile/leadershipScorer';
import type { DecisionRecord } from '../features/decisions/decisionTypes';
import { LEADERSHIP_TRAITS } from '../features/leadership-profile/leadershipTypes';
import { applyPlayerDecision, advanceSimulationDay } from '../features/simulation/simulationEngine';
import { freshGame } from './helpers';

const ALL_ACTIONS = [
  ...EVENT_CATALOG.flatMap((event) => event.availableActions.map((action) => ({ action, eventId: event.id }))),
  ...FREE_ACTIONS.map((action) => ({ action, eventId: undefined as string | undefined })),
];

/** Plain "carry on" / "take stock" choices: no lesson is shown for these on purpose. */
const NO_LESSON_ON_PURPOSE = new Set([
  'routine-operations',
  'story-sol-08-routine-operations',
  'story-sol-15-acknowledge-midpoint',
  'story-sol-16-routine-operations',
  'story-sol-22-routine-operations',
  'successful-experiment--celebrate',
  'successful-experiment--continue',
]);

function record(actionId: string, eventId?: string): DecisionRecord {
  return {
    id: 'd1',
    day: 20,
    ...(eventId ? { eventId } : {}),
    actionId,
    actionLabel: 'Chosen action',
    playerChoice: 'self-directed',
    resourceChanges: {},
    explanation: '',
    timestamp: 0,
  };
}

describe('story features cover every choice in the game', () => {
  it('has a leadership classification entry for every action', () => {
    const missing = ALL_ACTIONS.filter(({ action }) => !isClassifiedAction(action.id)).map(({ action }) => action.id);
    expect(missing).toEqual([]);
  });

  it('every non-routine action signals at least one leadership trait', () => {
    const silent = ALL_ACTIONS.filter(
      ({ action }) => !NO_LESSON_ON_PURPOSE.has(action.id) && Object.keys(classifyAction(action.id)).length === 0
    ).map(({ action }) => action.id);
    expect(silent).toEqual([]);
  });

  it('every non-routine action has a real-world lesson', () => {
    const missing = ALL_ACTIONS.filter(
      ({ action }) => !NO_LESSON_ON_PURPOSE.has(action.id) && !hasTopicMapping(action.id)
    ).map(({ action }) => action.id);
    expect(missing).toEqual([]);
  });

  it('builds a complete lesson for the second half of the mission (Sols 16-29)', () => {
    const lateActions = ALL_ACTIONS.filter(({ action }) => /^story-sol-(1[6-9]|2\d)-/.test(action.id) && hasTopicMapping(action.id));
    expect(lateActions.length).toBeGreaterThan(30);
    for (const { action, eventId } of lateActions) {
      const lesson = buildEducationalExplanation(record(action.id, eventId));
      expect(lesson, action.id).not.toBeNull();
      expect(lesson?.whatHappened.length, action.id).toBeGreaterThan(10);
      expect(lesson?.whyItHappened.length, action.id).toBeGreaterThan(20);
      expect(lesson?.keyTakeaway.length, action.id).toBeGreaterThan(10);
    }
  });

  it('the late-game choices now change the leadership profile', () => {
    // Play only the storyline choices from Sol 16 onwards, always the first or the last option.
    const profileFor = (pick: 'first' | 'last') => {
      let state = { ...freshGame(), day: 15 };
      let guard = 0;
      while (state.mission.status !== 'failed' && state.mission.status !== 'completed' && state.day < 29 && guard++ < 40) {
        state = advanceSimulationDay(state).state;
        let inner = 0;
        while (state.activeEvents.length > 0 && inner++ < 5) {
          const event = state.activeEvents[0]!;
          const actions = event.availableActions;
          const chosen = pick === 'first' ? actions[0]! : actions[actions.length - 1]!;
          state = applyPlayerDecision(state, { eventId: event.id, actionId: chosen.id, playerChoice: 'self-directed' });
        }
      }
      return { state, profile: scoreLeadershipProfile(state) };
    };
    const a = profileFor('first');
    const b = profileFor('last');
    for (const run of [a, b]) {
      expect(run.state.history.some((d) => /^story-sol-(1[6-9]|2\d)-/.test(d.actionId))).toBe(true);
      expect(run.profile.insufficientData).toBe(false);
      expect(LEADERSHIP_TRAITS.some((trait) => run.profile.scores[trait] > 0)).toBe(true);
    }
    expect(JSON.stringify(a.profile.scores)).not.toBe(JSON.stringify(b.profile.scores));
  });
});
