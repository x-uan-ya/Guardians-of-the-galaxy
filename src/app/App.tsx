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

import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dashboard } from '../features/dashboard/Dashboard';
import { MissionSetup } from '../features/mission/MissionSetup';
import { Briefing } from '../features/mission/Briefing';
import { ResupplyModal } from '../features/mission/ResupplyModal';
import { GameOver } from '../features/mission/GameOver';
import { Debrief } from '../features/debrief/Debrief';
import { HowToPlay } from '../features/how-to-play/HowToPlay';
import { AchievementsPage } from '../features/progression/AchievementsPage';
import { ProgressToasts } from '../features/progression/ProgressToasts';
import { CrisisModal } from '../features/events/CrisisModal';
import { Login } from '../features/auth/Login';
import { Signup } from '../features/auth/Signup';
import { isGameOver } from '../features/simulation/simulationEngine';
import { DEFAULT_MISSION_CONFIG, useGameState } from '../hooks/useGameState';
import { useProgression } from '../hooks/useProgression';
import type { MissionConfig } from '../features/mission/missionTypes';
import { DEFAULT_VIEW, type ViewKey } from './routes';
import { PersistenceBanner } from './PersistenceBanner';
import { isAuthenticated, logout } from '../features/auth/authService';

export function App(): ReactElement {
  const game = useGameState();
  const { progression, dismissNotifications } = useProgression(game.state);
  const [view, setView] = useState<ViewKey>(DEFAULT_VIEW);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Whether the player has an active run this session. A run exists either
  // because a saved game was restored, or because they launched one from
  // Mission Setup. Until then, Mission Control (and other in-run screens) stay
  // locked and the player is sent to Mission Setup first.
  const [runStarted, setRunStarted] = useState(false);
  // Whether the cinematic briefing has been dismissed this session. It plays
  // once before occupation selection on a fresh start.
  const [briefingDone, setBriefingDone] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, []);

  // If a saved mission was restored, the player already has an active run —
  // skip the briefing and let them straight into Mission Control.
  useEffect(() => {
    if (game.notice.kind === 'restored') {
      setRunStarted(true);
      setBriefingDone(true);
    }
  }, [game.notice.kind]);

  // Views that require an active run. Visiting them before a run has started
  // redirects to Mission Setup.
  const RUN_REQUIRED_VIEWS: ViewKey[] = ['dashboard', 'debrief'];
  const effectiveView: ViewKey =
    !runStarted && RUN_REQUIRED_VIEWS.includes(view) ? 'mission-setup' : view;

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
    if (hasProgress && runStarted) {
      setConfirm({ kind: 'launch', config });
    } else {
      game.startNewMission(config);
      setRunStarted(true);
      setView('dashboard');
    }
  };

  const handleReset = (): void => setConfirm({ kind: 'reset' });

  // Logo click: go to Mission Control if a run is active, otherwise Mission Setup.
  const handleLogoClick = (): void => {
    setView(runStarted ? 'dashboard' : 'mission-setup');
  };

  // Game-over: restart immediately with the same occupation + mission config.
  const handleRestartSame = (): void => {
    game.startNewMission(currentConfig);
    setRunStarted(true);
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
        setRunStarted(true);
        setView('dashboard');
        break;
    }
    setConfirm(null);
  };

  // Auth handlers
  const handleLoginSuccess = (): void => {
    setIsLoggedIn(true);
  };

  const handleSignupSuccess = (): void => {
    setIsLoggedIn(true);
  };

  const handleLogout = (): void => {
    logout(); // Clear session
    setIsLoggedIn(false);
    setRunStarted(false);
    setBriefingDone(false);
    setView('mission-setup');
  };

  const handleToggleSidebar = (): void => {
    setSidebarOpen(!sidebarOpen);
  };

  // Show auth screens if not logged in
  if (!isLoggedIn) {
    if (authView === 'login') {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignup={() => setAuthView('signup')}
        />
      );
    } else {
      return (
        <Signup
          onSignupSuccess={handleSignupSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
  }

  // Main app (when logged in)
  return (
    <AppShell
      day={game.state.day}
      status={game.state.mission.status}
      score={game.state.mission.score}
      storageAvailable={game.storageAvailable}
      activeView={effectiveView}
      hasActiveEvents={game.state.activeEvents.length > 0}
      sidebarOpen={sidebarOpen}
      onNavigate={setView}
      onAdvanceDay={game.advanceDay}
      onSave={game.save}
      onNewMission={handleNewMission}
      onReset={handleReset}
      onToggleSidebar={handleToggleSidebar}
      onLogoClick={handleLogoClick}
      onLogout={handleLogout}
    >
      <PersistenceBanner notice={game.notice} onDismiss={game.dismissNotice} />

      {/* Cinematic briefing: plays once before occupation selection. */}
      {!briefingDone && !runStarted ? (
        <Briefing onContinue={() => setBriefingDone(true)} />
      ) : null}

      {/* Resupply pop-up: appears when the Sol 15 drop is delivered. */}
      {game.resupplyDeliveredOnDay !== null ? (
        <ResupplyModal day={game.resupplyDeliveredOnDay} onClose={game.dismissResupply} />
      ) : null}

      {effectiveView === 'dashboard' ? (
        <Dashboard
          state={game.state}
          activity={game.activity}
          onDecide={game.decide}
          progression={progression}
          onNavigate={setView}
        />
      ) : null}

      {effectiveView === 'mission-setup' ? (
        <MissionSetup onLaunch={handleLaunch} current={currentConfig} />
      ) : null}

      {effectiveView === 'debrief' ? <Debrief state={game.state} /> : null}

      {effectiveView === 'achievements' ? <AchievementsPage progression={progression} /> : null}

      {effectiveView === 'how-to-play' ? <HowToPlay /> : null}

      <ProgressToasts events={progression.run.events} onDismiss={dismissNotifications} />

      {/* Game-over overlay: shown on the dashboard when the run has failed. */}
      {runFailed && effectiveView === 'dashboard' ? (
        <GameOver
          state={game.state}
          onRestartSame={handleRestartSame}
          onNewRun={handleNewRun}
        />
      ) : null}

      {/* Crisis Modal: shown when there are active events */}
      {game.state.activeEvents.length > 0 && effectiveView === 'dashboard' && !runFailed && game.state.activeEvents[0] ? (
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
