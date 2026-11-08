/**
 * ModalPortal.tsx
 * ---------------
 * Renders a full-screen overlay (confirm dialogs, pause, game over...) directly
 * under <body>, outside the app layout.
 *
 * Why: the main content area is animated with a CSS transform. A transformed
 * ancestor becomes the "containing block" for `position: fixed` children, so an
 * overlay rendered inside it is sized and centred against that area instead of
 * the screen (it ends up off-centre, shifted by the sidebar and the page scroll).
 * Rendering through a portal keeps the overlay centred on the screen no matter
 * what its parents do.
 */

import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function ModalPortal({ children }: { children: ReactNode }): ReactElement {
  return createPortal(children, document.body);
}
