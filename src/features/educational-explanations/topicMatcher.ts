/**
 * topicMatcher.ts
 * ----------------
 * Deterministic mapping from a DecisionRecord's actionId (and optionally
 * eventId) to an educational topic.
 *
 * MATCHING RULES:
 * ---------------
 * 1. Only important decisions get educational lessons. Routine, low-impact
 *    decisions (like "routine-operations") return null.
 *
 * 2. Each actionId maps to at most ONE topic — the most relevant one. This
 *    keeps the timeline clean (one lesson per decision, not a wall of text).
 *
 * 3. If an actionId is not in the map, null is returned and no lesson is
 *    displayed. This is intentional: not every decision warrants an
 *    educational explanation.
 *
 * 4. The mapping is based on the narrative intent and scientific theme of the
 *    action, read from the event catalog descriptions and effects.
 *
 * This module is pure data + one lookup function. No I/O, no React, no
 * mutation of game state.
 */

import type { DecisionRecord } from '../decisions/decisionTypes';
import type { EducationalTopicId, TopicMatch } from './educationalTypes';

// ---------------------------------------------------------------------------
// Static action → topic mapping
// ---------------------------------------------------------------------------

/**
 * Maps each actionId to its most relevant educational topic.
 *
 * Organised by source event for readability. Only actions that warrant an
 * educational lesson are listed. Actions not present here → null (no lesson).
 */
