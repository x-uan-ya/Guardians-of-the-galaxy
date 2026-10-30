/**
 * StepMission.tsx
 * ---------------
 * Tutorial Step 1 — "Meet Your Mission"
 *
 * Introduces the player to what they are doing on Mars, the three mission
 * objectives, the survival goal, and the Sol-based timeline. Interactive:
 * the player clicks through three objective cards that reveal more detail.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { Target, Beaker, Home, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ObjectiveCard {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  summary: string;
  detail: string;
}

const OBJECTIVES: ObjectiveCard[] = [
  {
    id: 'survival',
    label: 'Survival',
    icon: Target,
    color: 'text-status-critical',
    summary: 'Stay alive until extraction day.',
    detail:
      'Your primary goal is keeping the character alive for 30 Sols. Life support is prioritised and every resource decision revolves around not running out of the essentials.',
  },
  {
    id: 'science',
    label: 'Science',
    icon: Beaker,
    color: 'text-accent-blue',
    summary: 'Maximise research output.',
    detail:
      'Push your outpost toward scientific discovery. Power systems get a boost so you can run experiments, but you will need to balance research ambition against survival basics.',
  },
  {
    id: 'settlement',
    label: 'Settlement',
    icon: Home,
    color: 'text-status-ok',
    summary: 'Grow the outpost into a colony.',
    detail:
      'Focus on food production and expansion. You are laying the groundwork for a permanent human presence on Mars, which means investing resources into growth even when supplies are tight.',
  },
];

interface StepMissionProps {
  /** Whether this step is animating forward or backward (for CSS class). */
  direction: 'forward' | 'back';
}

export function StepMission({ direction }: StepMissionProps): ReactElement {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={direction === 'forward' ? 'tut-step-enter' : 'tut-step-enter-back'}>
      {/* Intro narrative */}
      <div className="mb-6 rounded-lg border border-mars-orange/30 bg-mars-red/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-mars-orange" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-mars-orange">
            Mission Brief
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-200">
          You have just landed on Mars as the sole operator of{' '}
          <span className="font-semibold text-mars-orange">Outpost Zero</span> — humanity's first
          permanent foothold on the red planet. Your mission: survive 30 Sols (Martian days), manage
          limited resources, and make critical decisions that will determine whether the outpost
          thrives or fails.
        </p>
      </div>

      {/* Sol timeline */}
      <div className="mb-6 rounded-md border border-space-600 bg-space-800/60 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Timeline
        </p>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="font-mono text-lg font-bold text-mars-orange">Sol 1</span>
            <span className="text-[10px] text-slate-400">Landing</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-mars-orange/60 via-slate-600 to-status-ok/60" />
          <div className="flex flex-col items-center">
            <span className="font-mono text-lg font-bold text-slate-300">Sol 15</span>
            <span className="text-[10px] text-slate-400">Resupply</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-status-ok/60 via-slate-600 to-accent-blue/60" />
          <div className="flex flex-col items-center">
            <span className="font-mono text-lg font-bold text-accent-blue">Sol 30</span>
            <span className="text-[10px] text-slate-400">Extraction</span>
          </div>
        </div>
      </div>

      {/* Mission objectives — interactive cards */}
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Before you launch, you will choose one of three mission objectives.
        <span className="ml-1 font-normal normal-case text-slate-500">
          Click each card to learn more.
        </span>
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OBJECTIVES.map((obj) => {
          const isExpanded = expanded === obj.id;
          const Icon = obj.icon;
          return (
            <button
              key={obj.id}
              type="button"
              onClick={() => setExpanded(isExpanded ? null : obj.id)}
              aria-expanded={isExpanded}
              className={`tut-card-interactive rounded-lg border p-3 text-left ${
                isExpanded
                  ? 'border-mars-orange/50 bg-mars-red/10'
                  : 'border-space-600 bg-space-700/40'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${obj.color}`} aria-hidden />
                <span className="text-sm font-semibold text-slate-100">{obj.label}</span>
              </div>
              <p className="text-xs text-slate-400">{obj.summary}</p>
              {isExpanded ? (
                <p className="mt-2 text-xs leading-relaxed text-slate-300 tut-reveal">
                  {obj.detail}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Key takeaway */}
      <div className="mt-5 rounded-md border border-accent-blue/30 bg-accent-blue/5 p-3">
        <p className="text-xs leading-relaxed text-slate-300">
          <span className="font-semibold text-accent-blue">Key takeaway:</span> Every mission is a
          balancing act. Your objective shapes which systems get a head start, but you still need to
          keep all four resources above zero to survive.
        </p>
      </div>
    </div>
  );
}
