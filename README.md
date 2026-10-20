# MARS: OUTPOST ZERO

An educational **space survival and engineering strategy simulation**. Players
manage a Mars outpost, balance limited resources, respond to crises, and learn
how their decisions create both immediate and delayed consequences.

This repository currently contains the **shared foundation**: a deterministic
simulation engine, a polished mission-control dashboard, localStorage
persistence, mission setup, a debrief view, an AI-advisor integration seam, and
tests. It is designed so a team of six can build the remaining gameplay features
independently without stepping on each other.

> ⚠️ All gameplay numbers (starting resources, consumption rates, thresholds)
> are **illustrative assumptions for an educational game**. They are **not** real
> NASA mission data or engineering specifications.

---

## Tech stack

| Concern        | Choice                        |
| -------------- | ----------------------------- |
| UI library     | React 18                      |
| Language       | TypeScript (strict mode)      |
| Build / dev    | Vite 5                        |
| Styling        | Tailwind CSS 3                |
| Icons          | lucide-react                  |
| Tests          | Vitest + jsdom                |
| Persistence    | Browser `localStorage`        |

No backend, database, authentication, paid services, or live AI integration are
part of this foundation. Simulation is fully local and deterministic.

---

## Installation and run

Requires Node 18+ and npm.

```bash
npm install        # install dependencies
npm run dev        # start the Vite dev server (http://localhost:5173)
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build locally
npm test           # run the test suite once
npm run test:watch # run tests in watch mode
npm run lint       # run ESLint
npm run typecheck  # type-check without emitting
```

---

## Folder structure

```
src/
  app/                  Composition root + navigation
    App.tsx             Wires the hook, views, and controls together
    routes.ts           View keys + nav metadata (tiny string router)
    PersistenceBanner.tsx
  components/
    layout/             App chrome: AppShell, Sidebar, TopBar
    ui/                 Reusable presentational pieces: StatusCard,
                        ProgressBar, SectionHeader, ConfirmDialog
  features/
    mission/            Mission config, defaults, setup screen
    dashboard/          Dashboard + resource/crew/system/activity panels
    simulation/         ★ The authoritative engine (see below)
    decisions/          Decision types + read-only history selectors
    ai-advisor/         Advisor types + rule-based placeholder
    events/             Event types + event/action catalog (content)
    debrief/            Debrief types, builder, and screen
  hooks/
    useGameState.ts     ★ The single React entry point to the engine
    useLocalStorage.ts  Generic persisted-state hook (UI prefs)
  lib/
    storage.ts          The only module that touches localStorage
    validation.ts       Safe parse + validate of stored data
    random.ts           Seeded deterministic RNG (no Math.random in sim)
    ids.ts              Deterministic id helpers
  styles/
    index.css           Tailwind layers + component classes
  tests/                Vitest suites + fixtures
  main.tsx              Entry point
```

---

## Shared type definitions (single source of truth)

**All shared game types live in `src/features/simulation/simulationTypes.ts`.**
Import from there. Do **not** create feature-local copies of `GameState`,
`Resources`, `CrewState`, etc.

| Type                                   | Location                                          |
| -------------------------------------- | ------------------------------------------------- |
| `GameState`, `Resources`, `CrewState`, `SystemState`, `MissionState`, `DelayedEffect`, `StatusLevel`, `DerivedStatus`, enums | `features/simulation/simulationTypes.ts` |
| `DecisionInput`, `DecisionRecord`, `PlayerChoice` | `features/decisions/decisionTypes.ts` |
| `GameEvent`, `EventAction`, `ActionEffect`, `EventSeverity` | `features/events/eventTypes.ts` |
| `MissionConfig`                        | `features/mission/missionTypes.ts`                |
| `Advisor`, `Recommendation`, `AdvisorContext` | `features/ai-advisor/advisorTypes.ts`      |
| `DebriefSummary`, `TimelineEntry`, `LeadershipProfile` | `features/debrief/debriefTypes.ts` |

### Units and bounds

Every primary resource (power, water, food, oxygen), every crew metric
(health, morale, radiationExposure), and every system metric is stored as a
**0–100 value**. Resources/crew/systems are percentages; `radiationExposure` is
a 0–100 accumulation index where **higher is worse**. Do not mix units — keep
everything on the 0–100 scale and let the engine clamp.

---

## Public simulation-engine API

Import from `features/simulation/simulationEngine.ts`. The engine **owns** the
game state. Components never mutate state; they call these functions, which
always return a **new** `GameState`.

