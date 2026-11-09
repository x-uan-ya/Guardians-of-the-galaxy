import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlayHistory } from '../features/history/PlayHistory';
import {
  getPlayHistory,
  MAX_HISTORY_ROWS,
  recordRun,
  summariseHistory,
} from '../features/history/historyService';
import { applyPlayerDecision } from '../features/simulation/simulationEngine';
import { freshGame } from './helpers';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const USERS_KEY = 'mars-outpost-users';
const SESSION_KEY = 'mars-outpost-session';

function user(id: string, email: string) {
  return { id, email, passwordHash: 'x', securityQuestions: [], createdAt: new Date().toISOString() };
}
function signInAs(id: string): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: id, timestamp: Date.now() }));
}

/** A run with `n` decisions made. */
function played(gameId: string, n = 1) {
  let state = freshGame({ gameId });
  for (let i = 0; i < n; i += 1) {
    state = applyPlayerDecision(state, { actionId: 'routine-operations', playerChoice: 'self-directed' });
  }
  return state;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(USERS_KEY, JSON.stringify([user('acc1', 'one@gmail.com'), user('acc2', 'two@gmail.com')]));
  signInAs('acc1');
});

afterEach(() => localStorage.clear());

describe('play history storage', () => {
  it('records the score of each finished run, newest first', () => {
    const a = played('a', 2);
    const b = played('b', 3);
    recordRun(a, 'failed', 1000);
    recordRun(b, 'completed', 2000);

    const rows = getPlayHistory();
    expect(rows.map((r) => r.id)).toEqual(['run_b', 'run_a']);
    expect(rows[0]).toMatchObject({
      outcome: 'completed',
      score: Math.round(b.mission.score),
      sols: b.day,
      decisions: 3,
      missionType: 'mars',
      occupation: 'engineer',
    });
    expect(rows[1]).toMatchObject({ outcome: 'failed', decisions: 2 });
  });

  it('keeps one row per run and never changes a finished result', () => {
    const run = played('same');
    recordRun(run, 'failed', 1000);
    recordRun(run, 'completed', 2000);
    recordRun(run, 'abandoned', 3000);
    const rows = getPlayHistory();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ outcome: 'failed', timestamp: 1000 });
  });

  it('records a run that was left early, but not one that never started', () => {
    expect(recordRun(freshGame({ gameId: 'empty' }), 'abandoned')).toBeNull();
    expect(getPlayHistory()).toHaveLength(0);

    recordRun(played('left'), 'abandoned', 500);
    expect(getPlayHistory()[0]).toMatchObject({ id: 'run_left', outcome: 'abandoned' });
  });

  it('is private to the signed-in account', () => {
    recordRun(played('mine'), 'completed', 1);
    signInAs('acc2');
    expect(getPlayHistory()).toHaveLength(0);
    recordRun(played('theirs'), 'failed', 2);
    expect(getPlayHistory().map((r) => r.id)).toEqual(['run_theirs']);
    signInAs('acc1');
    expect(getPlayHistory().map((r) => r.id)).toEqual(['run_mine']);
  });

  it('keeps only the newest rows', () => {
    for (let i = 0; i < MAX_HISTORY_ROWS + 5; i += 1) recordRun(played(`g${i}`), 'failed', 1000 + i);
    const rows = getPlayHistory();
    expect(rows).toHaveLength(MAX_HISTORY_ROWS);
    expect(rows[0]?.id).toBe(`run_g${MAX_HISTORY_ROWS + 4}`);
  });

  it('ignores damaged storage instead of crashing', () => {
    localStorage.setItem(
      Object.keys(localStorage).find((k) => k.includes('play-history')) ?? 'mars-outpost-zero:play-history:v1:user:acc1',
      '{not json'
    );
    expect(getPlayHistory()).toEqual([]);
    localStorage.setItem('mars-outpost-zero:play-history:v1:user:acc1', JSON.stringify([{ id: 1 }, null, 'x']));
    expect(getPlayHistory()).toEqual([]);
  });

  it('summarises best, average and survived', () => {
    const base = { missionType: 'mars', occupation: 'engineer', decisions: 1, timestamp: 1, sols: 5 } as const;
    const summary = summariseHistory([
      { ...base, id: 'a', score: 100, outcome: 'failed' },
      { ...base, id: 'b', score: 300, outcome: 'completed' },
      { ...base, id: 'c', score: 200, outcome: 'abandoned' },
    ]);
    expect(summary).toEqual({ runs: 3, best: 300, average: 200, survived: 1, bestId: 'b' });
    expect(summariseHistory([])).toMatchObject({ runs: 0, best: 0, bestId: null });
  });
});

describe('PlayHistory page', () => {
  let root: ReturnType<typeof createRoot> | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = undefined;
  });

  function mount(state = freshGame()): HTMLDivElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root?.render(<PlayHistory state={state} />));
    return container;
  }

  it('shows an empty message before any run when nothing is in progress', () => {
    const base = freshGame();
    const ended = { ...base, mission: { ...base.mission, status: 'failed' as const } };
    const view = mount(ended);
    expect(view.textContent).toContain('No runs yet');
    expect(view.querySelectorAll('[data-history-row]')).toHaveLength(0);
  });

  it('shows the run in progress with a hint when there is no earlier run', () => {
    const view = mount();
    expect(view.querySelectorAll('[data-history-row]')).toHaveLength(1);
    expect(view.textContent).toContain('In progress');
    expect(view.textContent).toContain('Your earlier runs will appear here');
  });

  it('lists every run with its score, plus the run in progress', () => {
    const first = played('first', 2);
    recordRun(first, 'failed', 1000);
    recordRun(played('second', 3), 'completed', 2000);
    const view = mount(played('current', 1));

    const rows = view.querySelectorAll('[data-history-row]');
    expect(rows).toHaveLength(3);
    const text = view.textContent ?? '';
    expect(text).toContain('In progress');
    expect(text).toContain('Survived');
    expect(text).toContain('Lost');
    expect(text).toContain(String(Math.round(first.mission.score)));
    expect(text).toContain('Runs played');
    expect(text).toContain('Best score');
  });

  it('does not show a finished run twice', () => {
    const state = played('done');
    recordRun(state, 'failed', 1);
    const view = mount(state);
    expect(view.querySelectorAll('[data-history-row]')).toHaveLength(1);
  });
});
