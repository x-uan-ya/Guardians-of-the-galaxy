import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { actionPreview } from '../features/dashboard/bunker/actionPreview';
import { BunkerGame } from '../features/dashboard/bunker/BunkerGame';
import { PreviewMetric } from '../features/dashboard/bunker/PreviewMetric';
import { getFreeActions, applyPlayerDecision, advanceSimulationDay } from '../features/simulation/simulationEngine';
import type { EventAction } from '../features/events/eventTypes';
import type { GameState } from '../features/simulation/simulationTypes';
import { EVENT_CATALOG } from '../features/events/eventCatalog';
import { useGameState, type UseGameState } from '../hooks/useGameState';
import { saveGame } from '../lib/storage';
import { freshGame } from './helpers';
import { applyResourceChanges, applyCrewChanges, applySystemChanges } from '../features/simulation/resourceCalculations';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const ration = getFreeActions().find((action) => action.id === 'ration-supplies')!;
const maintenance = getFreeActions().find((action) => action.id === 'maintenance-shift')!;

function setup() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
}
function click(text: string) {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')]
    .find((candidate) => candidate.textContent?.includes(text));
  if (!button) throw new Error(`Missing button: ${text}`);
  act(() => button.click());
}
function mount(state = freshGame()) {
  setup();
  const onDecide = vi.fn();
  const onAdvanceDay = vi.fn();
  const render = (next = state) => act(() => root?.render(<BunkerGame state={next}
    activity={[]} onDecide={onDecide} onAdvanceDay={onAdvanceDay} />));
  render();
  return { state, render, onDecide, onAdvanceDay };
}

