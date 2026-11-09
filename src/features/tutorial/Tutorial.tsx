/**
 * Tutorial.tsx
 * ------------
 * The main five-step introductory tutorial wizard. Orchestrates step navigation,
 * renders the progress bar, and delegates to the individual step components.
 *
 * This is a full-screen overlay shown during the TUTORIAL game phase. On
 * completion it fires onComplete (which advances the flow to MISSION_SELECT).
 *
 * No game state is mutated here — this is purely educational / presentational.
 *
 * The mock-decision state (chosen option in the dust storm scenario) is lifted
 * here so Steps 4 and 5 share it. Changing the choice in Step 4 automatically
 * updates the consequences in Step 5.
 *
 * RENDERING: The overlay is rendered via a React portal to document.body so
 * that CSS containment, transforms, or backdrop-filter on parent components
 * (e.g. AppShell panels) cannot break fixed positioning. Body scroll is locked
 * while the tutorial is open and restored on unmount.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement } from 'react';
import { ChevronLeft, ChevronRight, Rocket, X } from 'lucide-react';
import { STEPS, STEP_COUNT } from './tutorialSteps';
import type { MockChoice } from './tutorialSteps';
import { StepMission } from './StepMission';
import { StepResources } from './StepResources';
import { StepOccupation } from './StepOccupation';
import { StepDecision } from './StepDecision';
import { StepConsequences } from './StepConsequences';
import './tutorial.css';

interface TutorialProps {
  /** Called when the player finishes or skips the tutorial. */
  onComplete: () => void;
}

/** Renders the step body for the given index, threading shared state. */
function StepBody({
  index,
  direction,
  chosenDecision,
  onChooseDecision,
}: {
  index: number;
  direction: 'forward' | 'back';
  chosenDecision: MockChoice | null;
  onChooseDecision: (choice: MockChoice) => void;
}): ReactElement {
  switch (index) {
    case 0:
      return <StepMission direction={direction} />;
    case 1:
      return <StepResources direction={direction} />;
    case 2:
      return <StepOccupation direction={direction} />;
    case 3:
      return <StepDecision direction={direction} chosen={chosenDecision} onChoose={onChooseDecision} />;
    case 4:
      return <StepConsequences direction={direction} chosen={chosenDecision} />;
    default:
      return <StepMission direction={direction} />;
  }
}

export function Tutorial({ onComplete }: TutorialProps): ReactElement {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  /** Shared mock-decision state between Steps 4 (decision) and 5 (consequences). */
  const [chosenDecision, setChosenDecision] = useState<MockChoice | null>(null);

  // Lock body scroll while the tutorial overlay is mounted. Restore the
  // previous overflow value on unmount so the background page returns to
  // exactly where it was.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goNext = useCallback(() => {
    if (step < STEP_COUNT - 1) {
      setDirection('forward');
      setStep((s) => s + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection('back');
      setStep((s) => s - 1);
    }
  }, [step]);

  const isFirst = step === 0;
  const isLast = step === STEP_COUNT - 1;
  const meta = STEPS[step]!;

  // Step 4 (index 3) requires a decision before the player can proceed.
  const isDecisionStep = step === 3;
  const nextDisabled = isDecisionStep && chosenDecision === null;

  // Render through a portal to document.body so that parent CSS containment
  // (backdrop-filter, transforms, will-change) cannot break fixed positioning.
  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-space-600/70 bg-space-900/95 shadow-2xl">
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between border-b border-space-600/50 px-5 py-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-mars-orange">
              Tutorial
            </span>
            <span className="ml-2 text-[10px] text-slate-500">
              Step {step + 1} of {STEP_COUNT}
            </span>
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-space-700 hover:text-slate-300"
            aria-label="Skip tutorial"
            title="Skip tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ---- Progress bar ---- */}
        <div className="flex items-center justify-center gap-2 px-5 py-3">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setDirection(i > step ? 'forward' : 'back');
                  setStep(i);
                }}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                aria-current={active ? 'step' : undefined}
                className="group flex flex-col items-center gap-1"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                    active
                      ? 'tut-dot-active border-mars-orange bg-mars-orange/20 text-mars-orange'
                      : done
                        ? 'border-mars-orange/50 bg-mars-orange/10 text-mars-orange/70'
                        : 'border-space-500 bg-space-700 text-slate-500 group-hover:border-slate-400 group-hover:text-slate-400'
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`hidden text-[9px] uppercase tracking-wider sm:block ${
                    active ? 'text-mars-orange' : done ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---- Step title ---- */}
        <div className="px-5 pb-2">
          <h2 className="text-lg font-semibold text-slate-100">{meta.subtitle}</h2>
          <p className="text-xs text-slate-400">{meta.description}</p>
        </div>

        {/* ---- Step body (scrollable) ---- */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" key={step}>
          <StepBody
            index={step}
            direction={direction}
            chosenDecision={chosenDecision}
            onChooseDecision={setChosenDecision}
          />
        </div>

        {/* ---- Footer navigation ---- */}
        <div className="flex items-center justify-between border-t border-space-600/50 px-5 py-3">
          <div>
            {!isFirst ? (
              <button type="button" onClick={goBack} className="btn-ghost text-sm">
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onComplete}
                className="text-xs text-slate-500 transition-colors hover:text-slate-300"
              >
                Skip tutorial
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Hint when Next is disabled on Step 4 */}
            {nextDisabled ? (
              <span className="text-xs text-slate-500">Choose an option to continue</span>
            ) : null}

            {isLast ? (
              <button type="button" onClick={onComplete} className="btn-primary text-sm">
                <Rocket className="h-4 w-4" aria-hidden />
                Begin Mission
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={nextDisabled}
                className="btn-primary text-sm"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
