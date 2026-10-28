import { describe, expect, it } from 'vitest';
import { createRng } from '../lib/random';
import type { ActionEffect, EventAction } from '../features/events/eventTypes';
import {
  advanceSimulationDay,
  applyPlayerDecision,
  createInitialGameState,
  getFreeActions,
  getGameOverReason,
  resolveEvent,
  validateGameState,
} from '../features/simulation/simulationEngine';
import type {
  DelayedEffect,
  GameState,
  MissionType,
  ResourceKey,
} from '../features/simulation/simulationTypes';
import type { MissionConfig } from '../features/mission/missionTypes';

type Strategy = 'balanced' | 'resource-saving' | 'safety-first' | 'risk-taking' | 'seeded-random';

const MISSIONS: readonly MissionType[] = ['lunar', 'mars', 'deep-space'];
const STRATEGIES: readonly Strategy[] = [
  'balanced',
  'resource-saving',
  'safety-first',
  'risk-taking',
  'seeded-random',
];
const FIXED_NOW = 1_798_000_000_000;
const MAX_EVENT_RESOLUTIONS_PER_SOL = 10;
const MAX_EVENT_RESOLUTIONS_PER_RUN = 100;
const DELAYED_EFFECT_WEIGHT = 0.5;

/**
 * Test-only strategy definitions:
 * - balanced values resource, crew, radiation safety, and system gains together;
 * - resource-saving gives stored resources priority over crew and systems;
 * - safety-first strongly favors health, oxygen, and reduced radiation;
 * - risk-taking favors declared gains while discounting costs and delayed harm;
 * - seeded-random selects uniformly among available choices with a fixed RNG.
 *
 * These policies only rank catalog effects; none changes engine calculations.
 */
interface EventDecisionSummary {
  sol: number;
  eventId: string;
  actionId: string;
  actionLabel: string;
}

interface PlaythroughReport {
  mission: MissionType;
  strategy: Strategy;
  gameId: string;
  finalStatus: GameState['mission']['status'];
  endingSol: number;
  score: number;
  failureReason?: string;
  lowestResources: Record<ResourceKey, number>;
  eventDecisions: EventDecisionSummary[];
  scheduledEventsEncountered: number;
  delayedEffectsFired: DelayedEffect[];
  pendingEffectsAtTermination: DelayedEffect[];
}

interface StrategyWeights {
  resources: Record<ResourceKey, number>;
  health: number;
  morale: number;
  radiation: number;
  systems: number;
  delayed: number;
  asymmetricRisk?: boolean;
}

const STRATEGY_WEIGHTS: Record<Exclude<Strategy, 'seeded-random'>, StrategyWeights> = {
  balanced: {
    resources: { power: 1, water: 1, food: 1, oxygen: 1 },
    health: 1.25,
    morale: 0.5,
    radiation: -1.5,
    systems: 0.5,
    delayed: DELAYED_EFFECT_WEIGHT,
  },
  'resource-saving': {
    resources: { power: 2, water: 2, food: 2, oxygen: 2 },
    health: 0.75,
    morale: 0.25,
    radiation: -0.5,
    systems: 0.25,
    delayed: 0.7,
  },
  'safety-first': {
    resources: { power: 0.8, water: 0.8, food: 0.8, oxygen: 1.5 },
    health: 2.5,
    morale: 0.5,
    radiation: -2.5,
    systems: 0.8,
    delayed: 0.8,
  },
  'risk-taking': {
    resources: { power: 1, water: 1, food: 1, oxygen: 1 },
    health: 1,
    morale: 0.5,
    radiation: -1,
    systems: 0.5,
    delayed: 0.35,
    asymmetricRisk: true,
  },
};

function configFor(
  mission: MissionType,
  strategy: Strategy,
): MissionConfig & { gameId: string } {
  const gameId =
    mission === 'mars' && strategy === 'balanced'
      ? 'playthrough-mars-balanced-sol-1'
      : `playthrough-${mission}-${strategy}-sol-1`;
  return {
    missionType: mission,
    occupation: 'engineer',
    objective: 'survival',
    operatingPhilosophy: 'balanced',
    startingCondition: 'standard',
    // Keep the original Mars balanced scenario's fixed identity.
    gameId,
    now: FIXED_NOW,
  };
}

function weightedChanges(
  changes: Record<string, number | undefined> | undefined,
  weights: Record<string, number>,
  asymmetricRisk: boolean,
): number {
  return Object.entries(changes ?? {}).reduce((total, [key, value]) => {
    if (value === undefined) return total;
    const weighted = value * (weights[key] ?? 0);
    if (!asymmetricRisk) return total + weighted;
    // Risk-taking values potential gains more than costs and delayed downside.
    return total + weighted * (weighted >= 0 ? 1.25 : 0.2);
  }, 0);
}

