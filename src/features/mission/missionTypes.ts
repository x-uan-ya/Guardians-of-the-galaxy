/**
 * missionTypes.ts
 * ---------------
 * Configuration the player chooses at mission setup. This is the input to the
 * engine's createInitialGameState(config).
 *
 * The mission-defining enums (MissionObjective, OperatingPhilosophy,
 * StartingCondition) are declared once in simulationTypes and re-exported here
 * for convenience — they are NOT redefined.
 */

export type {
  MissionObjective,
  OperatingPhilosophy,
  StartingCondition,
} from '../simulation/simulationTypes';

import type {
  MissionObjective,
  OperatingPhilosophy,
  StartingCondition,
} from '../simulation/simulationTypes';

/** Player-chosen configuration for a new mission. */
export interface MissionConfig {
  objective: MissionObjective;
  operatingPhilosophy: OperatingPhilosophy;
  startingCondition: StartingCondition;
  /**
   * Optional fixed seed/id for deterministic playthroughs and tests. When
   * omitted the engine generates one. Supplying the same gameId + same config
   * + same decision sequence reproduces identical results.
   */
  gameId?: string;
  /** Optional fixed creation timestamp (ms). Lets tests pin createdAt. */
  now?: number;
}
