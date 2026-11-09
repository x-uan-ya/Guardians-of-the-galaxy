/**
 * useGameFlow.ts
 * --------------
 * React wrapper around the pure game-flow state machine (app/gameFlow.ts).
 * Holds the current GamePhase and exposes intent-level actions the UI calls.
 *
 * The UI should dispatch INTENTS (e.g. `flow.launch()`), never set a phase
 * directly — that keeps every transition going through the validated machine.
 *
 * This hook owns ONLY the flow phase. Simulation/game data lives in
 * useGameState; the two are composed in App.
 */

import { useCallback, useReducer } from 'react';
import {
  INITIAL_PHASE,
  PHASE_META,
  transition,
  type FlowEvent,
  type GamePhase,
} from '../app/gameFlow';

export interface UseGameFlow {
  /** The current top-level phase. */
  phase: GamePhase;
  /** True when a mission is active (PLAYING/CRISIS/PAUSED/terminal). */
  inRun: boolean;
  /** True when the run has ended (GAME_OVER / MISSION_COMPLETE). */
  terminal: boolean;

  // Intent-level transitions (dispatch a FlowEvent through the machine).
  start: () => void; //            TITLE -> TUTORIAL (first-time)
  skipTutorial: () => void; //     TITLE -> MISSION_SELECT (returning player)
  completeTutorial: () => void; //  TUTORIAL -> MISSION_SELECT
  continueBriefing: () => void; //  BRIEFING -> MISSION_SELECT
  selectMission: () => void; //     MISSION_SELECT -> SETUP
  launch: () => void; //            SETUP -> PLAYING
  raiseCrisis: () => void; //       PLAYING -> CRISIS
  resolveCrisis: () => void; //     CRISIS -> PLAYING
  pause: () => void; //             -> PAUSED
  resume: () => void; //            PAUSED -> PLAYING
  die: () => void; //               -> GAME_OVER
  complete: () => void; //          -> MISSION_COMPLETE
  viewDebrief: () => void; //       terminal -> DEBRIEF
  newRun: () => void; //            -> SETUP
  quitToTitle: () => void; //       -> TITLE
  restoreRun: () => void; //        TITLE -> PLAYING (saved run loaded)

  /** Escape hatch for advanced callers/tests: dispatch a raw FlowEvent. */
  dispatch: (event: FlowEvent) => void;
}

function reducer(phase: GamePhase, event: FlowEvent): GamePhase {
  return transition(phase, event);
}

export function useGameFlow(initial: GamePhase = INITIAL_PHASE): UseGameFlow {
  const [phase, dispatch] = useReducer(reducer, initial);

  const make = useCallback(
    (event: FlowEvent) => () => dispatch(event),
    []
  );

  return {
    phase,
    inRun: PHASE_META[phase].inRun,
    terminal: PHASE_META[phase].terminal,

    start: make({ type: 'START' }),
    skipTutorial: make({ type: 'SKIP_TUTORIAL' }),
    completeTutorial: make({ type: 'COMPLETE_TUTORIAL' }),
    continueBriefing: make({ type: 'CONTINUE_BRIEFING' }),
    selectMission: make({ type: 'SELECT_MISSION' }),
    launch: make({ type: 'LAUNCH' }),
    raiseCrisis: make({ type: 'CRISIS_RAISED' }),
    resolveCrisis: make({ type: 'CRISIS_RESOLVED' }),
    pause: make({ type: 'PAUSE' }),
    resume: make({ type: 'RESUME' }),
    die: make({ type: 'DIED' }),
    complete: make({ type: 'COMPLETED' }),
    viewDebrief: make({ type: 'VIEW_DEBRIEF' }),
    newRun: make({ type: 'NEW_RUN' }),
    quitToTitle: make({ type: 'QUIT_TITLE' }),
    restoreRun: make({ type: 'RESTORE_RUN' }),

    dispatch,
  };
}
