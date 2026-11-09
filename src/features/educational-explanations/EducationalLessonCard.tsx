/**
 * EducationalLessonCard.tsx
 * --------------------------
 * Collapsible "Real-World Mission Lesson" card rendered inside an expanded
 * Decision Timeline entry.
 *
 * The card is only shown when a relevant educational topic matches the
 * decision. It provides a two-level interaction:
 *   1. The decision card must already be expanded to see the lesson header.
 *   2. The player clicks "Learn More" to expand the full five-section
 *      educational explanation.
 *
 * READ-ONLY: displays prewritten science content + the player's actual
 * recorded decision data. Never mutates game state.
 *
 * ACCESSIBILITY: uses button with aria-expanded, keyboard navigation,
 * and respects prefers-reduced-motion via CSS.
 */

import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  Rocket,
  Sparkles,
} from 'lucide-react';
import type { DecisionRecord } from '../decisions/decisionTypes';
import type { EducationalExplanation } from './educationalTypes';
import { buildEducationalExplanation } from './explanationBuilder';
import './educational-explanations.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EducationalLessonCardProps {
  /** The decision record from the timeline entry. */
  record: DecisionRecord;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EducationalLessonCard({ record }: EducationalLessonCardProps): ReactElement | null {
  const explanation = useMemo(() => buildEducationalExplanation(record), [record]);
  const [expanded, setExpanded] = useState(false);

  // No matching topic → render nothing.
  if (!explanation) return null;

  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="mt-3">
      {/* Toggle button */}
      <button
        type="button"
        className="edu-toggle"
        aria-expanded={expanded}
        aria-label={`Learn more: real-world lesson about ${explanation.topicTitle}`}
        onClick={(e) => {
          // Stop the click from toggling the parent decision card.
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }
        }}
      >
        <BookOpen className="h-3 w-3" aria-hidden />
        <span>Real-World Mission Lesson — {explanation.topicTitle}</span>
        <Chevron className="h-3 w-3" aria-hidden />
      </button>

      {/* Expanded lesson content */}
      {expanded ? (
        <div
          className="edu-card edu-expand-enter"
          role="region"
          aria-label={`Educational lesson: ${explanation.topicTitle}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="space-y-0 p-4">
            <LessonSection
              icon={<Sparkles className="h-3 w-3" aria-hidden />}
              title="What Happened?"
              body={explanation.whatHappened}
            />

            <hr className="edu-divider" />

            <LessonSection
              icon={<FlaskConical className="h-3 w-3" aria-hidden />}
              title="Why Did It Happen?"
              body={explanation.whyItHappened}
            />

            <hr className="edu-divider" />

            <LessonSection
              icon={<GraduationCap className="h-3 w-3" aria-hidden />}
              title="What Can You Learn?"
              body={explanation.whatYouCanLearn}
            />

            <hr className="edu-divider" />

            <RealWorldSection explanation={explanation} />

            <hr className="edu-divider" />

            <KeyTakeaway text={explanation.keyTakeaway} />

            {/* Game vs. reality footnote */}
            <p className="edu-footnote">
              <Lightbulb
                className="mr-1 inline h-3 w-3 text-slate-500"
                aria-hidden
              />
              <strong>Game vs. reality:</strong> {explanation.gameVsRealityNote}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single section with a coloured header and body text. */
function LessonSection({
  icon,
  title,
  body,
}: {
  icon: ReactElement;
  title: string;
  body: string;
}): ReactElement {
  return (
    <div>
      <div className="edu-section-title">
        {icon}
        {title}
      </div>
      <p className="edu-section-body">{body}</p>
    </div>
  );
}

/** Section 4: Real Space Missions + reference links. */
function RealWorldSection({
  explanation,
}: {
  explanation: EducationalExplanation;
}): ReactElement {
  return (
    <div>
      <div className="edu-section-title">
        <Rocket className="h-3 w-3" aria-hidden />
        How Does This Relate to Real Space Missions?
      </div>
      <p className="edu-section-body">{explanation.realWorldConnection}</p>

      {explanation.references.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {explanation.references.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="edu-ref-link"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              {ref.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Section 5: Key Takeaway highlight box. */
function KeyTakeaway({ text }: { text: string }): ReactElement {
  return (
    <div className="edu-takeaway">
      <div className="edu-section-title" style={{ marginBottom: '0.375rem' }}>
        <Lightbulb className="h-3 w-3" aria-hidden />
        Key Takeaway
      </div>
      <p>{text}</p>
    </div>
  );
}
