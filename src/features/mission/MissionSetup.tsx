/**
 * MissionSetup.tsx
 * ----------------
 * The pre-mission / occupation-selection screen. The player first chooses an
 * occupation (which sets the character's starting attributes and passive), then
 * tunes the mission (objective / philosophy / starting condition), then
 * launches. It builds a MissionConfig and hands it to the parent, which calls
 * the engine. Launching discards the current run, so the parent confirms first.
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
import { OCCUPATION_LIST, getOccupation } from './occupations';
import { OccupationAvatar } from './OccupationAvatar';
import type {
  MissionConfig,
  MissionObjective,
  Occupation,
  OperatingPhilosophy,
  StartingCondition,
} from './missionTypes';

interface MissionSetupProps {
  /** Called when the player launches. Parent handles the confirm + engine call. */
  onLaunch: (config: MissionConfig) => void;
  /** The current config, used to preselect the controls. */
  current: MissionConfig;
}

const OBJECTIVES: { value: MissionObjective; label: string; blurb: string }[] = [
  { value: 'survival', label: 'Survival', blurb: 'Keep the character alive. Life support is prioritised.' },
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

/**
 * The occupation card grid — the headline choice of a run.
 *
 * Players choose BLIND: the cards reveal only the portrait, role name and a
 * one-line summary. Attributes, the unique ability and trade-offs are hidden
 * until the run actually starts (shown on the dashboard Character panel). This
 * stops min-maxing / comparison-shopping at setup.
 */
function OccupationPicker({
  value,
  onChange,
}: {
  value: Occupation | null;
  onChange: (v: Occupation) => void;
}): ReactElement {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Occupation
        <span className="ml-2 font-normal normal-case text-slate-500">
          — stats are revealed once the run begins
        </span>
      </legend>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {OCCUPATION_LIST.map((occ) => {
          const selected = occ.id === value;
          return (
            <button
              key={occ.id}
              type="button"
              onClick={() => onChange(occ.id)}
              aria-pressed={selected}
              className={`occ-card flex h-full flex-col items-center rounded-lg border p-3 text-center transition-colors ${
                selected
                  ? 'border-mars-orange/60 bg-mars-red/10 ring-1 ring-mars-orange/40'
                  : 'border-space-600 bg-space-700/40 hover:bg-space-700'
              }`}
            >
              <OccupationAvatar occupation={occ} size={108} className="mb-2" />
              <span className="text-sm font-semibold text-slate-100">{occ.label}</span>
              <p className="mt-0.5 text-xs text-slate-400">{occ.summary}</p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function MissionSetup({ onLaunch, current }: MissionSetupProps): ReactElement {
  // Start with NO occupation selected so players make a deliberate choice and
  // can never see more than one character's stats at a time. `current` is kept
  // for the other mission settings only.
  const [occupation, setOccupation] = useState<Occupation | null>(null);
  const [objective, setObjective] = useState<MissionObjective>(current.objective);
  const [philosophy, setPhilosophy] = useState<OperatingPhilosophy>(current.operatingPhilosophy);
  const [condition, setCondition] = useState<StartingCondition>(current.startingCondition);

  const preview = condition === 'resource-constrained' ? CONSTRAINED_RESOURCES : STANDARD_RESOURCES;
  const consumption = PHILOSOPHY_CONSUMPTION[philosophy];
  const chosen = occupation ? getOccupation(occupation) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="panel p-5">
        <SectionHeader
          title="New Run — Select Your Character"
          icon={Rocket}
          subtitle="Choose an occupation, then configure the mission. Launching starts a fresh run."
        />

        <div className="space-y-6">
          <OccupationPicker value={occupation} onChange={setOccupation} />
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
            {chosen
              ? `Character: ${chosen.label}. Stats are revealed when the run begins. Daily consumption ×${consumption.toFixed(2)} (${philosophy}).`
              : `Choose an occupation to set your character. Daily consumption ×${consumption.toFixed(2)} (${philosophy}).`}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {!occupation ? (
            <span className="text-xs text-slate-400">Select an occupation to launch.</span>
          ) : null}
          <button
            type="button"
            className="btn-primary"
            disabled={!occupation}
            onClick={() => {
              if (!occupation) return;
              onLaunch({
                occupation,
                objective,
                operatingPhilosophy: philosophy,
                startingCondition: condition,
              });
            }}
          >
            <Rocket className="h-4 w-4" aria-hidden />
            Launch Run
          </button>
        </div>
      </section>
    </div>
  );
}
