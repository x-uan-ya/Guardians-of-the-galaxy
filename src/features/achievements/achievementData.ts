/**
 * achievementData.ts
 * ------------------
 * The badge list. Every badge is earnable in a normal 30-Sol mission and each
 * one carries its own unlock rule, so the description and the code stay in one
 * place.
 */

import type { SystemState, Resources, MissionStatus } from '../simulation/simulationTypes';

/** Names of the icons the UI can draw (mapped to lucide icons in the UI layer). */
export type IconKey =
  | 'flag'
  | 'calendar'
  | 'calendar-days'
  | 'trophy'
  | 'shield'
  | 'heart'
  | 'sprout'
  | 'cog'
  | 'package'
  | 'lightbulb'
  | 'compass'
  | 'medal';

export type AchievementId =
  | 'first_sol'
  | 'sol_10'
  | 'sol_20'
  | 'mission_complete'
  | 'crisis_handler'
  | 'staying_healthy'
  | 'green_thumb'
  | 'all_systems_go'
  | 'well_stocked'
  | 'good_listener'
  | 'own_path';

/** Everything a badge rule is allowed to look at. */
export interface AchievementContext {
  day: number;
  status: MissionStatus;
  health: number;
  systems: SystemState;
  resources: Resources;
  /** Events the player has responded to. */
  eventsResolved: number;
  /** Decisions that followed / went against the advisor's suggestion. */
  followedAdvice: number;
  ignoredAdvice: number;
}

export interface AchievementDef {
  id: AchievementId;
  title: string;
  /** Plain-language description that also says how to earn it. */
  description: string;
  icon: IconKey;
  isUnlocked: (ctx: AchievementContext) => boolean;
}

const allAtLeast = (values: number[], min: number): boolean => values.every((v) => v >= min);

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'first_sol',
    title: 'First Sol',
    description: 'Get through your first Sol on Mars.',
    icon: 'flag',
    isUnlocked: (c) => c.day >= 2,
  },
  {
    id: 'sol_10',
    title: 'Sol 10',
    description: 'Reach Sol 10 with the outpost still running.',
    icon: 'calendar',
    isUnlocked: (c) => c.day >= 10,
  },
  {
    id: 'sol_20',
    title: 'Sol 20',
    description: 'Reach Sol 20.',
    icon: 'calendar-days',
    isUnlocked: (c) => c.day >= 20,
  },
  {
    id: 'mission_complete',
    title: 'Mission Complete',
    description: 'Survive all 30 Sols.',
    icon: 'trophy',
    isUnlocked: (c) => c.status === 'completed',
  },
  {
    id: 'crisis_handler',
    title: 'Crisis Handler',
    description: 'Respond to 5 emergencies.',
    icon: 'shield',
    isUnlocked: (c) => c.eventsResolved >= 5,
  },
  {
    id: 'staying_healthy',
    title: 'Staying Healthy',
    description: 'Reach Sol 15 with health above 80%.',
    icon: 'heart',
    isUnlocked: (c) => c.day >= 15 && c.health > 80,
  },
  {
    id: 'green_thumb',
    title: 'Green Thumb',
    description: 'Get food production up to 90%.',
    icon: 'sprout',
    isUnlocked: (c) => c.systems.foodProduction >= 90,
  },
  {
    id: 'all_systems_go',
    title: 'All Systems Go',
    description: 'Have all four systems at 85% or more at the same time.',
    icon: 'cog',
    isUnlocked: (c) =>
      allAtLeast(
        [
          c.systems.powerGeneration,
          c.systems.lifeSupportEfficiency,
          c.systems.foodProduction,
          c.systems.shieldingIntegrity,
        ],
        85
      ),
  },
  {
    id: 'well_stocked',
    title: 'Well Stocked',
    description: 'Have power, water, food and oxygen all at 90% or more at the same time.',
    icon: 'package',
    isUnlocked: (c) =>
      allAtLeast([c.resources.power, c.resources.water, c.resources.food, c.resources.oxygen], 90),
  },
  {
    id: 'good_listener',
    title: 'Good Listener',
    description: "Follow the advisor's suggestion 5 times.",
    icon: 'lightbulb',
    isUnlocked: (c) => c.followedAdvice >= 5,
  },
  {
    id: 'own_path',
    title: 'Own Path',
    description: 'Choose a different action from the advisor 5 times.',
    icon: 'compass',
    isUnlocked: (c) => c.ignoredAdvice >= 5,
  },
];

export const ACHIEVEMENT_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, AchievementDef>;
