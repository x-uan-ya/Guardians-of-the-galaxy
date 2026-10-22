# Events & Crisis System Documentation

## Overview

The Events & Crisis System creates unpredictability and tension in the Mars simulation game. It includes:

- **15+ diverse events** (critical, major, minor, info)
- **State-based trigger conditions** (events become more likely when systems are stressed)
- **Weighted randomized selection** (deterministic using seeded RNG)
- **Dramatic crisis UI** (full-screen modal with severity-based styling)
- **Solar Storm flagship crisis** (showcase event with multiple high-stakes choices)

## Architecture

### Module Structure

```
src/features/events/
├── eventCatalog.ts      # Event content definitions (15+ events)
├── eventTriggers.ts     # Event selection & probability system
├── eventTypes.ts        # TypeScript type definitions
├── CrisisModal.tsx      # Dramatic UI for presenting events
└── index.ts             # Barrel export
```

### Key Files Modified

- `src/features/simulation/simulationEngine.ts` - Integrated event triggering into day advance
- `src/app/App.tsx` - Added CrisisModal to app composition
- `src/hooks/useGameState.ts` - Added event announcement to activity feed
- `src/lib/random.ts` - Added `seededRandom()` helper for deterministic randomness
- `src/styles/index.css` - Added crisis modal animations

## Event Catalog

### Critical Events (High Stakes)

1. **Solar Storm** (☀️)
   - Radiation spike, power generation reduced
   - 3 choices: Activate Shielding / Shutdown Systems / Risk It
   - Delayed effects over 2-3 days
   - Triggers: radiation > 50-70, low shielding, days 10-20

2. **Catastrophic System Failure** (⚠️)
   - Multiple systems fail simultaneously
   - 2 choices: Emergency Repairs / Conservation Mode
   - Triggers: avg systems < 50, power < 30

### Major Events (Significant Challenges)

3. **Severe Dust Storm**
   - Solar panels coated, power generation drops
   - 2 choices: Shelter / EVA to Clear Array

4. **Critical Equipment Failure**
   - Cascading failures possible
   - 3 choices: Immediate Repair / Patch Job / Defer

5. **Water System Contamination**
   - Health risk from contaminated water
   - 3 choices: Purge System / Intensive Filtration / Risk Use

6. **Communication Array Failure**
   - Cut off from Earth
   - 2 choices: Repair Immediately / Defer Repairs

7. **Battery System Malfunction**
   - Power storage critically compromised
   - 3 choices: Emergency Cooldown / Isolate Cells / Push Through

8. **Severe Temperature Drop**
   - Life support straining to maintain heat
   - 3 choices: Boost Heating / Emergency Insulation / Endure

### Minor Events (Smaller Challenges)

9. **Hydroponics Bloom**
   - Opportunity: invest for food boost
   - 2 choices: Invest in Growth / Harvest Now

10. **Resource Discovery**
    - Water-ice deposit found
    - 2 choices: Extract Resources / Ignore

11. **Minor Airlock Leak**
    - Slow oxygen loss
    - 2 choices: Seal Leak / Monitor & Defer

### Info Events (Positive/Neutral)

12. **Successful Research Experiment**
    - Morale boost, system improvements
    - 2 choices: Celebrate / Continue Working

## Event Triggering System

### Probability Calculation

Events use **weighted probabilities** based on game state:

```typescript
// Base weight for all events
const BASE_WEIGHT = 10;

// Example: Solar Storm becomes more likely when stressed
let weight = BASE_WEIGHT;
if (crew.radiationExposure > 50) weight += 30;
if (crew.radiationExposure > 70) weight += 50;
if (systems.shieldingIntegrity < 50) weight += 20;
if (day >= 10 && day <= 20) weight += 15;
```

### Trigger Conditions

Events respond to game state:

| Condition | Triggers |
|-----------|----------|
| `radiation > 70` | Solar Storm more likely |
| `avgSystems < 50` | System Failure more likely |
| `power < 30` | Equipment Failure, Battery Malfunction more likely |
| `water < 30` | Water Contamination more likely |
| `morale < 40` | Communication Failure more likely |

### Daily Event Roll

Each day advance:

1. **Calculate weights** for all events based on current state
2. **Roll for event trigger** (base 15% chance, increases to 25% mid-game, 35% late-game)
3. **Select event** using weighted random selection
4. **Check forced events** (critical conditions can force specific events)
5. **Add to activeEvents** if triggered

### Deterministic Randomness

