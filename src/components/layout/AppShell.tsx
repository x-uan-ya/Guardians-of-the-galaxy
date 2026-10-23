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
  onNavigate: (view: ViewKey) => void;
  onAdvanceDay: () => void;
  onSave: () => void;
  onNewMission: () => void;
  onReset: () => void;
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
  onNavigate,
  onAdvanceDay,
  onSave,
  onNewMission,
  onReset,
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
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        <Sidebar active={activeView} onNavigate={onNavigate} />
        <main key={activeView} className="flex-1 animate-fade-in-up p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
