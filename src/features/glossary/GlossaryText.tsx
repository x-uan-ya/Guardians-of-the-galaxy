/**
 * GlossaryText.tsx
 * ----------------
 * Shows a piece of game text and turns the harder words in it into hover tips.
 * Hover a dotted word (or focus it with the keyboard) to read what it means.
 *
 * It only reads the text it is given; it never changes the game. The text is
 * rendered as plain React text, so nothing in it can inject markup.
 */

import { Fragment, type ReactElement } from 'react';
import { Tooltip } from '../../components/ui/Tooltip';
import { splitGlossary } from './glossary';

interface GlossaryTextProps {
  children: string;
  /** Let keyboard users Tab to the words. Turn off for text inside a button. */
  focusable?: boolean;
}

export function GlossaryText({ children, focusable = true }: GlossaryTextProps): ReactElement {
  const pieces = splitGlossary(children);
  return (
    <>
      {pieces.map((piece, index) =>
        piece.entry ? (
          <Tooltip key={index} content={piece.entry.definition} focusable={focusable}>
            {piece.text}
          </Tooltip>
        ) : (
          <Fragment key={index}>{piece.text}</Fragment>
        )
      )}
    </>
  );
}
