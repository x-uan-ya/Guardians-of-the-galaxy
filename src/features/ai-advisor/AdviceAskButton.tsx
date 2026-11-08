/**
 * AdviceAskButton.tsx
 * -------------------
 * Advice is optional. Until the player asks for it, the Mission Controller stays
 * quiet and nothing is computed or sent to an AI service. This is the button
 * that asks.
 */

import type { ReactElement } from 'react';
import { Radio } from 'lucide-react';

interface AdviceAskButtonProps {
  onAsk: () => void;
  disabled?: boolean;
}

export function AdviceAskButton({ onAsk, disabled = false }: AdviceAskButtonProps): ReactElement {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onAsk}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-accent-blue/50 bg-accent-blue/10 px-3 py-1.5 text-xs font-semibold text-accent-blue hover:bg-accent-blue/20 disabled:opacity-50"
      >
        <Radio className="h-3.5 w-3.5" aria-hidden />
        Ask Mission Controller for advice
      </button>
      <p className="text-center text-[11px] text-slate-400">Optional. You decide either way.</p>
    </div>
  );
}
