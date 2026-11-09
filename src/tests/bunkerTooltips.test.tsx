import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BunkerScene } from '../features/dashboard/bunker/BunkerScene';
import { FACILITIES, facilityCondition } from '../features/dashboard/bunker/facilities';
import { calculateDerivedStatus } from '../features/simulation/simulationSelectors';
import { freshGame } from './helpers';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  vi.restoreAllMocks();
});

function pointer(target: Element, type: string, pointerType = 'mouse'): void {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => { target.dispatchEvent(event); });
}

function mount() {
  const state = freshGame();
  state.systems.foodProduction = 65;
  const onSelect = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const render = () => act(() => root?.render(<BunkerScene state={state}
    derived={calculateDerivedStatus(state)} selected={null} emergency={null}
    alertFacility={null} dayBanner={null} onSelect={onSelect} onRespond={() => undefined} />));
  render();
  const button = container.querySelectorAll('button')[1]!;
  const tooltip = container.querySelector<HTMLElement>('[role="tooltip"]')!;
  return { state, onSelect, button, tooltip, render };
}

describe('bunker facility tooltips', () => {
  it('shows live values on hover without selecting or changing game state', () => {
    const { state, onSelect, button, tooltip, render } = mount();
    const before = JSON.stringify(state);
    pointer(button, 'pointerover');
    expect(tooltip.dataset.visible).toBe('true');
    expect(tooltip.textContent).toContain('Greenhouse — 65%');
    expect(tooltip.textContent).not.toContain('Food production efficiency');
    expect(tooltip.querySelector('.bunker-tooltip-detail')).toBeNull();
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(onSelect).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(before);
    state.systems.foodProduction = 12;
    render();
    expect(tooltip.textContent).toContain('12%');
    expect(tooltip.querySelector<HTMLElement>('.bunker-dot')?.style.background).toBe('rgb(217, 83, 63)');
    pointer(button, 'pointerout');
    expect(tooltip.dataset.visible).toBe('false');
  });

  it('supports keyboard focus, Escape dismissal and unchanged clicks', () => {
    const { button, tooltip, onSelect } = mount();
    act(() => button.focus());
    expect(tooltip.dataset.visible).toBe('true');
    expect(onSelect).not.toHaveBeenCalled();
    act(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(tooltip.dataset.visible).toBe('false');
    act(() => button.click());
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('greenhouse');
    act(() => button.blur());
    expect(tooltip.dataset.visible).toBe('false');
  });

  it('follows keyboard focus despite a stationary mouse, then supports Escape and renewed hover', () => {
    const { button, tooltip, onSelect } = mount();
    const oxygen = container!.querySelectorAll('button')[0]!;
    pointer(button, 'pointerover');
    expect(tooltip.textContent).toContain('Greenhouse');
    act(() => oxygen.focus());
    expect(tooltip.textContent).toContain('Oxygen Generator');
    expect(oxygen.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(button.hasAttribute('aria-describedby')).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();
    act(() => oxygen.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(tooltip.dataset.visible).toBe('false');
    pointer(button, 'pointerout');
    pointer(button, 'pointerover');
    expect(tooltip.dataset.visible).toBe('true');
    expect(tooltip.textContent).toContain('Greenhouse');
    act(() => button.click());
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('greenhouse');
  });

  it('shows on touch while allowing the same tap to select, then dismisses outside', () => {
    const { button, tooltip, onSelect } = mount();
    pointer(button, 'pointerdown', 'touch');
    act(() => button.click());
    expect(tooltip.dataset.visible).toBe('true');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('greenhouse');
    pointer(document.body, 'pointerdown', 'touch');
    expect(tooltip.dataset.visible).toBe('false');
  });

  it('keeps tooltip bounds within a narrow scene at both edges and after resize', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(180);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(240);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(60);
    const { tooltip } = mount();
    const buttons = container!.querySelectorAll('button');
    for (const button of [buttons[0]!, buttons[6]!]) {
      pointer(button, 'pointerover');
      act(() => window.dispatchEvent(new Event('resize')));
      expect(parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(8);
      expect(parseFloat(tooltip.style.left) + 240).toBeLessThanOrEqual(312);
      expect(parseFloat(tooltip.style.top)).toBeGreaterThanOrEqual(8);
      expect(parseFloat(tooltip.style.top) + 60).toBeLessThanOrEqual(172);
      pointer(button, 'pointerout');
    }
  });

  it('uses the mapped resource, system or health and rejects invalid percentages', () => {
    const state = freshGame();
    expect(facilityCondition(FACILITIES.oxygen, state).value).toBe(state.systems.lifeSupportEfficiency);
    expect(facilityCondition(FACILITIES.storage, state).value).toBe(state.resources.food);
    expect(facilityCondition(FACILITIES.medical, state).value).toBe(state.crew.health);
    for (const value of [NaN, Infinity, -1, 101]) {
      state.systems.foodProduction = value;
      expect(facilityCondition(FACILITIES.greenhouse, state).value).toBeNull();
    }
    state.resources.water = 0;
    expect(facilityCondition(FACILITIES.water, state).value).toBe(0);
  });

  it('shows a meaningful fallback instead of an invalid number', () => {
    const { state, button, tooltip, render } = mount();
    state.systems.foodProduction = NaN;
    render();
    pointer(button, 'pointerover');
    expect(tooltip.textContent).toContain('Condition unavailable');
    expect(tooltip.textContent).not.toContain('NaN');
  });
});
