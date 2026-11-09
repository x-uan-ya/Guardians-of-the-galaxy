/**
 * adviceBuilder.ts
 * ----------------
 * Turns the advisor's recommendation into full, explainable advice:
 *
 *   headline + reason + risk + expected consequence
 *   + up to three options labelled Recommended / Alternative / Risky.
 *
 * Everything here is deterministic and read-only. Risk text is worked out by
 * projecting the state forward (the action itself, one more sol of normal
 * consumption, and any delayed effects the action schedules), then explaining
 * in plain words what could go wrong, instead of just saying "don't".
 */

import { FREE_ACTIONS } from '../events/eventCatalog';
import { unavailableReason } from '../simulation/actionValidation';
import type { ActionEffect, EventAction } from '../events/eventTypes';
import { summariseChanges, metricWord } from '../decisions/decisionOutcome';
import {
  METRIC_THRESHOLDS,
  PHILOSOPHY_CONSUMPTION,
  RADIATION_THRESHOLDS,
} from '../mission/missionDefaults';
import {
  applyCrewChanges,
  applyResourceChanges,
  applySystemChanges,
  computeDailyResourceDelta,
} from '../simulation/resourceCalculations';
import type {
  CrewState,
  GameState,
  Resources,
  SystemState,
} from '../simulation/simulationTypes';
import { freeActionProtocol, ruleBasedAdvisor, scoreEffect } from './advisorInterface';
import type {
  Advice,
  AdviceMode,
  AdviceOption,
  AdvisorContext,
  RiskLevel,
} from './advisorTypes';

/** Shown to the player when the advisor falls back to the safety protocol. */
export const FALLBACK_NOTICE = 'AI unavailable — switching to Mission Safety Protocol.';

/** Short label for who produced a piece of advice. */
export const ADVICE_SOURCE: Record<AdviceMode, string> = {
  rules: 'Mission Controller · rule-based',
  ai: 'Mission Controller · AI advisor',
  fallback: 'Mission Safety Protocol',
};

// ---------------------------------------------------------------------------
// Projection and risk assessment
// ---------------------------------------------------------------------------

interface Projection {
  resources: Resources;
  crew: CrewState;
  systems: SystemState;
}

type Moment = 'now' | 'next' | 'later';

interface Concern {
  /** 2 = dangerous, 1 = worrying. */
  severity: 1 | 2;
  /** Metric key the concern is about (or 'status' / 'hit-*'). */
  key: string;
  value: number;
  moment: Moment;
  /** For 'later' concerns: the number of sols until it lands. */
  inDays?: number;
  /** Ready-made sentence for concerns that are not simple threshold crossings. */
  text?: string;
  /** Lower number = mentioned first when severities tie. */
  priority: number;
}

interface Assessment {
  risk: string;
  riskLevel: RiskLevel;
  consequence: string;
  concerns: Concern[];
}

const PRIORITY: Record<string, number> = {
  oxygen: 0,
  power: 1,
  water: 2,
  food: 3,
  health: 4,
  radiationExposure: 5,
  lifeSupportEfficiency: 6,
  powerGeneration: 7,
  foodProduction: 8,
  shieldingIntegrity: 9,
  morale: 10,
};

const CONTINGENCY: Record<string, string> = {
  power: 'If a solar storm or dust cloud cuts generation, life support may become unstable.',
  water: 'A recycler fault or a late resupply could leave you short of drinking water.',
  food: 'A greenhouse setback would leave very little buffer before hunger affects health and morale.',
  oxygen: 'A small leak or a life-support fault would leave very little time to react.',
  health: 'Any new injury or radiation dose could become life-threatening.',
  radiationExposure:
    'Another solar flare could push exposure toward the lethal range, and exposure is hard to bring back down.',
  morale: 'Low morale slows work and makes the crew use supplies less efficiently.',
  lifeSupportEfficiency: 'Weak life support means water and oxygen recycle more slowly every sol.',
  powerGeneration: 'Less generation means the power reserve drains faster every sol.',
  foodProduction: 'The greenhouse would supply less food every sol.',
  shieldingIntegrity: 'The crew would absorb more radiation from the next storm.',
};

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

