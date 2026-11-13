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

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Leaderboard } from '../features/leaderboard/Leaderboard';
import { PlayHistory } from '../features/history/PlayHistory';
import { recordRun } from '../features/history/historyService';
import { submitScore, submitScoreToApi } from '../features/leaderboard/leaderboardService';
import { ProgressToasts } from '../features/progression/ProgressToasts';
import { EmergencyNotice } from '../features/events/EmergencyNotice';
import { CrisisModal } from '../features/events/CrisisModal';
import { ChapterIntroModal } from '../features/storyline/ChapterIntroModal';
import { getChapterIntroductionByOpeningSol } from '../features/storyline/chapterIntroductions';
import { Tutorial } from '../features/tutorial/Tutorial';
import { hasTutorialCompleted, markTutorialComplete } from '../features/tutorial/tutorialService';
import { TitleScreen } from '../features/title/TitleScreen';
import { Login } from '../features/auth/Login';
import { Signup } from '../features/auth/Signup';
import { DEFAULT_MISSION_CONFIG, useGameState } from '../hooks/useGameState';
import { useGameFlow } from '../hooks/useGameFlow';
import { useProgression } from '../hooks/useProgression';
import type { MissionConfig, MissionType } from '../features/mission/missionTypes';
import type { DecisionInput } from '../features/decisions/decisionTypes';
import { type ViewKey } from './routes';
import { PersistenceBanner } from './PersistenceBanner';
import { getCurrentSession, logout, syncUsersFromApi } from '../features/auth/authService';
import type { User } from '../features/auth/authTypes';
import {
  completeChapterIntroduction,
  loadCompletedChapterIntroductions,
  hydrateSaveFromApi,
} from '../lib/storage';
import { hydrateAchievementsFromApi } from '../features/achievements/achievementService';
import { hydrateProgressionFromApi } from '../features/progression/progressionStorage';
import { hydrateHistoryFromApi } from '../features/history/historyService';

/** Sidebar views available as SECONDARY navigation during the PLAYING phase. */
type SubView = Extract<
  ViewKey,
  'dashboard' | 'debrief' | 'history' | 'achievements' | 'leaderboard' | 'how-to-play'
>;

/**
 * The signed-in player's game. It is mounted with key={user.id} (see App), so
 * signing out and in as someone else throws all of this away and starts fresh
 * from THAT account's own saved game. Nothing can carry over between accounts.
 */
