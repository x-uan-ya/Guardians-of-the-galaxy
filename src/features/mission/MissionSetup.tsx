/**
 * MissionSetup.tsx
 * ----------------
 * A simple panel to configure and launch a new mission. It builds a
 * MissionConfig and hands it to the parent (which calls the engine). Starting
 * a new mission discards the current game, so the parent confirms first.
 *
 * Choices adjust documented starting values / simulation parameters only — this
 * is NOT a procedural mission generator.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { Rocket } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import {
  CONSTRAINED_RESOURCES,
  PHILOSOPHY_CONSUMPTION,
  STANDARD_RESOURCES,
} from './missionDefaults';
import type {
  MissionConfig,
  MissionObjective,
  OperatingPhilosophy,
  StartingCondition,
} from './missionTypes';

interface MissionSetupProps {
  /** Called when the player launches. Parent handles the confirm + engine call. */
  onLaunch: (config: MissionConfig) => void;
  /** The current objective, used to preselect the controls. */
  current: MissionConfig;
}

const OBJECTIVES: { value: MissionObjective; label: string; blurb: string }[] = [
  { value: 'survival', label: 'Survival', blurb: 'Keep the crew alive. Life support is prioritised.' },
  { value: 'science', label: 'Science', blurb: 'Maximise research. Power systems are prioritised.' },
  { value: 'settlement', label: 'Settlement', blurb: 'Grow the outpost. Food production is prioritised.' },
];

const PHILOSOPHIES: { value: OperatingPhilosophy; label: string; blurb: string }[] = [
  { value: 'conservative', label: 'Conservative', blurb: 'Ration hard. Lower consumption, slower growth.' },
  { value: 'balanced', label: 'Balanced', blurb: 'The reference approach.' },
  { value: 'ambitious', label: 'Ambitious', blurb: 'Push the outpost. Higher consumption, faster progress.' },
];

const CONDITIONS: { value: StartingCondition; label: string; blurb: string }[] = [
  { value: 'standard', label: 'Standard', blurb: 'Comfortable starting reserves.' },
  { value: 'resource-constrained', label: 'Resource-constrained', blurb: 'Tight reserves. Harder start.' },
];

function OptionGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string; blurb: string }[];
  value: T;
  onChange: (v: T) => void;
}): ReactElement {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {legend}
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className={`rounded-md border p-3 text-left transition-colors ${
                selected
                  ? 'border-mars-red/50 bg-mars-red/10 text-slate-100'
                  : 'border-space-600 bg-space-700/40 text-slate-300 hover:bg-space-700'
              }`}
            >
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">{opt.blurb}</div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function MissionSetup({ onLaunch, current }: MissionSetupProps): ReactElement {
  const [objective, setObjective] = useState<MissionObjective>(current.objective);
  const [philosophy, setPhilosophy] = useState<OperatingPhilosophy>(current.operatingPhilosophy);
  const [condition, setCondition] = useState<StartingCondition>(current.startingCondition);

  const preview = condition === 'resource-constrained' ? CONSTRAINED_RESOURCES : STANDARD_RESOURCES;
  const consumption = PHILOSOPHY_CONSUMPTION[philosophy];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="panel p-5">
        <SectionHeader
          title="Mission Setup"
          icon={Rocket}
          subtitle="Configure the next mission. Launching discards the current game."
        />

        <div className="space-y-5">
          <OptionGroup legend="Objective" options={OBJECTIVES} value={objective} onChange={setObjective} />
          <OptionGroup
            legend="Operating Philosophy"
            options={PHILOSOPHIES}
            value={philosophy}
            onChange={setPhilosophy}
          />
          <OptionGroup
            legend="Starting Conditions"
            options={CONDITIONS}
            value={condition}
            onChange={setCondition}
          />
        </div>

        {/* Documented starting-value preview */}
        <div className="mt-5 rounded-md border border-space-600 bg-space-700/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Starting values (illustrative, not real mission data)
          </p>
          <div className="tnum grid grid-cols-2 gap-2 text-sm text-slate-300 sm:grid-cols-4">
            <span>Power {preview.power}%</span>
            <span>Water {preview.water}%</span>
            <span>Food {preview.food}%</span>
            <span>Oxygen {preview.oxygen}%</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Daily consumption factor: ×{consumption.toFixed(2)} ({philosophy}).
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              onLaunch({
                objective,
                operatingPhilosophy: philosophy,
                startingCondition: condition,
              })
            }
          >
            <Rocket className="h-4 w-4" aria-hidden />
            Launch Mission
          </button>
        </div>
      </section>
    </div>
  );
}
