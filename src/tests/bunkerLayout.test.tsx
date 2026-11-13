import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../components/layout/AppShell';
import { BunkerGame } from '../features/dashboard/bunker/BunkerGame';
import { FACILITIES, FACILITY_ORDER } from '../features/dashboard/bunker/facilities';
import { freshGame } from './helpers';
import { ROUTES, type ViewKey } from '../app/routes';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
});

function setup() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
}

function mountGame() {
  setup();
  const state = freshGame();
  const onDecide = vi.fn();
  const onAdvanceDay = vi.fn();
  act(() => root?.render(<BunkerGame state={state} activity={[]}
    onDecide={onDecide} onAdvanceDay={onAdvanceDay} />));
  return { onDecide, onAdvanceDay };
}

describe('responsive bunker layout interactions', () => {
  it('reclaims the sidebar space and preserves width limits for secondary pages', () => {
    setup();
    const props = {
      day: 1, status: 'active' as const, score: 0, storageAvailable: true,
      hasActiveEvents: false, onNavigate: vi.fn(), onAdvanceDay: vi.fn(),
      onSave: vi.fn(), onNewMission: vi.fn(), onReset: vi.fn(), onToggleSidebar: vi.fn(),
    };
    const render = (sidebarOpen: boolean, activeView: 'dashboard' | 'leaderboard' | 'debrief') => {
      act(() => root?.render(<AppShell {...props} sidebarOpen={sidebarOpen} activeView={activeView}>
        <div>Content</div>
      </AppShell>));
    };
    render(true, 'dashboard');
    expect(container.querySelector('main')?.parentElement?.classList.contains('md:pl-56')).toBe(true);
    expect(container.querySelector('main')?.classList.contains('max-w-[120rem]')).toBe(true);
    render(false, 'dashboard');
    expect(container.querySelector('main')?.parentElement?.classList.contains('md:pl-56')).toBe(false);
    expect(container.querySelector('main')?.parentElement?.classList.contains('md:pl-16')).toBe(true);
    expect(container.querySelector('[aria-label="Primary"]')?.classList.contains('md:w-16')).toBe(true);
    expect(container.querySelector('[aria-label="Primary"]')?.parentElement?.classList.contains('md:hidden')).toBe(false);
    expect(container.querySelector('main')?.parentElement?.classList.contains('max-w-7xl')).toBe(false);
    for (const view of ['leaderboard', 'debrief'] as const) {
      render(true, view);
      expect(container.querySelector('main')?.parentElement?.classList.contains('max-w-7xl')).toBe(true);
      expect(container.querySelector('main')?.classList.contains('max-w-[120rem]')).toBe(false);
    }
  });

  it('uses the existing toggle callback, keeps all routes and names, and shows focus and hover labels', () => {
    setup();
    const onNavigate = vi.fn();
    const onToggle = vi.fn();
    function Harness() {
      const [expanded, setExpanded] = useState(true);
      const [active, setActive] = useState<ViewKey>('dashboard');
      return <AppShell day={1} status="active" score={0} storageAvailable
        activeView={active} hasActiveEvents={false} sidebarOpen={expanded}
        onNavigate={(view) => { onNavigate(view); setActive(view); }}
        onToggleSidebar={() => { onToggle(); setExpanded((value) => !value); }}
        onAdvanceDay={vi.fn()} onSave={vi.fn()} onNewMission={vi.fn()} onReset={vi.fn()}>
        <div>Content</div>
      </AppShell>;
    }
    act(() => root?.render(<Harness />));
    const nav = container.querySelector<HTMLElement>('[aria-label="Primary"]')!;
    const toggle = nav.querySelector<HTMLButtonElement>('[aria-expanded]')!;
    const getRoute = (label: string) => [...nav.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.getAttribute('aria-label') === label)!;
    expect(nav.classList.contains('md:w-56')).toBe(true);
    expect(toggle.getAttribute('aria-controls')).toBe(nav.id);
    for (const expanded of [true, false]) {
      expect(toggle.getAttribute('aria-expanded')).toBe(String(expanded));
      expect(toggle.getAttribute('aria-label')).toBe(expanded ? 'Collapse sidebar' : 'Expand sidebar');
      for (const route of ROUTES) {
        const button = getRoute(route.label);
        expect(button.querySelector('span')?.classList.contains('md:sr-only')).toBe(!expanded);
        expect(button.querySelector('span')?.classList.contains('hidden')).toBe(false);
        act(() => button.click());
        expect(onNavigate).toHaveBeenLastCalledWith(route.key);
        expect(button.getAttribute('aria-current')).toBe('page');
        expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
        expect(button.className).toContain('bg-mars-red/15');
      }
      if (!expanded) {
        const history = getRoute('Play History');
        act(() => history.focus());
        const tooltip = document.body.querySelector('[role="tooltip"]')!;
        expect(tooltip.textContent).toBe('Play History');
        expect(history.getAttribute('aria-describedby')).toBe(tooltip.id);
        act(() => history.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
        expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
        act(() => history.blur());
        act(() => history.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
        expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe('Play History');
        act(() => history.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })));
        expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
        expect(nav.classList.contains('motion-reduce:transition-none')).toBe(true);
      }
      act(() => toggle.click());
    }
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(nav.classList.contains('md:w-56')).toBe(true);
  });

  it('keeps quick access closed initially and every facility functional when expanded', () => {
    const { onDecide, onAdvanceDay } = mountGame();
    const details = container.querySelector<HTMLDetailsElement>('.bunker-quick-access')!;
    const summary = details.querySelector('summary')!;
    expect(details.open).toBe(false);
    expect(summary.textContent).toBe('Facility Quick Access');
    // Native details/summary supplies Enter, Space and touch behaviour in browsers.
    act(() => summary.click());
    expect(details.open).toBe(true);
    const buttons = details.querySelectorAll<HTMLButtonElement>('nav button');
    expect(buttons).toHaveLength(7);
    FACILITY_ORDER.forEach((id, index) => {
      act(() => buttons[index]!.click());
      expect(buttons[index]!.getAttribute('aria-pressed')).toBe('true');
      expect(container.querySelector('[role="tabpanel"] h3')?.textContent).toBe(FACILITIES[id].label);
    });
    act(() => summary.click());
    expect(details.open).toBe(false);
    expect(onDecide).not.toHaveBeenCalled();
    expect(onAdvanceDay).not.toHaveBeenCalled();
  });

  it('keeps tablet tabs and End Sol outside the scrolling content and actions intact', () => {
    const { onDecide, onAdvanceDay } = mountGame();
    const body = container.querySelector('.bunker-tablet-body')!;
    expect(body.querySelector('[role="tablist"]')).toBeNull();
    expect(body.querySelector('.bunker-tablet-footer')).toBeNull();
    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    for (const tab of tabs) {
      act(() => tab.click());
      expect(tab.getAttribute('aria-selected')).toBe('true');
    }
    act(() => tabs[0]!.click());
    const action = [...body.querySelectorAll<HTMLButtonElement>('.bunker-action')]
      .find((button) => button.textContent?.includes('Ration supplies'))!;
    act(() => action.click());
    expect(container.querySelector('.bunker-hud-preview-label')).not.toBeNull();
    expect(onDecide).not.toHaveBeenCalled();
    const endSol = container.querySelector<HTMLButtonElement>('.bunker-tablet-footer button')!;
    expect(endSol.disabled).toBe(false);
    act(() => endSol.click());
    expect(onDecide).toHaveBeenCalledTimes(1);
    expect(onDecide).toHaveBeenCalledWith(expect.objectContaining({ actionId: 'ration-supplies' }));
    expect(onAdvanceDay).toHaveBeenCalledTimes(1);
  });
});
