/**
 * icons.ts
 * --------
 * Maps the plain icon names used in progression data to lucide icons, so the
 * data files stay free of React.
 */

import {
  Annoyed,
  CalendarCheck,
  CalendarDays,
  Cog,
  Compass,
  Flag,
  Frown,
  HeartPulse,
  Laugh,
  Lightbulb,
  Medal,
  Meh,
  Package,
  ShieldCheck,
  Smile,
  Sprout,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { IconKey } from '../achievements/achievementData';
import type { Mood } from './mood';

export const ICONS: Record<IconKey, LucideIcon> = {
  flag: Flag,
  calendar: CalendarCheck,
  'calendar-days': CalendarDays,
  trophy: Trophy,
  shield: ShieldCheck,
  heart: HeartPulse,
  sprout: Sprout,
  cog: Cog,
  package: Package,
  lightbulb: Lightbulb,
  compass: Compass,
  medal: Medal,
};

export const MOOD_ICONS: Record<Mood, LucideIcon> = {
  great: Laugh,
  good: Smile,
  okay: Meh,
  worried: Frown,
  struggling: Annoyed,
};

export const MOOD_COLORS: Record<Mood, string> = {
  great: 'text-status-ok',
  good: 'text-status-ok',
  okay: 'text-slate-300',
  worried: 'text-status-warn',
  struggling: 'text-status-critical',
};