describe('immediate action projection', () => {
  it('reads the real definitions, starts from actual state and never changes it', () => {
    const state = freshGame();
    const before = JSON.stringify(state);
    const first = actionPreview(state, ration)!;
    expect(first.resources.food?.projected).toBe(state.resources.food + 3);
    expect(first.resources.water?.change).toBe(2);
    expect(first.crew.morale?.change).toBe(-3);
    const second = actionPreview(state, maintenance)!;
    expect(second.resources.food).toBeUndefined();
    expect(second.crew.morale?.projected).toBe(state.crew.morale - 2);
    expect(second.systems.lifeSupportEfficiency?.change).toBe(3);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('matches engine immediate results for all current planned actions', () => {
    for (const action of getFreeActions()) {
      const state = freshGame();
      const projected = actionPreview(state, action)!;
      const committed = applyPlayerDecision(state, { actionId: action.id, playerChoice: 'self-directed' });
      for (const group of ['resources', 'crew', 'systems'] as const) {
        for (const [key, metric] of Object.entries(projected[group])) {
          expect(metric.projected).toBe((committed[group] as unknown as Record<string, number>)[key]);
        }
      }
    }
  });

  it('clamps at capacity and displays achievable changes including zero', () => {
    const state = freshGame();
    state.resources.food = 99;
    state.resources.water = 100;
    state.crew.morale = 1;
    const preview = actionPreview(state, ration)!;
    expect(preview.resources.food).toMatchObject({ current: 99, projected: 100, change: 1, tone: 'good' });
    expect(preview.resources.water).toMatchObject({ projected: 100, change: 0, tone: 'neutral' });
    expect(preview.crew.morale).toMatchObject({ projected: 0, change: -1, tone: 'bad' });
  });

  it('supports every metric category and reverses radiation colours', () => {
    const state = freshGame();
    state.crew.radiationExposure = 20;
    const action: EventAction = { id: 'test', label: 'Test', description: '', effect: {
      immediateResources: { oxygen: -5, power: 4 },
      immediateCrew: { health: 10, radiationExposure: 5 },
      immediateSystems: { shieldingIntegrity: -4, foodProduction: 2 },
    } };
    const preview = actionPreview(state, action)!;
    expect(preview.resources.oxygen?.tone).toBe('bad');
    expect(preview.resources.power?.tone).toBe('good');
    expect(preview.crew.health?.tone).toBe('good');
    expect(preview.crew.radiationExposure?.tone).toBe('bad');
    expect(preview.systems.shieldingIntegrity?.tone).toBe('bad');
    expect(preview.systems.foodProduction?.tone).toBe('good');
    action.effect.immediateCrew = { radiationExposure: -5 };
    expect(actionPreview(state, action)?.crew.radiationExposure?.tone).toBe('good');
  });

  it('excludes delayed effects and marks malformed immediate values unavailable', () => {
    const state = freshGame();
    const action: EventAction = { id: 'test', label: 'Test', description: '', effect: {
      immediateResources: { food: NaN },
      delayed: [{ delayInDays: 1, description: 'Later', parameters: { kind: 'crew', changes: { health: 10 } } }],
    } };
    expect(actionPreview(state, action)).toMatchObject({ resources: {}, crew: {}, delayed: 1, uncertain: true });
  });

  it('has no projection for unknown actions, emergencies and terminal missions', () => {
    const state = freshGame();
    expect(actionPreview(state, undefined)).toBeNull();
    state.activeEvents = [EVENT_CATALOG[0]!];
    expect(actionPreview(state, ration)).toBeNull();
    state.activeEvents = [];
    for (const status of ['failed', 'completed'] as const) {
      state.mission.status = status;
      expect(actionPreview(state, ration)).toBeNull();
    }
  });
});

describe('planned action display', () => {
  it('updates the existing HUD and facility panel, switches from actual state, and clears', () => {
    const state = freshGame();
    state.resources.food = 60;
    state.resources.water = 50;
    state.crew.morale = 74;
    const before = JSON.stringify(state);
    const { onDecide, onAdvanceDay } = mount(state);
    click('Ration supplies');
    expect([...container.querySelectorAll('.bunker-preview-number')].map((node) => node.getAttribute('aria-label')))
      .toContain('Current 60 percent; projected 63 percent; change +3');
    expect(container.querySelector('[aria-label="Food projected after planned action"]')?.getAttribute('aria-valuenow')).toBe('63');
    expect(container.textContent).toContain('Immediate action effects only');
    expect(container.querySelectorAll('.bunker-hud-preview-label')).toHaveLength(1);
    expect(container.querySelector('.bunker-hud-preview-label')?.textContent).toContain('Preview Mode');
    expect(container.querySelector('.bunker-preview-card')?.getAttribute('data-preview-tone')).toBeNull();
    expect(container.querySelectorAll('[aria-label="Survival resources"]')).toHaveLength(1);
    act(() => container.querySelectorAll<HTMLButtonElement>('.bunker-hotspot')[2]!.click());
    expect(container.querySelectorAll('[aria-label="Food projected after planned action"]')).toHaveLength(2);
    click('Mission');
    click('Maintenance shift');
    expect(container.querySelector('[aria-label="Current 74 percent; projected 72 percent; change -2"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Food projected after planned action"]')).toBeNull();
    click('Maintenance shift');
    expect(container.querySelector('.bunker-preview-number')).toBeNull();
    expect(container.querySelector('.bunker-hud-preview-label')).toBeNull();
    expect(onDecide).not.toHaveBeenCalled();
    expect(onAdvanceDay).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each(['emergency', 'failed', 'completed', 'day', 'mission'] as const)('clears the preview on %s', (reason) => {
    const { state, render } = mount();
    click('Ration supplies');
    expect(container.querySelector('.bunker-preview-number')).not.toBeNull();
    let next: GameState = { ...state };
    if (reason === 'emergency') next = { ...next, activeEvents: [EVENT_CATALOG[0]!] };
    else if (reason === 'day') next = { ...next, day: state.day + 1 };
    else if (reason === 'mission') next = { ...next, gameId: 'another-game' };
    else next = { ...next, mission: { ...next.mission, status: reason } };
    render(next);
    expect(container.querySelector('.bunker-preview-number')).toBeNull();
    render(state);
    expect(container.querySelector('.bunker-preview-number')).toBeNull();
  });

  it('recomputes from incoming state without stacking the old preview', () => {
    const { state, render } = mount();
    click('Ration supplies');
    render({ ...state, resources: { ...state.resources, food: 40 } });
    expect([...container.querySelectorAll('.bunker-preview-number')].map((node) => node.getAttribute('aria-label')))
      .toContain('Current 40 percent; projected 43 percent; change +3');
  });

  it('respects reduced motion and shows exact projected values immediately', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    setup();
    const preview = { current: 60, projected: 63, change: 3, tone: 'good' as const };
    act(() => root?.render(<PreviewMetric value={60} preview={preview} />));
    expect(container.textContent).toBe('63%');
    expect(raf).not.toHaveBeenCalled();
  });

  it('animates the projected number to its exact target', () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1; });
    setup();
    act(() => root?.render(<PreviewMetric value={60} preview={{ current: 60, projected: 63, change: 3, tone: 'good' }} />));
    expect(container.textContent).toBe('60%');
    act(() => frame?.(performance.now() + 500));
    expect(container.textContent).toBe('63%');
  });

  it('rounds only visible percentages and preserves fractional projection and bar precision', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const state = freshGame();
    state.resources.food = 60.37;
    state.crew.morale = 74.62;
    const before = JSON.stringify(state);
    mount(state);
    click('Ration supplies');
    const food = [...container.querySelectorAll<HTMLElement>('.bunker-preview-number')]
      .find((node) => node.getAttribute('aria-label')?.startsWith('Current 60.37 percent'))!;
    expect(food.textContent).toBe('63%');
    expect(food.textContent).not.toContain('→');
    expect(food.textContent).not.toContain('+3');
    expect(container.querySelector('[aria-label="Food projected after planned action"] > div')?.getAttribute('style')).toContain('63.37%');
    expect(actionPreview(state, ration)?.resources.food?.projected).toBe(63.37);
    expect(JSON.stringify(state)).toBe(before);
    click('Ration supplies');
    expect(container.querySelector('.bunker-hud-preview-label')).toBeNull();
    expect(container.querySelectorAll('.bunker-preview-card')[2]?.textContent).toContain('60%');
  });
});

