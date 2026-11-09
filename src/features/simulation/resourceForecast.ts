/**
 * resourceForecast.ts
 * -------------------
 * Per-Sol production, consumption and "how long will it last" figures for the
 * four resources. Every number comes from the engine's own daily-change
 * calculation (projectDailyResources), so the dashboard only DISPLAYS these
 * values and does no game maths of its own.
 *
 * It is a forecast "at today's rate": events, delayed effects and the one-time
 * resupply are not predicted.
 */
import { SURVIVAL_TARGET_DAY, projectDailyResources } from './simulationEngine';
import { RESOURCE_KEYS, type GameState, type ResourceKey, type StatusLevel } from './simulationTypes';

/** Warn the player when a resource would run out within this many Sols. */
export const SHORTAGE_WARNING_SOLS = 7;
/** Escalate to a critical warning at this many Sols or fewer. */
export const SHORTAGE_CRITICAL_SOLS = 3;

const NAMES: Record<ResourceKey, string> = {
  power: 'Power',
  water: 'Water',
  food: 'Food',
  oxygen: 'Oxygen',
};

export interface ResourceForecast {
  key: ResourceKey;
  /** Amount in store right now (0..100). */
  available: number;
  /** Produced per Sol. */
  production: number;
  /** Consumed per Sol. */
  consumption: number;
  /** Net change per Sol (production minus consumption). */
  net: number;
  /**
   * Whole Sols until the store hits zero at today's rate, or null when the
   * store is not running down.
   */
  daysRemaining: number | null;
  /** True when the store is falling but still lasts until the rescue Sol. */
  lastsToRescue: boolean;
  /** ok = fine, warn = shortage within a week, critical = within 3 Sols or empty. */
  level: StatusLevel;
  /** Plain-English warning, e.g. "Food shortage in 6 Sols", or null. */
  warning: string | null;
}

function solsText(n: number): string {
  return `${n} Sol${n === 1 ? '' : 's'}`;
}

export function calculateResourceForecast(state: GameState): Record<ResourceKey, ResourceForecast> {
  const { production, consumption, dailyDelta } = projectDailyResources(state);
  const solsLeft = Math.max(0, SURVIVAL_TARGET_DAY - state.day);
  const result = {} as Record<ResourceKey, ResourceForecast>;

  for (const key of RESOURCE_KEYS) {
    const available = state.resources[key];
    const net = dailyDelta[key] ?? 0;
    let daysRemaining: number | null = null;
    let lastsToRescue = false;
    let level: StatusLevel = 'ok';
    let warning: string | null = null;

    if (available <= 0) {
      daysRemaining = 0;
      level = 'critical';
      warning = `${NAMES[key]} has run out`;
    } else if (net < 0) {
      daysRemaining = Math.ceil(available / -net);
      lastsToRescue = daysRemaining > solsLeft;
      // Only warn if the shortage would actually arrive before the mission ends.
      if (daysRemaining <= SHORTAGE_WARNING_SOLS && daysRemaining <= solsLeft) {
        level = daysRemaining <= SHORTAGE_CRITICAL_SOLS ? 'critical' : 'warn';
        warning = `${NAMES[key]} shortage in ${solsText(daysRemaining)}`;
      }
    }

    result[key] = {
      key,
      available,
      production: production[key],
      consumption: consumption[key],
      net,
      daysRemaining,
      lastsToRescue,
      level,
      warning,
    };
  }
  return result;
}
