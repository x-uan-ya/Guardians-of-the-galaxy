/**
 * App.tsx
 * -------
 * The composition root. Top-level game FLOW is driven by the phase state
 * machine (useGameFlow / app/gameFlow.ts) — this is the single source of truth
 * every teammate plugs screens into:
 *
 *   TITLE → BRIEFING → SETUP → PLAYING ⇄ CRISIS / PAUSED
 *                                  ↓
 *                        GAME_OVER | MISSION_COMPLETE → DEBRIEF → SETUP
 *
 * Responsibilities:
 *  - auth gate (login/signup) before the game shell,
 *  - render the screen for the current phase,
 *  - sync engine outcomes (death/complete/crisis) into flow events,
 *  - keep secondary sidebar navigation (Badges / How-to-Play / Debrief page)
 *    available during PLAYING.
 *
 * App holds NO simulation logic. Game state changes route through useGameState;
 * flow changes route through useGameFlow.
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dashboard } from '../features/dashboard/Dashboard';
import { MissionSetup } from '../features/mission/MissionSetup';
import { MissionSelect } from '../features/mission/MissionSelect';
import { Briefing } from '../features/mission/Briefing';
import { ResupplyModal } from '../features/mission/ResupplyModal';
import { GameOver } from '../features/mission/GameOver';
import { MissionComplete } from '../features/mission/MissionComplete';
import { PauseScreen } from '../features/mission/PauseScreen';
import { Debrief } from '../features/debrief/Debrief';
import { HowToPlay } from '../features/how-to-play/HowToPlay';
import { AchievementsPage } from '../features/progression/AchievementsPage';
import { ProgressToasts } from '../features/progression/ProgressToasts';
import { CrisisModal } from '../features/events/CrisisModal';
import { Login } from '../features/auth/Login';
import { Signup } from '../features/auth/Signup';
import { DEFAULT_MISSION_CONFIG, useGameState } from '../hooks/useGameState';
import { useGameFlow } from '../hooks/useGameFlow';
import { useProgression } from '../hooks/useProgression';
import type { MissionConfig, MissionType } from '../features/mission/missionTypes';
import { type ViewKey } from './routes';
import { PersistenceBanner } from './PersistenceBanner';
import { isAuthenticated, logout } from '../features/auth/authService';

/** Sidebar views available as SECONDARY navigation during the PLAYING phase. */
type SubView = Extract<ViewKey, 'dashboard' | 'debrief' | 'achievements' | 'how-to-play'>;

