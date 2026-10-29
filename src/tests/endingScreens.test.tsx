import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameOver } from '../features/mission/GameOver';
import { MissionComplete } from '../features/mission/MissionComplete';
import { freshGame } from './helpers';
import type { GameState } from '../features/simulation/simulationTypes';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  document.body.style.overflow = '';
});

function render(element: ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(element));
}

function clickButton(label: string): void {
  const button = [...document.body.querySelectorAll('button')].find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!button) throw new Error(`Could not find button "${label}".`);
  act(() => button.click());
}

function failedGame(reason: 'character-died' | 'oxygen-depleted' | 'radiation-lethal'): GameState {
  const base = freshGame();
  return {
    ...base,
    day: 12,
    crew: {
      ...base.crew,
      health: reason === 'character-died' ? 0 : base.crew.health,
      radiationExposure: reason === 'radiation-lethal' ? 100 : base.crew.radiationExposure,
    },
    resources: {
      ...base.resources,
      oxygen: reason === 'oxygen-depleted' ? 0 : base.resources.oxygen,
    },
    mission: { ...base.mission, status: 'failed', score: 73.6 },
  };
}

describe('MissionComplete', () => {
  it('shows the success artwork, heading, statistics and both existing actions', () => {
    const base = freshGame();
    const state: GameState = {
      ...base,
      day: 30,
      mission: { ...base.mission, status: 'completed', score: 92.4 },
    };
    const onViewDebrief = vi.fn();
    const onNewRun = vi.fn();
    render(
      <MissionComplete
        state={state}
        onViewDebrief={onViewDebrief}
        onNewRun={onNewRun}
      />,
    );

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const panel = dialog?.firstElementChild as HTMLElement | null;
    const image = dialog?.querySelector<HTMLImageElement>('img');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.querySelectorAll('h2')).toHaveLength(1);
    expect(dialog?.querySelector('h2')?.textContent).toBe('MISSION COMPLETED');
    expect(image?.getAttribute('src')).toBe('/endings/mission-success.png');
    expect(image?.className).toContain('object-cover');
    expect(image?.parentElement?.className).toContain('aspect-[4/1]');
    expect(dialog?.textContent).toContain('Occupation');
    expect(dialog?.textContent).toContain('Sols Survived');
    expect(dialog?.textContent).toContain('30');
    expect(dialog?.textContent).toContain('Final Score');
    expect(dialog?.textContent).toContain('92');
    expect(dialog?.textContent).toContain('Review how your decisions helped the mission succeed.');
    expect(panel?.className).toContain('max-h-[calc(100dvh-1.5rem)]');
    expect(panel?.className).toContain('overflow-y-auto');
    expect(document.body.style.overflow).toBe('hidden');
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>('button');
    expect([...(buttons ?? [])].map((button) => button.textContent?.trim())).toEqual([
      'View Debrief',
      'New Run',
    ]);
    expect(buttons?.[0]?.className).toContain('max-w-[272px]');
    expect(buttons?.[0]?.className).toContain('min-h-11');

    clickButton('View Debrief');
    clickButton('New Run');
    expect(onViewDebrief).toHaveBeenCalledOnce();
    expect(onNewRun).toHaveBeenCalledOnce();
  });

  it('traps keyboard focus, blocks Escape dismissal, and restores focus and scrolling', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const base = freshGame();
    render(
      <MissionComplete
        state={{ ...base, day: 30, mission: { ...base.mission, status: 'completed' } }}
        onViewDebrief={() => {}}
        onNewRun={() => {}}
      />,
    );

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>('button');
    expect(document.activeElement).toBe(buttons?.[0]);

    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    buttons?.[0]?.dispatchEvent(shiftTab);
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons?.[1]);

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    dialog?.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    act(() => root?.unmount());
    root = undefined;
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('GameOver', () => {
  it.each([
    ['character-died', 'Your character succumbed to their injuries. Health reached zero.'],
    ['oxygen-depleted', 'The outpost ran out of breathable oxygen.'],
    ['radiation-lethal', 'Your character absorbed a lethal dose of radiation.'],
  ] as const)('shows the failure artwork and %s reason with the reached-Sol statistic', (reason, text) => {
    const state = failedGame(reason);
    const onRestartSame = vi.fn();
    const onNewRun = vi.fn();
    const onViewDebrief = vi.fn();
    render(
      <GameOver
        state={state}
        onRestartSame={onRestartSame}
        onNewRun={onNewRun}
        onViewDebrief={onViewDebrief}
      />,
    );

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const panel = dialog?.firstElementChild as HTMLElement | null;
    const image = dialog?.querySelector<HTMLImageElement>('img');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.querySelectorAll('h2')).toHaveLength(1);
    expect(dialog?.querySelector('h2')?.textContent).toBe('MISSION FAILED');
    expect(image?.getAttribute('src')).toBe('/endings/mission-failure.png');
    expect(image?.className).toContain('object-cover');
    expect(image?.parentElement?.className).toContain('aspect-[4/1]');
    expect(dialog?.textContent).toContain(text);
    expect(dialog?.textContent).toContain('Occupation');
    expect(dialog?.textContent).toContain('Final Sol Reached');
    expect(dialog?.textContent).toContain('12');
    expect(dialog?.textContent).toContain('Final Score');
    expect(dialog?.textContent).toContain('74');
    expect(dialog?.textContent).toContain('Review your decisions, adjust your plan, and try again.');
    expect(panel?.className).toContain('max-h-[calc(100dvh-1.5rem)]');
    expect(panel?.className).toContain('overflow-y-auto');
    expect(panel?.className).toContain('border-status-critical/35');
    expect(document.body.style.overflow).toBe('hidden');
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>('button');
    expect([...(buttons ?? [])].map((button) => button.textContent?.trim())).toEqual([
      'Retry Mission',
      'Choose Occupation',
      'View Debrief',
    ]);
    expect([...(buttons ?? [])].every((button) =>
      button.className.includes('max-w-[272px]') && button.className.includes('min-h-11'),
    )).toBe(true);

    clickButton('Retry Mission');
    clickButton('Choose Occupation');
    clickButton('View Debrief');
    expect(onRestartSame).toHaveBeenCalledOnce();
    expect(onNewRun).toHaveBeenCalledOnce();
    expect(onViewDebrief).toHaveBeenCalledOnce();
  });

  it('keeps focus within the failure dialog and prevents Escape dismissal', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    render(
      <GameOver
        state={failedGame('oxygen-depleted')}
        onRestartSame={() => {}}
        onNewRun={() => {}}
        onViewDebrief={() => {}}
      />,
    );

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>('button');
    expect(document.activeElement).toBe(buttons?.[0]);

    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    buttons?.[0]?.dispatchEvent(shiftTab);
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons?.[2]);

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    dialog?.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    act(() => root?.unmount());
    root = undefined;
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
