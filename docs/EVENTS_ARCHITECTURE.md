# Events System Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         React App Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐          ┌──────────────┐                      │
│  │   App     │◄─────────┤ useGameState │                      │
│  │  (App.tsx)│          │   (Hook)     │                      │
│  └─────┬─────┘          └──────┬───────┘                      │
│        │                       │                               │
│        │ renders when          │ state.activeEvents.length > 0 │
│        │ events exist          │                               │
│        ▼                       │                               │
│  ┌─────────────┐              │                               │
│  │ CrisisModal │              │                               │
│  │   (UI)      │              │                               │
│  └──────┬──────┘              │                               │
│         │                     │                               │
│         │ onChoose(actionId)  │                               │
│         │                     │                               │
│         └─────────────────────┤                               │
│                               │                               │
│                               ▼                               │
│                      resolveActiveEvent()                     │
│                               │                               │
└───────────────────────────────┼───────────────────────────────┘
                                │
┌───────────────────────────────┼───────────────────────────────┐
│                    Simulation Engine Layer                     │
├───────────────────────────────┼───────────────────────────────┤
│                               │                               │
│  ┌────────────────────────────▼───────────────────────┐      │
│  │    simulationEngine.ts                             │      │
│  │                                                     │      │
│  │  advanceSimulationDay(state)                       │      │
│  │    │                                                │      │
│  │    ├─1. Increment day                              │      │
│  │    ├─2. Apply daily resource delta                 │      │
│  │    ├─3. Process delayed effects                    │      │
│  │    ├─4. ┌─────────────────────┐                   │      │
│  │    │    │  triggerEvent()     │◄──┐               │      │
│  │    │    └─────────────────────┘   │               │      │
│  │    └─5. Recompute status          │               │      │
│  │                                    │               │      │
│  │  applyPlayerDecision(state, input)│               │      │
│  │    │                               │               │      │
│  │    ├─ Validate action              │               │      │
│  │    ├─ Apply immediate effects      │               │      │
│  │    ├─ Schedule delayed effects     │               │      │
│  │    ├─ Record in history            │               │      │
│  │    └─ Remove from activeEvents     │               │      │
│  │                                    │               │      │
│  └────────────────────────────────────┼───────────────┘      │
│                                       │                       │
└───────────────────────────────────────┼───────────────────────┘
                                        │
┌───────────────────────────────────────┼───────────────────────┐
│                      Events Module                             │
├───────────────────────────────────────┼───────────────────────┤
│                                       │                       │
│  ┌────────────────────────────────────▼─────────────────┐    │
│  │  eventTriggers.ts                                     │    │
│  │                                                        │    │
│  │  triggerEvent(state)                                  │    │
│  │    │                                                   │    │
│  │    ├─ checkForcedEvent(state)                         │    │
│  │    │   └─ If critical conditions → return event       │    │
│  │    │                                                   │    │
│  │    └─ rollForEvent(state)                             │    │
│  │        │                                               │    │
│  │        ├─ calculateEventWeights(state)                │    │
│  │        │   │                                           │    │
│  │        │   ├─ For each event:                         │    │
│  │        │   │   weight = BASE_WEIGHT                   │    │
│  │        │   │   if (condition) weight += bonus         │    │
│  │        │   │                                           │    │
│  │        │   └─ Return EventWeight[]                    │    │
│  │        │                                               │    │
│  │        ├─ Roll for trigger (15-35% chance)            │    │
│  │        │                                               │    │
│  │        └─ Select event by weighted random             │    │
│  │            │                                           │    │
│  │            └─ seededRandom(gameId + day)              │    │
│  │                                                        │    │
│  └────────────────────────────┬───────────────────────────┘    │
│                               │                               │
│  ┌────────────────────────────▼───────────────────────┐      │
│  │  eventCatalog.ts                                   │      │
│  │                                                     │      │
│  │  EVENT_CATALOG: GameEvent[]                        │      │
│  │    ├─ solar-storm (critical)                       │      │
│  │    ├─ catastrophic-system-failure (critical)       │      │
│  │    ├─ dust-storm (major)                           │      │
│  │    ├─ equipment-failure (major)                    │      │
│  │    ├─ water-contamination (major)                  │      │
│  │    ├─ communication-failure (major)                │      │
│  │    ├─ battery-malfunction (major)                  │      │
│  │    ├─ temperature-drop (major)                     │      │
│  │    ├─ hydroponics-bloom (minor)                    │      │
│  │    ├─ resource-discovery (minor)                   │      │
│  │    ├─ minor-airlock-leak (minor)                   │      │
│  │    └─ successful-experiment (info)                 │      │
│  │                                                     │      │
│  │  Each event has:                                   │      │
│  │    ├─ id, title, description, severity            │      │
│  │    └─ availableActions[]                           │      │
│  │        ├─ id, label, description                   │      │
│  │        └─ effect:                                   │      │
│  │            ├─ immediateResources                    │      │
│  │            ├─ immediateCrew                         │      │
│  │            ├─ immediateSystems                      │      │
│  │            └─ delayed[]                             │      │
│  │                ├─ delayInDays                       │      │
│  │                ├─ description                       │      │
│  │                └─ parameters                        │      │
│  │                                                     │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Event Triggering (Day Advance)