describe('End Sol regression', () => {
  it('separates planned and daily effects, then applies an incident response only once', () => {
    expect(saveGame(freshGame()).status).toBe('saved');
    let game: UseGameState | undefined;
    function Harness() {
      game = useGameState();
      return <BunkerGame state={game.state} activity={game.activity} onDecide={game.decide} onAdvanceDay={game.advanceDay} />;
    }
    setup();
    act(() => root?.render(<Harness />));
    const initial = game!.state;
    click('Ration supplies');
    expect(game!.state).toBe(initial);
    const afterAction = applyPlayerDecision(initial, { actionId: ration.id, playerChoice: 'self-directed' });
    expect(afterAction.resources).toEqual(applyResourceChanges(initial.resources, ration.effect.immediateResources ?? {}));
    expect(afterAction.crew).toEqual(applyCrewChanges(initial.crew, ration.effect.immediateCrew ?? {}));
    const advance = advanceSimulationDay(afterAction);
    expect(advance.firedEffects).toHaveLength(0);
    expect(advance.resupplyFired).toBe(false);
    expect(advance.state.resources).toEqual(applyResourceChanges(afterAction.resources, advance.dailyDelta));
    click('Do "Ration supplies"');
    expect(game!.state.resources).toEqual(advance.state.resources);
    expect(game!.state.crew).toEqual(advance.state.crew);
    expect(game!.state.systems).toEqual(advance.state.systems);
    expect(game!.state.history).toHaveLength(initial.history.length + 1);
    expect(game!.state.activeEvents).toHaveLength(1);
    expect(game!.state.history.filter((entry) => entry.actionId === ration.id)).toHaveLength(1);
    const pending = game!.state;
    const incident = pending.activeEvents[0]!;
    const response = incident.availableActions.find((action) =>
      Object.values(action.effect.immediateResources ?? {}).some((delta) => delta !== 0))!;
    expect(response).toBeDefined();
    act(() => game!.resolveActiveEvent(incident.id, response.id));
    const resolved = game!.state;
    expect(resolved.resources).toEqual(applyResourceChanges(pending.resources, response.effect.immediateResources ?? {}));
    expect(resolved.crew).toEqual(applyCrewChanges(pending.crew, response.effect.immediateCrew ?? {}));
    expect(resolved.systems).toEqual(applySystemChanges(pending.systems, response.effect.immediateSystems ?? {}));
    expect(resolved.history.filter((entry) => entry.eventId === incident.id)).toHaveLength(1);
    expect(resolved.activeEvents.some((event) => event.id === incident.id)).toBe(false);
    const snapshot = JSON.stringify(resolved);
    act(() => game!.resolveActiveEvent(incident.id, response.id));
    expect(game!.state).toBe(resolved);
    expect(JSON.stringify(game!.state)).toBe(snapshot);
  });
  it('commits the planned action exactly once before advancing in the same React event', () => {
    const initial = freshGame();
    expect(saveGame(initial).status).toBe('saved');
    let game: UseGameState | undefined;
    function Harness() {
      game = useGameState();
      return <BunkerGame state={game.state} activity={game.activity} onDecide={game.decide} onAdvanceDay={game.advanceDay} />;
    }
    setup();
    act(() => root?.render(<Harness />));
    const before = game!.state;
    click('Ration supplies');
    expect(game!.state).toBe(before);
    const expected = advanceSimulationDay(applyPlayerDecision(before, {
      actionId: ration.id, playerChoice: 'self-directed',
    })).state;
    click('Do "Ration supplies"');
    expect(game!.state.day).toBe(before.day + 1);
    expect(game!.state.resources).toEqual(expected.resources);
    expect(game!.state.crew).toEqual(expected.crew);
    expect(game!.state.systems).toEqual(expected.systems);
    expect(game!.state.history.filter((decision) => decision.actionId === ration.id)).toHaveLength(1);
    expect(container.querySelector('.bunker-preview-number')).toBeNull();
  });
});
