/**
 * DecisionTimeline.tsx
 * --------------------
 * The enhanced Decision Timeline component for the mission debrief.
 *
 * Renders a chronological, expandable timeline of milestones, player decisions,
 * and butterfly-effect consequence links. All data is read from GameState via
 * timelineBuilder — no simulation or teammate code is modified.
 *
 * Usable during an active mission (shows history so far) or after completion.
 */

import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { Clock } from 'lucide-react';
import type { GameState } from '../../simulation/simulationTypes';
import { buildEnhancedTimeline } from './timelineBuilder';
import { TimelineEntryCard } from './TimelineEntryCard';
import './timeline.css';

interface DecisionTimelineProps {
  state: GameState;
}

export function DecisionTimeline({ state }: DecisionTimelineProps): ReactElement {
  const entries = useMemo(() => buildEnhancedTimeline(state), [state]);

  const decisionCount = entries.filter((e) => e.kind === 'decision').length;
  const eventCount = entries.filter(
    (e) => e.kind === 'decision' && e.eventContext !== null
  ).length;

  return (
    <section className="panel p-5">
      <SectionHeader
        title="Decision Timeline"
        icon={Clock}
        subtitle={
          decisionCount > 0
            ? `${decisionCount} decision${decisionCount !== 1 ? 's' : ''} recorded${
                eventCount > 0 ? ` · ${eventCount} event response${eventCount !== 1 ? 's' : ''}` : ''
              } · click any entry to expand`
            : undefined
        }
      />

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">
          No decisions recorded yet. Play a few Sols, then return here to see your mission timeline.
        </p>
      ) : (
        <div className="relative space-y-3 py-2">
          {/* Vertical connector line */}
          <div className="dtl-connector" aria-hidden />

          {entries.map((entry) => (
            <TimelineEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
