/**
 * explanationBuilder.ts
 * ----------------------
 * Pure function that builds a complete EducationalExplanation from a
 * DecisionRecord and its matched EducationalTopic.
 *
 * The "What Happened?" section is generated dynamically from the player's
 * actual recorded decision data. The remaining four sections come from the
 * prewritten topic content.
 *
 * DATA ACCURACY RULES:
 * --------------------
 * 1. Only describe consequences that are recorded in the DecisionRecord
 *    (immediate resource changes in record.resourceChanges).
 * 2. Do NOT invent causal relationships or claim effects that are not in
 *    the recorded data.
 * 3. Do NOT claim that pending/delayed effects have already happened.
 * 4. Use the record's own explanation text as the primary source of truth.
 *
 * This module is pure: no I/O, no React, no mutation of any game state.
 */

import { RESOURCE_LABELS } from '../dashboard/labels';
import type { DecisionRecord } from '../decisions/decisionTypes';
import type { ResourceKey } from '../simulation/simulationTypes';
import type { EducationalExplanation, EducationalTopicId } from './educationalTypes';
import { getEducationalTopic } from './educationalTopics';
import { matchTopicForDecision } from './topicMatcher';

// ---------------------------------------------------------------------------
// "What Happened?" builder — uses ONLY recorded decision data
// ---------------------------------------------------------------------------

/**
 * Build a plain-language summary of what the player did and its recorded
 * immediate effects. Only references data present in the DecisionRecord.
 */
function buildWhatHappened(record: DecisionRecord): string {
  const parts: string[] = [];

  // Start with what the player chose.
  parts.push(`On Sol ${record.day}, you chose "${record.actionLabel}".`);

  // Summarise the engine's recorded explanation.
  if (record.explanation) {
    parts.push(record.explanation);
  }

  // Summarise immediate resource effects from the recorded data.
  const effects = describeResourceChanges(record.resourceChanges);
  if (effects) {
    parts.push(`Immediate recorded effects: ${effects}.`);
  } else {
    parts.push('No immediate resource changes were recorded for this decision.');
  }

  return parts.join(' ');
}

/**
 * Turn a ResourceChanges object into a human-readable string like
 * "Power -9.0, Life Support Efficiency +4.0". Returns empty string if
 * there are no non-zero changes.
 */
function describeResourceChanges(
  changes: Partial<Record<string, number>>,
): string {
  const descriptions: string[] = [];

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === 0) continue;
    const label = RESOURCE_LABELS[key as ResourceKey] ?? key;
    const sign = value > 0 ? '+' : '';
    descriptions.push(`${label} ${sign}${value.toFixed(1)}`);
  }

  return descriptions.join(', ');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a complete educational explanation for a decision, or return null if
 * no relevant topic matches.
 *
 * This is the main entry point used by the EducationalLessonCard component.
 * It handles topic matching and explanation assembly in one call.
 */
export function buildEducationalExplanation(
  record: DecisionRecord,
): EducationalExplanation | null {
  const topicId = matchTopicForDecision(record);
  if (topicId === null) return null;

  return buildExplanationForTopic(record, topicId);
}

/**
 * Build an explanation for a specific topic (used when the topic is already
 * known). Returns null if the topic content is not found.
 */
export function buildExplanationForTopic(
  record: DecisionRecord,
  topicId: EducationalTopicId,
): EducationalExplanation | null {
  const topic = getEducationalTopic(topicId);
  if (!topic) return null;

  return {
    topicId: topic.id,
    topicTitle: topic.title,
    whatHappened: buildWhatHappened(record),
    whyItHappened: topic.sciencePrinciple,
    whatYouCanLearn: topic.playerLesson,
    realWorldConnection: topic.realWorldConnection,
    keyTakeaway: topic.keyTakeaway,
    references: topic.references,
    gameVsRealityNote: topic.gameVsRealityNote,
  };
}
