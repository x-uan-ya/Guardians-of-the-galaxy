/**
 * Sidebar.tsx
 * -----------
 * Primary navigation between top-level views. Collapses to a horizontal strip
 * on small screens. Navigation state is owned by App and passed in.
 */

import type { ReactElement } from 'react';
import { PanelLeftClose } from 'lucide-react';
import { ROUTES, type ViewKey } from '../../app/routes';

interface SidebarProps {
  active: ViewKey;
  onNavigate: (view: ViewKey) => void;
  onToggleSidebar?: () => void;
}

export function Sidebar({ active, onNavigate, onToggleSidebar }: SidebarProps): ReactElement {
  return (
    <nav
      aria-label="Primary"
      className="flex gap-1 overflow-x-auto border-b border-space-600/50 bg-space-850/60 backdrop-blur-xl p-2
                 md:fixed md:left-0 md:top-0 md:h-screen md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:pt-20"
    >
      {/* Close sidebar button - fixed position within viewport */}
      {onToggleSidebar && (
        <div className="mb-2 hidden md:flex md:justify-start">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-space-700 hover:text-slate-200"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
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
            onClick={() => onNavigate(route.key)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors
              ${
                isActive
                  ? 'bg-mars-red/15 text-slate-100 ring-1 ring-mars-red/40'
                  : 'text-slate-400 hover:bg-space-700 hover:text-slate-200'
              }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? 'text-mars-orange' : ''}`} aria-hidden />
            <span className="whitespace-nowrap font-medium">{route.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