function project(state: GameState, effect: ActionEffect): {
  now: Projection;
  next: Projection;
  later: Projection;
  laterDays: number;
  statusRisk: { status: 'failed' | 'critical'; inDays: number } | null;
} {
  const now: Projection = {
    resources: applyResourceChanges(state.resources, effect.immediateResources ?? {}),
    crew: applyCrewChanges(state.crew, effect.immediateCrew ?? {}),
    systems: applySystemChanges(state.systems, effect.immediateSystems ?? {}),
  };

  // One more sol of ordinary consumption and production. This is an estimate:
  // the real engine may add events and mission modifiers on top.
  const daily = computeDailyResourceDelta(
    now.systems,
    now.crew,
    PHILOSOPHY_CONSUMPTION[state.mission.operatingPhilosophy]
  );
  const next: Projection = {
    resources: applyResourceChanges(now.resources, daily),
    crew: applyCrewChanges(now.crew, { radiationExposure: state.mission.modifiers.radiationPerDay }),
    systems: now.systems,
  };

  // Delayed effects the action schedules.
  let later: Projection = next;
  let laterDays = 0;
  let statusRisk: { status: 'failed' | 'critical'; inDays: number } | null = null;
  for (const item of effect.delayed ?? []) {
    laterDays = Math.max(laterDays, item.delayInDays);
    const p = item.parameters;
    if (p.kind === 'resource') {
      later = { ...later, resources: applyResourceChanges(later.resources, p.changes) };
    } else if (p.kind === 'crew') {
      later = { ...later, crew: applyCrewChanges(later.crew, p.changes) };
    } else if (p.kind === 'system') {
      later = { ...later, systems: applySystemChanges(later.systems, p.changes) };
    } else if (p.status === 'failed' || p.status === 'critical') {
      if (!statusRisk || p.status === 'failed') statusRisk = { status: p.status, inDays: item.delayInDays };
    }
  }

  return { now, next, later, laterDays, statusRisk };
}

/** Metrics where a LOW value is bad. */
function lowIsBad(p: Projection): Array<[string, number]> {
  return [
    ['oxygen', p.resources.oxygen],
    ['power', p.resources.power],
    ['water', p.resources.water],
    ['food', p.resources.food],
    ['health', p.crew.health],
    ['morale', p.crew.morale],
    ['lifeSupportEfficiency', p.systems.lifeSupportEfficiency],
    ['powerGeneration', p.systems.powerGeneration],
    ['foodProduction', p.systems.foodProduction],
    ['shieldingIntegrity', p.systems.shieldingIntegrity],
  ];
}

function concernsAt(p: Projection, moment: Moment, inDays?: number): Concern[] {
  const out: Concern[] = [];
  for (const [key, value] of lowIsBad(p)) {
    const severity: 0 | 1 | 2 =
      value <= METRIC_THRESHOLDS.critical ? 2 : value <= METRIC_THRESHOLDS.warn ? 1 : 0;
    if (severity === 0) continue;
    out.push({ severity, key, value, moment, inDays, priority: PRIORITY[key] ?? 20 });
  }
  const radiation = p.crew.radiationExposure;
  if (radiation >= RADIATION_THRESHOLDS.warn) {
    out.push({
      severity: radiation >= RADIATION_THRESHOLDS.critical ? 2 : 1,
      key: 'radiationExposure',
      value: radiation,
      moment,
      inDays,
      priority: PRIORITY.radiationExposure ?? 5,
    });
  }
  return out;
}

function concernSentence(c: Concern, effect: ActionEffect): string {
  const word = metricWord(c.key);
  const contingency = CONTINGENCY[c.key] ?? '';

  if (c.text) return c.text;

  if (c.key === 'radiationExposure') {
    const lead =
      c.moment === 'now'
        ? `This takes radiation exposure to ${Math.round(c.value)}/100.`
        : `Radiation exposure would reach about ${Math.round(c.value)}/100${
            c.moment === 'next' ? ' by the next sol' : ''
          }.`;
    return `${lead} ${contingency}`;
  }

  const isResource = ['power', 'water', 'food', 'oxygen'].includes(c.key);
  const noun = isResource ? `${word} reserve` : word;

  if (c.moment === 'now') {
    // A problem that already exists and is not made worse is described as such.
    if (immediateDelta(effect, c.key) >= 0) {
      return `Your ${word} is already low at ${pct(c.value)}, and this action does not raise it. ${contingency}`;
    }
    return isResource
      ? `This action leaves the outpost with only ${pct(c.value)} ${noun}. ${contingency}`
      : `This action leaves ${word} at ${pct(c.value)}. ${contingency}`;
  }
  if (c.moment === 'next') {
    return `By the next sol, normal use leaves ${word} at about ${pct(c.value)}. ${contingency}`;
  }
  const when = c.inDays ? `within ${c.inDays} sol${c.inDays === 1 ? '' : 's'}` : 'soon';
  return `Delayed effects could bring ${word} down to about ${pct(c.value)} ${when}. ${contingency}`;
}

