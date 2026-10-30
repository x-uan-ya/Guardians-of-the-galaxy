/**
 * TimelineEntryCard.tsx
 * ---------------------
 * A single expandable row in the enhanced Decision Timeline.
 *
 * Collapsed: Sol badge, type icon, label, advisor badge.
 * Expanded:  explanation, immediate resource deltas, event context,
 *            pending consequences (butterfly-effect links).
 *
 * READ-ONLY: displays data from EnhancedTimelineEntry. Never mutates state.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  Package,
  Rocket,
  Skull,
  Wrench,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RESOURCE_LABELS } from '../../dashboard/labels';
import type { ResourceKey } from '../../simulation/simulationTypes';
import type {
  DecisionEntry,
  EnhancedTimelineEntry,
  MilestoneEntry,
  TimelineConsequence,
} from './timelineTypes';

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const MILESTONE_ICONS: Record<MilestoneEntry['icon'], LucideIcon> = {
  rocket: Rocket,
  package: Package,
  flag: Flag,
  skull: Skull,
};

function severityColor(severity: string | null): string {
  switch (severity) {
    case 'critical':
      return 'text-status-critical border-status-critical/40';
    case 'major':
      return 'text-status-warn border-status-warn/40';
    case 'minor':
      return 'text-accent-blue border-accent-blue/40';
    case 'info':
      return 'text-status-ok border-status-ok/40';
    default:
      return 'text-slate-400 border-space-500';
  }
}

// ---------------------------------------------------------------------------
// Resource delta chips
// ---------------------------------------------------------------------------

function ResourceChips({ changes }: { changes: Record<string, number | undefined> }): ReactElement | null {
  const entries = Object.entries(changes).filter(
    (pair): pair is [string, number] => pair[1] !== undefined && pair[1] !== 0
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map(([key, delta]) => {
        const label = RESOURCE_LABELS[key as ResourceKey] ?? key;
        const positive = delta > 0;
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] ${
              positive
                ? 'border-status-ok/30 text-status-ok'
                : 'border-status-critical/30 text-status-critical'
            }`}
          >
            {label} {positive ? '+' : ''}{delta.toFixed(1)}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Advisor badge
// ---------------------------------------------------------------------------

function AdvisorBadge({ relation }: { relation: DecisionEntry['advisorRelation'] }): ReactElement | null {
  if (relation === 'self-directed') return null;

  const isFollowed = relation === 'followed';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isFollowed
          ? 'bg-status-ok/15 text-status-ok'
          : 'bg-accent-blue/15 text-accent-blue'
      }`}
    >
      {isFollowed ? 'Followed advisor' : 'Overrode advisor'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pending consequence list (butterfly effect)
// ---------------------------------------------------------------------------

function ConsequenceList({ items }: { items: TimelineConsequence[] }): ReactElement | null {
  if (items.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-status-warn">
        <Clock className="mr-1 inline h-3 w-3" aria-hidden />
        Pending consequences
      </p>
      <div className="space-y-1.5">
        {items.map((c) => (
          <div key={c.effectId} className="dtl-consequence-link text-xs text-slate-400">
            <span className="font-mono text-status-warn">Sol {c.scheduledDay}</span>{' '}
            <span className="text-slate-300">{c.description}</span>
            <span className="ml-1 text-[10px] text-slate-500">({c.effectType})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Milestone card
// ---------------------------------------------------------------------------

function MilestoneCard({ entry }: { entry: MilestoneEntry }): ReactElement {
  const Icon = MILESTONE_ICONS[entry.icon];
  return (
    <div className="relative ml-10 rounded-lg border border-mars-orange/20 bg-mars-red/5 p-3">
      <div className="dtl-dot dtl-dot-milestone">
        <Icon className="h-2.5 w-2.5 text-mars-orange" aria-hidden />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-mars-orange">Sol {entry.day}</span>
        <span className="text-sm font-semibold text-slate-100">{entry.label}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">{entry.description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision card (expandable)
// ---------------------------------------------------------------------------

function DecisionCard({ entry }: { entry: DecisionEntry }): ReactElement {
  const [expanded, setExpanded] = useState(false);

  const isEventResponse = entry.eventContext !== null;
  const dotClass = isEventResponse ? 'dtl-dot-event' : 'dtl-dot-decision';
  const DotIcon = isEventResponse ? AlertTriangle : Wrench;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
      className="dtl-card relative ml-10 rounded-lg border border-space-600 bg-space-800/40 p-3"
    >
      <div className={`dtl-dot ${dotClass}`}>
        <DotIcon className="h-2.5 w-2.5" aria-hidden />
      </div>

      {/* Collapsed header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-300">Sol {entry.day}</span>
            {entry.eventContext ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${severityColor(
                  entry.eventContext.severity
                )}`}
              >
                {entry.eventContext.severity ?? 'event'}
              </span>
            ) : null}
            <AdvisorBadge relation={entry.advisorRelation} />
          </div>
          <p className="mt-0.5 text-sm font-medium text-slate-200">{entry.actionLabel}</p>
          {/* Event title context (if responding to an event) */}
          {entry.eventContext?.title ? (
            <p className="mt-0.5 text-xs text-slate-500">
              In response to: {entry.eventContext.title}
            </p>
          ) : null}
        </div>
        <Chevron className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
      </div>

      {/* Expanded details */}
      {expanded ? (
        <div className="dtl-expand-enter mt-3 space-y-2 border-t border-space-600/50 pt-3">
          {/* Explanation */}
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Decision details
            </p>
            <p className="text-xs leading-relaxed text-slate-300">{entry.explanation}</p>
          </div>

          {/* Immediate resource effects */}
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <Zap className="mr-1 inline h-3 w-3" aria-hidden />
              Immediate effects
            </p>
            <ResourceChips changes={entry.resourceChanges} />
            {Object.values(entry.resourceChanges).every((v) => v === undefined || v === 0) ? (
              <p className="text-xs text-slate-500">No immediate resource changes recorded.</p>
            ) : null}
          </div>

          {/* Pending consequences (butterfly effect) */}
          <ConsequenceList items={entry.pendingConsequences} />

          {/* Note about already-fired effects */}
          {entry.pendingConsequences.length === 0 && entry.eventContext ? (
            <p className="text-[10px] italic text-slate-600">
              Delayed consequences that have already resolved are not shown (not yet tracked in save data).
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface TimelineEntryCardProps {
  entry: EnhancedTimelineEntry;
}

export function TimelineEntryCard({ entry }: TimelineEntryCardProps): ReactElement {
  if (entry.kind === 'milestone') {
    return <MilestoneCard entry={entry} />;
  }
  return <DecisionCard entry={entry} />;
}
