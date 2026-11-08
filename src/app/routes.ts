/**
 * routes.ts
 * ---------
 * The app uses a tiny, dependency-free "view" router (no react-router in the
 * foundation — fewer moving parts for six developers). A view is just a string
 * key; the AppShell swaps the main panel based on the active view.
 *
 * Teammates adding a screen: add a ViewKey, a ROUTES entry, and a case in
 * App.tsx. Keep this list the single source of navigation truth.
 */

import type { LucideIcon } from 'lucide-react';
import { BarChart3, ClipboardList, HelpCircle, LayoutDashboard, Trophy } from 'lucide-react';

/**
 * All views reachable from the sidebar while a mission is running. Mission and
 * character selection are NOT here on purpose: they are a one-time step at the
 * start of a mission (see app/gameFlow.ts). The top bar's "New" button is the
 * deliberate way to start over.
 */
export type ViewKey =
  | 'dashboard'
  | 'debrief'
  | 'achievements'
  | 'leaderboard'
  | 'how-to-play';

export interface RouteDef {
  key: ViewKey;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const ROUTES: readonly RouteDef[] = [
  {
    key: 'dashboard',
    label: 'Mission Control',
    icon: LayoutDashboard,
    description: 'Live outpost status and daily operations.',
  },
  {
    key: 'debrief',
    label: 'Debrief',
    icon: ClipboardList,
    description: 'Decision timeline and leadership profile.',
  },
  {
    key: 'achievements',
    label: 'Badges',
    icon: Trophy,
    description: 'Badges you have earned across your missions.',
  },
  {
    key: 'leaderboard',
    label: 'Leaderboard',
    icon: BarChart3,
    description: 'Top operators ranked by sols survived.',
  },
  {
    key: 'how-to-play',
    label: 'How to Play',
    icon: HelpCircle,
    description: 'Learn how to survive on Mars.',
  },
];

export const DEFAULT_VIEW: ViewKey = 'dashboard';
