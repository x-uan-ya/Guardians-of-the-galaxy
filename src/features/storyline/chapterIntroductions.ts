import type { MissionType } from '../simulation/simulationTypes';

/** The presentation-ready data passed from the chapter lookup to the modal. */
export interface ChapterIntroduction {
  chapterNumber: number;
  openingSol: number;
  endingSol: number;
  title: string;
  narrative: string;
}

interface ChapterIntroductionContent extends Omit<ChapterIntroduction, 'narrative'> {
  narrative: string;
  /** Short setting details let the introduction reflect the selected mission without spoilers. */
  missionContext: Record<MissionType, string>;
}

/** Shared titles and opening narratives for all five story chapters. */
export const CHAPTER_INTRODUCTIONS: readonly ChapterIntroductionContent[] = [
  {
    chapterNumber: 1,
    openingSol: 1,
    endingSol: 5,
    title: 'A Fragile Beginning',
    narrative:
      'A new outpost. A distant frontier. Every system matters, and every decision leaves a mark.',
    missionContext: {
      lunar: 'Your lunar habitat is the first foothold on a nearby, airless world.',
      mars: 'Your Mars outpost is a small foothold in a vast, unforgiving landscape.',
      'deep-space': 'Your isolated habitat must make the most of every system and reserve.',
    },
  },
  {
    chapterNumber: 2,
    openingSol: 6,
    endingSol: 10,
    title: 'Signals in the Storm',
    narrative:
      'The first challenges are behind you, but the frontier has more to reveal. Not every signal brings reassurance.',
    missionContext: {
      lunar: 'Mission Control remains a vital link across the distance to the Moon.',
      mars: 'Messages cross the vast distance between Mars and Earth with unavoidable delays.',
      'deep-space': 'The habitat depends on delayed communications and careful independent decisions.',
    },
  },
  {
    chapterNumber: 3,
    openingSol: 11,
    endingSol: 15,
    title: 'The Breaking Point',
    narrative:
      'Supplies are strained. Systems are vulnerable. Halfway through the mission, survival is no longer guaranteed.',
    missionContext: {
      lunar: 'The lunar crew must balance finite stores with the demands of the habitat.',
      mars: 'The Mars outpost must balance finite stores with the demands of a remote habitat.',
      'deep-space': 'With no resupply, the isolated habitat depends on its closed-loop systems.',
    },
  },
  {
    chapterNumber: 4,
    openingSol: 16,
    endingSol: 23,
    title: 'Secrets Beyond the Outpost',
    narrative:
      'Beyond the familiar walls lie unanswered questions. The greatest discovery may come at the greatest cost.',
    missionContext: {
      lunar: 'The surrounding lunar terrain holds scientific questions beyond the habitat.',
      mars: 'The Martian landscape beyond the habitat remains a frontier for careful study.',
      'deep-space': 'Observations beyond the isolated habitat may expand what the mission can learn.',
    },
  },
  {
    chapterNumber: 5,
    openingSol: 24,
    endingSol: 30,
    title: 'The Final Countdown',
    narrative:
      "The end is within reach. Seven Sols remain, and everything you've built will be put to the test.",
    missionContext: {
      lunar: 'The lunar outpost enters its final planned operations.',
      mars: 'The Mars outpost enters its final planned operations.',
      'deep-space': 'The isolated habitat enters its final planned operations without resupply.',
    },
  },
];

/**
 * Find the introduction that begins on a Sol and optionally tailor its
 * narrative to the selected mission. Without a mission, the shared copy is
 * returned unchanged.
 */
export function getChapterIntroductionByOpeningSol(
  openingSol: number,
  missionType?: MissionType,
): ChapterIntroduction | undefined {
  const content = CHAPTER_INTRODUCTIONS.find(
    (introduction) => introduction.openingSol === openingSol,
  );
  if (!content) return undefined;

  const { missionContext, ...introduction } = content;
  return {
    ...introduction,
    narrative: missionType
      ? `${introduction.narrative} ${missionContext[missionType]}`
      : introduction.narrative,
  };
}