| Function | Purpose |
| -------- | ------- |
| `createInitialGameState(config: MissionConfig): GameState` | Build a fresh, valid, playable game. |
| `validateGameState(state): { valid, errors }` | Structural + numeric validation. Never throws. |
| `applyPlayerDecision(state, input: DecisionInput): GameState` | Validate + apply a decision, record history, schedule delayed effects. Throws `InvalidDecisionError` on invalid/terminal. |
| `resolveEvent(state, eventId, actionId, choice?): GameState` | Convenience wrapper around `applyPlayerDecision` for events. |
| `advanceSimulationDay(state): { state, firedEffects, dailyDelta }` | Advance one day: apply daily deltas, fire due effects, recompute status/score. |
| `processDelayedEffects(state): GameState` | Apply any effects due on the current day (used internally by advance). |
| `calculateDerivedStatus(state): DerivedStatus` | Compute UI status levels (ok/warn/critical). Pure. |
| `getSimulationSummary(state): SimulationSummary` | Compact snapshot for header/logging/tests. |
| `getFreeActions(): EventAction[]` | The always-available routine actions. |

### Guarantees

- **Immutability** — inputs are never mutated; a new state is returned.
- **Determinism** — same `MissionConfig` (with fixed `gameId`/`now`) + same
  decision sequence ⇒ identical results. No `Math.random` in the engine.
- **Bounds** — all metrics stay within `[0, 100]`; `NaN`/`Infinity` are rejected.
- **Causality** — each `DelayedEffect` records its `sourceDecisionId` and fires
  exactly once, only when `day >= scheduledDay`.
- **Integrity** — unknown/unavailable action ids are rejected; history is
  append-only.

### Mission status rules (documented behaviour)

- **failed** — oxygen or crew health hits 0, or radiation reaches 100. Terminal.
- **completed** — survived to day 30 while active. Terminal.
- **critical** — any resource ≤ 15, health ≤ 15, or radiation ≥ 80. Recoverable.
- **active** — otherwise. Terminal states are never downgraded.

---

## Module ownership recommendations

Six teammates, six lanes. Each owner primarily edits files in their folder and
consumes the shared engine + types.

| Owner | Folder(s) | Responsibility |
| ----- | --------- | -------------- |
| 1. Simulation | `features/simulation/` | Engine rules, balancing, selectors. **Owns game state.** |
| 2. Dashboard / UI | `features/dashboard/`, `components/` | Panels, visual polish, layout. |
| 3. Events | `features/events/` | Event + action content via `eventCatalog.ts`. |
| 4. Decisions / Debrief | `features/decisions/`, `features/debrief/` | History views, timeline, leadership profile. |
| 5. AI Advisor | `features/ai-advisor/` | Real advisor implementing the `Advisor` interface. |
| 6. Mission / Persistence | `features/mission/`, `lib/`, `hooks/` | Setup flow, save/load, app wiring. |

**Boundaries:**

- The **simulation engine** is the only thing that mutates game state.
- **React components** read derived status and dispatch intents; they never
  calculate resources themselves.
- The **AI advisor** receives a read-only snapshot and returns a
  `Recommendation`. It never mutates state; the engine validates its suggestion
  like any player decision.
- **Event modules** define content only. The engine validates and applies it.
- The **debrief** reads recorded history; it never rewrites past decisions.

---

## Working as a team

### Create a feature branch

```bash
git checkout main
git pull
git checkout -b feature/<your-area>-<short-description>
# e.g. feature/events-solar-flare
```

### Avoid editing another person's files

- Stay within your module folder (see ownership table).
- Need a change to a **shared type**? Open a short discussion/PR against
  `simulationTypes.ts` (or the relevant `*Types.ts`) so everyone updates together.
- Never copy shared interfaces into your folder. Import them.

### Integrate changes and resolve conflicts

```bash
git fetch origin
git rebase origin/main        # replay your work on top of latest main
# resolve conflicts, then:
git add <files>
git rebase --continue
npm run typecheck && npm test # must pass before you push
git push -u origin HEAD
```

Open a pull request; keep it focused on one module/feature where possible.

### How to add new events and actions

Edit `features/events/eventCatalog.ts` only:

1. Add a `GameEvent` to `EVENT_CATALOG` with a unique `id` and at least one
   action. Set effects with `immediateResources/Crew/Systems` and optional
   `delayed[]` entries (`delayInDays >= 1`).
2. To add an always-available routine action, append an `EventAction` to
   `FREE_ACTIONS`.
3. The engine picks these up automatically — it validates and applies them. No
   engine changes needed for new content.

### Run tests and build

```bash
npm test          # all suites
npm run build     # type-check + production build (must succeed)
```

---

## Where to go next

See [`docs/INTEGRATION_CONTRACT.md`](docs/INTEGRATION_CONTRACT.md) for the exact
interfaces each teammate must use.
