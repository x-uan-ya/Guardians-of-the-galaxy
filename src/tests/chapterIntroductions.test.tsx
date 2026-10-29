import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { ChapterIntroModal } from '../features/storyline/ChapterIntroModal';
import {
  CHAPTER_INTRODUCTIONS,
  getChapterIntroductionByOpeningSol,
} from '../features/storyline/chapterIntroductions';
import { chapter2EventForDay } from '../features/events/eventTriggers';
import { freshGame } from './helpers';
import {
  completeChapterIntroduction,
  loadCompletedChapterIntroductions,
  loadGame,
  saveGame,
} from '../lib/storage';
import { createInitialGameState } from '../features/simulation/simulationEngine';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  document.body.style.overflow = '';
  window.localStorage.clear();
});

function render(element: ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(element));
}

function clickButton(label: string): void {
  const button = [...document.body.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim().includes(label),
  );
  if (!button) throw new Error(`Could not find button "${label}".`);
  act(() => button.click());
}

function authenticateTestUser(): void {
  window.localStorage.setItem(
    'mars-outpost-users',
    JSON.stringify([
      {
        id: 'chapter-intro-test-user',
        email: 'chapter-intro@example.test',
        passwordHash: 'unused',
        securityQuestions: [],
        createdAt: new Date(0).toISOString(),
      },
    ]),
  );
  window.localStorage.setItem(
    'mars-outpost-session',
    JSON.stringify({ userId: 'chapter-intro-test-user', timestamp: Date.now() }),
  );
}

function initialSavedMission(gameId: string) {
  return createInitialGameState({
    missionType: 'mars',
    occupation: 'engineer',
    objective: 'survival',
    operatingPhilosophy: 'balanced',
    startingCondition: 'standard',
    gameId,
    now: 1_700_000_000_000,
  });
}

describe('chapter introduction data', () => {
  it('returns an introduction for each chapter opening and nothing for other Sols', () => {
    expect(CHAPTER_INTRODUCTIONS.map(({ openingSol }) => openingSol)).toEqual([
      1, 6, 11, 16, 24,
    ]);
    expect(getChapterIntroductionByOpeningSol(1)?.title).toBe('A Fragile Beginning');
    expect(getChapterIntroductionByOpeningSol(7)).toBeUndefined();
  });

  it.each(
    CHAPTER_INTRODUCTIONS.flatMap((chapter) =>
      (['lunar', 'mars', 'deep-space'] as const).map((missionType) => ({
        chapter,
        missionType,
      })),
    ),
  )(
    'renders Chapter $chapter.chapterNumber for the $missionType mission without changing its narrative',
    ({ chapter, missionType }) => {
      const selectedChapter = getChapterIntroductionByOpeningSol(
        chapter.openingSol,
        missionType,
      );
      if (!selectedChapter) throw new Error(`Missing Chapter ${chapter.chapterNumber}.`);

      render(
        <ChapterIntroModal chapter={selectedChapter} onContinue={() => {}} />,
      );

      const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
      const image = dialog?.querySelector<HTMLImageElement>('img');
      const narrative = dialog?.querySelector<HTMLElement>(
        `[id="${dialog?.getAttribute('aria-describedby')}"]`,
      );

      expect(image?.getAttribute('src')).toBe(
        `/chapters/chapter-${chapter.chapterNumber}.png`,
      );
      expect(dialog?.querySelector('h1')?.textContent).toBe(chapter.title);
      expect(narrative?.textContent).toBe(selectedChapter.narrative);
      expect(dialog?.textContent).toContain(
        `Sol ${chapter.openingSol}–${chapter.endingSol}`,
      );
    },
  );
});

