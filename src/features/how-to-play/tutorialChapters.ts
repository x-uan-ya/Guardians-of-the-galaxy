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
    start: 16.9,
    summary:
      'Every role has its own special ability. Point at a character to watch it move, click one to choose it, then press Launch Run.',
  },
  {
    title: 'Your outpost',
    start: 43.1,
    summary: 'This is your outpost. Each room holds one of your supplies. Click a room to inspect it.',
  },
  {
    title: 'Your supplies',
    start: 55,
    summary:
      'Oxygen, Power, Food and Water are your supplies. Green is safe, so keep every bar out of the red. Health, Morale and Radiation show how you are doing. For Radiation, lower is better.',
  },
  {
    title: 'Emergencies',
    start: 63.3,
    summary:
      'Emergencies must be answered before the day can end. Not sure? Ask Mission Controller. It advises and explains the risks, but you make the final call.',
  },
  {
    title: 'Plan your Sol',
    start: 78.8,
    summary:
      'Pick one routine action. The starred action is the one Mission Controller suggests. Then press End Sol. Your supplies change every Sol, and the Log shows what happened and why.',
  },
  {
    title: 'Earn badges',
    start: 107.6,
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