/** The immediate change an action makes to one metric (0 when it does not touch it). */
function immediateDelta(effect: ActionEffect, key: string): number {
  for (const group of [effect.immediateResources, effect.immediateCrew, effect.immediateSystems]) {
    const value = (group as Record<string, number | undefined> | undefined)?.[key];
    if (typeof value === 'number') return value;
  }
  return 0;
}

/** Explain what an action does to the outpost, now and later. */
function describeConsequence(effect: ActionEffect, next: Projection): string {
  const parts: string[] = [];
  const immediate = summariseChanges(
    effect.immediateResources,
    effect.immediateCrew,
    effect.immediateSystems
  );
  parts.push(immediate ? `Right away: ${immediate}.` : 'Right away: no change to resources or systems.');

  for (const item of effect.delayed ?? []) {
    const p = item.parameters;
    const when = `After ${item.delayInDays} sol${item.delayInDays === 1 ? '' : 's'}`;
    if (p.kind === 'status') {
      parts.push(`${when}: the mission may become ${p.status}.`);
    } else {
      const text = summariseChanges(p.changes);
      if (text) parts.push(`${when}: ${text}.`);
    }
  }

  // Outlook for the tightest resource by the next sol.
  const tightest = (Object.entries(next.resources) as Array<[string, number]>).reduce((a, b) =>
    b[1] < a[1] ? b : a
  );
  parts.push(`Outlook for the next sol: ${metricWord(tightest[0])} around ${pct(tightest[1])}.`);
  return parts.join(' ');
}

function tradeoffs(effect: ActionEffect): string[] {
  const costs: string[] = [];
  const consider = (changes: object | undefined): void => {
    if (!changes) return;
    for (const [key, delta] of Object.entries(changes)) {
      if (typeof delta !== 'number' || delta === 0) continue;
      const bad = key === 'radiationExposure' ? delta > 0 : delta < 0;
      if (bad) costs.push(`${metricWord(key)} ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`);
    }
  };
  consider(effect.immediateResources);
  consider(effect.immediateCrew);
  consider(effect.immediateSystems);
  return costs;
}

/** Assess how risky an action is and explain why, in plain language. */
export function assessAction(state: GameState, effect: ActionEffect): Assessment {
  const { now, next, later, laterDays, statusRisk } = project(state, effect);

  const concerns: Concern[] = [
    ...concernsAt(now, 'now'),
    ...concernsAt(next, 'next'),
    ...concernsAt(later, 'later', laterDays || undefined),
  ];

  // Keep one concern per metric: the most severe, and the earliest if tied.
  const MOMENT_ORDER: Record<Moment, number> = { now: 0, next: 1, later: 2 };
  const best = new Map<string, Concern>();
  for (const c of concerns) {
    const current = best.get(c.key);
    if (
      !current ||
      c.severity > current.severity ||
      (c.severity === current.severity && MOMENT_ORDER[c.moment] < MOMENT_ORDER[current.moment])
    ) {
      best.set(c.key, c);
    }
  }
  const unique = [...best.values()];
  const seen = new Set(best.keys());

  // Large one-off hits are worth flagging even before a threshold is crossed.
  const radiationHit = effect.immediateCrew?.radiationExposure ?? 0;
  if (radiationHit >= 10 && !seen.has('radiationExposure')) {
    unique.push({
      severity: 1,
      key: 'radiationExposure',
      value: now.crew.radiationExposure,
      moment: 'now',
      priority: PRIORITY.radiationExposure ?? 5,
      text:
        `This adds ${radiationHit} points of radiation exposure at once. ` +
        `${CONTINGENCY.radiationExposure}`,
    });
  }
  const healthHit = effect.immediateCrew?.health ?? 0;
  if (healthHit <= -10 && !seen.has('health')) {
    unique.push({
      severity: 1,
      key: 'health',
      value: now.crew.health,
      moment: 'now',
      priority: PRIORITY.health ?? 4,
      text: `This costs ${Math.abs(healthHit)} points of crew health at once. ${CONTINGENCY.health}`,
    });
  }
  if (statusRisk) {
    unique.push({
      severity: 2,
      key: 'status',
      value: 0,
      moment: 'later',
      priority: -1,
      text:
        `This could push the mission into a ${statusRisk.status} state within ` +
        `${statusRisk.inDays} sol${statusRisk.inDays === 1 ? '' : 's'}.`,
    });
  }

  unique.sort((a, b) => b.severity - a.severity || a.priority - b.priority);

  const top = unique[0];
  const consequence = describeConsequence(effect, next);

  if (!top) {
    const costs = tradeoffs(effect);
    return {
      riskLevel: 'low',
      concerns: unique,
      consequence,
      risk:
        costs.length > 0
          ? `Low risk. It does not push any key metric toward a warning level. Trade-offs: ${costs.join(', ')}.`
          : 'Low risk. It does not push any key metric toward a warning level.',
    };
  }

  const second = unique.find((c) => c.key !== top.key && c.severity >= 1);
  const also = second ? ` Also watch ${metricWord(second.key)}.` : '';
  return {
    riskLevel: unique.some((c) => c.severity === 2) ? 'high' : 'moderate',
    concerns: unique,
    consequence,
    risk: `${concernSentence(top, effect)}${also}`,
  };
}