/**
 * Test-only policy scoring: use only declared effects, not state mutations.
 * The four ranked policies use different weights; risk-taking discounts costs
 * while favoring declared gains. Delayed metric changes are discounted.
 */
function scoreEffect(effect: ActionEffect, strategy: Exclude<Strategy, 'seeded-random'>): number {
  const weights = STRATEGY_WEIGHTS[strategy];
  const asymmetricRisk = weights.asymmetricRisk ?? false;
  const crewWeights = {
    health: weights.health,
    morale: weights.morale,
    radiationExposure: weights.radiation,
  };
  const systemWeights = {
    powerGeneration: weights.systems,
    lifeSupportEfficiency: weights.systems,
    foodProduction: weights.systems,
    shieldingIntegrity: weights.systems,
  };

  const immediate =
    weightedChanges(effect.immediateResources, weights.resources, asymmetricRisk) +
    weightedChanges(effect.immediateCrew, crewWeights, asymmetricRisk) +
    weightedChanges(effect.immediateSystems, systemWeights, asymmetricRisk);
  const delayed = (effect.delayed ?? []).reduce((total, item) => {
    const parameters = item.parameters;
    if (parameters.kind === 'status') {
      const statusScore =
        parameters.status === 'failed' ? -100 : parameters.status === 'completed' ? 100 : 0;
      return total + weights.delayed * statusScore;
    }

    if (parameters.kind === 'resource') {
      return total + weights.delayed *
        weightedChanges(parameters.changes, weights.resources, asymmetricRisk);
    }
    if (parameters.kind === 'crew') {
      return total + weights.delayed *
        weightedChanges(parameters.changes, crewWeights, asymmetricRisk);
    }
    return total + weights.delayed *
      weightedChanges(parameters.changes, systemWeights, asymmetricRisk);
  }, 0);

  return immediate + delayed;
}

function chooseAction(
  actions: readonly EventAction[],
  strategy: Strategy,
  rng: ReturnType<typeof createRng>,
): EventAction {
  if (actions.length === 0) throw new Error('Cannot choose from an empty action list.');
  if (strategy === 'seeded-random') {
    const selected = actions[rng.nextInt(0, actions.length - 1)];
    if (!selected) throw new Error('Seeded action selection returned no action.');
    return selected;
  }

  const selected = [...actions].sort((a, b) => {
    const difference =
      scoreEffect(b.effect, strategy) - scoreEffect(a.effect, strategy);
    return difference || a.id.localeCompare(b.id);
  })[0];
  if (!selected) throw new Error('Cannot choose from an empty action list.');
  return selected;
}

function observeResources(
  state: GameState,
  lowest: Record<ResourceKey, number>,
): Record<ResourceKey, number> {
  return {
    power: Math.min(lowest.power, state.resources.power),
    water: Math.min(lowest.water, state.resources.water),
    food: Math.min(lowest.food, state.resources.food),
    oxygen: Math.min(lowest.oxygen, state.resources.oxygen),
  };
}

function assertValidState(state: GameState, context: string): void {
  const validation = validateGameState(state);
  if (!validation.valid) {
    throw new Error(`${context} produced an invalid state: ${validation.errors.join('; ')}`);
  }
}

