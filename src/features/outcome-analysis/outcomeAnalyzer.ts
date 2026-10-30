/**
 * outcomeAnalyzer.ts
 * -------------------
 * Pure, deterministic analysis functions that derive a FullOutcomeAnalysis from
 * a finished (or in-progress) GameState. READ-ONLY: never mutates state.
 *
 * All insights and explanations are template-driven, grounded in recorded game
 * data. Nothing is invented or fabricated.
 */

import { findEvent } from '../events/eventCatalog';
import { getMission } from '../mission/missions';
import { getGameOverReason } from '../simulation/simulationEngine';
import { calculateDerivedStatus } from '../simulation/simulationSelectors';
import {
  RESOURCE_KEYS,
  type GameState,
  type ResourceKey,
} from '../simulation/simulationTypes';
import { RESOURCE_LABELS } from '../dashboard/labels';
import type {
  AnalysisInsight,
  CauseEffectChain,
  CrewResult,
  FullOutcomeAnalysis,
  LifeSupportResult,
  MissionResults,
  OutcomeExplanationData,
  RankedDecision,
  RecordedConsequence,
  ResourceResult,
} from './outcomeTypes';

// ---------------------------------------------------------------------------
// Mission Results
// ---------------------------------------------------------------------------

/** Build the mission results snapshot from the final GameState. */
export function buildMissionResults(state: GameState): MissionResults {
  const derived = calculateDerivedStatus(state);
  const mission = getMission(state.mission.missionType);

  const resources: ResourceResult[] = RESOURCE_KEYS.map((key) => ({
    key,
    label: RESOURCE_LABELS[key],
    value: state.resources[key],
    level: derived.resources[key].level,
  }));

  const crew: CrewResult = {
    health: state.crew.health,
    healthLevel: derived.crew.health.level,
    morale: state.crew.morale,
    moraleLevel: derived.crew.morale.level,
    radiationExposure: state.crew.radiationExposure,
    radiationLevel: derived.crew.radiationExposure.level,
    survived: state.crew.health > 0,
  };

  const lifeSupport: LifeSupportResult = {
    efficiency: state.systems.lifeSupportEfficiency,
    level: derived.systems.lifeSupportEfficiency.level,
  };

  return {
    status: state.mission.status,
    daysSurvived: state.day,
    finalScore: state.mission.score,
    totalDecisions: state.history.length,
    resources,
    crew,
    lifeSupport,
    missionTypeLabel: mission.label,
  };
}

// ---------------------------------------------------------------------------
// Ranked decisions (by impact magnitude)
// ---------------------------------------------------------------------------

/** Compute absolute impact of a decision's resource changes. */
function decisionAbsoluteImpact(changes: Partial<Record<ResourceKey, number>>): number {
  let sum = 0;
  for (const key of RESOURCE_KEYS) {
    sum += Math.abs(changes[key] ?? 0);
  }
  return sum;
}

/** Compute net signed impact of a decision's resource changes. */
function decisionNetImpact(changes: Partial<Record<ResourceKey, number>>): number {
  let sum = 0;
  for (const key of RESOURCE_KEYS) {
    sum += changes[key] ?? 0;
  }
  return sum;
}

/** Rank all decisions by absolute resource impact, descending. */
export function buildRankedDecisions(state: GameState): RankedDecision[] {
  return state.history
    .map((record) => {
      let eventTitle: string | null = null;
      if (record.eventId) {
        const evt = findEvent(record.eventId);
        eventTitle = evt?.title ?? null;
      }
      return {
        record,
        absoluteImpact: decisionAbsoluteImpact(record.resourceChanges),
        netImpact: decisionNetImpact(record.resourceChanges),
        eventTitle,
      };
    })
    .sort((a, b) => b.absoluteImpact - a.absoluteImpact);
}

// ---------------------------------------------------------------------------
// Recorded consequences
// ---------------------------------------------------------------------------

/**
 * Build the list of consequences from pending effects. Only effects that are
 * still in state.pendingEffects are available — fired effects have already
 * been removed by the engine. We distinguish:
 *   - hasFired = true  → scheduledDay <= state.day (the effect was due but the
 *     engine may have already processed and removed it; we only see remaining ones)
 *   - hasFired = false → scheduledDay > state.day (still pending)
 *
 * NOTE: The engine removes effects after processing them, so
 * state.pendingEffects only contains UNFIRED future effects. We report these
 * as pending consequences. For consequences that already happened, we look at
 * the decision history and the event catalog to identify decisions that had
 * declared delayed effects whose scheduledDay has passed.
 */