function GameApp({ onLogout }: { onLogout: () => void }): ReactElement {
  const game = useGameState();
  const { decide } = game;
  // Flow starts at TITLE: the player sees the title screen, then the tutorial,
  // then mission selection, occupation selection, and finally the dashboard.
  const flow = useGameFlow('TITLE');
  const { progression, dismissNotifications } = useProgression(game.state);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Secondary navigation WITHIN the PLAYING phase (dashboard is the default).
  const [subView, setSubView] = useState<SubView>('dashboard');
  const [confirm, setConfirm] = useState<{ kind: 'new-run' | 'restart' } | null>(null);
  const [pendingEventDecision, setPendingEventDecision] = useState<DecisionInput | null>(null);
  const eventDecisionCommitted = useRef(false);
  // The mission site chosen on the MISSION_SELECT screen, carried into SETUP.
  const [selectedMission, setSelectedMission] = useState<MissionType>('mars');
  // The leaderboard entry id for the run just submitted (for highlighting).
  const [lastLeaderboardId, setLastLeaderboardId] = useState<string | undefined>(undefined);
  const [chapterIntroProgress, setChapterIntroProgress] = useState(() => ({
    gameId: game.state.gameId,
    completed: loadCompletedChapterIntroductions(game.state.gameId),
  }));

  // When true, the Tutorial is shown as an overlay on top of the current game
  // (triggered from the How to Play page). Mission state is NOT touched.
  const [tutorialReplayOpen, setTutorialReplayOpen] = useState(false);

  // --- Engine <-> flow synchronisation --------------------------------------

  // A restored saved run jumps straight into PLAYING (skipping title, tutorial and mission select).
  // This must happen ONCE at start-up. If it ran every time the notice said
  // "restored", pressing New later would bounce straight back into the old run.
  const restoreHandledRef = useRef(false);
  useEffect(() => {
    if (restoreHandledRef.current) return;
    if (game.notice.kind === 'restored' && flow.phase === 'TITLE') {
      restoreHandledRef.current = true;
      flow.restoreRun();
    }
  }, [game.notice.kind, flow]);

  const status = game.state.mission.status;
  const hasActiveEvent = game.state.activeEvents.length > 0;
  const introCanShowInPhase =
    flow.phase === 'PLAYING' || flow.phase === 'CRISIS' || flow.phase === 'PAUSED';
  const chapterIntroduction =
    introCanShowInPhase && (status === 'active' || status === 'critical')
      ? getChapterIntroductionByOpeningSol(game.state.day, game.state.mission.missionType)
      : undefined;
  const completedIntroductions =
    chapterIntroProgress.gameId === game.state.gameId
      ? chapterIntroProgress.completed
      : loadCompletedChapterIntroductions(game.state.gameId);
  const chapterIntroOpen =
    chapterIntroduction !== undefined &&
    !completedIntroductions.includes(chapterIntroduction.chapterNumber);

  // Load progress for a newly launched or restored playthrough.
  useEffect(() => {
    setChapterIntroProgress({
      gameId: game.state.gameId,
      completed: loadCompletedChapterIntroductions(game.state.gameId),
    });
  }, [game.state.gameId]);

  const completeCurrentIntroduction = (): void => {
    if (!chapterIntroOpen || !chapterIntroduction) return;

    // Record only after the player explicitly continues.
    completeChapterIntroduction(game.state.gameId, chapterIntroduction.chapterNumber);
    setChapterIntroProgress((current) => {
      const completed =
        current.gameId === game.state.gameId
          ? current.completed
          : loadCompletedChapterIntroductions(game.state.gameId);
      return {
        gameId: game.state.gameId,
        completed: [...new Set([...completed, chapterIntroduction.chapterNumber])],
      };
    });
  };

  // Keep the game callbacks inert while the presentation-only introduction is open.
  const handleAdvanceDay = (): void => {
    if (!chapterIntroOpen) game.advanceDay();
  };
  const handleEndTurn = (input?: Parameters<typeof game.decide>[0]): void => {
    if (!chapterIntroOpen) game.endTurn(input);
  };
  const handleDecide = (input: Parameters<typeof game.decide>[0]): void => {
    if (chapterIntroOpen) return;

    if (input.eventId !== undefined) {
      const event = game.state.activeEvents.find((active) => active.id === input.eventId);
      const actionIsAvailable = event?.availableActions.some(
        (action) => action.id === input.actionId,
      );
      if (event && actionIsAvailable) {
        eventDecisionCommitted.current = false;
        setPendingEventDecision(input);
        return;
      }
    }

    game.decide(input);
  };

  const reconsiderEventDecision = useCallback(() => {
    eventDecisionCommitted.current = false;
    setPendingEventDecision(null);
  }, []);

  const confirmEventDecision = useCallback(() => {
    if (!pendingEventDecision || chapterIntroOpen || eventDecisionCommitted.current) return;
    eventDecisionCommitted.current = true;
    setPendingEventDecision(null);
    decide(pendingEventDecision);
  }, [chapterIntroOpen, decide, pendingEventDecision]);
  const pendingEvent = pendingEventDecision?.eventId
    ? game.state.activeEvents.find((event) => event.id === pendingEventDecision.eventId)
    : undefined;
  const pendingAction = pendingEventDecision
    ? pendingEvent?.availableActions.find(
        (action) => action.id === pendingEventDecision.actionId,
      )
    : undefined;

  // Death / completion: move the flow into the matching terminal phase.
  useEffect(() => {
    if (flow.phase === 'PLAYING' || flow.phase === 'CRISIS') {
      if (status === 'failed') flow.die();
      else if (status === 'completed') flow.complete();
    }
  }, [status, flow]);

  // Auto-submit the player's result to the leaderboard once, when the run ends.
  // Keyed on the run's gameId so each run posts a single entry.
  useEffect(() => {
    if (status !== 'failed' && status !== 'completed') return;
    const runId = `run_${game.state.gameId}`;
    if (lastLeaderboardId === runId) return; // already submitted this run

    const session = getCurrentSession();
    const name = session ? session.email.split('@')[0] || 'Operator' : 'Operator';

    const entry = {
      id: runId,
      ...(session ? { userId: session.id } : {}),
      name,
      daysSurvived: game.state.day,
      score: game.state.mission.score,
      missionType: game.state.mission.missionType,
      occupation: game.state.character.occupation,
      outcome: (status === 'completed' ? 'completed' : 'failed') as 'completed' | 'failed',
      timestamp: Date.now(),
    };
    // Local board (instant, offline-safe) + Neon Postgres board (fire-and-forget).
    submitScore(entry);
    void submitScoreToApi(entry);
    setLastLeaderboardId(runId);
  }, [status, game.state, lastLeaderboardId]);

  // Play history: write this account's row once the run has ended. Repeating it
  // is harmless (a finished run keeps its first result).
  useEffect(() => {
    if (status === 'failed' || status === 'completed') recordRun(game.state, status);
  }, [status, game.state]);

  // Crisis: a new active event interrupts PLAYING; clearing it returns to play.
  useEffect(() => {
    if (flow.phase === 'PLAYING' && hasActiveEvent) flow.raiseCrisis();
    else if (flow.phase === 'CRISIS' && !hasActiveEvent) flow.resolveCrisis();
  }, [hasActiveEvent, flow]);

  // Keyboard: "P" pauses during active play (teammates can add a button later).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea');
      if (
        !chapterIntroOpen &&
        !typing &&
        (e.key === 'p' || e.key === 'P') &&
        flow.phase === 'PLAYING'
      ) {
        flow.pause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flow, chapterIntroOpen]);

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
    // Prevent the initial-restore effect from treating this intentional
    // mission-selection phase as a request to restore the saved run again.
    game.dismissNotice();
    setSubView('dashboard');
    flow.newRun();
  };

  // "New" (top bar) is the only way back to site and character selection once a
  // mission is running: your character is locked in for the whole mission. It
  // always asks first, because starting over throws the current mission away. A
  // mission that has already ended has nothing left to lose.
  const handleNewMission = (): void => {
    if (chapterIntroOpen) return;
    const runInProgress =
      status !== 'failed' &&
      status !== 'completed' &&
      (game.state.day > 1 ||
        game.state.history.length > 0 ||
        game.state.activeEvents.length > 0);
    if (runInProgress) setConfirm({ kind: 'new-run' });
    else goToNewRun();
  };

  // Sidebar navigation (Mission Control, Debrief, Play History, Badges, Leaderboard,
  // How to Play). Locked while a chapter introduction is open.
  const handleNavigate = (view: SubView): void => {
    if (chapterIntroOpen) return;
    setSubView(view);
  };

  // The end screens' "View mission debrief": open the Debrief page. The sidebar
  // keeps working afterwards, so the player is never stuck on it.
  const handleViewDebrief = (): void => {
    setSubView('debrief');
    flow.viewDebrief();
  };

  // TopBar "Reset" during play: confirm, then relaunch the SAME run from Sol 1
  // (same mission + occupation) — straight back into play, not occupation select.
  const handleReset = (): void => {
    if (!chapterIntroOpen) setConfirm({ kind: 'restart' });
  };

  const handleRestartSame = (): void => {
    // Repeat the exact same run: same mission site + occupation + settings.
    game.startNewMission({ ...currentConfig, missionType: game.state.mission.missionType });
    setSubView('dashboard');
    flow.launch();
  };

  const handleLogout = (): void => {
    // The log-out prompt promises "Your game progress will be saved", so do it.
    // This runs before the session is removed, so it saves to THIS account.
    game.save();
    logout();
    onLogout();
  };

  const handleToggleSidebar = (): void => setSidebarOpen((v) => !v);

  // Logo returns to Mission Control (the dashboard) during a run.
  const handleLogoClick = (): void => {
    if (chapterIntroOpen) return;
    if (flow.inRun) setSubView('dashboard');
  };

  // --- Start mission handler (tutorial-aware) --------------------------------
  // On the Title Screen, "Start Mission" checks whether this user has already
  // completed the tutorial. First-time players see the tutorial; returning
  // players skip straight to mission selection.
  const handleStartMission = useCallback((): void => {
    const session = getCurrentSession();
    if (session && hasTutorialCompleted(session.id)) {
      flow.skipTutorial(); // TITLE -> MISSION_SELECT
    } else {
      flow.start(); // TITLE -> TUTORIAL
    }
  }, [flow]);

  // When the first-run tutorial finishes (completed or skipped), persist the
  // flag and advance to mission selection.
  const handleTutorialDone = useCallback((): void => {
    const session = getCurrentSession();
    if (session) markTutorialComplete(session.id);
    flow.completeTutorial(); // TUTORIAL -> MISSION_SELECT
  }, [flow]);

  // Replay tutorial: open as overlay (no flow change, no game state change).
  const handleReplayTutorial = useCallback((): void => {
    setTutorialReplayOpen(true);
  }, []);

  const handleReplayTutorialClose = useCallback((): void => {
    setTutorialReplayOpen(false);
  }, []);

  // (Login / sign-up is handled by the App gate below, before this component exists.)

  // --- TITLE ----------------------------------------------------------------
  if (flow.phase === 'TITLE') {
    return (
      <TitleScreen
        onStart={handleStartMission}
        onContinue={flow.restoreRun}
        canContinue={game.notice.kind === 'restored'}
      />
    );
  }

  // --- TUTORIAL (interactive 5-step introduction for first-time players) ----
  if (flow.phase === 'TUTORIAL') {
    return <Tutorial onComplete={handleTutorialDone} />;
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
      onNavigate={handleNavigate}
      onAdvanceDay={handleAdvanceDay}
      onSave={game.save}
      onNewMission={handleNewMission}
      onReset={handleReset}
      onToggleSidebar={handleToggleSidebar}
      onLogoClick={handleLogoClick}
      onLogout={handleLogout}
    >
      <PersistenceBanner notice={game.notice} onDismiss={game.dismissNotice} />

      {/* The dashboard answers emergencies inline. On other pages a waiting emergency
          is only a reminder, so the page stays readable and Reset / New stay usable. */}
      {flow.phase === 'CRISIS' && subView !== 'dashboard' && game.state.activeEvents[0] ? (
        <EmergencyNotice
          event={game.state.activeEvents[0]}
          waiting={game.state.activeEvents.length - 1}
          onRespond={() => setSubView('dashboard')}
        />
      ) : null}

      {/* The page follows the sidebar. "View mission debrief" on the end screen
          selects the Debrief page (see handleViewDebrief), and every other page
          stays reachable from there. */}
      <>
          {subView === 'dashboard' ? (
            <Dashboard
              state={game.state}
              activity={game.activity}
              onDecide={handleDecide}
              onAdvanceDay={handleAdvanceDay}
              onEndTurn={handleEndTurn}
            />
          ) : null}
          {subView === 'debrief' ? (
            <Debrief
              state={game.state}
              onPlayAgain={status === 'failed' || status === 'completed' ? goToNewRun : undefined}
            />
          ) : null}
          {subView === 'history' ? <PlayHistory state={game.state} /> : null}
          {subView === 'achievements' ? <AchievementsPage progression={progression} /> : null}
          {subView === 'leaderboard' ? <Leaderboard highlightId={lastLeaderboardId} /> : null}
          {subView === 'how-to-play' ? <HowToPlay onReplayTutorial={handleReplayTutorial} /> : null}
      </>

      <ProgressToasts events={progression.run.events} onDismiss={dismissNotifications} />

      {chapterIntroOpen && chapterIntroduction ? (
        <ChapterIntroModal
          chapter={chapterIntroduction}
          onContinue={completeCurrentIntroduction}
        />
      ) : (
        <>
          {/* Reviewing a chosen event response (the choice is applied only on Confirm). */}
          {pendingEvent && pendingAction ? (
            <CrisisModal
              event={pendingEvent}
              action={pendingAction}
              onConfirm={confirmEventDecision}
              onReconsider={reconsiderEventDecision}
            />
          ) : null}

          {/* Resupply pop-up (Sol 15 drop) waits until the chapter introduction closes. */}
          {game.resupplyDeliveredOnDay !== null && !game.state.mission.modifiers.noResupply ? (
            <ResupplyModal day={game.resupplyDeliveredOnDay} onClose={game.dismissResupply} />
          ) : null}

          {/* PAUSED overlay. */}
          {flow.phase === 'PAUSED' ? (
            <PauseScreen onResume={flow.resume} onNewRun={goToNewRun} />
          ) : null}

          {/* GAME_OVER overlay: only shown when viewing the dashboard. */}
          {flow.phase === 'GAME_OVER' && subView === 'dashboard' ? (
            <GameOver
              state={game.state}
              onRestartSame={handleRestartSame}
              onNewRun={goToNewRun}
              onViewDebrief={handleViewDebrief}
            />
          ) : null}

          {/* MISSION_COMPLETE overlay: only shown when viewing the dashboard. */}
          {flow.phase === 'MISSION_COMPLETE' && subView === 'dashboard' ? (
            <MissionComplete
              state={game.state}
              onViewDebrief={handleViewDebrief}
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
              // Leaving a run that is still going counts as a played run, so its
              // score is kept in the history.
              if (status === 'active' || status === 'critical') recordRun(game.state, 'abandoned');
              if (kind === 'restart') handleRestartSame();
              else goToNewRun();
            }}
            onCancel={() => setConfirm(null)}
          />

          {/* Tutorial replay overlay: shown on top of the game, mission state untouched. */}
          {tutorialReplayOpen ? <Tutorial onComplete={handleReplayTutorialClose} /> : null}
        </>
      )}
    </AppShell>
  );
}

