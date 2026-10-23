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
import { ClipboardList, HelpCircle, LayoutDashboard, Rocket, Trophy } from 'lucide-react';

/** All top-level views in the application. */
export type ViewKey = 'dashboard' | 'mission-setup' | 'debrief' | 'achievements' | 'how-to-play';

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
    key: 'mission-setup',
    label: 'Mission Setup',
    icon: Rocket,
    description: 'Configure and launch a new mission.',
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
    key: 'how-to-play',
    label: 'How to Play',
    icon: HelpCircle,
    description: 'Learn how to survive on Mars.',
  },
];

export const DEFAULT_VIEW: ViewKey = 'dashboard';
