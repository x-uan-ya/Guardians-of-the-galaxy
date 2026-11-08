import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdvicePanel } from '../features/ai-advisor/AdvicePanel';
import { buildAdvice } from '../features/ai-advisor/adviceBuilder';
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

function mount(node: React.ReactElement): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(node));
  return container;
}

const state = withActiveEvent(freshGame(), 'solar-storm');

describe('AdvicePanel', () => {
  it('shows recommendation, reason, risk, expected consequence and the human-override line', () => {
    const advice = buildAdvice({ state, eventId: 'solar-storm' });
    const view = mount(<AdvicePanel advice={advice} onAccept={vi.fn()} onOverride={vi.fn()} />);
    const text = view.textContent ?? '';

    expect(text).toContain(`Recommendation: ${advice?.headline}`);
    expect(text).toContain('Why:');
    expect(text).toContain('Risk:');
    expect(text).toContain('Expected:');
    expect(text).toContain('Human override available');
    expect(text).toContain('You decide');
    expect(view.querySelector('[data-role="recommended"]')).not.toBeNull();
    expect(view.querySelector('[data-role="alternative"]')).not.toBeNull();
    expect(view.querySelector('[data-role="risky"]')).not.toBeNull();
  });

  it('does nothing until the player clicks: Accept calls onAccept, Override calls onOverride', () => {
    const advice = buildAdvice({ state, eventId: 'solar-storm' })!;
    const onAccept = vi.fn();
    const onOverride = vi.fn();
    const view = mount(<AdvicePanel advice={advice} onAccept={onAccept} onOverride={onOverride} />);

    expect(onAccept).not.toHaveBeenCalled();
    expect(onOverride).not.toHaveBeenCalled();

    const buttons = Array.from(view.querySelectorAll('button'));
    const accept = buttons.find((b) => b.textContent?.includes('Accept recommendation'));
    act(() => accept?.click());
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onOverride).not.toHaveBeenCalled();

    const overrideButtons = buttons.filter((b) => b.textContent?.startsWith('Override'));
    expect(overrideButtons).toHaveLength(2);
    act(() => overrideButtons[0]?.click());
    expect(onOverride).toHaveBeenCalledWith(advice.options[1]?.actionId);
  });

  it('shows the fallback notice when the AI is unavailable', () => {
    const advice = buildAdvice({ state, eventId: 'solar-storm' }, 'fallback');
    const view = mount(<AdvicePanel advice={advice} onAccept={vi.fn()} onOverride={vi.fn()} />);
    expect(view.textContent).toContain('AI unavailable — switching to Mission Safety Protocol.');
    expect(view.textContent).toContain('Mission Safety Protocol');
    expect(view.querySelector('[role="status"]')).not.toBeNull();
  });

  it('disables Accept while an AI answer is still loading, but never blocks overriding', () => {
    const advice = buildAdvice({ state, eventId: 'solar-storm' })!;
    const view = mount(<AdvicePanel advice={advice} loading onAccept={vi.fn()} onOverride={vi.fn()} />);
    const accept = Array.from(view.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Accept recommendation')
    );
    expect(accept?.disabled).toBe(true);
    const override = Array.from(view.querySelectorAll('button')).find((b) =>
      b.textContent?.startsWith('Override')
    );
    expect(override?.disabled).toBe(false);
  });

  it('renders text safely (no HTML injection from advice text)', () => {
    const advice = buildAdvice({ state, eventId: 'solar-storm' })!;
    const hostile = { ...advice, reason: '<img src=x onerror=alert(1)>', risk: '<b>bold</b>' };
    const view = mount(<AdvicePanel advice={hostile} onAccept={vi.fn()} onOverride={vi.fn()} />);
    expect(view.querySelector('img')).toBeNull();
    expect(view.querySelector('b')).toBeNull();
    expect(view.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('renders nothing without advice', () => {
    const view = mount(<AdvicePanel advice={null} onAccept={vi.fn()} onOverride={vi.fn()} />);
    expect(view.innerHTML).toBe('');
  });
});
