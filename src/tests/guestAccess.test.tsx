import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { Login } from '../features/auth/Login';
import { getCurrentSession, login, logout, signup } from '../features/auth/authService';
import {
  endGuestSession,
  getGuestId,
  getOrCreateGuestId,
  startGuestSession,
} from '../features/auth/guestSession';
import { LEADERBOARD_KEY } from '../features/leaderboard/leaderboardService';
import { advanceSimulationDay, applyPlayerDecision } from '../features/simulation/simulationEngine';
import { markTutorialComplete } from '../features/tutorial/tutorialService';
import { freshGame } from './helpers';
import { loadGame, saveGame, STORAGE_KEY } from '../lib/storage';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const GUEST_ID_KEY = 'mars-outpost-guest-id';
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
  endGuestSession();
  localStorage.clear();
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  endGuestSession();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function render(element: ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(element));
}

async function flushEffects(): Promise<void> {
  await act(async () => Promise.resolve());
}

function clickButton(label: string): void {
  const button = [...document.body.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Could not find button "${label}".`);
  act(() => button.click());
}

function stubOfflineFetch() {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.reject(new Error('offline')));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('guest access', () => {
  it('shows an accessible guest option without removing registered login and recovery actions', () => {
    const onContinueAsGuest = vi.fn();
    render(
      <Login
        onLoginSuccess={() => {}}
        onSwitchToSignup={() => {}}
        onContinueAsGuest={onContinueAsGuest}
      />,
    );

    const guestButton = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Continue as Guest',
    );
    expect(guestButton?.type).toBe('button');
    expect(document.body.textContent).toContain('Log In');
    expect(document.body.textContent).toContain('Sign Up');
    expect(document.body.textContent).toContain('Forgot Email?');
    expect(document.body.textContent).toContain('Forgot Password?');

    act(() => guestButton?.click());
    expect(onContinueAsGuest).toHaveBeenCalledTimes(1);
  });

  it('creates one stable local guest id without creating a registered session', () => {
    const first = getOrCreateGuestId();
    expect(first).toMatch(/^guest_/);
    expect(localStorage.getItem(GUEST_ID_KEY)).toBe(first);
    expect(getOrCreateGuestId()).toBe(first);
    expect(getGuestId()).toBe(first);
    expect(getCurrentSession()).toBeNull();
  });

  it('uses the guest id for tutorial completion when the same guest returns', async () => {
    stubOfflineFetch();
    const guestId = getOrCreateGuestId();
    markTutorialComplete(guestId);

    render(<App />);
    await flushEffects();
    clickButton('Continue as Guest');
    clickButton('Start Mission');

    expect(document.body.textContent).toContain('Choose Your Mission');
    expect(document.body.textContent).not.toContain('Skip tutorial');
  });

  it('enters as a guest, saves on logout, and resumes the same browser save on re-entry', async () => {
    stubOfflineFetch();
    const guestId = startGuestSession();
    expect(saveGame(freshGame({ gameId: 'guest-resume-test' })).status).toBe('saved');
    endGuestSession();

    render(<App />);
    await flushEffects();
    expect(document.body.textContent).toContain('Log In');

    clickButton('Continue as Guest');
    await flushEffects();
    expect(document.body.textContent).toContain('Saved mission restored.');
    expect(document.body.textContent).toContain('Logout');

    clickButton('Logout');
    clickButton('Log Out');
    expect(document.body.textContent).toContain('Log In');
    expect(getGuestId()).toBe(guestId);
    expect(localStorage.getItem(`${STORAGE_KEY}:guest:${guestId}`)).not.toBeNull();

    clickButton('Continue as Guest');
    await flushEffects();
    expect(document.body.textContent).toContain('Saved mission restored.');
    expect(document.body.textContent).toContain('Logout');
    const resumed = loadGame();
    expect(resumed.status === 'loaded' && resumed.state.gameId).toBe('guest-resume-test');
  });

  it('does not send guest saves or completed runs to account or leaderboard APIs', async () => {
    const fetchMock = stubOfflineFetch();
    startGuestSession();
    let completed = applyPlayerDecision(freshGame({ gameId: 'guest-no-score' }), {
      actionId: 'routine-operations',
      playerChoice: 'self-directed',
    });
    completed = {
      ...completed,
      day: 29,
      activeEvents: [],
      mission: { ...completed.mission, status: 'active' as const },
    };
    completed = advanceSimulationDay(completed).state;
    expect(completed.mission.status).toBe('completed');
    expect(saveGame(completed).status).toBe('saved');
    expect(fetchMock.mock.calls).toHaveLength(0);

    endGuestSession();
    render(<App />);
    await flushEffects();
    clickButton('Continue as Guest');
    await flushEffects();
    const apiCalls = fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url),
      method: init?.method ?? 'GET',
    }));
    expect(apiCalls.some(({ url }) => url.includes('/api/state'))).toBe(false);
    expect(apiCalls.some(({ url }) => url.includes('/api/leaderboard'))).toBe(false);
    expect(apiCalls.some(({ url, method }) => url.includes('/api/users') && method === 'POST')).toBe(false);
    expect(localStorage.getItem(LEADERBOARD_KEY)).toBeNull();
  });
});

describe('registered authentication remains unchanged', () => {
  it('keeps signup, logout, and login using the registered session', () => {
    stubOfflineFetch();
    const result = signup({
      email: 'registered@example.test',
      password: 'mars-password',
      confirmPassword: 'mars-password',
      securityQuestions: [
        { question: 'Question one?', answer: 'First answer' },
        { question: 'Question two?', answer: 'Second answer' },
      ],
    });
    expect(result.success).toBe(true);
    expect(getCurrentSession()?.id).toBe(result.user?.id);

    logout();
    expect(getCurrentSession()).toBeNull();
    const loginResult = login({ email: 'registered@example.test', password: 'mars-password' });
    expect(loginResult.success).toBe(true);
    expect(getCurrentSession()?.id).toBe(result.user?.id);
  });
});
