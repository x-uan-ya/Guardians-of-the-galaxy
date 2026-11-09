/**
 * actionClassifier.ts
 * -------------------
 * Classifies every known actionId into leadership trait signals based on what
 * the action actually MEANS in the game context — not how many resources it
 * costs or whether the player overrode the AI advisor.
 *
 * CLASSIFICATION PRINCIPLES:
 * --------------------------
 * 1. Each action is tagged by its narrative intent, read from the event catalog
 *    descriptions and effect shapes. An action that shelters the crew is
 *    humanitarian regardless of its resource cost.
 *
 * 2. An action may signal multiple traits. "Invest in Growth" on a hydroponics
 *    bloom is both explorer (delayed science investment) and optimiser
 *    (efficient long-term yield). Actions are NOT forced into exactly one slot.
 *
 * 3. Resource cost alone never determines classification. A high-power spend
 *    on emergency repairs is humanitarian (crew safety), not risk-taking.
 *    Rationing water is survivor (conservation), not optimiser.
 *
 * 4. Overriding the AI advisor is NOT automatically classified as risk-taking.
 *    The playerChoice field is ignored by this classifier entirely.
 *
 * 5. Actions not found in this map receive NO trait signals, contributing
 *    equally (zero) to every trait. This prevents unknown future actions from
 *    skewing scores.
 *
 * HOW TO MAINTAIN:
 * ----------------
 * When the Events teammate adds a new event or action, add its actionId here
 * with the appropriate trait signals. The classifier is the ONLY place that
 * needs updating — the scorer and UI adapt automatically.
 *
 * This module is pure data: no I/O, no React, no mutation of any game state or
 * event catalog.
 */

import type { TraitSignals } from './leadershipTypes';

/**
 * Static classification of every known actionId to its leadership trait
 * signals. Organised by source event for readability.
 *
 * Legend for each trait:
 *   riskTaker    — accepts danger, uncertain outcomes, or exposure to harm
 *   survivor     — prioritises immediate safety, conservation, sheltering
 *   optimiser    — balances cost and benefit, invests in system efficiency
 *   humanitarian — protects crew health, morale, or reduces crew harm
 *   explorer     — pursues research, investigation, long-term discovery
 */
