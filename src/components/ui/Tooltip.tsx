/**
 * Tooltip.tsx
 * -----------
 * Reusable tooltip component for showing definitions and explanations
 * when hovering over technical terms.
 */

import { type ReactElement, type ReactNode, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  /** The term or content to show the tooltip for */
  children: ReactNode;
  /** The explanation/definition to show in the tooltip */
  content: string;
  /** Optional custom class for the trigger element */
  className?: string;
}

export function Tooltip({ children, content, className = '' }: TooltipProps): ReactElement {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, alignment: 'center' as 'left' | 'center' | 'right' });
  
  const updatePosition = () => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 256; // w-64 = 16rem = 256px
    const tooltipHeight = 80; // approximate height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 16;
    
    // Calculate centered position
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let alignment: 'left' | 'center' | 'right' = 'center';
    
    // Adjust if overflowing right
    if (left + tooltipWidth > viewportWidth - padding) {
      left = rect.right - tooltipWidth;
      alignment = 'right';
    }
    
    // Adjust if overflowing left
    if (left < padding) {
      left = rect.left;
      alignment = 'left';
    }
    
    // Position below by default
    let top = rect.bottom + 8;
    
    // If not enough space below, position above
    if (top + tooltipHeight > viewportHeight - padding) {
      top = rect.top - tooltipHeight - 8;
    }
    
    setPosition({ top, left, alignment });
  };
  
  const handleMouseEnter = () => {
    setIsVisible(true);
    updatePosition();
  };
  
  const handleMouseLeave = () => {
    setIsVisible(false);
  };
  
  // Update position on scroll
  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);
  
  // Arrow offset based on alignment
  const arrowOffset = position.alignment === 'center' 
    ? 'left-1/2 -translate-x-1/2' 
    : position.alignment === 'left' 
    ? 'left-8' 
    : 'right-8';
  
  return (
    <>
      <span 
        ref={triggerRef}
        className={`group relative inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* The term/trigger */}
        <span className="cursor-help border-b border-dotted border-current">
          {children}
        </span>
      </span>
      
      {/* Portal the tooltip to body so it's not clipped */}
      {isVisible && createPortal(
        <div
          className="fixed z-[9999] w-64 pointer-events-none transition-opacity duration-200"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
          role="tooltip"
        >
          <div className="block rounded-lg bg-space-900 border border-space-600 px-3 py-2 text-xs text-gray-200 shadow-xl break-words">
            {content}
            {/* Arrow pointing UP to the term */}
            <span
              className={`absolute bottom-full border-8 border-transparent border-b-space-900 ${arrowOffset}`}
              aria-hidden="true"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * Term component - Convenience wrapper for common technical terms
 * with pre-defined definitions.
 */

interface TermProps {
  /** The term to define */
  term: string;
  /** Optional: override the default definition */
  definition?: string;
  /** Optional: custom display text (if different from term) */
  children?: string;
}

// Dictionary of common space/technical terms
const DEFINITIONS: Record<string, string> = {
  // Space terms
  'Sol': 'A Martian day (24 hours and 39 minutes). Used to track mission time on Mars.',
  'EVA': 'Extra-Vehicular Activity - Going outside the habitat in a spacesuit to do repairs or collect samples.',
  'Radiation': 'Harmful energy from the sun and space that can damage crew health. Mars has no magnetic field to protect against it.',
  'Shielding': 'Protective barriers that block harmful radiation from reaching the crew.',
  'Life Support': 'Critical systems that provide breathable air, clean water, and temperature control.',
  'Hydroponics': 'Growing plants in water without soil. Used to produce fresh food on Mars.',
  'Airlock': 'A sealed room with two doors that allows crew to go outside without losing air from the habitat.',
  'Coronal Mass Ejection': 'A massive burst of radiation and particles from the sun that can be dangerous to Mars missions.',
  'Solar Array': 'Panels that convert sunlight into electricity to power the outpost.',
  'Power Generation': 'How much electricity the outpost can produce from solar panels or nuclear sources.',
  'Oxygen': 'Breathable air. Must be produced or recycled constantly to survive.',
  'Morale': 'The mental and emotional well-being of the crew. Low morale affects performance.',
  
  // System terms
  'Food Production': 'How efficiently the greenhouse grows food. Higher is better.',
  'Power': 'Electricity stored in batteries. Everything needs power to run.',
  'Water': 'Essential for drinking, growing food, and life support. Must be recycled carefully.',
  'Systems': 'The outpost\'s machinery and equipment. Needs regular maintenance.',
  
  // Event terms
  'Dust Storm': 'Massive storms on Mars that block sunlight and coat solar panels with dust, reducing power.',
  'Contamination': 'When water or air becomes impure and potentially harmful to the crew.',
  'Filtration': 'The process of cleaning water or air to make it safe to use.',
  'Temperature Drop': 'When Mars gets even colder than normal, requiring more power for heating.',
  'Critical Systems': 'Essential equipment that the crew cannot survive without, like oxygen production.',
  
  // Measurement terms
  'Efficiency': 'How well a system is working. 100% is perfect, lower means degraded performance.',
  'Reserves': 'Supplies stored for future use. Higher reserves mean more safety margin.',
};

export function Term({ term, definition, children }: TermProps): ReactElement {
  const content = definition || DEFINITIONS[term] || `${term} - No definition available`;
  const displayText = children || term;
  
  return (
    <Tooltip content={content}>
      {displayText}
    </Tooltip>
  );
}
