/**
 * App.tsx
 * -------
 * The composition root. It:
 *  - owns the useGameState hook (the single engine-facing surface),
 *  - owns the active view + confirmation-dialog state,
 *  - wires TopBar/Sidebar controls to the hook's handlers,
 *  - renders the active view inside the AppShell.
 *
 * App holds NO simulation logic. Every state change routes through useGameState.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dashboard } from '../features/dashboard/Dashboard';
import { MissionSetup } from '../features/mission/MissionSetup';
import { GameOver } from '../features/mission/GameOver';
import { Debrief } from '../features/debrief/Debrief';
import { CrisisModal } from '../features/events/CrisisModal';
import { isGameOver } from '../features/simulation/simulationEngine';
import { DEFAULT_MISSION_CONFIG, useGameState } from '../hooks/useGameState';
import type { MissionConfig } from '../features/mission/missionTypes';
import { DEFAULT_VIEW, type ViewKey } from './routes';
import { PersistenceBanner } from './PersistenceBanner';

export function App(): ReactElement {
  const game = useGameState();
  const [view, setView] = useState<ViewKey>(DEFAULT_VIEW);

  // Confirmation state for destructive actions.
  const [confirm, setConfirm] = useState<
    | { kind: 'reset' }
    | { kind: 'new-from-topbar' }
    | { kind: 'launch'; config: MissionConfig }
    | null
  >(null);

  const currentConfig: MissionConfig = {
    occupation: game.state.character.occupation,
    objective: game.state.mission.objective,
    operatingPhilosophy: game.state.mission.operatingPhilosophy,
    startingCondition: game.state.mission.startingCondition,
  };

  const hasProgress = game.state.history.length > 0 || game.state.day > 1;

  // TopBar "New": if there's progress, confirm; otherwise jump straight to setup.
  const handleNewMission = (): void => {
    if (hasProgress) {
      setConfirm({ kind: 'new-from-topbar' });
    } else {
      setView('mission-setup');
    }
  };

  // Launch from the setup screen: confirm if the current game has progress.
  const handleLaunch = (config: MissionConfig): void => {
    if (hasProgress) {
      setConfirm({ kind: 'launch', config });
    } else {
      game.startNewMission(config);
      setView('dashboard');
    }
  };

  const handleReset = (): void => setConfirm({ kind: 'reset' });

  // Logo click: navigate to dashboard
  const handleLogoClick = (): void => {
    setView('dashboard');
  };

  // Game-over: restart immediately with the same occupation + mission config.
  const handleRestartSame = (): void => {
    game.startNewMission(currentConfig);
    setView('dashboard');
  };

  // Game-over: go pick a new occupation for the next run.
  const handleNewRun = (): void => {
    setView('mission-setup');
  };

  const runFailed = isGameOver(game.state);

  const resolveConfirm = (): void => {
    if (!confirm) return;
    switch (confirm.kind) {
      case 'reset':
        game.reset();
        setView('dashboard');
        break;
      case 'new-from-topbar':
        setView('mission-setup');
        break;
      case 'launch':
        game.startNewMission(confirm.config);
        setView('dashboard');
        break;
    }
    setConfirm(null);
  };

  return (
    <AppShell
      day={game.state.day}
      status={game.state.mission.status}
      score={game.state.mission.score}
      storageAvailable={game.storageAvailable}
      activeView={view}
      hasActiveEvents={game.state.activeEvents.length > 0}
      onNavigate={setView}
      onAdvanceDay={game.advanceDay}
      onSave={game.save}
      onNewMission={handleNewMission}
      onReset={handleReset}
      onLogoClick={handleLogoClick}
    >
      <PersistenceBanner notice={game.notice} onDismiss={game.dismissNotice} />

      {view === 'dashboard' ? (
        <Dashboard state={game.state} activity={game.activity} onDecide={game.decide} />
      ) : null}

      {view === 'mission-setup' ? (
        <MissionSetup onLaunch={handleLaunch} current={currentConfig} />
      ) : null}

      {view === 'debrief' ? <Debrief state={game.state} /> : null}

      {/* Game-over overlay: shown on the dashboard when the run has failed. */}
      {runFailed && view === 'dashboard' ? (
        <GameOver
          state={game.state}
          onRestartSame={handleRestartSame}
          onNewRun={handleNewRun}
        />
      ) : null}

      {/* Crisis Modal: shown when there are active events */}
      {game.state.activeEvents.length > 0 && view === 'dashboard' && !runFailed && game.state.activeEvents[0] ? (
        <CrisisModal
          event={game.state.activeEvents[0]}
          onChoose={(actionId, choice) => {
            const event = game.state.activeEvents[0];
            if (event) {
              game.resolveActiveEvent(event.id, actionId, choice);
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === 'reset' ? 'Reset mission?' : 'Start a new mission?'}
        message={
          confirm?.kind === 'reset'
            ? 'This clears the saved game and starts a fresh default mission. This cannot be undone.'
            : `This discards the current mission (Sol ${game.state.day}, ${game.state.history.length} decisions). Continue?`
        }
        confirmLabel={confirm?.kind === 'reset' ? 'Reset' : 'Discard & continue'}
        onConfirm={resolveConfirm}
        onCancel={() => setConfirm(null)}
      />
    </AppShell>
  );
}

// Re-export the default mission config location for discoverability.
export { DEFAULT_MISSION_CONFIG };
