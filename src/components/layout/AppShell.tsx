/**
 * AppShell.tsx
 * ------------
 * The outer layout frame: TopBar across the top, Sidebar + main content below.
 * It is a pure layout container — it renders the chrome and slots in whatever
 * the active view provides. All data/handlers come from App via props.
 */

import { useLayoutEffect, useRef, type ReactElement, type ReactNode } from 'react';
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
  const shellRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const shell = shellRef.current;
    const header = shell?.querySelector('header');
    if (!shell || !header) return;
    const update = (): void => {
      shell.style.setProperty('--app-header-height', `${header.getBoundingClientRect().height}px`);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(header);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);
  return (
    <div ref={shellRef} className="relative flex min-h-screen flex-col">
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
      {/* Match the desktop sidebar width; secondary pages retain their readable width cap. */}
      <div
        className={`relative mx-auto flex w-full min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out motion-reduce:transition-none md:flex-row ${
          activeView === 'dashboard' ? '' : 'max-w-7xl'
        } ${sidebarOpen ? 'md:pl-56' : 'md:pl-16'}`}
      >
        {/* Sidebar - fixed to viewport on desktop, always visible on mobile */}
        <aside className="min-w-0">
          <Sidebar active={activeView} onNavigate={onNavigate}
            expanded={sidebarOpen} onToggleSidebar={onToggleSidebar} />
        </aside>

        <main 
          key={activeView} 
          className={`min-w-0 flex-1 animate-fade-in-up p-4 sm:p-6 transition-all ${activeView === 'dashboard' ? 'mx-auto w-full max-w-[120rem]' : ''}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