function runPlaythrough(mission: MissionType, strategy: Strategy): PlaythroughReport {
  const config = configFor(mission, strategy);
  let state = createInitialGameState(config);
  assertValidState(state, 'Initial state');
  if (state.mission.missionType !== mission) {
    throw new Error(`Expected ${mission} mission, got ${state.mission.missionType}.`);
  }
  if (state.activeEvents.length === 0) {
    throw new Error('The opening Sol 1 event should be active at game creation.');
  }

  // This RNG belongs to the test policy, separate from the engine's event rolls.
  const policyRng = createRng(`${config.gameId}-policy-seed-v1`);
  let lowestResources: Record<ResourceKey, number> = { ...state.resources };
  const eventDecisions: EventDecisionSummary[] = [];
  const delayedEffectsFired: DelayedEffect[] = [];
  const resolvedEventKeys = new Set<string>();
  const routineActionSols = new Set<number>();
  let eventResolutionCount = 0;

  while (state.mission.status !== 'completed' && state.mission.status !== 'failed') {
    if (state.day > 30) {
      throw new Error(`Playthrough continued past the Sol 30 target (Sol ${state.day}).`);
    }
    let eventResolutionsThisSol = 0;

    while (
      state.activeEvents.length > 0 &&
      state.mission.status !== 'completed' &&
      state.mission.status !== 'failed'
    ) {
      const event = state.activeEvents[0];
      if (!event) throw new Error('Active event list contained no event.');
      const eventKey = `${state.day}:${event.id}`;
      if (resolvedEventKeys.has(eventKey)) {
        throw new Error(`Event "${event.id}" was encountered repeatedly on Sol ${state.day}.`);
      }
      if (++eventResolutionsThisSol > MAX_EVENT_RESOLUTIONS_PER_SOL) {
        throw new Error(`Exceeded the event-resolution limit on Sol ${state.day}.`);
      }
      if (++eventResolutionCount > MAX_EVENT_RESOLUTIONS_PER_RUN) {
        throw new Error('Exceeded the event-resolution limit for this playthrough.');
      }

      resolvedEventKeys.add(eventKey);
      const action = chooseAction(event.availableActions, strategy, policyRng);
      const historyLength = state.history.length;
      state = resolveEvent(state, event.id, action.id);
      assertValidState(state, `Resolving ${event.id}`);
      if (
        state.history.length !== historyLength + 1 ||
        state.activeEvents.some((active) => active.id === event.id)
      ) {
        throw new Error(`Resolving event "${event.id}" did not make progress.`);
      }
      eventDecisions.push({
        sol: state.day,
        eventId: event.id,
        actionId: action.id,
        actionLabel: action.label,
      });
      lowestResources = observeResources(state, lowestResources);
    }

    if (state.mission.status === 'completed' || state.mission.status === 'failed') break;

    let routineAction: EventAction | undefined;
    if (strategy === 'seeded-random') {
      if (policyRng.next() < 0.5) {
        const freeActions = getFreeActions();
        routineAction = freeActions[policyRng.nextInt(0, freeActions.length - 1)];
      }
    } else {
      const best = chooseAction(getFreeActions(), strategy, policyRng);
      if (scoreEffect(best.effect, strategy) > 0) routineAction = best;
    }

    if (routineAction) {
      if (routineActionSols.has(state.day)) {
        throw new Error(`A routine action was selected more than once on Sol ${state.day}.`);
      }
      routineActionSols.add(state.day);
      state = applyPlayerDecision(state, {
        actionId: routineAction.id,
        playerChoice: 'self-directed',
      });
      assertValidState(state, `Applying routine action ${routineAction.id}`);
      lowestResources = observeResources(state, lowestResources);
    }

    if (state.mission.status === 'completed' || state.mission.status === 'failed') break;
    if (state.activeEvents.length !== 0) {
      throw new Error(`Cannot advance Sol ${state.day} with unresolved active events.`);
    }

    const previousDay = state.day;
    const advance = advanceSimulationDay(state);
    if (advance.state.day !== previousDay + 1) {
      throw new Error(`Expected Sol to advance from ${previousDay} to ${previousDay + 1}.`);
    }
    assertValidState(advance.state, `Advancing from Sol ${previousDay}`);
    state = advance.state;
    delayedEffectsFired.push(...advance.firedEffects);
    lowestResources = observeResources(state, lowestResources);
  }

  assertValidState(state, 'Terminal state');
  if (state.mission.status !== 'completed' && state.mission.status !== 'failed') {
    throw new Error(`Playthrough ended without a terminal status: ${state.mission.status}.`);
  }
  if (state.day < 1 || state.day > 30) {
    throw new Error(`Playthrough ended outside the expected Sol range: ${state.day}.`);
  }
  if (state.mission.status === 'completed' && state.day !== 30) {
    throw new Error(`Engine marked the mission complete before the Sol 30 target: Sol ${state.day}.`);
  }
  for (const effect of delayedEffectsFired) {
    if (!state.history.some((decision) => decision.id === effect.sourceDecisionId)) {
      throw new Error(`Fired delayed effect "${effect.id}" has no recorded source decision.`);
    }
  }

  return {
    mission,
    strategy,
    gameId: config.gameId,
    finalStatus: state.mission.status,
    endingSol: state.day,
    score: state.mission.score,
    ...(state.mission.status === 'failed'
      ? { failureReason: getGameOverReason(state) }
      : {}),
    lowestResources,
    eventDecisions,
    scheduledEventsEncountered: eventDecisions.filter((decision) =>
      decision.eventId.startsWith('story-'),
    ).length,
    delayedEffectsFired,
    pendingEffectsAtTermination: state.pendingEffects,
  };
}

