/**
 * TutorialVideo.tsx
 * -----------------
 * The "watch it" version of How to Play: a short captioned video recorded from
 * the real game, with chapter buttons to jump to any step and a written version
 * for anyone who would rather read (or whose browser cannot play the video).
 * The video has no sound; the steps are shown as on-screen captions.
 */

import { useRef, useState, type ReactElement } from 'react';
import { PlayCircle } from 'lucide-react';
import {
  TUTORIAL_CHAPTERS,
  TUTORIAL_VIDEO,
  formatTime,
} from './tutorialChapters';

/** The tutorial is a WebM file; very old browsers cannot play it. */
function canPlayWebm(): boolean {
  if (typeof document === 'undefined') return true;
  return document.createElement('video').canPlayType('video/webm; codecs="vp9"') !== '';
}

export function TutorialVideo(): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [failed, setFailed] = useState<boolean>(() => !canPlayWebm());

  const jumpTo = (start: number): void => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = start;
    // Some browsers refuse to start playback on their own; the player's own
    // play button still works, so ignoring the rejection is fine.
    video.play().catch(() => undefined);
  };

  const handleTimeUpdate = (): void => {
    const time = videoRef.current?.currentTime ?? 0;
    let index = 0;
    TUTORIAL_CHAPTERS.forEach((chapter, i) => {
      if (time >= chapter.start - 0.25) index = i;
    });
    setActiveChapter((previous) => (previous === index ? previous : index));
  };

  return (
    <section className="panel p-5" aria-labelledby="tutorial-video-title">
      <h2
        id="tutorial-video-title"
        className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-100"
      >
        <PlayCircle className="h-5 w-5 text-mars-orange" aria-hidden />
        Watch the video tutorial
      </h2>
      <p className="mb-3 text-sm text-slate-400">
        {TUTORIAL_VIDEO.lengthLabel}. There is no sound: follow the captions on screen. Use the
        steps below the video to jump to any part.
      </p>

      {failed ? (
        <div
          role="alert"
          className="mb-3 rounded-md border border-status-warn/40 bg-status-warn/10 p-4 text-sm text-slate-200"
        >
          The video can't play in this browser. The same steps are written out below, and the
          rest of this page covers everything in detail.
        </div>
      ) : (
        <video
          ref={videoRef}
          className="aspect-video w-full rounded-md border border-space-600 bg-black"
          src={TUTORIAL_VIDEO.src}
          poster={TUTORIAL_VIDEO.poster}
          controls
          playsInline
          preload="metadata"
          aria-label="How to play MARS: OUTPOST ZERO, a captioned video tutorial"
          onTimeUpdate={handleTimeUpdate}
          onError={() => setFailed(true)}
        />
      )}

      <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TUTORIAL_CHAPTERS.map((chapter, index) => {
          const isActive = !failed && index === activeChapter;
          return (
            <li key={chapter.title}>
              <button
                type="button"
                onClick={() => jumpTo(chapter.start)}
                disabled={failed}
                aria-current={isActive ? 'step' : undefined}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mars-orange/60 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? 'border-mars-orange/50 bg-mars-orange/10 text-slate-100'
                    : 'border-space-600 bg-space-800/40 text-slate-300 hover:bg-space-700'
                }`}
              >
                <span className="tnum w-6 shrink-0 text-xs font-semibold text-mars-orange">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 font-medium">{chapter.title}</span>
                <span className="tnum shrink-0 text-xs text-slate-400">
                  {formatTime(chapter.start)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <details
        className="mt-3 rounded-md border border-space-600 bg-space-900/60 p-3 text-sm text-slate-300"
        open={failed}
      >
        <summary className="cursor-pointer font-medium text-slate-100">
          Read the steps instead
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          {TUTORIAL_CHAPTERS.map((chapter) => (
            <li key={chapter.title}>
              <strong className="text-slate-100">{chapter.title}.</strong> {chapter.summary}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