// ---------------------------------------------------------------------------
// Reasons
// ---------------------------------------------------------------------------

/** One sentence about the situation that makes the decision matter. */
export function describeSituation(state: GameState): string {
  const entries = Object.entries(state.resources) as Array<[string, number]>;
  const [lowKey, lowValue] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  const lines: string[] = [];

  if (state.crew.radiationExposure >= RADIATION_THRESHOLDS.warn) {
    lines.push(`Radiation exposure is high (${Math.round(state.crew.radiationExposure)}/100).`);
  }
  if (state.crew.health <= METRIC_THRESHOLDS.warn) {
    lines.push(`Crew health is low (${pct(state.crew.health)}).`);
  }
  if (lowValue <= METRIC_THRESHOLDS.warn) {
    lines.push(`${capitalise(metricWord(lowKey))} is the tightest resource at ${pct(lowValue)}.`);
  } else if (lines.length === 0) {
    lines.push(`Your tightest resource is ${metricWord(lowKey)} at ${pct(lowValue)}.`);
  }

  const upcoming = upcomingWarning(state);
  if (upcoming) lines.push(upcoming);
  return lines.join(' ');
}

/** A negative effect already scheduled in the next few sols, if any. */
export function upcomingWarning(state: GameState): string | null {
  const soon = [...state.pendingEffects]
    .filter((e) => e.scheduledDay >= state.day && e.scheduledDay - state.day <= 3)
    .sort((a, b) => a.scheduledDay - b.scheduledDay);

  for (const effect of soon) {
    const p = effect.parameters;
    let harmful = false;
    if (p.kind === 'status') harmful = p.status === 'failed' || p.status === 'critical';
    else {
      for (const [key, delta] of Object.entries(p.changes)) {
        if (typeof delta !== 'number') continue;
        if (key === 'radiationExposure' ? delta > 0 : delta < 0) harmful = true;
      }
    }
    if (!harmful) continue;
    const inDays = effect.scheduledDay - state.day;
    const when = inDays <= 0 ? 'today' : `in ${inDays} sol${inDays === 1 ? '' : 's'}`;
    return `Already scheduled ${when}: ${effect.description.replace(/\.$/, '')}.`;
  }
  return null;
}

function capitalise(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

/** What an option helps with, e.g. "It helps with power and life support." */
function benefitSentence(effect: ActionEffect): string {
  const gains: string[] = [];
  const add = (changes: object | undefined): void => {
    if (!changes) return;
    for (const [key, delta] of Object.entries(changes)) {
      if (typeof delta !== 'number' || delta === 0) continue;
      const good = key === 'radiationExposure' ? delta < 0 : delta > 0;
      if (good) gains.push(metricWord(key));
    }
  };
  add(effect.immediateResources);
  add(effect.immediateCrew);
  add(effect.immediateSystems);
  for (const item of effect.delayed ?? []) {
    if (item.parameters.kind !== 'status') add(item.parameters.changes);
  }
  const unique = [...new Set(gains)].slice(0, 3);
  if (unique.length === 0) return 'It keeps your reserves steady without spending anything extra.';
  const list =
    unique.length === 1
      ? unique[0]!
      : `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]!}`;
  return `It helps with ${list}.`;
}

// ---------------------------------------------------------------------------
// Public builder
// ---------------------------------------------------------------------------

interface Candidate {
  action: EventAction;
  score: number;
  assessment: Assessment;
}

const RISK_RANK: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2 };

