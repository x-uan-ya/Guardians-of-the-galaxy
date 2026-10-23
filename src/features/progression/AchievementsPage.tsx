/**
 * AchievementsPage.tsx
 * --------------------
 * Every badge in one list, earned ones first. Each badge says how to earn it,
 * so there are no secrets to puzzle over.
 */

import type { ReactElement } from 'react';
import { Trophy } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ACHIEVEMENTS } from '../achievements/achievementData';
import { countUnlocked, isUnlocked } from '../achievements/achievementService';
import { ICONS } from './icons';
import type { ProgressionState } from './progressionEngine';

interface AchievementsPageProps {
  progression: ProgressionState;
}

export function AchievementsPage({ progression }: AchievementsPageProps): ReactElement {
  const { achievements } = progression;
  const earned = countUnlocked(achievements);

  const sorted = [...ACHIEVEMENTS].sort(
    (a, b) => Number(isUnlocked(achievements, b.id)) - Number(isUnlocked(achievements, a.id))
  );

  return (
    <section className="panel p-4">
      <SectionHeader
        title="Badges"
        icon={Trophy}
        subtitle={`${earned} of ${ACHIEVEMENTS.length} earned. Badges stay with you across missions.`}
      />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sorted.map((badge) => {
          const solEarned = achievements.unlocked[badge.id];
          const done = solEarned !== undefined;
          const Icon = ICONS[badge.icon];
          return (
            <li
              key={badge.id}
              className={`flex items-start gap-3 rounded-md border p-3 ${
                done ? 'border-mars-orange/40 bg-mars-orange/10' : 'border-space-600 bg-space-800/40'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-mars-orange/20 text-mars-orange' : 'bg-space-700 text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${done ? 'text-slate-100' : 'text-slate-300'}`}>
                  {badge.title}
                </div>
                <p className="text-xs text-slate-400">{badge.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {done ? `Earned on Sol ${solEarned}` : 'Not earned yet'}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
