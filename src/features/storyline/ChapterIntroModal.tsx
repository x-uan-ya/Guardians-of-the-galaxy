import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import type { ChapterIntroduction } from './chapterIntroductions';

interface ChapterIntroModalProps {
  chapter: ChapterIntroduction;
  onContinue: () => void;
  /** Add a secondary action for players who prefer to skip chapter introductions. */
  onSkipIntro?: () => void;
}

export function ChapterIntroModal({
  chapter,
  onContinue,
  onSkipIntro,
}: ChapterIntroModalProps): ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const narrativeId = useId();

  useEffect(() => {
    // Keep keyboard focus in the modal and return it to the opener when dismissed.
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    continueButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (!firstElement || !lastElement) return;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-md">
      <div className="relative flex min-h-full w-full items-center justify-center py-4 sm:min-h-0 sm:py-0">
        <div
          ref={dialogRef}
          className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-mars-orange/40 bg-space-900/95 p-6 text-center shadow-2xl shadow-mars-orange/10 animate-fade-in-up sm:p-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={narrativeId}
          onKeyDown={handleKeyDown}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(224,122,63,0.12),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-mars-orange">
              Chapter {String(chapter.chapterNumber).padStart(2, '0')}
            </p>
            <div className="mx-auto my-5 h-px w-20 bg-gradient-to-r from-transparent via-mars-orange/70 to-transparent" />
            <h1
              id={titleId}
              className="font-mono text-3xl font-bold tracking-tight text-slate-100 sm:text-5xl"
            >
              {chapter.title}
            </h1>
            <p
              id={narrativeId}
              className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg"
            >
              {chapter.narrative}
            </p>
            <p className="mt-7 font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
              Sol {chapter.openingSol}–{chapter.endingSol}
            </p>
            <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              {onSkipIntro ? (
                <button
                  type="button"
                  className="btn-secondary justify-center"
                  onClick={onSkipIntro}
                >
                  Skip Intro
                </button>
              ) : null}
              <button
                ref={continueButtonRef}
                type="button"
                className="btn-primary min-w-36 justify-center"
                onClick={onContinue}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
