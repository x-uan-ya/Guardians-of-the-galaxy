/**
 * OutcomeExplanation.tsx
 * -----------------------
 * Renders the outcome analysis: why the mission ended as it did, what went
 * well, what could be improved, and cause-effect chains linking earlier
 * decisions to later consequences. All content is deterministic and derived
 * from recorded game data. Pure presentational.
 */

import type { ReactElement } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  XCircle,
} from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { AnalysisInsight, CauseEffectChain, OutcomeExplanationData } from './outcomeTypes';

interface OutcomeExplanationProps {
  explanation: OutcomeExplanationData;
}

export function OutcomeExplanation({ explanation }: OutcomeExplanationProps): ReactElement {
  return (
    <section className="panel p-5 space-y-5">
      <SectionHeader
        title="Mission Analysis"
        icon={MessageCircle}
        subtitle="Deterministic analysis based on recorded mission data"
      />

      {/* Primary reason */}
      <div className="rounded-lg border border-space-500 bg-space-700/60 p-4">
        <div className="mb-1 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-mars-orange" aria-hidden />
          <h3 className="text-sm font-semibold text-slate-200">Why Did the Mission End This Way?</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          {explanation.primaryReason}
        </p>
      </div>

      {/* What went well */}
      {explanation.wentWell.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-status-ok" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-200">What Went Well</h3>
          </div>
          <ul className="space-y-2" aria-label="What went well">
            {explanation.wentWell.map((insight, i) => (
              <InsightCard key={`well-${i}`} insight={insight} />
            ))}
          </ul>
        </div>
      ) : null}

      {/* What could be improved */}
      {explanation.couldImprove.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-status-warn" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-200">What Could Be Improved</h3>
          </div>
          <ul className="space-y-2" aria-label="What could be improved">
            {explanation.couldImprove.map((insight, i) => (
              <InsightCard key={`improve-${i}`} insight={insight} />
            ))}
          </ul>
        </div>
      ) : null}

      {/* Cause-effect chains */}
      {explanation.causeEffectChains.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <ArrowRight className="h-4 w-4 text-mars-orange" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-200">
              How Earlier Decisions Influenced Later Outcomes
            </h3>
          </div>
          <ul className="space-y-2" aria-label="Cause and effect chains">
            {explanation.causeEffectChains.map((chain, i) => (
              <ChainCard key={`chain-${i}`} chain={chain} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const TONE_ICON = {
  positive: CheckCircle2,
  negative: XCircle,
  neutral: HelpCircle,
} as const;

const TONE_BORDER = {
  positive: 'border-status-ok/30',
  negative: 'border-status-critical/30',
  neutral: 'border-space-500',
} as const;

const TONE_BG = {
  positive: 'bg-status-ok/5',
  negative: 'bg-status-critical/5',
  neutral: 'bg-space-700/40',
} as const;

const TONE_ICON_COLOR = {
  positive: 'text-status-ok',
  negative: 'text-status-critical',
  neutral: 'text-slate-400',
} as const;

function InsightCard({ insight }: { insight: AnalysisInsight }): ReactElement {
  const Icon = TONE_ICON[insight.tone];
  return (
    <li
      className={`rounded-md border ${TONE_BORDER[insight.tone]} ${TONE_BG[insight.tone]} p-3`}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${TONE_ICON_COLOR[insight.tone]}`}
          aria-hidden
        />
        <div>
          <p className="text-sm font-medium text-slate-200">{insight.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
            {insight.detail}
          </p>
        </div>
      </div>
    </li>
  );
}

function ChainCard({ chain }: { chain: CauseEffectChain }): ReactElement {
  return (
    <li className="rounded-md border border-mars-orange/20 bg-mars-orange/5 p-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-space-600 px-1.5 py-0.5 font-medium text-slate-300">
          Sol {chain.decision.day}
        </span>
        <span className="text-slate-200">{chain.decision.actionLabel}</span>
      </div>
      <div className="mt-1.5 flex items-start gap-2 pl-1">
        <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-mars-orange/60" aria-hidden />
        <div className="text-xs">
          <span className="text-slate-300">{chain.consequence}</span>
          <span className="ml-1.5 text-slate-500">(Sol {chain.consequenceDay})</span>
        </div>
      </div>
    </li>
  );
}
