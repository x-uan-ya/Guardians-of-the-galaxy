/**
 * SectionHeader.tsx
 * -----------------
 * A consistent heading for dashboard panels: an icon, a title, and optional
 * right-aligned content (e.g. a count or small control). Pure presentational.
 */

import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  /** Optional right-aligned slot. */
  action?: ReactNode;
  /** Optional sub-label under the title. */
  subtitle?: string;
}

export function SectionHeader({
  title,
  icon: Icon,
  action,
  subtitle,
}: SectionHeaderProps): ReactElement {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-mars-orange" aria-hidden /> : null}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