describe('ChapterIntroModal', () => {
  it.each([
    {
      chapterNumber: 1,
      alt: 'An astronaut looks out from a habitat toward a new outpost.',
    },
    {
      chapterNumber: 2,
      alt: 'An astronaut monitors a communications array and signal display.',
    },
    {
      chapterNumber: 3,
      alt: 'An astronaut stands beside illuminated habitat systems.',
    },
    {
      chapterNumber: 4,
      alt: 'An astronaut observes icy terrain and a rover from the habitat.',
    },
    {
      chapterNumber: 5,
      alt: 'Astronauts walk through a habitat outpost at sunset.',
    },
  ])('renders the Chapter $chapterNumber artwork and existing chapter content', ({
    chapterNumber,
    alt,
  }) => {
    const chapter = CHAPTER_INTRODUCTIONS[chapterNumber - 1]!;
    render(<ChapterIntroModal chapter={chapter} onContinue={() => {}} />);

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const image = dialog?.querySelector<HTMLImageElement>('img');

    expect(image?.getAttribute('src')).toBe(`/chapters/chapter-${chapterNumber}.png`);
    expect(image?.getAttribute('alt')).toBe(alt);
    expect(image?.className).toContain('object-cover');
    expect(image?.parentElement?.className).toContain('aspect-video');
    expect(dialog?.textContent).toContain(chapter.title);
    expect(dialog?.textContent).toContain(chapter.narrative);
    expect(dialog?.textContent).toContain(`Sol ${chapter.openingSol}–${chapter.endingSol}`);
    expect(dialog?.querySelector('button')?.textContent).toContain('Continue');
  });

  it('keeps Escape from completing the intro and exposes only Continue', () => {
    const chapter = getChapterIntroductionByOpeningSol(1)!;
    let continued = 0;
    render(
      <ChapterIntroModal
        chapter={chapter}
        onContinue={() => {
          continued += 1;
        }}
      />,
    );

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement?.textContent).toContain('Continue');
    expect(dialog?.getAttribute('aria-labelledby')).not.toBeNull();
    expect(dialog?.getAttribute('aria-describedby')).not.toBeNull();
    expect(dialog?.querySelectorAll('button')).toHaveLength(1);
    expect(dialog?.textContent).not.toContain('Skip Intro');
    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(continued).toBe(0);

    clickButton('Continue');
    expect(continued).toBe(1);
  });

  it('keeps keyboard focus in the modal, locks scrolling, and restores focus on unmount', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open chapter';
    document.body.appendChild(opener);
    opener.focus();

    render(
      <ChapterIntroModal
        chapter={getChapterIntroductionByOpeningSol(1)!}
        onContinue={() => {}}
      />,
    );

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const continueButton = dialog?.querySelector<HTMLButtonElement>('button');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(continueButton);

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    continueButton?.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(continueButton);

    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    continueButton?.dispatchEvent(shiftTabEvent);
    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(continueButton);

    act(() => root?.unmount());
    root = undefined;

    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('keeps the artwork and Continue control available with a longer narrative', () => {
    const chapter = getChapterIntroductionByOpeningSol(24, 'deep-space')!;
    const longChapter = {
      ...chapter,
      narrative: `${chapter.narrative} ${'Additional mission context. '.repeat(40)}`,
    };
    render(<ChapterIntroModal chapter={longChapter} onContinue={() => {}} />);

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const image = dialog?.querySelector<HTMLImageElement>('img');

    expect(dialog?.className).toContain('max-h-[calc(100dvh-1.5rem)]');
    expect(dialog?.className).toContain('overflow-y-auto');
    expect(image?.parentElement?.className).toContain('aspect-video');
    expect(image?.className).toContain('object-cover');
    expect(dialog?.textContent).toContain(longChapter.narrative);
    expect(dialog?.querySelector('button')?.textContent).toContain('Continue');
  });
});

