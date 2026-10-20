# Integration Contract

This is the short, binding version of "how to build on the foundation." If you
only read one doc, read this one. The goal: six people extend MARS: OUTPOST ZERO
without creating incompatible copies of shared logic.

---

## 1. One source of truth for types

- Import every shared type from its canonical module. **Do not** redefine
  `GameState`, `Resources`, `CrewState`, `SystemState`, `MissionState`,
  `DelayedEffect`, `DecisionRecord`, `GameEvent`, etc. in your feature folder.

```ts
// ✅ correct
import type { GameState, Resources } from '../simulation/simulationTypes';
import type { GameEvent } from '../events/eventTypes';

// ❌ never do this
interface Resources { power: number; /* ... a second, drifting copy */ }
```

Canonical locations:

| Types | Module |
| ----- | ------ |
| Core state, resources, crew, systems, mission, delayed effects, derived status, enums | `features/simulation/simulationTypes.ts` |
| Decisions | `features/decisions/decisionTypes.ts` |
| Events + actions | `features/events/eventTypes.ts` |
| Mission config | `features/mission/missionTypes.ts` |
| Advisor | `features/ai-advisor/advisorTypes.ts` |
| Debrief | `features/debrief/debriefTypes.ts` |

---

## 2. The engine owns state

All reads of "what happens when I do X" and all writes go through
`features/simulation/simulationEngine.ts`.

```ts
import {
  createInitialGameState,
  applyPlayerDecision,
  advanceSimulationDay,
  resolveEvent,
  calculateDerivedStatus,
  validateGameState,
} from '../simulation/simulationEngine';
```

Rules:

1. Functions return a **new** `GameState`. Never mutate the one you were given.
2. Components **must not** compute or change resource values directly. Read
   `calculateDerivedStatus(state)` for UI levels.
3. From React, go through the `useGameState()` hook rather than calling the
   engine yourself. The hook holds the authoritative instance and the activity
   feed.

```ts
// Inside a component
const game = useGameState();
game.advanceDay();
game.decide({ actionId: 'ration-supplies', playerChoice: 'self-directed' });
game.resolveActiveEvent('dust-storm', 'dust-storm--shelter');
```

---

## 3. Adding content (events / actions)

Edit **only** `features/events/eventCatalog.ts`.

```ts
// A new event with an immediate + delayed effect
EVENT_CATALOG.push({
  id: 'solar-flare',
  title: 'Solar flare incoming',
  description: 'Radiation spike expected within hours.',
  severity: 'critical',
  availableActions: [
    {
      id: 'solar-flare--shelter',
      label: 'Shelter in place',
      description: 'Protect the crew; pause surface work.',
      effect: {
        immediateCrew: { morale: -3 },
        delayed: [
          {
            delayInDays: 1,
            description: 'Backlogged maintenance reduces power generation.',
            parameters: { kind: 'system', changes: { powerGeneration: -5 } },
          },
        ],
      },
    },
  ],
});
```

The engine validates `delayInDays >= 1`, tags each delayed effect with the
causing decision, and applies everything with bounds enforcement. You do not
touch the engine to add content.

`DelayedEffectParameters` is a discriminated union — set `kind` to one of
`resource | crew | system | status` and provide the matching payload.

---

## 4. The AI advisor seam

Implement the `Advisor` interface; return a `Recommendation` (or `null`). You
receive a **read-only** snapshot and must not mutate it. The engine validates
whatever action you recommend before it is applied, so you cannot corrupt state.

```ts
import type { Advisor } from '../ai-advisor/advisorTypes';

export const myAdvisor: Advisor = {
  id: 'my-model',
  recommend(ctx) {
    // ctx.state is read-only; return a suggestion for the player to accept or override
    return { actionId: 'routine-operations', confidence: 'low', rationale: '…' };
  },
};
```

Swap it in where `defaultAdvisor` is used (`features/ai-advisor/advisorInterface.ts`).
The current default is a transparent, **rule-based** placeholder — not a fake AI.

---

## 5. The debrief is read-only

`features/debrief/debriefBuilder.ts` derives summaries from
`state.history`. Never write back to history or mutate state from the debrief.

---

## 6. Persistence boundary

- `lib/storage.ts` is the **only** module that calls `localStorage`.
- It validates before saving and **refuses to overwrite a valid save with an
  invalid state**.
- Corrupt saved data loads as `corrupted` and the app falls back to a fresh
  mission **without deleting** the bad data.
- The app must keep working when storage is unavailable.
- Never persist secrets or API keys.

---

## 7. Imports and dependencies

- Keep imports predictable: feature → shared types/engine, not feature → feature
  internals.
- Avoid circular runtime dependencies. Shared type files reference each other
  only via `import type` (erased at build time), which is safe.

---

## 8. Definition of done for a contribution

- `npm run typecheck` passes (no TypeScript errors).
- `npm test` passes, including any tests you added for new behaviour.
- `npm run build` succeeds.
- You did not copy shared interfaces or mutate state outside the engine.
