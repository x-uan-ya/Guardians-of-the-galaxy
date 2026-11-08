/**
 * tutorialChapters.ts
 * -------------------
 * Data for the "How to Play" video: where the file lives and its chapters.
 *
 * The video is recorded from the real game with tools/tutorial-video (see its
 * README). If the game's screens change, re-record it and update the chapter
 * start times below from the generated marks.json.
 */

export const TUTORIAL_VIDEO = {
  src: '/tutorial/how-to-play.webm',
  poster: '/tutorial/poster.jpg',
  /** Shown to players, e.g. "About 2 minutes". */
  lengthLabel: 'About 2 minutes',
} as const;

export interface TutorialChapter {
  title: string;
  /** Where the chapter starts, in seconds. */
  start: number;
  /** What the on-screen caption says (also used as the text version). */
  summary: string;
}

export const TUTORIAL_CHAPTERS: readonly TutorialChapter[] = [
  {
    title: 'Choose your mission',
    start: 4.9,
    summary: 'Pick where your mission takes place. Each site changes the odds. Mars is the classic.',
  },
  {
    title: 'Pick your role',
    start: 16.2,
    summary:
      'Every role has its own special ability. Point at a character to watch it move, click one to choose it, then press Launch Run.',
  },
  {
    title: 'Your outpost',
    start: 41.7,
    summary: 'This is your outpost. Each room holds one of your supplies. Click a room to inspect it.',
  },
  {
    title: 'Your supplies',
    start: 53.5,
    summary:
      'Oxygen, Power, Food and Water are your supplies. Green is safe, so keep every bar out of the red. Health, Morale and Radiation show how you are doing. For Radiation, lower is better.',
  },
  {
    title: 'Emergencies',
    start: 61.7,
    summary:
      'Emergencies must be answered before the day can end. Mission Controller recommends a response and explains why, what could go wrong and what to expect. It only advises: you accept the recommendation or override it.',
  },
  {
    title: 'Plan your Sol',
    start: 82.1,
    summary:
      'Plan one action each Sol. Mission Controller shows a recommended, an alternative and sometimes a risky option. Accept the advice or press Override to choose another, then press End Sol. Your supplies change every Sol, and the Log shows what happened and why.',
  },
  {
    title: 'Earn badges',
    start: 114.6,
    summary:
      'Play well to earn XP, climb ranks and unlock badges. They stay with you across missions.',
  },
];

/** 63.3 -> "1:03" */
export function formatTime(totalSeconds: number): string {
  const whole = Math.floor(totalSeconds);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