function formatSummaryTable(playthroughs: readonly PlaythroughReport[]): string {
  const headers = [
    'Mission',
    'Strategy',
    'Outcome',
    'Sol',
    'Score',
    'Failure reason',
    'Lowest P/W/F/O',
    'Story events',
    'Effects fired',
    'Effects pending',
  ];
  const rows = playthroughs.map((report) => [
    report.mission,
    report.strategy,
    report.finalStatus,
    String(report.endingSol),
    report.score.toFixed(2),
    report.failureReason ?? '-',
    `${report.lowestResources.power.toFixed(1)}/${report.lowestResources.water.toFixed(1)}/${report.lowestResources.food.toFixed(1)}/${report.lowestResources.oxygen.toFixed(1)}`,
    String(report.scheduledEventsEncountered),
    String(report.delayedEffectsFired.length),
    String(report.pendingEffectsAtTermination.length),
  ]);
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  const formatRow = (row: readonly string[]): string =>
    `| ${row.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join(' | ')} |`;
  const separator = `|-${widths.map((width) => '-'.repeat(width)).join('-|-')}-|`;
  return [formatRow(headers), separator, ...rows.map(formatRow)].join('\n');
}

function collectSuspiciousFindings(playthroughs: readonly PlaythroughReport[]): string[] {
  const findings: string[] = [];
  if (playthroughs.every((report) => report.finalStatus === 'completed')) {
    const lowestObserved = (key: ResourceKey): number =>
      Math.min(...playthroughs.map((report) => report.lowestResources[key]));
    findings.push(
      `All 15 scenarios completed without failure. Lowest observed resource values: power ${lowestObserved('power').toFixed(1)}, water ${lowestObserved('water').toFixed(1)}, food ${lowestObserved('food').toFixed(1)}, oxygen ${lowestObserved('oxygen').toFixed(1)}. Review alongside failure rules; this test does not recommend an automatic balance change.`,
    );
  }
  for (const report of playthroughs) {
    const expectedScheduledThroughSol = Math.min(report.endingSol, 29);
    if (
      report.finalStatus === 'completed' &&
      report.scheduledEventsEncountered !== expectedScheduledThroughSol
    ) {
      findings.push(
        `${report.mission}/${report.strategy} completed with ${report.scheduledEventsEncountered} scheduled events; expected ${expectedScheduledThroughSol}.`,
      );
    }
    if (
      report.finalStatus === 'failed' &&
      report.endingSol === 30
    ) {
      findings.push(
        `${report.mission}/${report.strategy} has failed status on Sol 30; inspect terminal-state handling.`,
      );
    }
  }
  return findings;
}

describe('headless deterministic simulation playthroughs', () => {
  it('runs all mission and test-only strategy combinations to a valid terminal outcome', () => {
    const playthroughs: PlaythroughReport[] = [];

    for (const mission of MISSIONS) {
      for (const strategy of STRATEGIES) {
        const firstRun = runPlaythrough(mission, strategy);
        const replay = runPlaythrough(mission, strategy);
        expect(firstRun).toEqual(replay);
        expect(firstRun.mission).toBe(mission);
        expect(firstRun.strategy).toBe(strategy);
        expect(['completed', 'failed']).toContain(firstRun.finalStatus);
        expect(firstRun.endingSol).toBeGreaterThanOrEqual(1);
        expect(firstRun.endingSol).toBeLessThanOrEqual(30);
        expect(Number.isFinite(firstRun.score)).toBe(true);
        expect(
          Object.values(firstRun.lowestResources).every(
            (value) => Number.isFinite(value) && value >= 0 && value <= 100,
          ),
        ).toBe(true);
        expect(firstRun.eventDecisions[0]?.eventId).toBe('story-sol-01-supply-inspection');
        expect(firstRun.eventDecisions.length).toBeGreaterThan(0);
        if (firstRun.finalStatus === 'failed') {
          expect(firstRun.failureReason).toBeDefined();
        } else {
          expect(firstRun.failureReason).toBeUndefined();
          expect(firstRun.endingSol).toBe(30);
        }
        playthroughs.push(firstRun);
      }
    }

    expect(playthroughs).toHaveLength(15);
    console.info(`15-scenario playthrough summary:\n${formatSummaryTable(playthroughs)}`);
    console.info(
      `Full playthrough reports:\n${JSON.stringify(playthroughs, null, 2)}`,
    );
    const findings = collectSuspiciousFindings(playthroughs);
    console.info(
      findings.length > 0
        ? `Suspicious findings (review only):\n- ${findings.join('\n- ')}`
        : 'Suspicious findings (review only): none detected.',
    );
  });
});