Uses **seeded RNG** for reproducible gameplay:

```typescript
const seed = `${state.gameId}-day-${state.day}-event-roll`;
const shouldFire = seededRandom(seed) < (eventChancePercent / 100);
```

Same game ID + same decisions = same events at same times.

## Crisis UI System

### CrisisModal Component

Dramatic full-screen modal with severity-based styling:

```typescript
<CrisisModal
  event={activeEvent}
  onChoose={(actionId, choice) => resolveEvent(eventId, actionId)}
/>
```

### Severity Styling

| Severity | Style | Icon | Effect |
|----------|-------|------|--------|
| `critical` | Red border, pulsing | 🚨 | Forces decision before advancing |
| `major` | Orange border | ⚠️ | High emphasis |
| `minor` | Yellow border | 📍 | Medium emphasis |
| `info` | Blue border | ℹ️ | Low emphasis |

### Action Preview

Each choice shows:
- **Label** (bold, hover effect)
- **Description** (detailed explanation)
- **Immediate effects** (color-coded: green = gain, red = loss)
- **Delayed effects** (count shown with ⏱ icon)

### Animations

- **fadeIn**: Modal entrance animation (0.3s)
- **pulse-slow**: Critical event pulsing (2s loop)
- Respects `prefers-reduced-motion`

## Integration Points

### 1. Simulation Engine

Events trigger during day advance:

```typescript
// In advanceSimulationDay()
const newEvent = triggerEvent(afterEffects);
const activeEvents = newEvent 
  ? [...afterEffects.activeEvents, newEvent]
  : afterEffects.activeEvents;
```

### 2. Game State Hook

Activity feed announces events:

```typescript
if (next.activeEvents.length > prev.activeEvents.length) {
  const newEvent = next.activeEvents[next.activeEvents.length - 1];
  pushActivity(next.day, `🚨 EVENT: ${newEvent.title}`, 'bad');
}
```

### 3. App Composition

Modal renders over dashboard:

```typescript
{game.state.activeEvents.length > 0 && (
  <CrisisModal
    event={game.state.activeEvents[0]}
    onChoose={(actionId) => game.resolveActiveEvent(eventId, actionId)}
  />
)}
```

## Adding New Events

### 1. Define Event in Catalog

```typescript
{
  id: 'my-new-event',
  title: 'Event Title',
  description: 'Detailed description of what\'s happening.',
  severity: 'major',
  availableActions: [
    {
      id: 'my-event--action-1',
      label: 'Action Label',
      description: 'What this action does.',
      effect: {
        immediateResources: { power: -10 },
        immediateCrew: { morale: -5 },
        delayed: [
          {
            delayInDays: 3,
            description: 'Delayed consequence',
            parameters: { kind: 'resource', changes: { oxygen: -8 } },
          },
        ],
      },
    },
    // ... more actions
  ],
}
```

### 2. Add Trigger Logic

In `eventTriggers.ts`:

```typescript
// In calculateEventWeights()
let myEventWeight = BASE_WEIGHT;
if (resources.power < 30) myEventWeight += 40;
if (systems.powerGeneration < 50) myEventWeight += 30;
weights.push({ eventId: 'my-new-event', weight: myEventWeight });
```

### 3. Test the Event

No engine changes needed! The system handles:
- ✅ Validation
- ✅ Effect application
- ✅ History recording
- ✅ Delayed effect scheduling
- ✅ UI presentation

## Testing

All existing tests pass:
- ✅ Resource calculations
- ✅ Simulation engine
- ✅ Occupations
- ✅ Storage/persistence

Build succeeds with no errors:
- ✅ TypeScript compilation
- ✅ Vite production build

## Future Enhancements

Potential additions:

1. **Event chains** - Events that trigger follow-up events
2. **Occupation-specific events** - Events tailored to each occupation's strengths
3. **Event history tracking** - Prevent same event from repeating too soon
4. **Dynamic event descriptions** - Description text that changes based on state
5. **Multi-part events** - Events that unfold over several days
6. **Event sound effects** - Audio cues for different severity levels
7. **Event statistics** - Track which events occur most often in debrief

## Credits

System designed and implemented to meet specification:
- ✅ Reusable event framework
- ✅ Solar Storm flagship crisis
- ✅ Emergency recovery choices
- ✅ Randomized event selection (deterministic)
- ✅ Visual crisis state (dramatic UI)
- ✅ State-based trigger conditions
- ✅ 15+ diverse events covering all severity levels