export function buildRecordedConsequences(state: GameState): RecordedConsequence[] {
  const consequences: RecordedConsequence[] = [];
  const decisionById = new Map(state.history.map((d) => [d.id, d]));

  // 1. Still-pending effects (from state.pendingEffects — these have NOT fired yet).
  for (const effect of state.pendingEffects) {
    const source = decisionById.get(effect.sourceDecisionId);
    if (!source) continue;
    consequences.push({
      sourceDecision: source,
      description: effect.description,
      scheduledDay: effect.scheduledDay,
      hasFired: false, // still in pendingEffects = not yet fired
    });
  }

  // 2. Already-fired consequences: look at each decision's event catalog entry
  //    to find delayed effects that were declared and whose scheduledDay has
  //    passed. Since the engine removes fired effects from pendingEffects, we
  //    reconstruct them from the catalog.
  for (const record of state.history) {
    if (!record.eventId) continue;
    const catalogEvent = findEvent(record.eventId);
    if (!catalogEvent) continue;

    const chosenAction = catalogEvent.availableActions.find(
      (a) => a.id === record.actionId,
    );
    if (!chosenAction?.effect.delayed) continue;

    for (const delayed of chosenAction.effect.delayed) {
      const scheduledDay = record.day + delayed.delayInDays;
      // Only include if it has actually fired (scheduledDay <= current day)
      // AND it's no longer in pendingEffects (meaning the engine processed it).
      if (scheduledDay > state.day) continue;
      const stillPending = state.pendingEffects.some(
        (pe) =>
          pe.sourceDecisionId === record.id &&
          pe.scheduledDay === scheduledDay &&
          pe.description === delayed.description,
      );
      if (stillPending) continue; // not yet processed — covered above

      consequences.push({
        sourceDecision: record,
        description: delayed.description,
        scheduledDay,
        hasFired: true,
      });
    }
  }

  // Sort: fired consequences first (by day ascending), then pending (by day ascending).
  consequences.sort((a, b) => {
    if (a.hasFired !== b.hasFired) return a.hasFired ? -1 : 1;
    return a.scheduledDay - b.scheduledDay;
  });

  return consequences;
}

// ---------------------------------------------------------------------------
// Outcome explanation (deterministic, template-driven)
// ---------------------------------------------------------------------------

/** Why the mission ended as it did. */
function buildPrimaryReason(state: GameState): string {
  if (state.mission.status === 'completed') {
    return `You successfully survived all ${state.day} sols and reached extraction. ` +
      `The outpost remained operational with a final score of ${Math.round(state.mission.score)}.`;
  }

  if (state.mission.status === 'failed') {
    const reason = getGameOverReason(state);
    switch (reason) {
      case 'character-died':
        return `Your character's health reached zero on Sol ${state.day}. ` +
          `Accumulated damage from events, resource shortages, or risky decisions proved fatal.`;
      case 'oxygen-depleted':
        return `The outpost ran out of breathable oxygen on Sol ${state.day}. ` +
          `Life-support systems could not maintain adequate oxygen levels.`;
      case 'radiation-lethal':
        return `Your character absorbed a lethal dose of radiation by Sol ${state.day}. ` +
          `Insufficient shielding or repeated exposure events caused this outcome.`;
      default:
        return `The mission failed on Sol ${state.day}.`;
    }
  }

  // Active or critical — mission still in progress.
  return `The mission is still in progress on Sol ${state.day} with status "${state.mission.status}".`;
}

/** Generate "What Went Well" insights from recorded data. */
function buildWentWell(state: GameState): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const derived = calculateDerivedStatus(state);

  // Survived many sols.
  if (state.day >= 20) {
    insights.push({
      title: 'Long survival',
      detail: `You survived ${state.day} sols, demonstrating sustained resource management over the majority of the mission.`,
      tone: 'positive',
    });
  }

  // Resources still healthy at end.
  const healthyResources = RESOURCE_KEYS.filter(
    (k) => derived.resources[k].level === 'ok',
  );
  if (healthyResources.length > 0) {
    const names = healthyResources.map((k) => RESOURCE_LABELS[k]).join(', ');
    insights.push({
      title: 'Resources maintained',
      detail: `${names} remained at healthy levels throughout the mission.`,
      tone: 'positive',
    });
  }

  // Good morale management.
  if (state.crew.morale >= 50) {
    insights.push({
      title: 'Morale preserved',
      detail: `Crew morale ended at ${Math.round(state.crew.morale)}%, showing effective attention to crew wellbeing.`,
      tone: 'positive',
    });
  }

  // Low radiation.
  if (state.crew.radiationExposure < 30) {
    insights.push({
      title: 'Radiation controlled',
      detail: `Radiation exposure was kept to ${Math.round(state.crew.radiationExposure)}%, well within safe limits.`,
      tone: 'positive',
    });
  }

  // Good life support.
  if (derived.systems.lifeSupportEfficiency.level === 'ok') {
    insights.push({
      title: 'Life support operational',
      detail: `Life-support efficiency remained at ${Math.round(state.systems.lifeSupportEfficiency)}%, keeping the outpost habitable.`,
      tone: 'positive',
    });
  }

  // Net resource gains from decisions.
  const netGains = RESOURCE_KEYS.filter((k) => {
    const net = state.history.reduce((sum, d) => sum + (d.resourceChanges[k] ?? 0), 0);
    return net > 0;
  });
  if (netGains.length > 0) {
    const names = netGains.map((k) => RESOURCE_LABELS[k]).join(', ');
    insights.push({
      title: 'Positive resource decisions',
      detail: `Your decisions produced a net positive effect on ${names}.`,
      tone: 'positive',
    });
  }

  // If nothing went well, acknowledge the difficulty.
  if (insights.length === 0) {
    insights.push({
      title: 'A tough mission',
      detail: 'This was an extremely challenging run. Every sol presented difficult tradeoffs.',
      tone: 'neutral',
    });
  }

  return insights;
}

