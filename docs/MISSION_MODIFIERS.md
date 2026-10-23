# Mission Modifier System — integration guide

This is the handoff doc for the **Mission Modifier System**. It explains the
clean ownership split and gives Person 2 (the simulation owner) a concrete
starting point.

---

## The ownership split

The mission system is deliberately two layers so two people can work without
stepping on each other:

| Layer | Who owns it | What it decides | Where it lives |
| ----- | ----------- | --------------- | -------------- |
| **Mission conditions / config** | You (content) | **What conditions exist** and their modifier values | `src/features/mission/missions.ts` |
| **Modifier resolution (the math)** | Person 2 (simulation) | **How each modifier value affects the game** | `src/features/simulation/simulationEngine.ts` (`advanceSimulationDay`) |

The rule of thumb:

- **You** declare: *"Deep-Space has `solarFactor: 0.8` and `noResupply: true`."*
- **Person 2** decides: *"`solarFactor` multiplies the daily power production;
  `noResupply` suppresses the Sol-15 drop."*

Neither side needs to touch the other's file to do their job.

---

## The data a mission carries

Each mission in `missions.ts` is a `MissionDef`:

```ts
{
  id: 'mars',
  label: 'Mars Outpost',
  summary: 'The red planet. Dust, distance, and radiation.',
  conditions: ['Long communication delay', 'Dust storms', 'High radiation'], // flavour text shown to the player
  difficulty: 'Hard',
  accent: '#c1440e',
  glyph: '🔴',
  modifiers: {            // ← the part the simulation consumes
    ...NEUTRAL_MODIFIERS,
    radiationPerDay: 1.5,
    powerGenerationFactor: 0.92,
  },
}
```

- `conditions` is **flavour** shown on the Mission Selection screen.
- `modifiers` is the **contract** the engine reads.

When a run starts, the chosen mission's `modifiers` are snapshotted onto
`GameState.mission.modifiers`, so the simulation always reads them from state:

```ts
const mod = state.mission.modifiers;
```

---

## The modifier keys (current contract)

Defined by the `MissionModifiers` interface in
`src/features/simulation/simulationTypes.ts`. `NEUTRAL_MODIFIERS` (in
`missions.ts`) is the "no effect" baseline — spread it and override only what a
mission changes.

| Key | Type | Neutral | Meaning (how the engine currently reads it) |
| --- | ---- | ------- | ------------------------------------------- |
| `powerGenerationFactor` | number | `1` | Multiplies daily power production. `0.8` = −20%. |
| `foodProductionFactor` | number | `1` | Multiplies daily food production. |
| `lifeSupportFactor` | number | `1` | Multiplies daily water **and** oxygen production. |
| `solarFactor` | number | `1` | Extra multiplier on power (stacks with `powerGenerationFactor`). |
| `radiationPerDay` | number | `0` | Flat radiation-exposure points added each sol. |
| `startingResourceDelta` | number | `0` | One-time signed shift to every starting resource (applied at creation). |
| `noResupply` | boolean | `false` | When `true`, the one-time Sol-15 resupply never arrives. |

> Convention: `*Factor` values multiply a production term (1 = no change).
> `*PerDay` / `*Delta` are additive. Keep that convention when adding keys.

---

## Where Person 2 reads them (the seam)

All consumption happens in **one place**: `advanceSimulationDay()` in
`simulationEngine.ts`. The relevant block is already there and commented:

```ts
const mod = state.mission.modifiers;

// Production factors scale ONLY the positive (production) part of each daily
// delta, so a penalty reduces generation without perversely easing consumption.
const scaleGain = (value, factor) => (value > 0 ? round2(value * factor) : value);
const powerFactor = mod.powerGenerationFactor * mod.solarFactor;

const dailyDelta = {
  power:  scaleGain(basePower,  powerFactor),
  water:  scaleGain(baseWater,  mod.lifeSupportFactor),
  food:   scaleGain(baseFood,   mod.foodProductionFactor),
  oxygen: scaleGain(baseOxygen, mod.lifeSupportFactor),
};

// radiation
if (mod.radiationPerDay > 0) crewChanges.radiationExposure = mod.radiationPerDay;

// resupply
const resupplyFired = !mod.noResupply && !state.mission.resupplyDelivered && nextDay === resupplyDay();

// startingResourceDelta is applied once in createInitialGameState().
```

