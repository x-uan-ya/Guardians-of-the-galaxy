/**
 * MissionTablet.tsx
 * -----------------
 * The sci-fi tablet. It shows, in four tabs:
 *   MISSION  - day counter, days to rescue, emergency (if any), Mission
 *              Controller advice, today's actions, feedback, End Sol button
 *   ROOM     - details for the bunker room you clicked (see FacilityTab)
 *   LOG      - consequences (delayed effects), decision history, mission log
 *   PROFILE  - astronaut profile
 *
 * It is a "controlled" component: BunkerGame owns the small pieces of UI state
 * (which tab, which action is planned) and passes them in. All real game
 * changes go out through the callbacks (onEndDay, onResolveEvent) which BunkerGame
 * connects to the existing useGameState handlers.
 */

import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { ClipboardList, Clock, MapPin, Package, ScrollText, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import type { ActivityEntry } from '../../../hooks/useGameState';
import { defaultAdvisor } from '../../ai-advisor/advisorInterface';
import { recentDecisions, sourceDecisionFor, upcomingEffects } from '../../decisions/decisionHistory';
import type { PlayerChoice } from '../../decisions/decisionTypes';
import type { GameEvent } from '../../events/eventTypes';
import { getFreeActions, resupplyDay } from '../../simulation/simulationEngine';
import type { DerivedStatus, GameState, MissionStatus } from '../../simulation/simulationTypes';
import { CREW_LABELS, RESOURCE_LABELS, SYSTEM_LABELS } from '../labels';
import { AstronautProfile } from './AstronautProfile';
import { EffectChips } from './EffectChips';
import { EmergencyPanel } from './EmergencyPanel';
import { FacilityTab } from './FacilityTab';
import { TOTAL_DAYS, type FacilityId } from './facilities';
import type { StateDelta } from './useStateDelta';

export type TabKey = 'mission' | 'room' | 'log' | 'profile';

const TABS: readonly { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'mission', label: 'Mission', icon: ClipboardList },
  { key: 'room', label: 'Room', icon: MapPin },
  { key: 'log', label: 'Log', icon: ScrollText },
  { key: 'profile', label: 'Profile', icon: UserRound },
];

const STATUS_STYLE: Record<MissionStatus, string> = {
  active: 'border-status-ok/50 text-status-ok',
  critical: 'border-status-critical/60 text-status-critical',
  completed: 'border-accent-cyan/60 text-accent-cyan',
  failed: 'border-status-critical/60 text-status-critical',
};

const TONE_DOT: Record<ActivityEntry['tone'], string> = {
  info: 'bg-accent-blue',
  good: 'bg-status-ok',
  warn: 'bg-status-warn',
  bad: 'bg-status-critical',
};

interface MissionTabletProps {
  state: GameState;
  derived: DerivedStatus;
  activity: ActivityEntry[];
  delta: StateDelta | null;
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  facilityId: FacilityId | null;
  alertFacility: FacilityId | null;
  emergency: GameEvent | null;
  plannedActionId: string | null;
  onPlanAction: (actionId: string | null) => void;
  /** Perform the planned action (if any) and advance to the next day. */
  onEndDay: (choice: PlayerChoice) => void;
  onResolveEvent: (eventId: string, actionId: string, choice: PlayerChoice) => void;
}