/** Generate "What Could Be Improved" insights from recorded data. */
function buildCouldImprove(state: GameState): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const derived = calculateDerivedStatus(state);

  // Critical resources at mission end.
  const criticalResources = RESOURCE_KEYS.filter(
    (k) => derived.resources[k].level === 'critical',
  );
  if (criticalResources.length > 0) {
    const names = criticalResources.map((k) => RESOURCE_LABELS[k]).join(', ');
    insights.push({
      title: 'Resource shortages',
      detail: `${names} reached critical levels. Rationing or maintenance actions earlier could have helped sustain these.`,
      tone: 'negative',
    });
  }

  // Low health.
  if (state.crew.health < 30 && state.crew.health > 0) {
    insights.push({
      title: 'Health management',
      detail: `Health dropped to ${Math.round(state.crew.health)}%. Avoiding high-risk actions or investing in medical care could have preserved it.`,
      tone: 'negative',
    });
  }

  // High radiation.
  if (state.crew.radiationExposure >= 50) {
    insights.push({
      title: 'Radiation exposure',
      detail: `Radiation reached ${Math.round(state.crew.radiationExposure)}%. Activating shielding during storms and avoiding EVA during high-radiation periods would reduce this.`,
      tone: 'negative',
    });
  }

  // Low morale.
  if (state.crew.morale < 30) {
    insights.push({
      title: 'Crew morale',
      detail: `Morale fell to ${Math.round(state.crew.morale)}%. Celebrating successes and avoiding consecutive negative decisions helps maintain crew spirit.`,
      tone: 'negative',
    });
  }

  // Life support degraded.
  if (derived.systems.lifeSupportEfficiency.level !== 'ok') {
    insights.push({
      title: 'Life-support efficiency',
      detail: `Life support dropped to ${Math.round(state.systems.lifeSupportEfficiency)}%. Regular maintenance shifts help keep systems operational.`,
      tone: 'negative',
    });
  }

  // Net resource losses from decisions.
  const netLosses = RESOURCE_KEYS.filter((k) => {
    const net = state.history.reduce((sum, d) => sum + (d.resourceChanges[k] ?? 0), 0);
    return net < -20;
  });
  if (netLosses.length > 0) {
    const names = netLosses.map((k) => RESOURCE_LABELS[k]).join(', ');
    insights.push({
      title: 'Heavy resource spending',
      detail: `Decisions caused large net losses in ${names}. Balancing urgent needs against long-term reserves is key.`,
      tone: 'negative',
    });
  }

  // Short survival.
  if (state.day < 10 && state.mission.status === 'failed') {
    insights.push({
      title: 'Early failure',
      detail: `The mission ended on Sol ${state.day}. In early sols, conservative decisions and rationing help build a safety buffer before investing in growth.`,
      tone: 'negative',
    });
  }

  return insights;
}

/** Build cause-effect chains from decisions with delayed consequences. */
function buildCauseEffectChains(state: GameState): CauseEffectChain[] {
  const chains: CauseEffectChain[] = [];

  // Look at decisions that had events with delayed effects in the catalog,
  // and whose delayed effects have actually fired (scheduledDay <= state.day
  // and no longer in pendingEffects).
  for (const record of state.history) {
    if (!record.eventId) continue;
    const catalogEvent = findEvent(record.eventId);
    if (!catalogEvent) continue;

    const chosenAction = catalogEvent.availableActions.find(
      (a) => a.id === record.actionId,
    );
    if (!chosenAction?.effect.delayed) continue;

    for (const delayed of chosenAction.effect.delayed) {
      const scheduledDay = record.day + delayed.delayInDays;
      // Only include fired consequences — not future pending ones.
      if (scheduledDay > state.day) continue;
      const stillPending = state.pendingEffects.some(
        (pe) =>
          pe.sourceDecisionId === record.id &&
          pe.scheduledDay === scheduledDay &&
          pe.description === delayed.description,
      );
      if (stillPending) continue;

      chains.push({
        decision: record,
        consequence: delayed.description,
        consequenceDay: scheduledDay,
      });
    }
  }

  // Sort by consequence day ascending so the narrative reads chronologically.
  chains.sort((a, b) => a.consequenceDay - b.consequenceDay);

  return chains;
}

function buildOutcomeExplanation(state: GameState): OutcomeExplanationData {
  return {
    primaryReason: buildPrimaryReason(state),
    wentWell: buildWentWell(state),
    couldImprove: buildCouldImprove(state),
    causeEffectChains: buildCauseEffectChains(state),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Build the complete outcome analysis from a GameState. Pure function. */
export function buildFullOutcomeAnalysis(state: GameState): FullOutcomeAnalysis {
  return {
    results: buildMissionResults(state),
    rankedDecisions: buildRankedDecisions(state),
    recordedConsequences: buildRecordedConsequences(state),
    explanation: buildOutcomeExplanation(state),
  };
}