const ACTION_CLASSIFICATION: Record<string, TraitSignals> = {
  // ─────────────────────────────────────────────────────────────────────────
  // FREE ACTIONS (always available, no event context)
  // ─────────────────────────────────────────────────────────────────────────

  // Routine operations: standard protocols, no distinctive leadership signal.
  'routine-operations': {},

  // Ration supplies: tightens consumption to preserve food and water.
  // Narrative: survival-oriented conservation at a morale cost.
  'ration-supplies': { survivor: true },

  // Maintenance shift: diverts crew to repairs, improving systems.
  // Narrative: proactive system investment for long-term reliability.
  'maintenance-shift': { optimiser: true },

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPTER 1 — A Fragile Beginning (Sols 1–5)
  // ─────────────────────────────────────────────────────────────────────────

  // Sol 1 — Emergency Supply Inspection
  // Inspect essential systems: checking equipment for faults to improve reliability.
  'story-sol-01-inspect': { optimiser: true },
  // Reorganise supplies: recover misplaced water — practical conservation.
  'story-sol-01-organise': { survivor: true },
  // Begin operations immediately: skips safety checks, risks delayed fault.
  'story-sol-01-begin': { riskTaker: true },

  // Sol 2 — Water Recycling Malfunction
  // Increase filtration: pushes equipment hard now, risks later deterioration.
  'story-sol-02-filter': { riskTaker: true },
  // Repair the recycling unit: proper fix for long-term life-support.
  'story-sol-02-repair': { optimiser: true },
  // Ration water and monitor: conserves water, defers the real fix.
  'story-sol-02-ration': { survivor: true },

  // Sol 3 — Power System Instability
  // Temporary bypass: quick fix that may deteriorate — accepts risk.
  'story-sol-03-bypass': { riskTaker: true },
  // Reduce non-essential operations: conserve power, protect crew.
  'story-sol-03-conserve': { survivor: true },
  // Comprehensive repairs: large investment for lasting improvement.
  'story-sol-03-repair': { optimiser: true },

  // Sol 4 — Greenhouse Contamination
  // Continue production: harvests now but risks contamination spread.
  'story-sol-04-harvest': { riskTaker: true },
  // Isolate affected crops: removes contamination for better long-term yield.
  'story-sol-04-isolate': { optimiser: true },
  // Apply selective treatment: researches/treats, delayed recovery harvest.
  'story-sol-04-treat': { explorer: true },

  // Sol 5 — First Environmental Crisis
  // Emergency intervention: repairs power gen at crew health cost.
  'story-sol-05-intervene': { riskTaker: true },
  // Shelter and conserve: protects crew, defers environmental damage.
  'story-sol-05-shelter': { survivor: true, humanitarian: true },
  // Isolate vulnerable equipment: protective measure for systems.
  'story-sol-05-isolate': { optimiser: true },
  // Mission-specific Sol 5 actions (all spend power for protective measures):
  'story-sol-05-lunar-thermal-protection': { survivor: true },
  'story-sol-05-mars-dust-protection': { optimiser: true },
  'story-sol-05-deep-space-impact-reinforcement': { survivor: true },

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPTER 2 — Signals in the Storm (Sols 6–10)
  // ─────────────────────────────────────────────────────────────────────────

  // Sol 6 — Aftermath Assessment
  // Prioritise maintenance: spends power improving generation + life support.
  'story-sol-06-prioritise-maintenance': { optimiser: true },
  // Conserve supplies: preserves food and water at morale cost.
  'story-sol-06-conserve-supplies': { survivor: true },
  // Prioritise crew recovery: lets astronaut rest and heal.
  'story-sol-06-prioritise-recovery': { humanitarian: true },

  // Sol 7 — Communication Array Failure
  // Postpone repairs: saves power, accepts isolation and morale damage.
  'story-sol-07-postpone-repairs': { survivor: true },
  // Full repairs: large power investment to restore communication.
  'story-sol-07-full-repairs': { optimiser: true, humanitarian: true },
  // Low-power communications: partial fix, balanced approach.
  'story-sol-07-low-power': { optimiser: true },

  // Sol 8 — Narrow Window of Opportunity
  // Attempt resource recovery: invests power for delayed water recovery.
  'story-sol-08-resource-recovery': { explorer: true },
  // Run system diagnostics: improves life-support efficiency.
  'story-sol-08-system-diagnostics': { optimiser: true },
  // Continue routine operations: no risk, no investment.
  'story-sol-08-routine-operations': {},

  // Sol 9 — Repairs Under Pressure
  // Restore power generation: focused system investment.
  'story-sol-09-restore-power': { optimiser: true },
  // Restore life support: focused system investment for crew safety.
  'story-sol-09-restore-life-support': { optimiser: true, humanitarian: true },
  // Balanced repairs: invests more for proportional improvement in both.
  'story-sol-09-balanced-repairs': { optimiser: true },

  // Sol 10 — Unexpected Transmission
  // Analyse the transmission: investigation/research.
  'story-sol-10-analyse': { explorer: true },
  // Verify the signal: cautious investigation.
  'story-sol-10-verify': { explorer: true },
  // Archive the transmission: preserves power, defers investigation.
  'story-sol-10-archive': { survivor: true },

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPTER 3 — The Breaking Point (Sols 11–15)
  // ─────────────────────────────────────────────────────────────────────────

  // Sol 11 — Life-Support Warning
  // Purify and stabilise: invests power to improve life-support reliability.
  'story-sol-11-purify-stabilise': { optimiser: true },
  // Emergency conservation: recovers water/oxygen, strains morale+life-support.
  'story-sol-11-emergency-conservation': { survivor: true },
  // Replace critical components: large investment for reliable life support.
  'story-sol-11-replace-components': { optimiser: true },

  // Sol 12 — Medical and Radiation Concerns
  // Prioritise recovery: spends power on crew health.
  'story-sol-12-prioritise-recovery': { humanitarian: true },
  // Reinforce shielding: invests power in habitat radiation protection.
  'story-sol-12-reinforce-shielding': { survivor: true, humanitarian: true },
  // Continue essential work: saves power at crew health cost — risky.
  'story-sol-12-essential-work': { riskTaker: true },

  // Sol 13 — Emergency Resource Allocation
  // Prioritise oxygen: direct life-sustaining resource recovery.
  'story-sol-13-prioritise-oxygen': { survivor: true },
  // Recover food and water reserves: practical resource recovery.
  'story-sol-13-recover-reserves': { survivor: true },
  // Long-term efficiency: invests in life-support + food production.
  'story-sol-13-long-term-efficiency': { optimiser: true, explorer: true },

  // Sol 14 — Midpoint Preparation
  // Reinforce power generation: preventive system maintenance.
  'story-sol-14-reinforce-power': { optimiser: true },
  // Reorganise emergency supplies: recover food/water from inventory.
  'story-sol-14-reorganise-supplies': { survivor: true },
  // Crew recovery: restores health and morale.
  'story-sol-14-crew-recovery': { humanitarian: true },

  // Sol 15 — Midpoint Turning Point
  // Acknowledge midpoint: neutral narrative beat, no distinctive signal.
  'story-sol-15-acknowledge-midpoint': {},
  // Intensify closed-loop recycling: invests in life-support at strain risk.
  'story-sol-15-intensify-recycling': { optimiser: true },
  // Reduce non-essential operations: conserves power, accepts morale cost.
  'story-sol-15-reduce-operations': { survivor: true },
  // Recover emergency equipment reserves: retrieves stored supplies.
  'story-sol-15-recover-emergency-equipment': { survivor: true },

  // ─────────────────────────────────────────────────────────────────────────
  // STANDALONE CATALOG EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  // Solar Storm
  // Activate full shielding: massive power cost to protect crew from radiation.
  'solar-storm--activate-shielding': { survivor: true, humanitarian: true },
  // Shut down non-essential systems: accepts radiation exposure to preserve resources.
  'solar-storm--shutdown-systems': { riskTaker: true },
  // Maintain operations: high radiation risk to keep production going.
  'solar-storm--risk-it': { riskTaker: true },

  // Catastrophic System Failure
  // Emergency repair protocol: dangerous repairs to stabilise systems.
  'system-failure--emergency-repairs': { riskTaker: true, optimiser: true },
  // Emergency conservation mode: buys time by reducing consumption.
  'system-failure--conserve': { survivor: true },

  // Dust Storm
  // Shelter and conserve: wait it out safely.
  'dust-storm--shelter': { survivor: true },
  // EVA to clear solar array: risky outdoor work to maintain power.
  'dust-storm--clear-array': { riskTaker: true },

  // Equipment Failure
  // Immediate repair: large investment to prevent cascading failure.
  'equipment-failure--immediate-repair': { optimiser: true },
  // Quick patch: temporary fix that may fail — accepts risk.
  'equipment-failure--patch-job': { riskTaker: true },
  // Defer repairs: ignores the problem, systems degrade.
  'equipment-failure--defer': { riskTaker: true },

  // Water Contamination
  // Purge and sterilise: large water loss for a safe, clean system.
  'water-contamination--purge-system': { optimiser: true },
  // Intensive filtration: balanced power-for-safety trade-off.
  'water-contamination--filter-intensive': { optimiser: true, humanitarian: true },
  // Continue use with caution: health risk to preserve water — risky.
  'water-contamination--risk-use': { riskTaker: true },

  // Communication Failure
  // Repair immediately: expensive but restores support and morale.
  'communication-failure--repair-immediately': { humanitarian: true, optimiser: true },
  // Defer repairs: accepts isolation and morale decline.
  'communication-failure--defer': { survivor: true },

  // Battery Malfunction
  // Emergency cooldown: shuts everything down to save batteries.
  'battery-malfunction--emergency-cooldown': { survivor: true },
  // Isolate damaged cells: targeted fix, reduced capacity.
  'battery-malfunction--partial-isolation': { optimiser: true },
  // Push through: gambles on stabilisation — high risk.
  'battery-malfunction--push-through': { riskTaker: true },

  // Temperature Drop
  // Boost heating: spends power to keep crew safe and healthy.
  'temperature-drop--boost-heating': { humanitarian: true },
  // Emergency insulation: practical shelter measure.
  'temperature-drop--insulation': { survivor: true },
  // Endure the cold: saves resources at crew health cost — risky.
  'temperature-drop--endure': { riskTaker: true },

  // Hydroponics Bloom
  // Invest in growth: spends now for delayed larger harvest.
  'hydroponics-bloom--invest': { explorer: true, optimiser: true },
  // Harvest now: takes the safe immediate gain.
  'hydroponics-bloom--stabilise': { survivor: true },

  // Unexpected Resource Discovery
  // Extract resources: power-intensive exploration for future water.
  'resource-discovery--extract': { explorer: true },
  // Ignore discovery: safe, but forgoes potential.
  'resource-discovery--ignore': { survivor: true },

  // Minor Airlock Leak
  // Seal the leak: proper maintenance fix.
  'airlock-leak--seal': { optimiser: true },
  // Monitor and defer: accepts gradual oxygen loss.
  'airlock-leak--monitor': { riskTaker: true },

  // Successful Research Experiment
  // Celebrate: acknowledges achievement, morale boost.
  'successful-experiment--celebrate': { humanitarian: true, explorer: true },
  // Continue working: minimal acknowledgement.
  'successful-experiment--continue': {},

  // ─────────────────────────────────────────────────────────────────────────
  // MISSION-SPECIFIC EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  // Lunar — Power Instability
  // Conserve power: shed loads and wait for stability.
  'mission-lunar-power-instability--conserve': { survivor: true },
  // Push systems: risk damaging the array for immediate output.
  'mission-lunar-power-instability--push': { riskTaker: true },
  // Engineer mitigation: precision stabilisation.
  'mission-lunar-power-instability--engineer': { optimiser: true },

  // Lunar — Thermal Emergency
  // Reduce habitat load: practical conservation.
  'mission-lunar-thermal-emergency--reduce-load': { survivor: true },
  // Maintain full operations: burns power and strains life support.
  'mission-lunar-thermal-emergency--full-ops': { riskTaker: true },
  // Chemist mitigation: efficient climate rebalance.
  'mission-lunar-thermal-emergency--chemist': { optimiser: true },

  // Mars — Dust Storm
  // Conservation mode: accept reduced generation.
  'mission-mars-dust-storm--conservation': { survivor: true },
  // Normal operations: depletes stored power to avoid slowdown.
  'mission-mars-dust-storm--normal-ops': { riskTaker: true },
  // Engineer mitigation: rig sweepers to maintain generation.
  'mission-mars-dust-storm--engineer': { optimiser: true },
  // Pilot mitigation: manual panel realignment.
  'mission-mars-dust-storm--pilot': { optimiser: true },

  // Mars — Radiation Spike
  // Shelter immediately: protects crew from radiation.
  'mission-mars-radiation-spike--shelter': { survivor: true, humanitarian: true },
  // Continue operations: accepts rising radiation exposure.
  'mission-mars-radiation-spike--continue': { riskTaker: true },
  // Medical officer mitigation: efficient shelter-and-treatment.
  'mission-mars-radiation-spike--medic': { humanitarian: true },

  // Deep Space — Unknown Anomaly
  // Investigate: spends power to explore for potential resources.
  'mission-deep-space-anomaly--investigate': { explorer: true },
  // Ignore: no risk, no gain.
  'mission-deep-space-anomaly--ignore': { survivor: true },
  // Scientist mitigation: remote analysis for efficient discovery.
  'mission-deep-space-anomaly--scientist': { explorer: true, optimiser: true },

  // Deep Space — Critical Systems Failure
  // Attempt repair: spends scarce power to restore subsystems.
  'mission-deep-space-systems-failure--repair': { optimiser: true },
  // Reroute resources: bypass now, erodes life support over time.
  'mission-deep-space-systems-failure--reroute': { riskTaker: true },
  // Engineer mitigation: precision repair at reduced cost.
  'mission-deep-space-systems-failure--engineer': { optimiser: true },
};

/**
 * Return the trait signals for a given actionId. If the actionId is unknown
 * (e.g. a future event added by a teammate), returns an empty object so the
 * decision contributes zero to all trait scores — it never misleads.
 */
export function classifyAction(actionId: string): TraitSignals {
  return ACTION_CLASSIFICATION[actionId] ?? {};
}

/**
 * Check whether a given actionId has any classification entry (useful for
 * diagnostics and testing).
 */
export function isClassifiedAction(actionId: string): boolean {
  return actionId in ACTION_CLASSIFICATION;
}
