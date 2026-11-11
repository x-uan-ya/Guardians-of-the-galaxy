/**
 * Sidebar.tsx
 * -----------
 * Primary navigation between top-level views. Collapses to a horizontal strip
 * on small screens. Navigation state is owned by App and passed in.
 */

import { useId, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ROUTES, type ViewKey } from '../../app/routes';

interface SidebarProps {
  active: ViewKey;
  onNavigate: (view: ViewKey) => void;
  expanded?: boolean;
  onToggleSidebar?: () => void;
}

export function Sidebar({ active, onNavigate, expanded = true, onToggleSidebar }: SidebarProps): ReactElement {
  const navId = useId();
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<{ key: ViewKey; label: string; left: number; top: number } | null>(null);
  const showLabel = (button: HTMLButtonElement, key: ViewKey, label: string): void => {
    if (expanded) return;
    const rect = button.getBoundingClientRect();
    setTooltip({ key, label, left: rect.right + 8, top: Math.max(8, Math.min(rect.top, window.innerHeight - 40)) });
  };
  const hideLabel = (key: ViewKey): void => setTooltip((current) => current?.key === key ? null : current);
  return (
    <nav
      id={navId}
      aria-label="Primary"
      onScroll={() => setTooltip(null)}
      className={`flex gap-1 overflow-x-auto border-b border-space-600/50 bg-space-850/60 backdrop-blur-xl p-2
        md:fixed md:left-0 md:top-[var(--app-header-height,5rem)] md:h-[calc(100dvh-var(--app-header-height,5rem))]
        md:z-20 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-b-0 md:border-r
        transition-[width] duration-300 ease-out motion-reduce:transition-none ${expanded ? 'md:w-56' : 'md:w-16'}`}
    >
      {/* The same toggle and navigation remain mounted in both desktop states. */}
      {onToggleSidebar && (
        <div className="sticky top-0 z-10 mb-2 hidden shrink-0 bg-space-850 md:flex md:justify-start">
          <button
            type="button"
            onClick={() => { setTooltip(null); onToggleSidebar(); }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-space-700 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-cyan"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={expanded}
            aria-controls={navId}
          >
            {expanded ? <PanelLeftClose className="h-5 w-5" aria-hidden /> : <PanelLeftOpen className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      )}

      {ROUTES.map((route) => {
        const Icon = route.icon;
        const isActive = route.key === active;
        return (
          <button
            key={route.key}
            type="button"
            aria-label={route.label}
            aria-describedby={!expanded && tooltip?.key === route.key ? tooltipId : undefined}
            onClick={() => { setTooltip(null); onNavigate(route.key); }}
            onMouseEnter={(event) => showLabel(event.currentTarget, route.key, route.label)}
            onMouseLeave={(event) => { if (document.activeElement !== event.currentTarget) hideLabel(route.key); }}
            onFocus={(event) => showLabel(event.currentTarget, route.key, route.label)}
            onBlur={() => hideLabel(route.key)}
            onKeyDown={(event) => { if (event.key === 'Escape') setTooltip(null); }}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-cyan
              ${expanded ? '' : 'md:justify-center md:px-0'}
              ${
                isActive
                  ? 'bg-mars-red/15 text-slate-100 ring-1 ring-mars-red/40'
                  : 'text-slate-400 hover:bg-space-700 hover:text-slate-200'
              }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-mars-orange' : ''}`} aria-hidden />
            <span className={`whitespace-nowrap font-medium ${expanded ? '' : 'md:sr-only'}`}>{route.label}</span>
          </button>
        );
      })}
      {!expanded && tooltip ? createPortal(<div id={tooltipId} role="tooltip"
        className="pointer-events-none fixed z-50 hidden max-w-[calc(100vw-5rem)] rounded border border-space-600 bg-space-900 px-2 py-1 text-xs text-slate-100 shadow-lg md:block"
        style={{ left: tooltip.left, top: tooltip.top }}>{tooltip.label}</div>, document.body) : null}
    </nav>
  );
}
