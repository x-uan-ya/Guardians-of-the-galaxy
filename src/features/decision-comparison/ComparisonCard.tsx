/**
 * ComparisonCard.tsx
 * ------------------
 * An expandable card for a single decision point in the What If? panel.
 *
 * Collapsed: Sol badge, severity tag, event title, chosen action label.
 * Expanded:  side-by-side columns — "Your Decision" vs each "Alternative" —
 *            showing immediate effects, delayed consequences, and the takeaway.
 *
 * DESIGN RULES:
 *  - Actual recorded outcomes are labelled "Recorded result".
 *  - Alternative effects are labelled "Declared effect (not played)".
 *  - Delayed consequences for the chosen action show whether they were
 *    confirmed by the game or are still pending.
 *  - Delayed consequences for alternatives are always labelled as declared.
 *  - The takeaway never claims to predict the full alternative mission.
 *
 * READ-ONLY: purely presentational.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  GitCompareArrows,
  Lightbulb,
} from 'lucide-react';
import { EffectDiffDisplay } from './EffectDiffDisplay';
import type {
  ChosenDelayedEffect,
  DecisionComparison,
  DeclaredDelayedEffect,
} from './comparisonTypes';

// ---------------------------------------------------------------------------
// Severity styling (matches TimelineEntryCard)
// ---------------------------------------------------------------------------

function severityColor(severity: string): string {
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
// Delayed effects lists
// ---------------------------------------------------------------------------

function ChosenDelayedList({
  effects,
}: {
  effects: ChosenDelayedEffect[];
}): ReactElement | null {
  if (effects.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        <Clock className="mr-1 inline h-3 w-3" aria-hidden />
        Delayed consequences
      </p>
      <ul className="space-y-1" aria-label="Delayed consequences of chosen action">
        {effects.map((e, i) => (
          <li
            key={i}
            className={`rounded border p-2 text-xs ${
              e.confirmed
                ? 'border-status-ok/20 bg-status-ok/5'
                : 'border-status-warn/20 bg-status-warn/5'
            }`}
          >
            <span className="text-slate-300">{e.description}</span>
            <span className="ml-1.5 text-[10px] text-slate-500">
              (Sol {e.scheduledDay} &middot; {e.kind})
            </span>
            <span
              className={`ml-1.5 text-[10px] font-semibold ${
                e.confirmed ? 'text-status-ok' : 'text-status-warn'
              }`}
            >
              {e.confirmed ? '- Confirmed' : '- Pending'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeclaredDelayedList({
  effects,
  decisionDay,
}: {
  effects: DeclaredDelayedEffect[];
  decisionDay: number;
}): ReactElement | null {
  if (effects.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        <Clock className="mr-1 inline h-3 w-3" aria-hidden />
        Declared delayed consequences
      </p>
      <ul className="space-y-1" aria-label="Declared delayed consequences of alternative action">
        {effects.map((e, i) => (
          <li
            key={i}
            className="rounded border border-accent-blue/20 bg-accent-blue/5 p-2 text-xs"
          >
            <span className="text-slate-300">{e.description}</span>
            <span className="ml-1.5 text-[10px] text-slate-500">
              (+{e.delayInDays} sol{e.delayInDays !== 1 ? 's' : ''} &rarr; Sol{' '}
              {decisionDay + e.delayInDays} &middot; {e.kind})
            </span>
            <span className="ml-1.5 text-[10px] font-semibold text-accent-blue">
              - Not played
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action column
// ---------------------------------------------------------------------------

function ActionColumn({
  heading,
  headingIcon,
  headingColor,
  actionLabel,
  description,
  children,
}: {
  heading: string;
  headingIcon: ReactElement;
  headingColor: string;
  actionLabel: string;
  description: string;
  children: ReactElement;
}): ReactElement {
  return (
    <div className="dc-column flex-1 rounded-lg border border-space-600 bg-space-800/50 p-3">
      <div className={`mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest ${headingColor}`}>
        {headingIcon}
        {heading}
      </div>
      <p className="text-sm font-medium text-slate-100">{actionLabel}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface ComparisonCardProps {
  comparison: DecisionComparison;
}

export function ComparisonCard({ comparison }: ComparisonCardProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const { eventContext, chosen, alternatives, takeaway, day } = comparison;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      className="dc-card rounded-lg border border-space-600 bg-space-800/40"
      role="region"
      aria-label={`What-if comparison for Sol ${day}: ${eventContext.title}`}
    >
      {/* Collapsed header */}
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
        className="dc-card-header flex cursor-pointer items-start justify-between gap-2 p-4"
      >
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-300">
              Sol {day}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${severityColor(
                eventContext.severity,
              )}`}
            >
              {eventContext.severity}
            </span>
            <span className="text-xs text-slate-400">{eventContext.title}</span>
          </div>
          <p className="mt-1 text-sm text-slate-200">
            <span className="font-medium">Your choice:</span> {chosen.label}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {alternatives.length} alternative{alternatives.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <Chevron className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
      </div>

      {/* Expanded comparison */}
      {expanded && (
        <div className="dc-card-body border-t border-space-600/50 p-4 space-y-4">
          {/* Event description */}
          <p className="text-xs leading-relaxed text-slate-400 italic">
            {eventContext.description}
          </p>

          {/* Side-by-side columns */}
          <div className="dc-comparison-grid gap-3">
            {/* Your Decision */}
            <ActionColumn
              heading="Your Decision"
              headingIcon={<CheckCircle2 className="h-3 w-3" aria-hidden />}
              headingColor="text-status-ok"
              actionLabel={chosen.label}
              description={chosen.description}
            >
              <>
                <EffectDiffDisplay
                  provenance={chosen.immediateEffects.provenance}
                  resources={chosen.immediateEffects.resources}
                  crew={chosen.immediateEffects.crew}
                  systems={chosen.immediateEffects.systems}
                />
                <ChosenDelayedList effects={chosen.delayedEffects} />
              </>
            </ActionColumn>

            {/* Alternatives */}
            {alternatives.map((alt) => (
              <ActionColumn
                key={alt.actionId}
                heading="Alternative"
                headingIcon={<GitCompareArrows className="h-3 w-3" aria-hidden />}
                headingColor="text-accent-blue"
                actionLabel={alt.label}
                description={alt.description}
              >
                <>
                  <EffectDiffDisplay
                    provenance={alt.immediateEffects.provenance}
                    resources={alt.immediateEffects.resources}
                    crew={alt.immediateEffects.crew}
                    systems={alt.immediateEffects.systems}
                  />
                  <DeclaredDelayedList effects={alt.delayedEffects} decisionDay={day} />
                </>
              </ActionColumn>
            ))}
          </div>

          {/* Key takeaway */}
          <div className="dc-takeaway rounded-lg border border-mars-orange/20 bg-mars-orange/5 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-mars-orange" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-mars-orange">
                Key Takeaway
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">{takeaway}</p>
          </div>
        </div>
      )}
    </div>
  );
}
