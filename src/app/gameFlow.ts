/**
 * gameFlow.ts
 * ===========
 * THE single source of truth for the game's top-level flow. The whole team
 * plugs their screens into these phases, so keep this file the one place that
 * defines "what phase are we in and how do we move between phases".
 *
 * FLOW (see the diagram in the design doc):
 *
 *   TITLE
 *     ↓ start
 *   BRIEFING
 *     ↓ continue
 *   SETUP            (occupation selection + mission config)
 *     ↓ launch
 *   PLAYING  ⇄  CRISIS         (a crisis interrupts play; resolving returns)
 *     ↓            ↓
 *   PLAYING  ⇄  PAUSED         (player can pause/resume)
 *     ↓
 *   GAME_OVER  or  MISSION_COMPLETE   (death/failure vs. survived to extraction)
 *     ↓ debrief
 *   DEBRIEF
 *     ↓ newRun
 *   SETUP            (back to occupation selection for a fresh run)
 *
 * This module is PURE: no React, no I/O. The reducer validates every
 * transition, so illegal jumps are caught instead of silently corrupting flow.
 * UI state (which phase) lives in useGameFlow; game simulation state lives in
 * useGameState. The two are intentionally separate concerns.
 */

/** Every top-level phase of the game. */
export type GamePhase =
  | 'TITLE'
  | 'BRIEFING'
  | 'MISSION_SELECT'
  | 'SETUP'
  | 'PLAYING'
  | 'CRISIS'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'MISSION_COMPLETE'
  | 'DEBRIEF';

/** The intents that drive phase changes. UI dispatches these, never raw phases. */
export type FlowEvent =
  | { type: 'START' } //            TITLE -> BRIEFING
  | { type: 'CONTINUE_BRIEFING' } // BRIEFING -> MISSION_SELECT
  | { type: 'SELECT_MISSION' } //    MISSION_SELECT -> SETUP
  | { type: 'LAUNCH' } //            SETUP -> PLAYING
  | { type: 'CRISIS_RAISED' } //     PLAYING -> CRISIS
  | { type: 'CRISIS_RESOLVED' } //   CRISIS -> PLAYING
  | { type: 'PAUSE' } //             PLAYING/CRISIS -> PAUSED
  | { type: 'RESUME' } //            PAUSED -> PLAYING
  | { type: 'DIED' } //              PLAYING/CRISIS -> GAME_OVER
  | { type: 'COMPLETED' } //         PLAYING/CRISIS -> MISSION_COMPLETE
  | { type: 'VIEW_DEBRIEF' } //      GAME_OVER/MISSION_COMPLETE -> DEBRIEF
  | { type: 'NEW_RUN' } //           (most phases) -> SETUP
  | { type: 'QUIT_TITLE' } //        (most phases) -> TITLE
  | { type: 'RESTORE_RUN' }; //      TITLE -> PLAYING (a saved run was loaded)

/** The very first phase on a fresh boot. */
export const INITIAL_PHASE: GamePhase = 'TITLE';

/**
 * Allowed transitions. Each phase maps the events it accepts to the next phase.
 * An event not listed for the current phase is a no-op (ignored), which makes
 * the machine forgiving of stray UI events without corrupting flow.
 */
const TRANSITIONS: Record<GamePhase, Partial<Record<FlowEvent['type'], GamePhase>>> = {
  TITLE: {
    START: 'BRIEFING',
    RESTORE_RUN: 'PLAYING',
    NEW_RUN: 'SETUP',
  },
  BRIEFING: {
    CONTINUE_BRIEFING: 'MISSION_SELECT',
    RESTORE_RUN: 'PLAYING',
    QUIT_TITLE: 'TITLE',
  },
  MISSION_SELECT: {
    SELECT_MISSION: 'SETUP',
    QUIT_TITLE: 'TITLE',
  },
  SETUP: {
    LAUNCH: 'PLAYING',
    QUIT_TITLE: 'TITLE',
  },
  PLAYING: {
    CRISIS_RAISED: 'CRISIS',
    PAUSE: 'PAUSED',
    DIED: 'GAME_OVER',
    COMPLETED: 'MISSION_COMPLETE',
    NEW_RUN: 'SETUP',
    QUIT_TITLE: 'TITLE',
  },
  CRISIS: {
    CRISIS_RESOLVED: 'PLAYING',
    PAUSE: 'PAUSED',
    DIED: 'GAME_OVER',
    COMPLETED: 'MISSION_COMPLETE',
    NEW_RUN: 'SETUP',
    QUIT_TITLE: 'TITLE',
  },
  PAUSED: {
    RESUME: 'PLAYING',
    NEW_RUN: 'SETUP',
    QUIT_TITLE: 'TITLE',
  },
  GAME_OVER: {
    VIEW_DEBRIEF: 'DEBRIEF',
    NEW_RUN: 'SETUP',
    QUIT_TITLE: 'TITLE',
  },
  MISSION_COMPLETE: {
    VIEW_DEBRIEF: 'DEBRIEF',
    NEW_RUN: 'SETUP',
    QUIT_TITLE: 'TITLE',
  },
  DEBRIEF: {
    NEW_RUN: 'SETUP',
    QUIT_TITLE: 'TITLE',
  },
};

/**
 * Pure transition function. Returns the next phase for (phase, event), or the
 * SAME phase if the event is not valid in the current phase (a no-op).
 */
export function transition(phase: GamePhase, event: FlowEvent): GamePhase {
  return TRANSITIONS[phase][event.type] ?? phase;
}

/** True if `event` would actually change the phase (useful for guards/tests). */
export function canTransition(phase: GamePhase, event: FlowEvent): boolean {
  return TRANSITIONS[phase][event.type] !== undefined;
}

/**
 * Phase metadata for the UI. `terminal` marks run-ending phases; `inRun` marks
 * phases where a mission is active (so the HUD/sidebar should be available).
 */
export interface PhaseMeta {
  /** Short human label. */
  label: string;
  /** A mission is active in this phase (show HUD chrome). */
  inRun: boolean;
  /** The run has ended (success or failure) in this phase. */
  terminal: boolean;
}

export const PHASE_META: Record<GamePhase, PhaseMeta> = {
  TITLE: { label: 'Title', inRun: false, terminal: false },
  BRIEFING: { label: 'Mission Briefing', inRun: false, terminal: false },
  MISSION_SELECT: { label: 'Mission Selection', inRun: false, terminal: false },
  SETUP: { label: 'Occupation Selection', inRun: false, terminal: false },
  PLAYING: { label: 'Mission Control', inRun: true, terminal: false },
  CRISIS: { label: 'Crisis', inRun: true, terminal: false },
  PAUSED: { label: 'Paused', inRun: true, terminal: false },
  GAME_OVER: { label: 'Mission Failed', inRun: true, terminal: true },
  MISSION_COMPLETE: { label: 'Mission Complete', inRun: true, terminal: true },
  DEBRIEF: { label: 'Debrief', inRun: false, terminal: false },
};
