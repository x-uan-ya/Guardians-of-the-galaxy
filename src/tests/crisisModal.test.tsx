import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createInitialGameState } from '../features/simulation/simulationEngine';
import { CrisisModal } from '../features/events/CrisisModal';

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
  const button = [...document.body.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim().includes(label),
  );
  if (!button) throw new Error(`Could not find button "${label}".`);
  act(() => button.click());
}

describe('CrisisModal decision review', () => {
  it('previews action details and consequences without committing until confirmed once', () => {
    const event = createInitialGameState({
      missionType: 'mars',
      occupation: 'engineer',
      objective: 'survival',
      operatingPhilosophy: 'balanced',
      startingCondition: 'standard',
    }).activeEvents[0];
    const action = event?.availableActions.find((choice) => choice.id === 'story-sol-01-inspect');
    if (!event || !action) throw new Error('Expected the Sol 1 inspection action.');

    let confirmed = 0;
    let reconsidered = 0;
    render(
      <CrisisModal
        event={event}
        action={action}
        onConfirm={() => {
          confirmed += 1;
        }}
        onReconsider={() => {
          reconsidered += 1;
        }}
      />,
    );

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.textContent).toContain(action.label);
    expect(dialog?.textContent).toContain(action.description);
    const immediateEffects = dialog?.querySelector('[aria-label="Immediate effects"]');
    expect(immediateEffects?.textContent).toContain('Power-4');
    expect(immediateEffects?.textContent).toContain('Life Support+3');
    const reconsiderButton = [...(dialog?.querySelectorAll('button') ?? [])].find((button) =>
      button.textContent?.includes('Reconsider'),
    );
    const confirmButton = [...(dialog?.querySelectorAll('button') ?? [])].find((button) =>
      button.textContent?.includes('Confirm choice'),
    );
    expect(reconsiderButton?.className).toContain('btn-secondary');
    expect(reconsiderButton?.className).toContain('min-h-10');
    expect(reconsiderButton?.className).toContain('focus-visible:ring');
    expect(confirmButton?.className).toContain('hover:bg-emerald-800/60');
    expect(confirmButton?.className).toContain('focus-visible:ring-emerald-300');
    expect(confirmButton?.className).toContain('min-h-10');
    expect(document.body.lastElementChild?.className).toContain('fixed');
    expect(dialog?.className).toContain('max-w-2xl');
    expect(dialog?.className).toContain('overflow-y-auto');
    expect(confirmed).toBe(0);

    clickButton('Reconsider');
    expect(reconsidered).toBe(1);
    expect(confirmed).toBe(0);
  });

  it('describes delayed consequences without exposing their narrative details', () => {
    const event = createInitialGameState({
      missionType: 'mars',
      occupation: 'engineer',
      objective: 'survival',
      operatingPhilosophy: 'balanced',
      startingCondition: 'standard',
    }).activeEvents[0];
    const action = event?.availableActions.find((choice) => choice.id === 'story-sol-01-begin');
    if (!event || !action) throw new Error('Expected the Sol 1 delayed-effect action.');

    render(
      <CrisisModal event={event} action={action} onConfirm={() => {}} onReconsider={() => {}} />,
    );

    expect(document.body.textContent).toContain('1 delayed consequence will be scheduled.');
    expect(document.body.textContent).not.toContain(
      action.effect.delayed?.[0]?.description ?? 'missing description',
    );
  });
});