describe('chapter introduction game integration', () => {
  it('restores the initially saved run and keeps the Sol 1 intro and event available', async () => {
    authenticateTestUser();
    const savedState = initialSavedMission('initial-restore');
    expect(savedState.activeEvents[0]?.title).toBe('Emergency Supply Inspection');
    expect(saveGame(savedState).status).toBe('saved');

    render(<App />);
    await act(async () => Promise.resolve());

    expect(document.body.textContent).toContain('Saved mission restored.');
    expect(document.body.textContent).toContain('A Fragile Beginning');
    expect(document.body.textContent).toContain('Emergency Supply Inspection');
    expect(document.body.textContent).not.toContain('Choose Your Mission');
  });

  it('keeps mission selection open after choosing New from a restored run', async () => {
    authenticateTestUser();
    const savedState = initialSavedMission('new-mission-after-restore');
    expect(saveGame(savedState).status).toBe('saved');
    completeChapterIntroduction(savedState.gameId, 1);

    render(<App />);
    await act(async () => Promise.resolve());

    expect(document.body.textContent).toContain('Saved mission restored.');
    clickButton('New');
    const confirmation = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(confirmation?.textContent).toContain('Start a new run?');
    expect(confirmation?.textContent).toContain('Sol 1, 0 decisions');
    expect(confirmation?.parentElement).toBe(document.body);
    expect(confirmation?.className).toContain('fixed');
    expect(confirmation?.className).toContain('overflow-y-auto');
    expect(confirmation?.firstElementChild?.className).toContain('max-h-[calc(100vh-2rem)]');

    clickButton('Discard & continue');
    expect(document.body.textContent).toContain('Choose Your Mission');
    expect(document.body.textContent).not.toContain('Saved mission restored.');
  });

  it('allows secondary-page navigation without dropping a pending event or enabling advancement', async () => {
    authenticateTestUser();
    const savedState = initialSavedMission('pending-event-navigation');
    expect(saveGame(savedState).status).toBe('saved');
    completeChapterIntroduction(savedState.gameId, 1);

    render(<App />);
    await act(async () => Promise.resolve());

    const advanceButton = [...document.body.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Advance Day'),
    );
    expect(advanceButton?.hasAttribute('disabled')).toBe(true);

    clickButton('Leaderboard');
    expect(document.body.textContent).toContain('Survival Leaderboard');
    expect(document.body.textContent).not.toContain('CHOOSE YOUR RESPONSE');
    expect(advanceButton?.hasAttribute('disabled')).toBe(true);

    clickButton('Mission Control');
    expect(document.body.textContent).toContain('Emergency Supply Inspection');
    expect(
      [...document.body.querySelectorAll('button')].some((button) =>
        button.textContent?.includes('Inspect Essential Systems'),
      ),
    ).toBe(true);
    expect(advanceButton?.hasAttribute('disabled')).toBe(true);
  });

  it('shows Sol 1 intro before its event can be resolved after mission launch', async () => {
    authenticateTestUser();
    render(<App />);
    await act(async () => Promise.resolve());

    clickButton('Lunar Outpost');
    clickButton('Confirm Mission');
    clickButton('Engineer');
    clickButton('Launch Run');

    const chapterDialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(chapterDialog?.textContent).toContain('A Fragile Beginning');
    expect(document.body.textContent).toContain('Emergency Supply Inspection');
    const launchedGame = loadGame();
    expect(launchedGame.status).toBe('loaded');
    if (launchedGame.status !== 'loaded') return;
    expect(launchedGame.state.mission.missionType).toBe('lunar');
    expect(loadCompletedChapterIntroductions(launchedGame.state.gameId)).toEqual([]);

    // The overlay callback guard must also reject underlying event interactions.
    clickButton('Inspect Essential Systems');
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
      'A Fragile Beginning',
    );

    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'p', bubbles: true }),
    );
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
      'A Fragile Beginning',
    );

    clickButton('Continue');
    expect(loadCompletedChapterIntroductions(launchedGame.state.gameId)).toEqual([1]);
    expect(document.body.textContent).toContain('Emergency Supply Inspection');
    const continuedGame = loadGame();
    expect(continuedGame.status).toBe('loaded');
    if (continuedGame.status === 'loaded') {
      expect(continuedGame.state.day).toBe(1);
      expect(continuedGame.state.history).toHaveLength(0);
      expect(continuedGame.state.activeEvents[0]?.id).toBe(
        'story-sol-01-supply-inspection',
      );
    }
    expect(
      [...document.body.querySelectorAll('button')].some(
        (button) => button.textContent?.includes('Inspect Essential Systems'),
      ),
    ).toBe(true);
  });

  it('restores a completed introduction marker and still displays the active incident', async () => {
    authenticateTestUser();
    const base = freshGame({ gameId: 'restored-intro-complete' });
    const withoutEvent = { ...base, day: 6, activeEvents: [] };
    const event = chapter2EventForDay(6, withoutEvent);
    if (!event) throw new Error('Chapter 2 event for Sol 6 is missing.');
    const savedState = { ...withoutEvent, activeEvents: [event] };
    expect(saveGame(savedState).status).toBe('saved');
    expect(completeChapterIntroduction(savedState.gameId, 2)).toBe(true);

    render(<App />);
    await act(async () => Promise.resolve());

    expect(document.body.textContent).not.toContain('Signals in the Storm');
    expect(document.body.textContent).toContain('Aftermath Assessment');
  });

  it('shows an uncompleted chapter introduction after restoring its opening Sol', async () => {
    authenticateTestUser();
    const base = freshGame({ gameId: 'restored-intro-not-completed' });
    const withoutEvent = { ...base, day: 6, activeEvents: [] };
    const event = chapter2EventForDay(6, withoutEvent);
    if (!event) throw new Error('Chapter 2 event for Sol 6 is missing.');
    expect(saveGame({ ...withoutEvent, activeEvents: [event] }).status).toBe('saved');

    render(<App />);
    await act(async () => Promise.resolve());

    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
      'Signals in the Storm',
    );
    expect(document.body.textContent).toContain('Aftermath Assessment');
  });
});