export function MissionTablet(props: MissionTabletProps): ReactElement {
  const { state, derived, tab, onTabChange, emergency } = props;
  const terminal = state.mission.status === 'failed' || state.mission.status === 'completed';

  return (
    <div className="bunker-tablet" data-alert={emergency ? 'true' : 'false'}>
      <div className="bunker-tablet-screen">
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-accent-cyan/20 bg-space-900/80 px-3 py-1.5">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-accent-cyan">
            <span
              className={`h-1.5 w-1.5 rounded-full ${emergency ? 'bg-red-500 animate-pulse-soft' : 'bg-status-ok'}`}
              aria-hidden
            />
            MISSION TABLET
          </div>
          <div className="font-mono text-[10px] tracking-widest text-slate-500">
            {emergency ? 'ALERT' : 'LINK OK'}
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Mission tablet" className="grid grid-cols-4 border-b border-space-600/60 bg-space-850/70">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(key)}
                className={`relative flex items-center justify-center gap-1.5 px-1 py-2 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                  active
                    ? 'bg-accent-cyan/10 text-accent-cyan shadow-[inset_0_-2px_0_#5fd0c8]'
                    : 'text-slate-400 hover:bg-space-700/60 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
                {key === 'mission' && emergency && !active ? (
                  <span className="absolute right-1.5 top-1 h-2 w-2 animate-pulse-soft rounded-full bg-red-500" aria-label="Emergency" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="bunker-tablet-body" role="tabpanel">
          {tab === 'mission' ? <MissionTab {...props} terminal={terminal} /> : null}
          {tab === 'room' ? (
            <FacilityTab
              state={state}
              derived={derived}
              facilityId={props.facilityId}
              emergency={emergency}
              alertFacility={props.alertFacility}
              plannedActionId={props.plannedActionId}
              disabled={terminal}
              onPlanAction={props.onPlanAction}
              onGoToMission={() => onTabChange('mission')}
            />
          ) : null}
          {tab === 'log' ? <LogTab state={state} activity={props.activity} /> : null}
          {tab === 'profile' ? <AstronautProfile state={state} derived={derived} /> : null}
        </div>

        <EndDayFooter {...props} terminal={terminal} />
      </div>
    </div>
  );
}

/* ========================================================================== */
/* MISSION TAB                                                                */
/* ========================================================================== */

function MissionTab(props: MissionTabletProps & { terminal: boolean }): ReactElement {
  const { state, delta, emergency, plannedActionId, onPlanAction, onResolveEvent, terminal } = props;
  const actions = getFreeActions();

  // Free-action advice (read-only). Not used while an emergency is showing.
  const recommendation = useMemo(
    () => (terminal || emergency ? null : defaultAdvisor.recommend({ state })),
    [state, terminal, emergency]
  );

  const daysLeft = Math.max(0, TOTAL_DAYS - state.day);
  const lastDecision = recentDecisions(state, 1)[0];

  // One-time resupply status (reads the same engine helper as the TacticalHud).
  const drop = resupplyDay();
  const mod = state.mission.modifiers;
  let supply = '';
  if (mod.noResupply) supply = 'No resupply on this mission';
  else if (state.mission.resupplyDelivered) supply = 'Resupply delivered';
  else if (state.day >= drop) supply = `Resupply arriving (Sol ${drop})`;
  else supply = `Resupply drop: Sol ${drop} (in ${drop - state.day})`;

  return (
    <div className="space-y-3">
      {emergency ? (
        <div className="flex items-center justify-between rounded-md border border-space-600 bg-space-800/60 px-2.5 py-1.5 font-mono text-[11px]">
          <span className="font-bold text-white">
            SOL {state.day} <span className="text-slate-500">/ {TOTAL_DAYS}</span>
          </span>
          <span className="text-accent-cyan">{daysLeft} days until rescue</span>
        </div>
      ) : null}

      {/* Emergency takes over the top of the tablet. */}
      {emergency ? (
        <EmergencyPanel
          key={emergency.id}
          state={state}
          event={emergency}
          waiting={state.activeEvents.length - 1}
          disabled={terminal}
          onChoose={(actionId, choice) => onResolveEvent(emergency.id, actionId, choice)}
        />
      ) : null}

{!emergency ? (
      <section className="rounded-md border border-accent-cyan/25 bg-space-800/60 p-3" aria-label="Mission day">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] tracking-widest text-slate-500">CURRENT DAY</div>
            <div className="font-mono text-3xl font-bold leading-none text-white">
              SOL {state.day}
              <span className="text-base text-slate-500"> / {TOTAL_DAYS}</span>
            </div>
          </div>
          <span
            className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${STATUS_STYLE[state.mission.status]}`}
          >
            {state.mission.status}
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={(state.day / TOTAL_DAYS) * 100} level="ok" label="Mission progress" />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="font-semibold text-accent-cyan">
            {state.mission.status === 'completed'
              ? 'Rescue has arrived!'
              : `${daysLeft} day${daysLeft === 1 ? '' : 's'} until rescue`}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Package className="h-3 w-3" aria-hidden />
            {supply}
          </span>
        </div>
      </section>
      ) : null}


      {/* Feedback from the last thing that happened. */}
      <FeedbackCard
        delta={delta}
        decisionLabel={lastDecision?.actionLabel}
        decisionNote={lastDecision?.explanation}
        decisionDay={lastDecision?.day}
      />

      {/* Today's plan */}
      {!emergency ? (
        <section aria-label="Today's actions">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Today&apos;s plan
            </span>
            <span className="text-[10px] text-slate-500">pick one, then end the sol</span>
          </div>

          {recommendation ? (
            <div className="mb-2 rounded-md border border-accent-blue/30 bg-accent-blue/10 p-2">
              <div className="mb-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-accent-blue">
                Mission Controller (rule-based) · {recommendation.confidence} confidence
              </div>
              <p className="text-[11px] text-slate-200">{recommendation.rationale}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            {actions.map((action) => {
              const planned = plannedActionId === action.id;
              const recommended = recommendation?.actionId === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  className="bunker-action"
                  aria-pressed={planned}
                  disabled={terminal}
                  onClick={() => onPlanAction(planned ? null : action.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{action.label}</span>
                    <span className="flex shrink-0 gap-1">
                      {recommended ? (
                        <span className="rounded bg-accent-blue/20 px-1.5 py-px font-mono text-[10px] text-accent-blue">
                          ★ ADVISED
                        </span>
                      ) : null}
                      {planned ? (
                        <span className="rounded bg-accent-cyan/20 px-1.5 py-px font-mono text-[10px] text-accent-cyan">
                          PLANNED
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-slate-300">{action.description}</p>
                  <EffectChips action={action} />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** What just changed, in plain colour-coded chips. */
function FeedbackCard({
  delta,
  decisionLabel,
  decisionNote,
  decisionDay,
}: {
  delta: StateDelta | null;
  decisionLabel: string | undefined;
  decisionNote: string | undefined;
  decisionDay: number | undefined;
}): ReactElement | null {
  if (!delta && !decisionLabel) return null;

  const chips: { id: string; text: string; good: boolean }[] = [];
  if (delta) {
    for (const [k, v] of Object.entries(delta.resources)) {
      if (v === undefined) continue;
      chips.push({ id: `r-${k}`, text: `${RESOURCE_LABELS[k as keyof typeof RESOURCE_LABELS]} ${fmt(v)}`, good: v > 0 });
    }
    for (const [k, v] of Object.entries(delta.crew)) {
      if (v === undefined) continue;
      chips.push({
        id: `c-${k}`,
        text: `${CREW_LABELS[k as keyof typeof CREW_LABELS]} ${fmt(v)}`,
        good: k === 'radiationExposure' ? v < 0 : v > 0,
      });
    }
    for (const [k, v] of Object.entries(delta.systems)) {
      if (v === undefined) continue;
      chips.push({ id: `s-${k}`, text: `${SYSTEM_LABELS[k as keyof typeof SYSTEM_LABELS]} ${fmt(v)}`, good: v > 0 });
    }
  }

  return (
    <section
      key={delta?.stamp}
      className="rounded-md border border-space-600 bg-space-800/60 p-2.5 animate-fade-in"
      aria-label="What just happened"
      aria-live="polite"
    >
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
        What just happened{delta && delta.toDay !== delta.fromDay ? ` · Sol ${delta.fromDay} → ${delta.toDay}` : ''}
      </div>
      {decisionLabel ? (
        <p className="text-[11px] text-slate-300">
          <span className="font-semibold text-slate-100">{decisionLabel}</span>
          {decisionDay !== undefined ? <span className="text-slate-500"> (Sol {decisionDay})</span> : null}
          {decisionNote ? <span className="text-slate-400"> — {decisionNote}</span> : null}
        </p>
      ) : null}
      {chips.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chips.map((c) => (
            <span
              key={c.id}
              className={`rounded border px-1.5 py-px font-mono text-[10px] ${
                c.good
                  ? 'border-status-ok/40 bg-status-ok/10 text-status-ok'
                  : 'border-status-critical/40 bg-status-critical/10 text-status-critical'
              }`}
            >
              {c.text}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function fmt(n: number): string {
  return `${n > 0 ? '+' : ''}${n}`;
}

/* ========================================================================== */
/* LOG TAB                                                                    */
/* ========================================================================== */

function LogTab({ state, activity }: { state: GameState; activity: ActivityEntry[] }): ReactElement {
  const pending = upcomingEffects(state);
  const decisions = recentDecisions(state, 6);

  return (
    <div className="space-y-4">
      <section aria-label="Consequences on the way">
        <h3 className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          <Clock className="h-3 w-3" aria-hidden />
          Consequences on the way
        </h3>
        {pending.length === 0 ? (
          <p className="text-xs text-slate-400">No delayed effects are pending.</p>
        ) : (
          <ul className="space-y-1.5">
            {pending.map((eff) => {
              const source = sourceDecisionFor(state, eff);
              const inDays = Math.max(0, eff.scheduledDay - state.day);
              return (
                <li key={eff.id} className="rounded-md border border-status-warn/30 bg-status-warn/5 p-2">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="uppercase text-status-warn">{eff.type}</span>
                    <span className="text-slate-400">
                      Sol {eff.scheduledDay} {inDays === 0 ? '(now)' : `(in ${inDays})`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200">{eff.description}</p>
                  {source ? (
                    <p className="text-[10px] text-slate-500">
                      Caused by: {source.actionLabel} (Sol {source.day})
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Decision history">
        <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Recent decisions
        </h3>
        {decisions.length === 0 ? (
          <p className="text-xs text-slate-400">No decisions recorded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {decisions.map((d) => (
              <li key={d.id} className="rounded-md border border-space-600 bg-space-800/60 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-100">{d.actionLabel}</span>
                  <span className="tnum font-mono text-[10px] text-slate-500">Sol {d.day}</span>
                </div>
                <p className="text-[11px] text-slate-400">{d.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Mission log">
        <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">Mission log</h3>
        {activity.length === 0 ? (
          <p className="text-xs text-slate-400">The log is quiet.</p>
        ) : (
          <ul className="space-y-1.5">
            {activity.slice(0, 20).map((entry) => (
              <li key={entry.id} className="flex items-start gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[entry.tone]}`} aria-hidden />
                <div>
                  <p className="text-[11px] text-slate-300">{entry.message}</p>
                  <span className="tnum font-mono text-[9px] uppercase text-slate-500">Sol {entry.day}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ========================================================================== */
/* FOOTER: the big "End Sol" button                                           */
/* ========================================================================== */

function EndDayFooter(props: MissionTabletProps & { terminal: boolean }): ReactElement {
  const { state, emergency, plannedActionId, onEndDay, terminal } = props;
  const planned = plannedActionId ? getFreeActions().find((a) => a.id === plannedActionId) : undefined;

  // Same "accepted / overrode / self-directed" bookkeeping the classic panel uses.
  const choice = useMemo<PlayerChoice>(() => {
    if (!plannedActionId || terminal || emergency) return 'self-directed';
    const rec = defaultAdvisor.recommend({ state });
    if (!rec) return 'self-directed';
    return rec.actionId === plannedActionId ? 'accepted-recommendation' : 'overrode-recommendation';
  }, [state, plannedActionId, terminal, emergency]);

  let label: string;
  let hint: string;
  if (terminal) {
    label = state.mission.status === 'completed' ? 'Mission complete' : 'Mission ended';
    hint = 'Start a new mission from the top bar to play again.';
  } else if (emergency) {
    label = 'Respond to the emergency first';
    hint = 'You cannot end the sol while an emergency is active.';
  } else if (planned) {
    label = `Do "${planned.label}" & end Sol ${state.day}`;
    hint = 'Your action happens now, then the day advances.';
  } else {
    label = `End Sol ${state.day}`;
    hint = 'No special action planned. The outpost runs on routine.';
  }

  return (
    <div className="border-t border-accent-cyan/20 bg-space-900/90 p-3">
      <button
        type="button"
        className="btn-primary w-full"
        disabled={terminal || emergency !== null}
        onClick={() => onEndDay(choice)}
      >
        {label}
      </button>
      <p className="mt-1 text-center text-[10px] text-slate-500">{hint}</p>
    </div>
  );
}