export function App(): ReactElement {
  const game = useGameState();
  // Flow starts at BRIEFING: after login the player goes straight into the
  // briefing, then occupation selection, then the dashboard. (No title screen.)
  const flow = useGameFlow('BRIEFING');
  const { progression, dismissNotifications } = useProgression(game.state);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Secondary navigation WITHIN the PLAYING phase (dashboard is the default).
  const [subView, setSubView] = useState<SubView>('dashboard');
  const [confirm, setConfirm] = useState<{ kind: 'new-run' | 'restart' } | null>(null);
  // The mission site chosen on the MISSION_SELECT screen, carried into SETUP.
  const [selectedMission, setSelectedMission] = useState<MissionType>('mars');

  // --- Auth -----------------------------------------------------------------
  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, []);

  // --- Engine <-> flow synchronisation --------------------------------------

  // A restored saved run jumps straight into PLAYING (skipping the briefing).
  useEffect(() => {
    if (game.notice.kind === 'restored' && flow.phase === 'BRIEFING') {
      flow.restoreRun();
    }
  }, [game.notice.kind, flow]);

  const status = game.state.mission.status;
  const hasActiveEvent = game.state.activeEvents.length > 0;

  // Death / completion: move the flow into the matching terminal phase.
  useEffect(() => {
    if (flow.phase === 'PLAYING' || flow.phase === 'CRISIS') {
      if (status === 'failed') flow.die();
      else if (status === 'completed') flow.complete();
    }
  }, [status, flow]);

  // Crisis: a new active event interrupts PLAYING; clearing it returns to play.
  useEffect(() => {
    if (flow.phase === 'PLAYING' && hasActiveEvent) flow.raiseCrisis();
    else if (flow.phase === 'CRISIS' && !hasActiveEvent) flow.resolveCrisis();
  }, [hasActiveEvent, flow]);

  // Keyboard: "P" pauses during active play (teammates can add a button later).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea');
      if (!typing && (e.key === 'p' || e.key === 'P') && flow.phase === 'PLAYING') {
        flow.pause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flow]);

  // --- Config + handlers ----------------------------------------------------

  const currentConfig: MissionConfig = {
    missionType: selectedMission,
    occupation: game.state.character.occupation,
    objective: game.state.mission.objective,
    operatingPhilosophy: game.state.mission.operatingPhilosophy,
    startingCondition: game.state.mission.startingCondition,
  };

  // SETUP -> PLAYING: build the run from the player's chosen config.
  const handleLaunch = (config: MissionConfig): void => {
    game.startNewMission(config);
    setSubView('dashboard');
    flow.launch();
  };

  // Start a fresh run by choosing a site before entering character setup.
  const goToNewRun = (): void => {
    setSubView('dashboard');
    flow.newRun();
  };

  // TopBar "New Mission" during play: confirm before choosing a new site.
  const handleNewMission = (): void => setConfirm({ kind: 'new-run' });

  // TopBar "Reset" during play: confirm, then relaunch the SAME run from Sol 1
  // (same mission + occupation) — straight back into play, not occupation select.
  const handleReset = (): void => setConfirm({ kind: 'restart' });

  const handleRestartSame = (): void => {
    // Repeat the exact same run: same mission site + occupation + settings.
    game.startNewMission({ ...currentConfig, missionType: game.state.mission.missionType });
    setSubView('dashboard');
    flow.launch();
  };

  const handleLogout = (): void => {
    logout();
    setIsLoggedIn(false);
    flow.quitToTitle();
  };

  const handleToggleSidebar = (): void => setSidebarOpen((v) => !v);

  // Logo returns to Mission Control (the dashboard) during a run.
  const handleLogoClick = (): void => {
    if (flow.inRun) setSubView('dashboard');
  };

  // --- Auth screens ---------------------------------------------------------
  if (!isLoggedIn) {
    return authView === 'login' ? (
      <Login
        onLoginSuccess={() => setIsLoggedIn(true)}
        onSwitchToSignup={() => setAuthView('signup')}
      />
    ) : (
      <Signup
        onSignupSuccess={() => setIsLoggedIn(true)}
        onSwitchToLogin={() => setAuthView('login')}
      />
    );
  }

  // --- BRIEFING -------------------------------------------------------------
  if (flow.phase === 'BRIEFING') {
    return <Briefing onContinue={flow.continueBriefing} />;
  }

  // --- MISSION_SELECT (choose the deployment site) --------------------------
  if (flow.phase === 'MISSION_SELECT') {
    return (
      <MissionSelect
        current={selectedMission}
        onSelect={(missionType) => {
          setSelectedMission(missionType);
          flow.selectMission();
        }}
      />
    );
  }

  // --- SETUP (occupation selection) -----------------------------------------
  if (flow.phase === 'SETUP') {
    return <MissionSetup onLaunch={handleLaunch} current={currentConfig} />;
  }

  // --- In-run phases: PLAYING / CRISIS / PAUSED / GAME_OVER /
  //     MISSION_COMPLETE / DEBRIEF — all rendered inside the AppShell. --------
  return (
    <AppShell
      day={game.state.day}
      status={game.state.mission.status}
      score={game.state.mission.score}
      storageAvailable={game.storageAvailable}
      activeView={subView}
      hasActiveEvents={hasActiveEvent}
      sidebarOpen={sidebarOpen}
      onNavigate={(v) => setSubView(v as SubView)}
      onAdvanceDay={game.advanceDay}
      onSave={game.save}
      onNewMission={handleNewMission}
      onReset={handleReset}
      onToggleSidebar={handleToggleSidebar}
      onLogoClick={handleLogoClick}
      onLogout={handleLogout}
    >
      <PersistenceBanner notice={game.notice} onDismiss={game.dismissNotice} />

      {/* DEBRIEF takes over the main panel; otherwise show the sub-view. */}
      {flow.phase === 'DEBRIEF' ? (
        <Debrief state={game.state} />
      ) : (
        <>
          {subView === 'dashboard' ? (
            <Dashboard
              state={game.state}
              activity={game.activity}
              onDecide={game.decide}
              onAdvanceDay={game.advanceDay}
              progression={progression}
              onNavigate={(v) => setSubView(v as SubView)}
            />
          ) : null}
          {subView === 'debrief' ? <Debrief state={game.state} /> : null}
          {subView === 'achievements' ? <AchievementsPage progression={progression} /> : null}
          {subView === 'how-to-play' ? <HowToPlay /> : null}
        </>
      )}

      <ProgressToasts events={progression.run.events} onDismiss={dismissNotifications} />

      {/* Resupply pop-up (Sol 15 drop). */}
      {game.resupplyDeliveredOnDay !== null && !game.state.mission.modifiers.noResupply ? (
        <ResupplyModal day={game.resupplyDeliveredOnDay} onClose={game.dismissResupply} />
      ) : null}

      {/* The dashboard handles emergencies inline; other views keep the overlay. */}
      {flow.phase === 'CRISIS' && subView !== 'dashboard' && game.state.activeEvents[0] ? (
        <CrisisModal
          event={game.state.activeEvents[0]}
          onChoose={(actionId, choice) => {
            const event = game.state.activeEvents[0];
            if (event) game.resolveActiveEvent(event.id, actionId, choice);
          }}
        />
      ) : null}

      {/* PAUSED overlay. */}
      {flow.phase === 'PAUSED' ? (
        <PauseScreen onResume={flow.resume} onNewRun={goToNewRun} />
      ) : null}

      {/* GAME_OVER overlay. */}
      {flow.phase === 'GAME_OVER' ? (
        <GameOver
          state={game.state}
          onRestartSame={handleRestartSame}
          onNewRun={goToNewRun}
          onViewDebrief={flow.viewDebrief}
        />
      ) : null}

      {/* MISSION_COMPLETE overlay. */}
      {flow.phase === 'MISSION_COMPLETE' ? (
        <MissionComplete
          state={game.state}
          onViewDebrief={flow.viewDebrief}
          onNewRun={goToNewRun}
        />
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === 'restart' ? 'Reset mission?' : 'Start a new run?'}
        message={
          confirm?.kind === 'restart'
            ? `This restarts the current mission from Sol 1 with the same site and occupation. Progress (Sol ${game.state.day}, ${game.state.history.length} decisions) will be lost.`
            : `This discards the current mission (Sol ${game.state.day}, ${game.state.history.length} decisions) and continues to mission selection, then character setup.`
        }
        confirmLabel={confirm?.kind === 'restart' ? 'Reset & restart' : 'Discard & continue'}
        onConfirm={() => {
          const kind = confirm?.kind;
          setConfirm(null);
          if (kind === 'restart') handleRestartSame();
          else goToNewRun();
        }}
        onCancel={() => setConfirm(null)}
      />
    </AppShell>
  );
}

// Re-export the default mission config location for discoverability.
export { DEFAULT_MISSION_CONFIG };
