import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmergencyPanel } from '../features/dashboard/bunker/EmergencyPanel';
import { freshGame, withActiveEvent } from './helpers';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

const state = withActiveEvent(freshGame(), 'solar-storm');
const event = state.activeEvents[0]!;

function mount(onChoose = vi.fn()): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <EmergencyPanel state={state} event={event} waiting={0} disabled={false} onChoose={onChoose} />
    )
  );
  return container;
}

const button = (view: HTMLElement, text: string) =>
  Array.from(view.querySelectorAll('button')).find((b) => b.textContent?.includes(text));

describe('advice is optional', () => {
  it('shows no advice until the player asks', () => {
    const view = mount();
    const text = view.textContent ?? '';
    expect(text).not.toContain('Recommendation:');
    expect(text).not.toContain('Accept recommendation');
    expect(button(view, 'Ask Mission Controller for advice')).toBeDefined();
    // Every response is still available without advice.
    for (const action of event.availableActions) {
      expect(button(view, action.label)).toBeDefined();
    }
  });

  it('records a choice made without advice as self-directed, with no advice snapshot', () => {
    const onChoose = vi.fn();
    const view = mount(onChoose);
    const first = event.availableActions[0]!;
    act(() => button(view, first.label)?.click());
    expect(onChoose).toHaveBeenCalledWith(first.id, 'self-directed', undefined);
  });

  it('shows the advice after the player asks, and records the advice when followed', () => {
    const onChoose = vi.fn();
    const view = mount(onChoose);
    act(() => button(view, 'Ask Mission Controller for advice')?.click());

    expect(view.textContent).toContain('Recommendation:');
    expect(button(view, 'Ask Mission Controller for advice')).toBeUndefined();

    act(() => button(view, 'Accept recommendation')?.click());
    expect(onChoose).toHaveBeenCalledTimes(1);
    const [, choice, advice] = onChoose.mock.calls[0] as [string, string, { mode: string }];
    expect(choice).toBe('accepted-recommendation');
    expect(advice.mode).toBe('rules');
  });
});