// Re-export the default mission config location for discoverability.
export { DEFAULT_MISSION_CONFIG };

/**
 * Sign-in gate. While nobody is signed in only the login / sign-up screens exist,
 * so there is no game in memory that another account could see.
 */
export function App(): ReactElement {
  const [user, setUser] = useState<User | null>(() => getCurrentSession());
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  // Gate GameApp until this user's Neon-backed state has been pulled into the
  // local mirror, because GameApp reads save/achievements/progression/history
  // synchronously on mount. Keyed by user id so switching accounts re-hydrates.
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  // Pull the Neon-backed account registry into the local mirror once at startup
  // so an account created on another device can sign in here. No-op offline.
  useEffect(() => {
    void syncUsersFromApi();
  }, []);

  // Hydrate this player's per-user state from Neon before showing the game.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const userId = user.id;
    void Promise.allSettled([
      hydrateSaveFromApi(),
      hydrateAchievementsFromApi(),
      hydrateProgressionFromApi(),
      hydrateHistoryFromApi(),
    ]).then(() => {
      // Even if every call failed (offline), proceed on the local mirror.
      if (!cancelled) setHydratedFor(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    // A successful login or sign-up has already stored the session.
    const onSignedIn = (): void => setUser(getCurrentSession());
    return authView === 'login' ? (
      <Login onLoginSuccess={onSignedIn} onSwitchToSignup={() => setAuthView('signup')} />
    ) : (
      <Signup onSignupSuccess={onSignedIn} onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  if (hydratedFor !== user.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-space-900 text-slate-300">
        <p className="text-sm">Syncing your mission data…</p>
      </div>
    );
  }

  return <GameApp key={user.id} onLogout={() => { setHydratedFor(null); setUser(null); }} />;
}