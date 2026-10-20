/**
 * SystemStatus.tsx
 * ----------------
 * The four engineering systems as StatusCards. Pure reader of derived status.
 */

import type { ReactElement } from 'react';
import { Factory, Leaf, Shield, Zap } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatusCard } from '../../components/ui/StatusCard';
import { calculateDerivedStatus } from '../simulation/simulationEngine';
import type { GameState } from '../simulation/simulationTypes';
import { PERCENT_UNIT, SYSTEM_LABELS } from './labels';
import { Cpu } from 'lucide-react';

interface SystemStatusProps {
  state: GameState;
}

export function SystemStatus({ state }: SystemStatusProps): ReactElement {
  const derived = calculateDerivedStatus(state);

  return (
    <section className="panel p-4">
      <SectionHeader title="Systems" icon={Cpu} subtitle="Engineering subsystem efficiency" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatusCard
          label={SYSTEM_LABELS.powerGeneration}
          value={derived.systems.powerGeneration.value}
          unit={PERCENT_UNIT}
          level={derived.systems.powerGeneration.level}
          icon={Zap}
        />
        <StatusCard
          label={SYSTEM_LABELS.lifeSupportEfficiency}
          value={derived.systems.lifeSupportEfficiency.value}
          unit={PERCENT_UNIT}
          level={derived.systems.lifeSupportEfficiency.level}
          icon={Factory}
        />
        <StatusCard
          label={SYSTEM_LABELS.foodProduction}
          value={derived.systems.foodProduction.value}
          unit={PERCENT_UNIT}
          level={derived.systems.foodProduction.level}
          icon={Leaf}
        />
        <StatusCard
          label={SYSTEM_LABELS.shieldingIntegrity}
          value={derived.systems.shieldingIntegrity.value}
          unit={PERCENT_UNIT}
          level={derived.systems.shieldingIntegrity.level}
          icon={Shield}
        />
      </div>
    </section>
  );
}
