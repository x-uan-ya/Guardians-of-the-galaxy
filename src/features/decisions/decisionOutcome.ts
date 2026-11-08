/**
 * decisionOutcome.ts
 * ------------------
 * Pure helpers that turn an applied decision into the pieces stored on a
 * DecisionRecord: a plain-language outcome summary and a sanitised copy of the
 * advisor's advice. Used by the simulation engine (to record) and by the
 * advisor (to word its text), so both speak the same language.
 */

import type {
  CrewChanges,
  CrewState,
  MissionStatus,
  ResourceChanges,
  Resources,
  SystemChanges,
} from '../simulation/simulationTypes';
import type {
  AdviceMode,
  AdviceRole,
  AdviceSnapshot,
  DecisionOutcome,
} from './decisionTypes';

/** Everyday names for every metric key, lower case, for use inside sentences. */
const METRIC_WORDS: Record<string, string> = {
  power: 'power',
  water: 'water',
  food: 'food',
  oxygen: 'oxygen',
  health: 'crew health',
  morale: 'morale',
  radiationExposure: 'radiation exposure',
  powerGeneration: 'power generation',
  lifeSupportEfficiency: 'life support',
  foodProduction: 'food production',
  shieldingIntegrity: 'shielding',
};

/** Human-readable name for a metric key ("lifeSupportEfficiency" -> "life support"). */
export function metricWord(key: string): string {
  return METRIC_WORDS[key] ?? key.replace(/([A-Z])/g, ' $1').toLowerCase();
}

function signed(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)}`;
}

function capitalise(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

/** "Power −4, Life support +3, Morale −2" (empty string when nothing changed). */
export function summariseChanges(
  ...groups: Array<ResourceChanges | CrewChanges | SystemChanges | undefined>
): string {
  const parts: string[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const [key, delta] of Object.entries(group)) {
      if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) continue;
      parts.push(`${capitalise(metricWord(key))} ${signed(delta)}`);
    }
  }
  return parts.join(', ');
}

/** Build the outcome snapshot for a decision that has just been applied. */
export function buildDecisionOutcome(input: {
  resources: ResourceChanges;
  crew?: CrewChanges;
  systems?: SystemChanges;
  resourcesAfter: Resources;
  crewAfter: CrewState;
  statusAfter: MissionStatus;
}): DecisionOutcome {
  const summary = summariseChanges(input.resources, input.crew, input.systems);
  return {
    summary: summary.length > 0 ? summary : 'No immediate change to the outpost.',
    statusAfter: input.statusAfter,
    resourcesAfter: { ...input.resourcesAfter },
    crewAfter: { ...input.crewAfter },
  };
}

// ---------------------------------------------------------------------------
// Advice snapshot sanitising
// ---------------------------------------------------------------------------

const MAX_TEXT = 500;
const CONFIDENCES = ['low', 'medium', 'high'] as const;
const MODES: readonly AdviceMode[] = ['rules', 'ai', 'fallback'];
const ROLES: readonly AdviceRole[] = ['recommended', 'alternative', 'risky'];

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, MAX_TEXT);
}

/**
 * Validate an untrusted advice snapshot (from a caller or a stored save) and
 * return a clean copy, or undefined when it is unusable. Never throws, so a
 * malformed snapshot can never block a player's decision.
 */
export function sanitizeAdviceSnapshot(value: unknown): AdviceSnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const raw = value as Record<string, unknown>;

  const recommendedActionId = cleanText(raw.recommendedActionId);
  const recommendedLabel = cleanText(raw.recommendedLabel);
  const reason = cleanText(raw.reason);
  const risk = cleanText(raw.risk);
  const expectedConsequence = cleanText(raw.expectedConsequence);
  const confidence = CONFIDENCES.find((c) => c === raw.confidence);
  const mode = MODES.find((m) => m === raw.mode);
  const chosenRole = ROLES.find((r) => r === raw.chosenRole);

  if (!recommendedActionId || !recommendedLabel || !reason || !risk || !expectedConsequence) {
    return undefined;
  }
  if (!confidence || !mode) return undefined;

  return {
    recommendedActionId,
    recommendedLabel,
    confidence,
    mode,
    reason,
    risk,
    expectedConsequence,
    ...(chosenRole ? { chosenRole } : {}),
  };
}
