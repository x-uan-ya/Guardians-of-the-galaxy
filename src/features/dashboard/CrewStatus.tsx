/**
 * CrewStatus.tsx
 * --------------
 * Crew health, morale, and radiation exposure. Radiation is "high = bad", so
 * its StatusLevel comes from the engine's inverted classifier (already baked
 * into the derived status we read here).
 */

import type { ReactElement } from 'react';
import { HeartPulse, Radiation, Smile, Users } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatusCard } from '../../components/ui/StatusCard';
import { calculateDerivedStatus } from '../simulation/simulationEngine';
import type { GameState } from '../simulation/simulationTypes';
import { CREW_LABELS, PERCENT_UNIT } from './labels';

interface CrewStatusProps {
  state: GameState;
}

export function CrewStatus({ state }: CrewStatusProps): ReactElement {
  const derived = calculateDerivedStatus(state);

  return (
    <section className="panel p-4">
      <SectionHeader title="Vitals" icon={Users} subtitle="Live condition of your character" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatusCard
          label={CREW_LABELS.health}
          value={derived.crew.health.value}
          unit={PERCENT_UNIT}
          level={derived.crew.health.level}
          icon={HeartPulse}
        />
        <StatusCard
          label={CREW_LABELS.morale}
          value={derived.crew.morale.value}
          unit={PERCENT_UNIT}
          level={derived.crew.morale.level}
          icon={Smile}
        />
        <StatusCard
          label={CREW_LABELS.radiationExposure}
          value={derived.crew.radiationExposure.value}
          unit={PERCENT_UNIT}
          level={derived.crew.radiationExposure.level}
          icon={Radiation}
          caption="Higher is more dangerous"
        />
      </div>
    </section>
  );
}
