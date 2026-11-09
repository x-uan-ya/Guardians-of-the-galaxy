/**
 * gameFlow.test.ts
 * ----------------
 * Tests for the top-level game-flow state machine. The machine is the single
 * source of truth for flow, so these lock in the documented transitions:
 *  - the full happy path TITLE -> ... -> DEBRIEF -> MISSION_SELECT -> SETUP,
 *  - invalid events are no-ops (do not corrupt the phase),
 *  - crisis and pause round-trips,
 *  - both terminal paths (death vs. completion),
 *  - restoring a saved run from the title.
 */

import { describe, expect, it } from 'vitest';
import {
  INITIAL_PHASE,
  PHASE_META,
  canTransition,
  transition,
  type FlowEvent,
  type GamePhase,
} from '../app/gameFlow';

/** Fold a sequence of events from a starting phase. */
function run(start: GamePhase, events: FlowEvent['type'][]): GamePhase {
  return events.reduce<GamePhase>((phase, type) => transition(phase, { type } as FlowEvent), start);
}

describe('initial phase', () => {
  it('boots at TITLE', () => {
    expect(INITIAL_PHASE).toBe('TITLE');
  });
});

describe('happy path', () => {
  it('walks the tutorial, briefing-skip and new-run paths through mission selection', () => {
    const phases: GamePhase[] = [];
    let p: GamePhase = INITIAL_PHASE;
    for (const ev of [
      'START',
      'COMPLETE_TUTORIAL',
      'SELECT_MISSION',
      'LAUNCH',
      'COMPLETED',
      'VIEW_DEBRIEF',
      'NEW_RUN',
      'SELECT_MISSION',
    ] as FlowEvent['type'][]) {
      p = transition(p, { type: ev } as FlowEvent);
      phases.push(p);
    }
    expect(phases).toEqual([
      'TUTORIAL',
      'MISSION_SELECT',
      'SETUP',
      'PLAYING',
      'MISSION_COMPLETE',
      'DEBRIEF',
      'MISSION_SELECT',
      'SETUP',
    ]);
  });
});

describe('invalid events are no-ops', () => {
  it('ignores LAUNCH from TITLE', () => {
    expect(transition('TITLE', { type: 'LAUNCH' })).toBe('TITLE');
    expect(canTransition('TITLE', { type: 'LAUNCH' })).toBe(false);
  });

  it('ignores CONTINUE_BRIEFING while PLAYING', () => {
    expect(transition('PLAYING', { type: 'CONTINUE_BRIEFING' })).toBe('PLAYING');
  });

  it('ignores RESUME when not PAUSED', () => {
    expect(transition('PLAYING', { type: 'RESUME' })).toBe('PLAYING');
  });
});

describe('crisis round-trip', () => {
  it('PLAYING -> CRISIS -> PLAYING', () => {
    expect(run('PLAYING', ['CRISIS_RAISED', 'CRISIS_RESOLVED'])).toBe('PLAYING');
  });

  it('can die out of a crisis', () => {
    expect(run('PLAYING', ['CRISIS_RAISED', 'DIED'])).toBe('GAME_OVER');
  });
});

describe('pause round-trip', () => {
  it('PLAYING -> PAUSED -> PLAYING', () => {
    expect(run('PLAYING', ['PAUSE', 'RESUME'])).toBe('PLAYING');
  });

  it('can pause out of a crisis and resume to PLAYING', () => {
    expect(run('CRISIS', ['PAUSE', 'RESUME'])).toBe('PLAYING');
  });
});

describe('terminal paths', () => {
  it('death routes to GAME_OVER then DEBRIEF', () => {
    expect(run('PLAYING', ['DIED'])).toBe('GAME_OVER');
    expect(run('PLAYING', ['DIED', 'VIEW_DEBRIEF'])).toBe('DEBRIEF');
  });

  it('completion routes to MISSION_COMPLETE then DEBRIEF', () => {
    expect(run('PLAYING', ['COMPLETED'])).toBe('MISSION_COMPLETE');
    expect(run('PLAYING', ['COMPLETED', 'VIEW_DEBRIEF'])).toBe('DEBRIEF');
  });

  it('marks terminal phases in metadata', () => {
    expect(PHASE_META.GAME_OVER.terminal).toBe(true);
    expect(PHASE_META.MISSION_COMPLETE.terminal).toBe(true);
    expect(PHASE_META.PLAYING.terminal).toBe(false);
  });
});

describe('new run + restore', () => {
  it('NEW_RUN from any in-run or terminal phase returns to mission selection', () => {
    for (const phase of ['PLAYING', 'CRISIS', 'PAUSED', 'GAME_OVER', 'MISSION_COMPLETE', 'DEBRIEF'] as GamePhase[]) {
      expect(transition(phase, { type: 'NEW_RUN' })).toBe('MISSION_SELECT');
    }
  });

  it('selecting a mission continues to character setup before launch', () => {
    expect(transition('MISSION_SELECT', { type: 'SELECT_MISSION' })).toBe('SETUP');
    expect(transition('SETUP', { type: 'LAUNCH' })).toBe('PLAYING');
  });

  it('restoring a saved run jumps TITLE -> PLAYING', () => {
    expect(transition('TITLE', { type: 'RESTORE_RUN' })).toBe('PLAYING');
  });

  it('inRun metadata is true only for active-mission phases', () => {
    expect(PHASE_META.PLAYING.inRun).toBe(true);
    expect(PHASE_META.CRISIS.inRun).toBe(true);
    expect(PHASE_META.PAUSED.inRun).toBe(true);
    expect(PHASE_META.TITLE.inRun).toBe(false);
    expect(PHASE_META.SETUP.inRun).toBe(false);
    expect(PHASE_META.BRIEFING.inRun).toBe(false);
    expect(PHASE_META.DEBRIEF.inRun).toBe(false);
  });
});
