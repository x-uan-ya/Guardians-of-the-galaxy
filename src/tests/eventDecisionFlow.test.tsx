import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { createInitialGameState } from '../features/simulation/simulationEngine';
import {
  completeChapterIntroduction,
  saveGame,
} from '../lib/storage';

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

function clickButton(label: string, lastMatch = false): void {
  const matches = [...document.body.querySelectorAll('button')].filter(
    (candidate) => candidate.textContent?.trim().includes(label),
  );
  const button = lastMatch ? matches[matches.length - 1] : matches[0];
  if (!button) throw new Error(`Could not find button "${label}".`);
  act(() => button.click());
}

function authenticateTestUser(): void {
  window.localStorage.setItem(
    'mars-outpost-users',
    JSON.stringify([{
      id: 'event-decision-test-user',
      email: 'event-decision@example.test',
      passwordHash: 'unused',
      securityQuestions: [],
      createdAt: new Date(0).toISOString(),
    }]),
  );
  window.localStorage.setItem(
    'mars-outpost-session',
    JSON.stringify({ userId: 'event-decision-test-user', timestamp: Date.now() }),
  );
}

function prepareSavedMission(gameId: string, completeIntro: boolean) {
  const state = createInitialGameState({
    missionType: 'mars',
    occupation: 'engineer',
    objective: 'survival',
    operatingPhilosophy: 'balanced',
    startingCondition: 'standard',
    gameId,
    now: 1_700_000_000_000,
  });
  if (saveGame(state).status !== 'saved') throw new Error('Could not save test mission.');
  if (completeIntro) completeChapterIntroduction(state.gameId, 1);
  return state;
}

async function restoreApp(): Promise<void> {
  render(<App />);
  await act(async () => Promise.resolve());
}

function expectInitialMetrics(state: ReturnType<typeof prepareSavedMission>): void {
  const hud = document.querySelector<HTMLElement>('[aria-label="Survival resources"]');
  expect(hud?.textContent).toContain(`${Math.round(state.resources.power)}%`);
  expect(document.querySelector('[title="Life Support"]')?.textContent).toContain(
    `${Math.round(state.systems.lifeSupportEfficiency)}%`,
  );
}

function expectCommittedInspection(state: ReturnType<typeof prepareSavedMission>): void {
  const hud = document.querySelector<HTMLElement>('[aria-label="Survival resources"]');
  expect(hud?.textContent).toContain(`${Math.round(state.resources.power - 4)}%`);
  expect(document.querySelector('[title="Life Support"]')?.textContent).toContain(
    `${Math.round(state.systems.lifeSupportEfficiency + 3)}%`,
  );
  expect(document.querySelector('[aria-live="assertive"]')).toBeNull();
}

describe('shared event decision confirmation', () => {
  it('reviews Mission Tablet choices, allows reconsideration, and applies a double-confirmed action once', async () => {
    authenticateTestUser();
    const savedState = prepareSavedMission('tablet-event-review', true);
    await restoreApp();

    clickButton('Inspect Essential Systems');
    let dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.textContent).toContain('Review your decision');
    expect(dialog?.textContent).toContain('Inspect Essential Systems');
    expect(dialog?.textContent).toContain('Spend energy checking life-support equipment');
    expect(dialog?.querySelector('[aria-label="Immediate effects"]')?.textContent).toContain(
      'Power-4',
    );
    expect(dialog?.querySelector('[aria-label="Immediate effects"]')?.textContent).toContain(
      'Life Support+3',
    );
    expect(document.body.textContent).toContain('Emergency Supply Inspection');
    expectInitialMetrics(savedState);

    clickButton('Reconsider');
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.querySelector('[aria-live="assertive"]')).not.toBeNull();
    expectInitialMetrics(savedState);

    clickButton('Inspect Essential Systems');
    const confirmButton = [...document.body.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Confirm choice'),
    );
    if (!confirmButton) throw new Error('Could not find the confirmation button.');
    act(() => {
      confirmButton.click();
      confirmButton.click();
    });

    dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).toBeNull();
    expectCommittedInspection(savedState);
    expect(document.body.querySelector('[role="tabpanel"]')?.textContent).toContain(
      'Inspect Essential Systems',
    );
  });

  it('routes Classic OperationsPanel event responses through the same review before applying them', async () => {
    authenticateTestUser();
    const savedState = prepareSavedMission('classic-event-review', true);
    await restoreApp();

    const summary = [...document.body.querySelectorAll('summary')].find((item) =>
      item.textContent?.includes('Classic dashboard panels'),
    );
    if (!summary) throw new Error('Could not find the Classic dashboard panels section.');
    act(() => summary.click());
    clickButton('Inspect Essential Systems', true);

    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
      'Review your decision',
    );
    expectInitialMetrics(savedState);
    expect(document.body.querySelector('[aria-live="assertive"]')).not.toBeNull();

    clickButton('Confirm choice');

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expectCommittedInspection(savedState);
    expect(document.body.textContent).not.toContain('Emergency Supply Inspection');
  });

  it('keeps the Chapter 1 introduction above the review until the player continues', async () => {
    authenticateTestUser();
    const savedState = prepareSavedMission('intro-before-event-review', false);
    await restoreApp();

    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
      'A Fragile Beginning',
    );
    clickButton('Inspect Essential Systems');
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
      'A Fragile Beginning',
    );
    expect(document.body.textContent).not.toContain('Review your decision');
    expectInitialMetrics(savedState);

    clickButton('Continue');
    clickButton('Inspect Essential Systems');
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
      'Review your decision',
    );
    expect(document.body.textContent).toContain('Emergency Supply Inspection');
    expectInitialMetrics(savedState);
  });
});
