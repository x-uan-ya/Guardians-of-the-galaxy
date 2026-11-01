import type { EventAction } from '../../events/eventTypes';
import { applyDelta } from '../../simulation/resourceCalculations';
import { METRIC_MIN, METRIC_MAX, type CrewState, type GameState, type ResourceKey, type SystemState } from '../../simulation/simulationTypes';

export interface MetricPreview {
  current: number;
  projected: number;
  change: number;
  tone: 'good' | 'bad' | 'neutral';
}

export interface ActionPreview {
  label: string;
  resources: Partial<Record<ResourceKey, MetricPreview>>;
  crew: Partial<Record<keyof CrewState, MetricPreview>>;
  systems: Partial<Record<keyof SystemState, MetricPreview>>;
  delayed: number;
  uncertain: boolean;
}

function project<K extends string>(values: Record<K, number>, changes: Partial<Record<K, number>> = {}) {
  const metrics: Partial<Record<K, MetricPreview>> = {};
  let uncertain = false;
  for (const key of Object.keys(changes) as K[]) {
    const current = values[key];
    const delta = changes[key];
    if (delta === undefined || delta === 0) continue;
    if (!Number.isFinite(current) || current < METRIC_MIN || current > METRIC_MAX || !Number.isFinite(delta)) {
      uncertain = true;
      continue;
    }
    const projected = applyDelta(current, delta);
    const change = Math.round((projected - current) * 100) / 100;
    const good = key === 'radiationExposure' ? change < 0 : change > 0;
    metrics[key] = { current, projected, change, tone: change === 0 ? 'neutral' : good ? 'good' : 'bad' };
  }
  return { metrics, uncertain };
}

/** Only declared immediate deltas: no decision, daily simulation, RNG or state writes. */
export function actionPreview(state: GameState, action: EventAction | undefined): ActionPreview | null {
  if (!action || state.activeEvents.length || ['failed', 'completed'].includes(state.mission.status)) return null;
  const resources = project(state.resources, action.effect.immediateResources);
  const crew = project(state.crew, action.effect.immediateCrew);
  const systems = project(state.systems, action.effect.immediateSystems);
  return {
    label: action.label,
    resources: resources.metrics,
    crew: crew.metrics,
    systems: systems.metrics,
    delayed: action.effect.delayed?.length ?? 0,
    uncertain: resources.uncertain || crew.uncertain || systems.uncertain,
  };
}

export function previewNotice(preview: ActionPreview): string {
  return `Preview: ${preview.label}. Immediate action effects only; excludes daily changes and events.${preview.delayed ? ` ${preview.delayed} delayed effect(s) excluded.` : ''}${preview.uncertain ? ' Some effects are unavailable; no exact projection is shown for them.' : ''}`;
}
