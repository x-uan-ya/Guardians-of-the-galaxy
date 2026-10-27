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

  it('keeps chapter titles shared and appends the selected mission context', () => {
    const lunar = getChapterIntroductionByOpeningSol(16, 'lunar');
    const mars = getChapterIntroductionByOpeningSol(16, 'mars');
    const deepSpace = getChapterIntroductionByOpeningSol(16, 'deep-space');

    expect(lunar?.title).toBe(mars?.title);
    expect(mars?.title).toBe(deepSpace?.title);
    expect(new Set([lunar?.narrative, mars?.narrative, deepSpace?.narrative]).size).toBe(3);
    expect(lunar?.narrative).toContain('lunar terrain');
    expect(deepSpace?.narrative).toContain('isolated habitat');
  });
});

describe('ChapterIntroModal', () => {
  it('keeps Escape from completing the intro and completes only on an explicit button click', () => {
    const chapter = getChapterIntroductionByOpeningSol(1)!;
    let continued = 0;
    let skipped = 0;
    render(
      <ChapterIntroModal
        chapter={chapter}
        onContinue={() => {
          continued += 1;
        }}
        onSkipIntro={() => {
          skipped += 1;
        }}
      />,
    );

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement?.textContent).toContain('Continue');
    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(continued).toBe(0);
    expect(skipped).toBe(0);

    clickButton('Skip Intro');
    expect(skipped).toBe(1);
    expect(continued).toBe(0);
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
