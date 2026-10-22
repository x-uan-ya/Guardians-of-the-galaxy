/**
 * EventDescription.tsx
 * --------------------
 * Component that renders event descriptions with tooltips for technical terms.
 * Makes the game more accessible to non-technical players.
 */

import { type ReactElement } from 'react';
import { Term } from '../../components/ui/Tooltip';

interface EventDescriptionProps {
  eventId: string;
  description: string;
}

/**
 * Renders a description with automatic tooltip highlighting for technical terms.
 * For special events, returns custom JSX with terms wrapped in <Term> components.
 */
export function EventDescription({ eventId, description }: EventDescriptionProps): ReactElement {
  // Special formatting for specific events with many technical terms
  switch (eventId) {
    case 'solar-storm':
      return (
        <>
          A massive <Term term="Coronal Mass Ejection" /> is heading toward Mars. <Term term="Radiation" /> levels are spiking, and <Term term="Solar Array">solar panels</Term> are experiencing severe interference. The storm will last for days. You must act now to protect your crew and systems.
        </>
      );
      
    case 'dust-storm':
      return (
        <>
          A massive <Term term="Dust Storm" /> is approaching. <Term term="Solar Array">Solar panels</Term> will be coated with dust, drastically reducing <Term term="Power Generation">power generation</Term>. The storm could last several days.
        </>
      );
      
    case 'water-contamination':
      return (
        <>
          <Term term="Contamination" /> detected in the water recycling system. Crew health is at risk. The water supply needs immediate attention or must be rationed heavily.
        </>
      );
      
    case 'equipment-failure':
      return (
        <>
          Essential equipment has failed. <Term term="Systems" /> diagnostics show cascading failures possible. You need to decide how to allocate your limited repair resources.
        </>
      );
      
    case 'temperature-drop':
      return (
        <>
          External temperatures have plummeted far below normal. Habitat insulation is being tested to its limits. <Term term="Life Support" /> systems are straining to maintain livable temperatures.
        </>
      );
      
    case 'communication-failure':
      return (
        <>
          The communication array with Earth has failed. You are cut off from mission control. Repairs are possible but will divert resources from other critical needs.
        </>
      );
      
    case 'battery-malfunction':
      return (
        <>
          The main battery banks are overheating and failing. <Term term="Power" /> storage is critically compromised. Without batteries, nighttime operations will be nearly impossible.
        </>
      );
      
    case 'hydroponics-bloom':
      return (
        <>
          The greenhouse is thriving unexpectedly. Invest now for a delayed food boost, or take a small immediate gain.
        </>
      );
      
    case 'catastrophic-system-failure':
      return (
        <>
          Multiple <Term term="Critical Systems" /> have failed simultaneously. <Term term="Life Support" /> is compromised, <Term term="Power" /> is fluctuating, and oxygen levels are dropping. This is a compound emergency requiring immediate prioritization.
        </>
      );
      
    default:
      // For other events, return description as-is
      return <>{description}</>;
  }
}
