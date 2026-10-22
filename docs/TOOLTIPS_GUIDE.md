# Tooltip System - Making the Game Accessible

## Overview

The tooltip system helps non-technical players understand space and technical terminology throughout the game. When players hover over underlined terms, they see simple explanations.

## Features

### 1. **Automatic Tooltips in Event Descriptions**
Technical terms in event descriptions are automatically highlighted with dotted underlines. Hovering shows a definition.

**Example:**
- Hover over "Radiation" → See: "Harmful energy from the sun and space..."
- Hover over "EVA" → See: "Extra-Vehicular Activity - Going outside..."
- Hover over "Sol" → See: "A Martian day (24 hours and 39 minutes)..."

### 2. **Pre-defined Dictionary**
Common terms have built-in definitions in `src/components/ui/Tooltip.tsx`:

| Term | Definition |
|------|------------|
| Sol | A Martian day (24 hours and 39 minutes) |
| EVA | Extra-Vehicular Activity - Going outside in a spacesuit |
| Radiation | Harmful energy from the sun that can damage crew health |
| Shielding | Protective barriers that block radiation |
| Life Support | Systems providing air, water, and temperature control |
| Hydroponics | Growing plants in water to produce food |
| Solar Array | Panels that convert sunlight into electricity |
| Dust Storm | Massive storms that block sunlight and coat solar panels |
| Morale | Mental and emotional well-being of the crew |
| ...and 20+ more terms |

### 3. **Visual Design**
- **Dotted underline** indicates a term has a tooltip
- **Dark popup** appears above the term when hovering
- **Arrow** points to the term
- **Auto-positioning** prevents tooltips from going off-screen

## How to Use

### For Players

Simply **hover your mouse** over any underlined term to see its definition. No clicking required!

### For Developers

#### Add a tooltip to any text:

```tsx
import { Term } from '../components/ui/Tooltip';

// Use a pre-defined term
<Term term="Radiation" />

// Use a term with custom display text
<Term term="Solar Array">solar panels</Term>

// Use a custom definition
<Term term="XYZ" definition="Custom explanation here">XYZ</Term>
```

#### Add a new term to the dictionary:

Edit `src/components/ui/Tooltip.tsx`:

```typescript
const DEFINITIONS: Record<string, string> = {
  // ...existing terms...
  'New Term': 'Simple explanation that anyone can understand.',
};
```

#### Add a help icon with tooltip:

```tsx
import { HelpText } from '../components/ui/HelpText';

<span>
  Resource Name <HelpText text="Explanation of this resource" />
</span>
```

## Current Implementation

### Events with Tooltips

These events have enhanced descriptions with tooltips:

1. ✅ **Solar Storm** - Coronal Mass Ejection, Radiation, Solar Array
2. ✅ **Dust Storm** - Dust Storm, Solar Array, Power Generation
3. ✅ **Water Contamination** - Contamination
4. ✅ **Equipment Failure** - Systems
5. ✅ **Temperature Drop** - Life Support
6. ✅ **Communication Failure** - (no technical terms needed)
7. ✅ **Battery Malfunction** - Power
8. ✅ **Hydroponics Bloom** - (no technical terms needed)
9. ✅ **Catastrophic System Failure** - Critical Systems, Life Support, Power

### Terms Defined (30+ total)

**Space Terminology:**
- Sol, EVA, Radiation, Shielding, Coronal Mass Ejection
- Solar Array, Airlock, Hydroponics

**System Terminology:**
- Life Support, Power Generation, Food Production
- Systems, Critical Systems, Efficiency

**Resource Terminology:**
- Power, Water, Oxygen, Morale, Reserves

**Event Terminology:**
- Dust Storm, Contamination, Filtration
- Temperature Drop

## Examples in Action

### Example 1: Solar Storm Event

**Before (technical):**
> "A massive coronal mass ejection is heading toward Mars. Radiation levels are spiking..."

**After (with tooltips):**
> "A massive **[coronal mass ejection](tooltip: A massive burst of radiation from the sun)** is heading toward Mars. **[Radiation](tooltip: Harmful energy from space that can damage crew health)** levels are spiking..."

### Example 2: Equipment Failure

**Before:**
> "Systems diagnostics show cascading failures..."

**After:**
> "**[Systems](tooltip: The outpost's machinery and equipment)** diagnostics show cascading failures..."

## Benefits

### For New Players
- ✅ Understand terminology without leaving the game
- ✅ Learn space concepts naturally through gameplay
- ✅ Reduced frustration and confusion
- ✅ More accessible to younger players

### For Educators
- ✅ Built-in educational content
- ✅ Accurate but simple definitions
- ✅ Encourages exploration and learning
- ✅ Can be used in classroom settings

### For Game Design
- ✅ Use realistic terminology without alienating players
- ✅ Maintain immersion and authenticity
- ✅ Progressive learning curve
- ✅ Professional appearance

## Future Enhancements

Potential additions:

1. **Dashboard Tooltips** - Add help icons to resource panels
2. **Interactive Glossary** - Dedicated page listing all terms
3. **Beginner Mode** - Automatically show all tooltips first playthrough
4. **Expanded Dictionary** - Add 50+ more terms
5. **Multilingual Support** - Translations for definitions
6. **Audio Pronunciation** - Hear how to pronounce terms
7. **Links to NASA Resources** - Deep dives for curious players

## Technical Details

### Files

- `src/components/ui/Tooltip.tsx` - Core tooltip component + Term dictionary
- `src/components/ui/HelpText.tsx` - Help icon with tooltip
- `src/features/events/EventDescription.tsx` - Event descriptions with tooltips

### Styling

Tooltips use Tailwind CSS classes:
- Dark background (`bg-space-900`)
- Border (`border border-space-600`)
- Shadow (`shadow-xl`)
- Positioned absolutely with arrow pointer

### Accessibility

- Uses semantic HTML (`role="tooltip"`)
- Keyboard accessible (focus reveals tooltip)
- Screen reader friendly
- High contrast text
- Large enough font (12px minimum)

## Adding More Tooltips

### Priority Areas

1. **Dashboard panels** - Resources, Crew, Systems
2. **Mission Setup** - Occupation descriptions
3. **Debrief screen** - Statistics and terms
4. **Action buttons** - What each routine action does

### Guidelines

**Good definitions:**
- ✅ Short (1-2 sentences max)
- ✅ Simple language (5th grade reading level)
- ✅ Concrete (avoid abstract concepts)
- ✅ Relevant (explains why it matters)

**Bad definitions:**
- ❌ Too technical ("electromagnetic radiation in the 10 keV range...")
- ❌ Too vague ("A thing that does stuff...")
- ❌ Too long (paragraph of text)
- ❌ Circular ("Radiation is radioactive energy...")

## Testing

To test tooltips:

1. Run the game: `npm run dev`
2. Start a mission
3. Advance until an event appears (Solar Storm, Dust Storm, etc.)
4. Hover over underlined terms in the description
5. Verify tooltip appears with correct text
6. Check tooltip positioning on different screen sizes

## Conclusion

The tooltip system makes the Mars simulation accessible to everyone, not just space enthusiasts. Players can enjoy realistic space terminology while learning what it means through natural gameplay.

**Status: ✅ Implemented and working**
