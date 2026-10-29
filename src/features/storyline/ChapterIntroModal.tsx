import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import type { ChapterIntroduction } from './chapterIntroductions';

interface ChapterIntroModalProps {
  chapter: ChapterIntroduction;
  onContinue: () => void;
}

export function ChapterIntroModal({
  chapter,
  onContinue,
}: ChapterIntroModalProps): ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const narrativeId = useId();
  const imageDescriptions: Record<number, string> = {
    1: 'An astronaut looks out from a habitat toward a new outpost.',
    2: 'An astronaut monitors a communications array and signal display.',
    3: 'An astronaut stands beside illuminated habitat systems.',
    4: 'An astronaut observes icy terrain and a rover from the habitat.',
    5: 'Astronauts walk through a habitat outpost at sunset.',
  };

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-md sm:p-4">
      <div className="relative flex w-full items-center justify-center">
        <div
          ref={dialogRef}
          className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-xl border border-mars-orange/40 bg-space-900/95 p-4 text-center shadow-2xl shadow-mars-orange/10 animate-fade-in-up sm:max-h-[calc(100dvh-2rem)] sm:p-6"
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
            <div className="mx-auto mb-3 aspect-video w-full max-w-[360px] overflow-hidden rounded-lg border border-mars-orange/30 sm:mb-4 sm:max-w-[450px]">
              <img
                src={`/chapters/chapter-${chapter.chapterNumber}.png`}
                alt={imageDescriptions[chapter.chapterNumber] ?? ''}
                className={`h-full w-full object-cover ${
                  chapter.chapterNumber === 3 || chapter.chapterNumber === 4
                    ? 'scale-[1.02]'
                    : ''
                }`}
              />
            </div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-mars-orange">
              Chapter {String(chapter.chapterNumber).padStart(2, '0')}
            </p>
            <div className="mx-auto my-3 h-px w-20 bg-gradient-to-r from-transparent via-mars-orange/70 to-transparent sm:my-4" />
            <h1
              id={titleId}
              className="font-mono text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl"
            >
              {chapter.title}
            </h1>
            <p
              id={narrativeId}
              className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:mt-4 sm:text-base"
            >
              {chapter.narrative}
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.25em] text-slate-400 sm:mt-5">
              Sol {chapter.openingSol}–{chapter.endingSol}
            </p>
            <div className="mt-5 flex flex-col-reverse justify-center gap-3 sm:mt-6 sm:flex-row">
              <button
                ref={continueButtonRef}
                type="button"
                className="btn-primary min-w-36 justify-center max-sm:mx-auto max-sm:w-[200px]"
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
