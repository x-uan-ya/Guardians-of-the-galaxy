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

describe('CrisisModal', () => {
  it('previews a decision until confirmation and invokes the commit callback only once', () => {
    const event = createInitialGameState({
      missionType: 'mars',
      occupation: 'engineer',
      objective: 'survival',
      operatingPhilosophy: 'balanced',
      startingCondition: 'standard',
    }).activeEvents[0];
    if (!event) throw new Error('Expected the initial Sol 1 event.');

    const selections: string[] = [];
    render(
      <CrisisModal
        event={event}
        onChoose={(actionId) => selections.push(actionId)}
      />,
    );

    const backdrop = document.body.lastElementChild as HTMLElement | null;
    expect(backdrop?.className).toContain('fixed');
    expect(backdrop?.className).toContain('overflow-y-auto');
    expect(backdrop?.firstElementChild?.className).toContain('max-w-3xl');
    expect(backdrop?.firstElementChild?.className).toContain('max-h-[calc(100dvh-2rem)]');

    clickButton('Inspect Essential Systems');
    expect(document.body.textContent).toContain('Review your decision.');
    expect(document.body.textContent).not.toContain('Decision recorded.');
    expect(selections).toEqual([]);

    clickButton('Reconsider');
    expect(document.body.textContent).toContain('CHOOSE YOUR RESPONSE:');
    expect(selections).toEqual([]);

    clickButton('Inspect Essential Systems');
    const confirmButton = [...document.body.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Confirm choice'),
    );
    if (!confirmButton) throw new Error('Could not find the decision confirmation button.');
    act(() => {
      confirmButton.click();
      confirmButton.click();
    });
    expect(selections).toEqual(['story-sol-01-inspect']);
  });
});
