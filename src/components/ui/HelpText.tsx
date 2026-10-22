/**
 * HelpText.tsx
 * ------------
 * Small help icon with tooltip for UI elements.
 * Provides context-sensitive help throughout the interface.
 */

import { type ReactElement } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTextProps {
  /** The help text to display */
  text: string;
  /** Optional: Position of tooltip */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpText({ text, position = 'top' }: HelpTextProps): ReactElement {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-space-900',
    bottom: 'left-1/2 bottom-full -translate-x-1/2 border-8 border-transparent border-b-space-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-space-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-space-900',
  };

  return (
    <span className="group relative inline-block ml-1">
      {/* Help icon */}
      <HelpCircle
        className="inline h-3.5 w-3.5 text-gray-500 hover:text-gray-300 cursor-help transition-colors"
        aria-label="Help"
      />
      
      {/* Tooltip */}
      <span
        className={`pointer-events-none absolute ${positionClasses[position]}
                   opacity-0 transition-opacity duration-200 group-hover:opacity-100
                   z-50 w-56`}
        role="tooltip"
      >
        <span
          className="block rounded-lg bg-space-900 border border-space-600 
                     px-3 py-2 text-xs text-gray-200 shadow-xl leading-relaxed"
        >
          {text}
          {/* Arrow */}
          <span className={`absolute ${arrowClasses[position]}`} aria-hidden="true" />
        </span>
      </span>
    </span>
  );
}