/** The actions the advisor may talk about for this context. */
function candidateActions(context: AdvisorContext): EventAction[] {
  const { state, eventId } = context;
  if (eventId !== undefined) {
    return state.activeEvents.find((e) => e.id === eventId)?.availableActions ?? [];
  }
  // Only actions the engine would accept today (enough stock, not already under way).
  return FREE_ACTIONS.filter((action) => unavailableReason(state, action) === null);
}

/**
 * Build full advice for the given context. Returns null when the advisor has no
 * opinion (finished mission, unknown event). `mode` only changes the label and
 * notice: the rules themselves are the same in every mode.
 */
export function buildAdvice(context: AdvisorContext, mode: AdviceMode = 'rules'): Advice | null {
  const recommendation = ruleBasedAdvisor.recommend(context);
  if (!recommendation) return null;

  const { state, eventId } = context;
  const actions = candidateActions(context);
  const recommendedAction = actions.find((a) => a.id === recommendation.actionId);
  if (!recommendedAction) return null;

  const candidates: Candidate[] = actions.map((action) => ({
    action,
    score: scoreEffect(action.effect, context),
    assessment: assessAction(state, action.effect),
  }));

  const best = candidates.find((c) => c.action.id === recommendedAction.id);
  if (!best) return null;
  const others = candidates.filter((c) => c !== best).sort((a, b) => b.score - a.score);

  // Risky = the most dangerous remaining option (ties: lowest score).
  // Alternative = the best-scoring remaining option that is not the risky one.
  let risky: Candidate | undefined;
  // An option is only labelled Risky when it really carries risk; otherwise it
  // is just another Alternative (the label must match the risk text).
  const alternatives: Candidate[] = [];
  if (others.length === 1) {
    const only = others[0]!;
    if (only.assessment.riskLevel !== 'low') risky = only;
    else alternatives.push(only);
  } else if (others.length >= 2) {
    const worst = [...others].sort(
      (a, b) =>
        RISK_RANK[b.assessment.riskLevel] - RISK_RANK[a.assessment.riskLevel] || a.score - b.score
    )[0]!;
    if (worst.assessment.riskLevel !== 'low') {
      risky = worst;
      const second = others.find((c) => c !== worst);
      if (second) alternatives.push(second);
    } else {
      alternatives.push(...others.slice(0, 2));
    }
  }

  const situation = describeSituation(state);
  const toOption = (c: Candidate, role: AdviceOption['role']): AdviceOption => {
    const benefit = benefitSentence(c.action.effect);
    const reason =
      role === 'recommended'
        ? `${situation} ${benefit}`.trim()
        : role === 'alternative'
          ? `A reasonable second choice. ${benefit}`
          : `Only if you accept the downside. ${benefit}`;
    return {
      role,
      actionId: c.action.id,
      label: c.action.label,
      reason,
      risk: c.assessment.risk,
      riskLevel: c.assessment.riskLevel,
      consequence: c.assessment.consequence,
      score: Math.round(c.score * 10) / 10,
    };
  };

  const options: AdviceOption[] = [toOption(best, 'recommended')];
  for (const candidate of alternatives.slice(0, 2)) options.push(toOption(candidate, 'alternative'));
  if (risky) options.push(toOption(risky, 'risky'));

  const primary = options[0]!;
  const headline =
    eventId === undefined
      ? freeActionProtocol(state).headline
      : recommendedAction.label;

  return {
    ...recommendation,
    headline,
    reason: primary.reason,
    risk: primary.risk,
    expectedConsequence: primary.consequence,
    options,
    mode,
    source: ADVICE_SOURCE[mode],
    ...(mode === 'fallback' ? { notice: FALLBACK_NOTICE } : {}),
  };
}
