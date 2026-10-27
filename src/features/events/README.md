# Events Module

## Overview

The Events module creates unpredictability and tension through a dynamic crisis system. Events are state-aware, weighted by current conditions, and presented with dramatic UI.

## Files

### `eventCatalog.ts`
**Content definitions** for all events and free actions.

```typescript
export const EVENT_CATALOG: GameEvent[] = [
  // 15+ events across all severity levels
];
```

Chapter 1–3 storyline definitions live in `chapter1Events.ts`,
`chapter2Events.ts`, and `chapter3Events.ts`; `eventCatalog.ts` registers them
alongside the existing random-event catalogue.

To add an event, append to `EVENT_CATALOG` with:
- Unique `id`
- `title` and `description`
- `severity` (critical | major | minor | info)
- Array of `availableActions` (minimum 1)

### `eventTriggers.ts`
**Event selection system** for scheduled story events, forced events, and weighted random events.

Key functions:
- `calculateEventWeights(state)` - Compute event probabilities based on game state
- `rollForEvent(state)` - Randomly select an event to trigger
- `checkForcedEvent(state)` - Force critical events when conditions warrant
- `chapter1EventForDay(day, missionType)` - Look up the Chapter 1 event variant for a Sol and mission site
- `chapter2EventForDay(day, state)` - Look up a Chapter 2 variant using mission and state context
- `chapter3EventForDay(day, state)` - Look up a Chapter 3 event, including the Sol 15 resupply variant
- `triggerEvent(state)` - Main entry point (scheduled story event, then forced, then random)

Chapter 1 events are scheduled on Sols 1–5. Sol 1 is placed in the initial game
state; Sols 2–5 are selected during day advance. Chapter 2 events are scheduled
on Sols 6–10, and Chapter 3 events on Sols 11–15. Chapters 1–3 keep shared
schedules across mission sites with location-specific descriptions. Chapter 3
Sol 15 acknowledges the existing Lunar/Mars resupply without adding resources
again; Deep Space instead receives a no-resupply survival event. Chapter 1 Sol
5 offers one extra response for the local crisis; Chapter 2 Sol 6 and Sol 9
adapt their narrative to decision history and system condition.

Scheduled story events take priority over forced and random events on their
Sols. Events do not stack: players must resolve an active event before
advancing or taking a free action. Once Sol 15 passes, the existing forced and
random event selection continues. Resolution uses the active event's stored
choices, preserving the presented variant when a game is restored.

### `eventTypes.ts`
**TypeScript types** for the event system.

Core types:
- `GameEvent` - Complete event definition
- `EventAction` - One choice within an event
- `ActionEffect` - Immediate and delayed consequences
- `EventSeverity` - Severity classification

### `CrisisModal.tsx`
**Dramatic UI component** for presenting events.

Features:
- Full-screen modal with backdrop blur
- Severity-based styling and icons
- Action preview with effect breakdown
- Animations (fade-in, pulse for critical)
- Keyboard and screen reader accessible

## Usage

### Triggering Events

Events trigger automatically during day advance:

```typescript
// In simulationEngine.ts
const newEvent = triggerEvent(state);
if (newEvent) {
  state = { ...state, activeEvents: [...state.activeEvents, newEvent] };
}
```

### Resolving Events

Players choose an action via the Crisis Modal:

```typescript
<CrisisModal
  event={activeEvent}
  onChoose={(actionId) => resolveActiveEvent(eventId, actionId)}
/>
```

The resolution:
1. Validates the action exists
2. Applies immediate effects
3. Schedules delayed effects
4. Records decision in history
5. Removes event from activeEvents

## Event Examples

### Critical: Solar Storm

```typescript
{
  id: 'solar-storm',
  title: '☀️ SOLAR STORM DETECTED',
  severity: 'critical',
  availableActions: [
    {
      id: 'solar-storm--activate-shielding',
      label: 'Activate Full Shielding',
      effect: {
        immediateResources: { power: -30 },
        immediateSystems: { shieldingIntegrity: 15 },
        immediateCrew: { radiationExposure: -5 },
        delayed: [
          {
            delayInDays: 2,
            description: 'Storm subsides',
            parameters: { kind: 'system', changes: { powerGeneration: 8 } },
          },
        ],
      },
    },
    // ... more actions
  ],
}
```

### Major: Equipment Failure

Multiple choices with different trade-offs:
- **Immediate Repair** - Expensive but prevents escalation
- **Patch Job** - Cheap but may fail again later
- **Defer** - Free but system degradation continues

### Minor: Resource Discovery

Opportunity events:
- **Extract** - Costs power/risk, yields delayed water gain
- **Ignore** - Small morale penalty, saves resources

## Trigger Conditions

Events respond to state dynamically:

| Event | Trigger Conditions |
|-------|-------------------|
| Solar Storm | `radiation > 50`, `shielding < 50`, days 10-20 |
| System Failure | `avgSystems < 50`, `power < 30` |
| Equipment Failure | `power < 30`, `lifeSupportEfficiency < 50` |
| Water Contamination | `water < 30`, `lifeSupportEfficiency < 50` |
| Battery Malfunction | `power < 40`, `powerGeneration < 50` |

Higher weights = more likely to trigger.

## Deterministic Randomness

Events use seeded RNG for reproducible gameplay:

```typescript
const seed = `${gameId}-day-${day}-event-roll`;
const random = seededRandom(seed);
```

Same game ID + same decisions = same events.

## Extending

### Add a New Event

1. **Define in catalog**:
   ```typescript
   {
     id: 'my-event',
     title: 'Event Title',
     description: '...',
     severity: 'major',
     availableActions: [/* ... */],
   }
   ```

2. **Add trigger logic**:
   ```typescript
   let weight = BASE_WEIGHT;
   if (condition) weight += 40;
   weights.push({ eventId: 'my-event', weight });
   ```

3. **Done!** Engine handles everything else.

### Customize UI

Severity styles defined in `CrisisModal.tsx`:

```typescript
const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-950/95',
    border: 'border-red-500',
    icon: '🚨',
    pulse: true,
  },
  // ... others
};
```

Add new severity level or customize existing ones.

## Design Principles

1. **State-aware** - Events respond to current conditions
2. **Consequences** - Every choice has trade-offs
3. **Delayed effects** - Actions create future impacts
4. **Deterministic** - Same inputs = same results
5. **Dramatic** - UI creates tension and urgency
6. **Accessible** - Keyboard navigation, screen readers

## Statistics

- **15 events** total
- **2 critical** (high-stakes crises)
- **7 major** (significant challenges)
- **3 minor** (smaller problems/opportunities)
- **1 info** (positive outcomes)
- **35+ total actions** (average 2.3 per event)
- **25+ delayed effects** across all events
