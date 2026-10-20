/**
 * TacticalHud.tsx
 * ---------------
 * A decorative "tactical HUD map" panel for the top of the dashboard: a
 * sweeping radar with outpost hotspot nodes and a telemetry readout line.
 *
 * The radar and node positions are purely decorative. The readout line and the
 * scanner status pill reflect REAL game state (day, mission status, overall
 * life-support level) so the flourish stays honest and alive. No game logic or
 * mutation happens here — it only reads what it is given.
 */

import type { ReactElement } from 'react';
import { Radar } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { calculateDerivedStatus } from '../simulation/simulationEngine';
import type { GameState, StatusLevel } from '../simulation/simulationTypes';

interface TacticalHudProps {
  state: GameState;
}

const LEVEL_COLOR: Record<StatusLevel, string> = {
  ok: '#4caf72',
  warn: '#d9a93f',
  critical: '#d9533f',
};

/** Decorative outpost nodes shown on the radar. */
const NODES = [
  { label: 'Bio-Dome Alpha', top: '32%', left: '28%', color: '#4caf72' },
  { label: 'Solar Field B', top: '60%', left: '66%', color: '#4a90d9' },
  { label: 'Life Support Core', top: '74%', left: '44%', color: '#e07a3f' },
] as const;

export function TacticalHud({ state }: TacticalHudProps): ReactElement {
  const derived = calculateDerivedStatus(state);
  const scanning = state.mission.status === 'active' || state.mission.status === 'critical';

  return (
    <section className="panel relative overflow-hidden p-4">
      <SectionHeader
        title="Outpost Zero — Tactical HUD"
        icon={Radar}
        subtitle="Perimeter scan & telemetry nodes"
        action={
          <span
            className="font-mono text-[11px] rounded border px-2 py-0.5"
            style={{
              color: LEVEL_COLOR[derived.overall],
              borderColor: 'rgba(74,144,217,0.3)',
              background: 'rgba(74,144,217,0.1)',
            }}
          >
            SCANNER: {scanning ? 'ACTIVE' : 'STANDBY'}
          </span>
        }
      />

      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-md border border-mars-orange/25 bg-space-900/80">
        {/* Concentric radar rings. */}
        <div className="absolute h-36 w-36 rounded-full border border-dashed border-mars-orange/25" />
        <div className="absolute h-56 w-56 rounded-full border border-mars-orange/15" />
        <div className="absolute h-2 w-2 rounded-full bg-mars-orange shadow-glow" />

        {/* Sweep: a rotating conic wedge. */}
        <div
          className="absolute h-60 w-60 animate-radar-sweep rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(224,122,63,0.32) 0deg, transparent 60deg, transparent 360deg)',
          }}
        />

        {/* Hotspot nodes. */}
        {NODES.map((node) => (
          <div
            key={node.label}
            className="absolute flex items-center gap-1.5 font-mono text-[10px]"
            style={{ top: node.top, left: node.left, color: node.color }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: node.color, boxShadow: `0 0 8px ${node.color}` }}
            />
            {node.label}
          </div>
        ))}

        {/* Telemetry readout (day/status are real; environment values are flavour). */}
        <div className="absolute bottom-2 left-3 font-mono text-[10px] text-slate-400">
          SOL {String(state.day).padStart(3, '0')} · {state.mission.status.toUpperCase()} · LAT
          -4.592 · LON 137.441 · TEMP -63°C
        </div>
      </div>
    </section>
  );
}