const ACTION_TOPIC_MAP: Record<string, EducationalTopicId> = {
  // ─────────────────────────────────────────────────────────────────────────
  // FREE ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  // Rationing is a clear resource scarcity lesson.
  'ration-supplies': 'resource-scarcity',

  // Maintenance teaches about redundancy and keeping systems healthy.
  'maintenance-shift': 'redundancy-backup-systems',

  // routine-operations: intentionally omitted (no lesson).

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPTER 1 — A Fragile Beginning (Sols 1–5)
  // ─────────────────────────────────────────────────────────────────────────

  // Sol 1 — Emergency Supply Inspection: redundancy and preparation.
  'story-sol-01-inspect': 'redundancy-backup-systems',
  'story-sol-01-organise': 'resource-scarcity',
  'story-sol-01-begin': 'cascading-failures', // skipping checks → delayed fault

  // Sol 2 — Water Recycling Malfunction: water recycling.
  'story-sol-02-filter': 'water-recycling-food-production',
  'story-sol-02-repair': 'water-recycling-food-production',
  'story-sol-02-ration': 'water-recycling-food-production',

  // Sol 3 — Power System Instability: energy and power.
  'story-sol-03-bypass': 'energy-power-management',
  'story-sol-03-conserve': 'energy-power-management',
  'story-sol-03-repair': 'energy-power-management',

  // Sol 4 — Greenhouse Contamination: food production.
  'story-sol-04-harvest': 'water-recycling-food-production',
  'story-sol-04-isolate': 'water-recycling-food-production',
  'story-sol-04-treat': 'water-recycling-food-production',

  // Sol 5 — First Environmental Crisis: risk management.
  'story-sol-05-intervene': 'risk-management',
  'story-sol-05-shelter': 'risk-management',
  'story-sol-05-isolate': 'risk-management',
  'story-sol-05-lunar-thermal-protection': 'temperature-thermal-control',
  'story-sol-05-mars-dust-protection': 'energy-power-management',
  'story-sol-05-deep-space-impact-reinforcement': 'redundancy-backup-systems',

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPTER 2 — Signals in the Storm (Sols 6–10)
  // ─────────────────────────────────────────────────────────────────────────

  // Sol 6 — Aftermath Assessment: resource scarcity (recovery after crisis).
  'story-sol-06-prioritise-maintenance': 'redundancy-backup-systems',
  'story-sol-06-conserve-supplies': 'resource-scarcity',
  'story-sol-06-prioritise-recovery': 'resource-scarcity',

  // Sol 7 — Communication Array Failure: decision under uncertainty.
  'story-sol-07-postpone-repairs': 'decision-under-uncertainty',
  'story-sol-07-full-repairs': 'decision-under-uncertainty',
  'story-sol-07-low-power': 'decision-under-uncertainty',

  // Sol 8 — Narrow Window of Opportunity: decision under uncertainty.
  'story-sol-08-resource-recovery': 'decision-under-uncertainty',
  'story-sol-08-system-diagnostics': 'redundancy-backup-systems',
  // story-sol-08-routine-operations: intentionally omitted (no lesson).

  // Sol 9 — Repairs Under Pressure: energy and power / life support.
  'story-sol-09-restore-power': 'energy-power-management',
  'story-sol-09-restore-life-support': 'oxygen-life-support',
  'story-sol-09-balanced-repairs': 'redundancy-backup-systems',

  // Sol 10 — Unexpected Transmission: decision under uncertainty.
  'story-sol-10-analyse': 'decision-under-uncertainty',
  'story-sol-10-verify': 'decision-under-uncertainty',
  'story-sol-10-archive': 'decision-under-uncertainty',

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPTER 3 — The Breaking Point (Sols 11–15)
  // ─────────────────────────────────────────────────────────────────────────

  // Sol 11 — Life-Support Warning: oxygen and life support.
  'story-sol-11-purify-stabilise': 'oxygen-life-support',
  'story-sol-11-emergency-conservation': 'oxygen-life-support',
  'story-sol-11-replace-components': 'oxygen-life-support',

  // Sol 12 — Medical and Radiation Concerns: radiation protection.
  'story-sol-12-prioritise-recovery': 'radiation-protection',
  'story-sol-12-reinforce-shielding': 'radiation-protection',
  'story-sol-12-essential-work': 'radiation-protection',

  // Sol 13 — Emergency Resource Allocation: resource scarcity.
  'story-sol-13-prioritise-oxygen': 'resource-scarcity',
  'story-sol-13-recover-reserves': 'resource-scarcity',
  'story-sol-13-long-term-efficiency': 'resource-scarcity',

  // Sol 14 — Midpoint Preparation: redundancy.
  'story-sol-14-reinforce-power': 'energy-power-management',
  'story-sol-14-reorganise-supplies': 'resource-scarcity',
  'story-sol-14-crew-recovery': 'resource-scarcity',

  // Sol 15 — Midpoint Turning Point.
  // story-sol-15-acknowledge-midpoint: intentionally omitted (no lesson).
  'story-sol-15-intensify-recycling': 'water-recycling-food-production',
  'story-sol-15-reduce-operations': 'energy-power-management',
  'story-sol-15-recover-emergency-equipment': 'redundancy-backup-systems',

  // ─────────────────────────────────────────────────────────────────────────
  // STANDALONE CATALOG EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  // Solar Storm: radiation protection.
  'solar-storm--activate-shielding': 'radiation-protection',
  'solar-storm--shutdown-systems': 'radiation-protection',
  'solar-storm--risk-it': 'radiation-protection',

  // Catastrophic System Failure: cascading failures.
  'system-failure--emergency-repairs': 'cascading-failures',
  'system-failure--conserve': 'cascading-failures',

  // Dust Storm: risk management.
  'dust-storm--shelter': 'risk-management',
  'dust-storm--clear-array': 'risk-management',

  // Equipment Failure: cascading failures (temp fixes lead to worse failures).
  'equipment-failure--immediate-repair': 'redundancy-backup-systems',
  'equipment-failure--patch-job': 'cascading-failures',
  'equipment-failure--defer': 'cascading-failures',

  // Water Contamination: water recycling.
  'water-contamination--purge-system': 'water-recycling-food-production',
  'water-contamination--filter-intensive': 'water-recycling-food-production',
  'water-contamination--risk-use': 'water-recycling-food-production',

  // Communication Failure: decision under uncertainty.
  'communication-failure--repair-immediately': 'decision-under-uncertainty',
  'communication-failure--defer': 'decision-under-uncertainty',

  // Battery Malfunction: energy and power.
  'battery-malfunction--emergency-cooldown': 'energy-power-management',
  'battery-malfunction--partial-isolation': 'energy-power-management',
  'battery-malfunction--push-through': 'energy-power-management',

  // Temperature Drop: thermal control.
  'temperature-drop--boost-heating': 'temperature-thermal-control',
  'temperature-drop--insulation': 'temperature-thermal-control',
  'temperature-drop--endure': 'temperature-thermal-control',

  // Hydroponics Bloom: food production.
  'hydroponics-bloom--invest': 'water-recycling-food-production',
  'hydroponics-bloom--stabilise': 'water-recycling-food-production',

  // Unexpected Resource Discovery: resource scarcity.
  'resource-discovery--extract': 'resource-scarcity',
  'resource-discovery--ignore': 'resource-scarcity',

  // Minor Airlock Leak: oxygen and life support.
  'airlock-leak--seal': 'oxygen-life-support',
  'airlock-leak--monitor': 'oxygen-life-support',

  // Successful Research Experiment: intentionally omitted (info event, no
  // meaningful science lesson about the decision itself).

  // ─────────────────────────────────────────────────────────────────────────
  // MISSION-SPECIFIC EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  // Lunar — Power Instability: energy and power.
  'mission-lunar-power-instability--conserve': 'energy-power-management',
  'mission-lunar-power-instability--push': 'energy-power-management',
  'mission-lunar-power-instability--engineer': 'energy-power-management',

  // Lunar — Thermal Emergency: thermal control.
  'mission-lunar-thermal-emergency--reduce-load': 'temperature-thermal-control',
  'mission-lunar-thermal-emergency--full-ops': 'temperature-thermal-control',
  'mission-lunar-thermal-emergency--chemist': 'temperature-thermal-control',

  // Mars — Dust Storm: energy and power (solar panel focus).
  'mission-mars-dust-storm--conservation': 'energy-power-management',
  'mission-mars-dust-storm--normal-ops': 'energy-power-management',
  'mission-mars-dust-storm--engineer': 'energy-power-management',
  'mission-mars-dust-storm--pilot': 'energy-power-management',

  // Mars — Radiation Spike: radiation protection.
  'mission-mars-radiation-spike--shelter': 'radiation-protection',
  'mission-mars-radiation-spike--continue': 'radiation-protection',
  'mission-mars-radiation-spike--medic': 'radiation-protection',

  // Deep Space — Unknown Anomaly: decision under uncertainty.
  'mission-deep-space-anomaly--investigate': 'decision-under-uncertainty',
  'mission-deep-space-anomaly--ignore': 'decision-under-uncertainty',
  'mission-deep-space-anomaly--scientist': 'decision-under-uncertainty',

  // Deep Space — Critical Systems Failure: cascading failures.
  'mission-deep-space-systems-failure--repair': 'cascading-failures',
  'mission-deep-space-systems-failure--reroute': 'cascading-failures',
  'mission-deep-space-systems-failure--engineer': 'cascading-failures',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Match a decision to its most relevant educational topic.
 *
 * Returns null if no lesson should be displayed for this decision. This is
 * intentional: not every decision warrants an educational explanation.
 *
 * The matching is deterministic and based solely on the actionId. The eventId
 * is not needed because actionIds are already unique across the event catalog.
 */
export function matchTopicForDecision(record: DecisionRecord): TopicMatch {
  return ACTION_TOPIC_MAP[record.actionId] ?? null;
}

/**
 * Check whether a given actionId has a topic mapping (useful for diagnostics).
 */
export function hasTopicMapping(actionId: string): boolean {
  return actionId in ACTION_TOPIC_MAP;
}