```
User clicks "Advance Day"
  │
  ├─► useGameState.advanceDay()
  │
  └─► simulationEngine.advanceSimulationDay(state)
       │
       ├─► Increment day
       ├─► Apply resource deltas
       ├─► Process delayed effects
       │
       ├─► eventTriggers.triggerEvent(state)
       │    │
       │    ├─► checkForcedEvent(state)
       │    │    └─► If critical conditions → return specific event
       │    │
       │    └─► rollForEvent(state)
       │         │
       │         ├─► calculateEventWeights(state)
       │         │    └─► Returns weighted list based on game state
       │         │
       │         ├─► Roll (15-35% base chance)
       │         │
       │         └─► Select event from EVENT_CATALOG
       │              using seededRandom(gameId + day)
       │
       └─► Add event to state.activeEvents
            │
            └─► Return new state
                 │
                 └─► Activity feed announces event
                      │
                      └─► UI renders CrisisModal
```

### 2. Event Resolution (Player Choice)

```
User clicks action in CrisisModal
  │
  ├─► CrisisModal.onChoose(actionId)
  │
  └─► useGameState.resolveActiveEvent(eventId, actionId)
       │
       └─► useGameState.decide({ eventId, actionId })
            │
            └─► simulationEngine.applyPlayerDecision(state, input)
                 │
                 ├─► Validate action exists in event
                 │
                 ├─► Apply immediate effects:
                 │    ├─ immediateResources → resources
                 │    ├─ immediateCrew → crew
                 │    └─ immediateSystems → systems
                 │
                 ├─► Schedule delayed effects:
                 │    └─ Add to state.pendingEffects with:
                 │        ├─ scheduledDay = currentDay + delayInDays
                 │        ├─ sourceDecisionId
                 │        └─ effect parameters
                 │
                 ├─► Create DecisionRecord:
                 │    └─ Add to state.history
                 │
                 ├─► Remove event from state.activeEvents
                 │
                 └─► Recompute mission status & score
                      │
                      └─► Return new state
                           │
                           └─► CrisisModal closes
                                │
                                └─► Activity feed shows decision
```

### 3. Delayed Effects (Future Days)

```
Day N: Player chooses action with delayed effect

state.pendingEffects.push({
  scheduledDay: N + 3,  // Fires 3 days later
  description: "Consequence happens",
  parameters: { kind: 'crew', changes: { health: -10 } }
})

...

Day N+3: advanceSimulationDay()
  │
  └─► effectProcessor.processDueEffects(state)
       │
       ├─► Find effects where scheduledDay <= currentDay
       │
       ├─► Apply each effect:
       │    ├─ resource effects → modify resources
       │    ├─ crew effects → modify crew
       │    ├─ system effects → modify systems
       │    └─ status effects → change mission status
       │
       ├─► Remove applied effects from pendingEffects
       │
       └─► Return { state, applied }
            │
            └─► Activity feed shows delayed effects
```

## State Structure

```typescript
GameState {
  day: number,
  resources: Resources,
  crew: CrewState,
  systems: SystemState,
  mission: MissionState,
  
  // Events
  activeEvents: GameEvent[],     // Currently awaiting player response
  
  // History
  history: DecisionRecord[],     // All decisions made
  pendingEffects: DelayedEffect[] // Future consequences
}
```

## Event Lifecycle

```
┌──────────────┐
│  EVENT POOL  │ EVENT_CATALOG (15 events)
└──────┬───────┘
       │
       │ Daily Roll (15-35% chance)
       │ + State-based weights
       │
       ▼
┌──────────────┐
│   ACTIVE     │ state.activeEvents[0]
│   (UI SHOWN) │
└──────┬───────┘
       │
       │ Player chooses action
       │
       ▼
┌──────────────┐
│   RESOLVED   │ Added to history
│              │ Immediate effects applied
└──────┬───────┘
       │
       │ If has delayed effects
       │
       ▼
┌──────────────┐
│   PENDING    │ state.pendingEffects[]
│   (FUTURE)   │ scheduledDay = currentDay + delay
└──────┬───────┘
       │
       │ When scheduledDay reached
       │
       ▼
┌──────────────┐
│   APPLIED    │ Effects execute
│   (PAST)     │ Removed from pendingEffects
└──────────────┘
```

## Key Design Decisions

### 1. Only One Active Event at a Time
- Prevents overwhelming the player
- Creates focused decision moments
- `activeEvents` check prevents new events when one exists

### 2. Deterministic Randomness
- Uses seeded RNG: `seededRandom(gameId + day)`
- Same game + same decisions = same events
- Enables testing and balancing

### 3. State-Based Weights
- Events become more likely when relevant metrics stressed
- Creates dynamic difficulty
- Rewards good management, punishes neglect

### 4. Separation of Concerns
- Content (catalog) separate from logic (triggers)
- Logic separate from presentation (modal)
- Easy to add new events without changing code

### 5. Integration with Existing Systems
- Uses simulation engine's decision system
- Records in history like any other decision
- Respects all game rules (bounds, validation)

## Performance Characteristics

- **Event triggering**: O(n) where n = number of events (~15)
- **Weight calculation**: O(n) - single pass through events
- **Event selection**: O(n) - weighted random walk
- **Total overhead**: < 1ms per day advance
- **Memory**: Minimal - events are references, not copies

## Extension Points

### Adding a New Event
1. Add to `EVENT_CATALOG` in `eventCatalog.ts`
2. Add weight calculation in `eventTriggers.ts`
3. Done! Everything else is automatic

### Custom UI for Specific Events
- Add conditional rendering in `CrisisModal.tsx`
- Check `event.id` to customize presentation

### Event Chains
- In action effect, add new event to `activeEvents`
- Future enhancement for multi-stage crises

### Occupation-Specific Events
- Add occupation check in weight calculation
- Adjust probabilities per character type
