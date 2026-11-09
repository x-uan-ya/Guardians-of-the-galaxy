/**
 * AdvicePanel.tsx
 * ---------------
 * Shows the Mission Controller's advice in plain language and keeps the human
 * in charge:
 *
 *   Recommended   headline, why, risk, expected consequence, [Accept recommendation]
 *   Alternative   a reasonable second choice, with its own risk, [Override]
 *   Risky         the option with the biggest downside, explained, [Override]
 *
 * The panel never decides. It only calls `onAccept` or `onOverride`; the host
 * decides what those do (resolve an event, or plan a daily action). All text is
 * rendered as plain React text.
 */

import type { ReactElement, ReactNode } from 'react';
import { AlertTriangle, Check, Hand, Radio, ShieldCheck } from 'lucide-react';
import { GlossaryText } from '../glossary/GlossaryText';
import type { Advice, AdviceOption, RiskLevel } from './advisorTypes';

interface AdvicePanelProps {
  advice: Advice | null;
  /** True while an optional AI provider is still answering. */
  loading?: boolean;
  disabled?: boolean;
  /** The action the player currently has selected (planning mode), if any. */
  pickedActionId?: string | null;
  /** Called when the player accepts the recommendation. */
  onAccept: () => void;
  /** Called when the player overrides the recommendation with another action. */
  onOverride: (actionId: string) => void;
  /** Optional extra content under an option (e.g. effect chips). */
  renderExtra?: (actionId: string) => ReactNode;
}

const ROLE_STYLE: Record<AdviceOption['role'], { tag: string; box: string; text: string }> = {
  recommended: {
    tag: 'Recommended',
    box: 'border-accent-blue/50 bg-accent-blue/10',
    text: 'text-accent-blue',
  },
  alternative: {
    tag: 'Alternative',
    box: 'border-space-500 bg-space-800/60',
    text: 'text-accent-cyan',
  },
  risky: {
    tag: 'Risky',
    box: 'border-status-warn/50 bg-status-warn/10',
    text: 'text-status-warn',
  },
};

const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Low risk',
  moderate: 'Moderate risk',
  high: 'High risk',
};

const RISK_TONE: Record<RiskLevel, string> = {
  low: 'text-status-ok',
  moderate: 'text-status-warn',
  high: 'text-status-critical',
};

export function AdvicePanel({
  advice,
  loading = false,
  disabled = false,
  pickedActionId = null,
  onAccept,
  onOverride,
  renderExtra,
}: AdvicePanelProps): ReactElement | null {
  if (!advice) return null;

  const recommended = advice.options.find((o) => o.role === 'recommended');
  const others = advice.options.filter((o) => o.role !== 'recommended');
  const overriding = pickedActionId !== null && pickedActionId !== advice.actionId;
  const accepted = pickedActionId !== null && pickedActionId === advice.actionId;

  return (
    <section
      className="space-y-2 rounded-md border border-accent-blue/40 bg-space-900/60 p-2.5"
      aria-label="Mission Controller advice"
      data-advice-mode={advice.mode}
    >
      {/* Who is speaking */}
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-accent-blue">
        <span className="flex items-center gap-1.5">
          <Radio className="h-3 w-3" aria-hidden />
          {advice.source}
        </span>
        <span className="text-slate-400">{advice.confidence} confidence</span>
      </div>

      {advice.notice ? (
        <div
          role="status"
          className="flex items-start gap-1.5 rounded border border-status-warn/50 bg-status-warn/10 px-2 py-1.5 text-[11px] text-status-warn"
        >
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{advice.notice}</span>
        </div>
      ) : null}

      {loading ? (
        <p role="status" className="text-[11px] text-slate-400">
          Checking with the AI advisor… rule-based advice is shown meanwhile.
        </p>
      ) : null}

      {/* Headline */}
      <h4 className="flex items-start gap-1.5 text-sm font-bold leading-snug text-white">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" aria-hidden />
        <span>
          Recommendation: <GlossaryText>{advice.headline}</GlossaryText>
        </span>
      </h4>

      {/* Recommended option */}
      {recommended ? (
        <OptionCard
          option={recommended}
          advice={advice}
          picked={accepted}
          disabled={disabled}
          renderExtra={renderExtra}
        >
          <button
            type="button"
            className="btn-primary mt-2 w-full gap-1.5 !py-1.5 text-xs"
            disabled={disabled || loading}
            onClick={onAccept}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            {accepted ? 'Recommendation accepted' : 'Accept recommendation'}
          </button>
        </OptionCard>
      ) : null}

      <p className="flex items-center gap-1.5 text-[11px] text-slate-300">
        <Hand className="h-3 w-3 shrink-0 text-accent-cyan" aria-hidden />
        Human override available. The advisor only recommends. You decide.
      </p>

      {overriding ? (
        <p className="text-[11px] font-semibold text-accent-cyan" role="status">
          You are overriding the recommendation.
        </p>
      ) : null}

      {/* Alternative / Risky */}
      {others.map((option) => (
        <OptionCard
          key={option.actionId}
          option={option}
          advice={advice}
          picked={pickedActionId === option.actionId}
          disabled={disabled}
          renderExtra={renderExtra}
        >
          <button
            type="button"
            className="btn-secondary mt-2 w-full gap-1.5 !py-1.5 text-xs"
            disabled={disabled}
            onClick={() => onOverride(option.actionId)}
          >
            <Hand className="h-3.5 w-3.5" aria-hidden />
            {pickedActionId === option.actionId
              ? 'Override selected'
              : `Override: choose ${option.label}`}
          </button>
        </OptionCard>
      ))}
    </section>
  );
}

function OptionCard({
  option,
  advice,
  picked,
  renderExtra,
  children,
}: {
  option: AdviceOption;
  advice: Advice;
  picked: boolean;
  disabled: boolean;
  renderExtra?: (actionId: string) => ReactNode;
  children: ReactNode;
}): ReactElement {
  const style = ROLE_STYLE[option.role];
  return (
    <div
      className={`rounded-md border p-2 ${style.box} ${picked ? 'ring-1 ring-accent-cyan' : ''}`}
      data-role={option.role}
      data-action-id={option.actionId}
    >
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <span className={`font-mono text-[10px] font-bold uppercase tracking-wide ${style.text}`}>
          {style.tag}
        </span>
        <span className={`font-mono text-[10px] uppercase ${RISK_TONE[option.riskLevel]}`}>
          {RISK_LABEL[option.riskLevel]}
        </span>
      </div>
      <div className="text-sm font-semibold text-white">
        <GlossaryText>{option.label}</GlossaryText>
      </div>
      <dl className="mt-1 space-y-1 text-[11px] leading-snug text-slate-300">
        <div>
          <dt className="inline font-semibold text-slate-100">Why: </dt>
          <dd className="inline">
            <GlossaryText>{option.role === 'recommended' ? advice.reason : option.reason}</GlossaryText>
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-100">Risk: </dt>
          <dd className="inline">
            <GlossaryText>{option.role === 'recommended' ? advice.risk : option.risk}</GlossaryText>
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-100">Expected: </dt>
          <dd className="inline">
            <GlossaryText>
              {option.role === 'recommended' ? advice.expectedConsequence : option.consequence}
            </GlossaryText>
          </dd>
        </div>
      </dl>
      {renderExtra ? <div className="mt-1.5">{renderExtra(option.actionId)}</div> : null}
      {children}
    </div>
  );
}
