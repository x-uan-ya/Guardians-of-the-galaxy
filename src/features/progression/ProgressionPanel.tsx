/**
 * ProgressionPanel.tsx
 * --------------------
 * Small dashboard card: how you're doing (mood), your mission rank with a
 * progress bar toward the next one, and how many badges you've earned.
 * Read-only.
 */

import type { ReactElement } from 'react';
import { Award } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { ViewKey } from '../../app/routes';
import { ACHIEVEMENTS } from '../achievements/achievementData';
import { countUnlocked } from '../achievements/achievementService';
import { MOOD_INFO } from './mood';
import { MOOD_COLORS, MOOD_ICONS } from './icons';
import { getRankInfo } from './ranks';
import type { ProgressionState } from './progressionEngine';

interface ProgressionPanelProps {
  progression: ProgressionState;
  onNavigate: (view: ViewKey) => void;
}

export function ProgressionPanel({ progression, onNavigate }: ProgressionPanelProps): ReactElement {
  const { run, achievements } = progression;
  const rank = getRankInfo(run.totalXp);
  const mood = MOOD_INFO[run.mood];
  const MoodIcon = MOOD_ICONS[run.mood];
  const percent = Math.round(rank.progress * 100);
  const earned = countUnlocked(achievements);

  return (
    <section className="panel p-4">
      <SectionHeader
        title="Your Progress"
        icon={Award}
        subtitle="Earn XP by making decisions and surviving each Sol"
        action={
          <button
            type="button"
            className="text-xs font-medium text-mars-orange underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mars-orange/60"
            onClick={() => onNavigate('achievements')}
          >
            {earned} of {ACHIEVEMENTS.length} badges
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-100">{rank.title}</span>
            <span className="tnum text-xs text-slate-400">
              {rank.nextTitle ? `${rank.xpToNext} XP to ${rank.nextTitle}` : 'Top rank reached'}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-space-600"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress toward ${rank.nextTitle ?? 'top rank'}`}
          >
            <div
              className="h-full rounded-full bg-mars-orange transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MoodIcon className={`h-7 w-7 shrink-0 ${MOOD_COLORS[run.mood]}`} aria-hidden />
          <div>
            <div className="text-sm font-semibold text-slate-100">{mood.label}</div>
            <div className="text-xs text-slate-400">{mood.hint}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
