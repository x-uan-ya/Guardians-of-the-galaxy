/**
 * AppShell.tsx
 * ------------
 * The outer layout frame: TopBar across the top, Sidebar + main content below.
 * It is a pure layout container — it renders the chrome and slots in whatever
 * the active view provides. All data/handlers come from App via props.
 */

import type { ReactElement, ReactNode } from 'react';
import type { MissionStatus } from '../../features/simulation/simulationTypes';
import type { ViewKey } from '../../app/routes';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { MissionBackdrop } from './MissionBackdrop';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
  day: number;
  status: MissionStatus;
  score: number;
  storageAvailable: boolean;
  activeView: ViewKey;
  hasActiveEvents: boolean;
  sidebarOpen: boolean;
  onNavigate: (view: ViewKey) => void;
  onAdvanceDay: () => void;
  onSave: () => void;
  onNewMission: () => void;
  onReset: () => void;
  onToggleSidebar: () => void;
  onLogoClick?: () => void;
  onLogout?: () => void;
  children: ReactNode;
}

export function AppShell({
  day,
  status,
  score,
  storageAvailable,
  activeView,
  hasActiveEvents,
  sidebarOpen,
  onNavigate,
  onAdvanceDay,
  onSave,
  onNewMission,
  onReset,
  onToggleSidebar,
  onLogoClick,
  onLogout,
  children,
}: AppShellProps): ReactElement {
  return (
    <div className="relative flex min-h-screen flex-col">
      <MissionBackdrop />
      <TopBar
        day={day}
        status={status}
        score={score}
        storageAvailable={storageAvailable}
        hasActiveEvents={hasActiveEvents}
        onAdvanceDay={onAdvanceDay}
        onSave={onSave}
        onNewMission={onNewMission}
        onReset={onReset}
        onLogoClick={onLogoClick}
        onLogout={onLogout}
      />
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row md:pl-56">
        {/* Close sidebar button - fixed at bottom of sidebar area, always visible when sidebar is open */}
        {sidebarOpen && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="fixed left-4 bottom-6 z-50 hidden rounded-md bg-space-800 p-2 text-slate-400 shadow-lg ring-1 ring-space-600 transition-colors hover:bg-space-700 hover:text-slate-200 md:flex md:items-center md:justify-center"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}

        {/* Open Sidebar Button - only shown when sidebar is closed, fixed and always visible */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="fixed left-2 bottom-6 z-50 hidden rounded-md bg-space-800 p-2 text-slate-400 shadow-lg ring-1 ring-space-600 transition-colors hover:bg-space-700 hover:text-slate-200 md:flex md:items-center md:justify-center"
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        {/* Sidebar - fixed to viewport on desktop, always visible on mobile */}
        <aside className={`${sidebarOpen ? 'md:block' : 'md:hidden'}`}>
          <Sidebar active={activeView} onNavigate={onNavigate} />
        </aside>

        <main 
          key={activeView} 
          className={`flex-1 animate-fade-in-up p-4 sm:p-6 transition-all`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