Person 2 owns this math. Tune it, change how a key behaves, or replace the
approach entirely — just keep it deterministic (no `Math.random`; see the
engine's determinism guarantee).

---

## Recipes

### You: add or change a mission condition (no engine changes)

1. Open `src/features/mission/missions.ts`.
2. Edit a mission's `modifiers` (and its `conditions` flavour text), e.g. make
   Lunar harsher:
   ```ts
   lunar: {
     ...,
     conditions: ['Low gravity', 'Extreme temperature swings', 'Limited resources'],
     modifiers: { ...NEUTRAL_MODIFIERS, powerGenerationFactor: 0.8, startingResourceDelta: -12 },
   }
   ```
3. Done. The selection screen auto-renders the new effects, and the engine
   applies the existing keys. No simulation code to touch.

### Person 2: add a brand-new modifier key (e.g. `temperature`)

1. Add the field to `MissionModifiers` in `simulationTypes.ts` and to
   `NEUTRAL_MODIFIERS` in `missions.ts` (neutral value).
2. Decide the math and read it in `advanceSimulationDay()`:
   ```ts
   // e.g. extreme cold raises power consumption
   if (mod.temperature < 0) { /* adjust the daily power delta */ }
   ```
3. Add a validation line in `validateGameState()` so bad saves are caught.
4. Set the value on whichever missions use it in `missions.ts`.

> Because `NEUTRAL_MODIFIERS` supplies a neutral default, existing missions keep
> working when a new key is added — they just inherit "no effect" until you give
> them a value.

### Add a whole new mission site

1. Add the id to the `MissionType` union + `MISSION_TYPES` in `simulationTypes.ts`.
2. Add a `MissionDef` entry to `MISSION_CATALOG` and to `MISSION_LIST`.
3. The Mission Selection screen and engine pick it up automatically.

---

## How it reaches the player

Flow: **login → briefing → MISSION_SELECT → occupation → dashboard**.

- `MissionSelect.tsx` renders every mission in `MISSION_LIST`, shows its
  `conditions`, a difficulty badge, and a derived "Simulation effects" list
  computed from `modifiers` (so new values appear automatically).
- The chosen site is carried in `MissionConfig.missionType`, snapshotted to
  `GameState.mission.missionType` + `mission.modifiers` by
  `createInitialGameState()`.
- The HUD (`TacticalHud.tsx`) shows the active mission's label + conditions.

---

## Occupation × Mission compatibility (advisory)

`src/features/mission/compatibility.ts` holds a separate, **advisory** matrix
rating each (mission, occupation) pairing as 🟢 Strong / 🟡 Neutral /
🔴 Challenging with a one-line reason. It is shown on the occupation picker and
**never locks** a choice — the player can pick any occupation.

Same ownership split applies:
- **Content owner** edits the matrix (which pairings are strong/challenging +
  the reason). Unlisted pairings fall back to `NEUTRAL_COMPAT`, so new
  occupations/missions never break.
- **Simulation owner (optional):** if you want compatibility to also affect the
  sim (e.g. a small penalty on 🔴), read
  `getCompatibility(state.mission.missionType, state.character.occupation).rating`
  in `advanceSimulationDay()` and apply the math there. It is currently advisory
  only.

## Tests

See `src/tests/missions.test.ts` and `src/tests/compatibility.test.ts` for
examples that pin the contract:
modifiers are seeded per mission, `noResupply` suppresses the drop, radiation
accrues, the power penalty bites, and `startingResourceDelta` shifts the start.
Add a case here whenever you add or change a modifier's behaviour.
