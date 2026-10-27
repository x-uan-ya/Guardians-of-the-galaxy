/**
 * Dashboard.tsx
 * -------------
 * The main mission-control screen. Composes the resource/crew/system panels,
 * operations controls, and the mission activity panels. It is a thin composer:
 * it receives state + handlers and lays out the feature panels.
 */

import type { ReactElement } from 'react';
import { BunkerGame } from './bunker/BunkerGame';
import { TacticalHud } from './TacticalHud';
import { CharacterPanel } from './CharacterPanel';
import { ResourceOverview } from './ResourceOverview';
import { CrewStatus } from './CrewStatus';
import { SystemStatus } from './SystemStatus';
import { OperationsPanel } from './OperationsPanel';
import { MissionActivity } from './MissionActivity';
import type { GameState } from '../simulation/simulationTypes';
import type { DecisionInput } from '../decisions/decisionTypes';
import type { ActivityEntry } from '../../hooks/useGameState';
import type { ViewKey } from '../../app/routes';
import { ProgressionPanel } from '../progression/ProgressionPanel';
import type { ProgressionState } from '../progression/progressionEngine';

interface DashboardProps {
  state: GameState;
  activity: ActivityEntry[];
  onDecide: (input: DecisionInput) => void;
  onAdvanceDay: () => void;
  progression: ProgressionState;
  onNavigate: (view: ViewKey) => void;
}

export function Dashboard({
  state,
  activity,
  onDecide,
  onAdvanceDay,
  progression,
  onNavigate,
}: DashboardProps): ReactElement {
  return (
    <div className="stagger space-y-4">
      <BunkerGame
        state={state}
        activity={activity}
        onDecide={onDecide}
        onAdvanceDay={onAdvanceDay}
      />
      <details className="panel p-4">
        <summary className="cursor-pointer font-semibold text-slate-200">
          Classic dashboard panels
        </summary>
        <div className="mt-4 space-y-4">
          <TacticalHud state={state} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <CharacterPanel state={state} />
            <div className="lg:col-span-2">
              <CrewStatus state={state} />
            </div>
          </div>
          <ProgressionPanel progression={progression} onNavigate={onNavigate} />
          <ResourceOverview state={state} />
          <OperationsPanel state={state} onDecide={onDecide} />
          <SystemStatus state={state} />
          <MissionActivity state={state} activity={activity} />
        </div>
      </details>
    </div>
  );
}
