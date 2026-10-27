import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ResupplyModal } from '../features/mission/ResupplyModal';
import { useGameState, type UseGameState } from '../hooks/useGameState';
import { saveGame } from '../lib/storage';
import { createInitialGameState } from '../features/simulation/simulationEngine';
import { FIXED_CONFIG } from './helpers';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  container?.remove();
  root = undefined;
  container = undefined;
  document.body.style.overflow = '';
  window.localStorage.clear();
});

describe('ResupplyModal viewport layout', () => {
  it('portals to the viewport, contains scrolling, and keeps the page from scrolling', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<ResupplyModal day={15} onClose={() => undefined} />);
    });

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const panel = dialog?.querySelector<HTMLElement>('.max-w-sm');
    expect(dialog?.parentElement).toBe(document.body);
    expect(dialog?.className).toContain('fixed');
    expect(dialog?.className).toContain('inset-0');
    expect(dialog?.className).toContain('overflow-y-auto');
    expect(panel?.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(panel?.className).toContain('overflow-y-auto');
    expect(dialog?.textContent).toContain('Continue');
    expect(document.body.style.overflow).toBe('hidden');

    act(() => root?.unmount());
    root = undefined;
    expect(document.body.style.overflow).toBe('');
  });
});

describe('resupply notification lifecycle', () => {
  it('clears the previous run notification when starting Deep Space', async () => {
    window.localStorage.clear();
    const savedState = {
      ...createInitialGameState(FIXED_CONFIG),
      day: 14,
      activeEvents: [],
    };
    expect(saveGame(savedState).status).toBe('saved');

    let game: UseGameState | undefined;
    function Probe(): ReactElement | null {
      game = useGameState();
      return null;
    }

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<Probe />);
    });
    expect(game?.state.day).toBe(14);

    await act(async () => {
      game?.advanceDay();
    });
    expect(game?.resupplyDeliveredOnDay).toBe(15);

    await act(async () => {
      game?.startNewMission({
        ...FIXED_CONFIG,
        missionType: 'deep-space',
      });
    });
    expect(game?.state.mission.missionType).toBe('deep-space');
    expect(game?.state.mission.modifiers.noResupply).toBe(true);
    expect(game?.resupplyDeliveredOnDay).toBeNull();
  });
});
