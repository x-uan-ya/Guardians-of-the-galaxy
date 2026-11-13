/**
 * Dashboard.tsx
 * -------------
 * The main mission-control screen. Passes state and gameplay handlers to the
 * bunker interface, which contains the tablet, live readouts and actions.
 */

import type { ReactElement } from 'react';
import { BunkerGame } from './bunker/BunkerGame';
import type { GameState } from '../simulation/simulationTypes';
import type { DecisionInput } from '../decisions/decisionTypes';
import type { ActivityEntry } from '../../hooks/useGameState';

interface DashboardProps {
  state: GameState;
  activity: ActivityEntry[];
  onDecide: (input: DecisionInput) => void;
  onAdvanceDay: () => void;
  /** Play a whole turn (decision + advance) in one engine call. */
  onEndTurn?: (input?: DecisionInput) => void;
}

export function Dashboard({
  state,
  activity,
  onDecide,
  onAdvanceDay,
  onEndTurn,
}: DashboardProps): ReactElement {
  return (
    <div className="stagger space-y-4">
      <BunkerGame
        state={state}
        activity={activity}
        onDecide={onDecide}
        onAdvanceDay={onAdvanceDay}
        {...(onEndTurn ? { onEndTurn } : {})}
      />
    </div>
  );
}
