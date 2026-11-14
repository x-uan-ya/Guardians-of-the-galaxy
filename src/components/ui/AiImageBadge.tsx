/**
 * AiImageBadge.tsx
 * ----------------
 * A small, always-visible label for images that were generated with an AI image
 * tool. The NASA Space Apps rules require a visible watermark on AI-generated
 * images, so every such picture in the game is wrapped in a `relative`
 * container with this badge inside it.
 *
 * Usage:
 *   <div className="relative ...">
 *     <img src="..." alt="..." />
 *     <AiImageBadge />
 *   </div>
 */
import type { ReactElement } from 'react';

export function AiImageBadge(): ReactElement {
  return (
    <span
      data-testid="ai-image-badge"
      className="pointer-events-none absolute bottom-1 right-1 z-10 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/40"
    >
      AI-generated image
    </span>
  );
}
