import { useEffect, useRef, useState } from 'react';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import type { StatusLevel } from '../../simulation/simulationTypes';
import type { MetricPreview } from './actionPreview';

const fmt = (value: number): string => String(Math.round(value * 100) / 100);

function AnimatedNumber({ value, initial }: { value: number; initial: number }) {
  const [display, setDisplay] = useState(initial);
  const last = useRef(initial);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const from = last.current;
    const start = performance.now();
    const finish = (): void => {
      cancelAnimationFrame(frame);
      last.current = value;
      setDisplay(value);
    };
    const animate = (now: number): void => {
      const progress = Math.min(1, Math.max(0, (now - start) / 300));
      const next = from + (value - from) * (1 - (1 - progress) ** 3);
      last.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    const onMotion = (): void => { if (media?.matches) finish(); };
    if (media?.matches) finish();
    else frame = requestAnimationFrame(animate);
    media?.addEventListener('change', onMotion);
    return () => {
      cancelAnimationFrame(frame);
      media?.removeEventListener('change', onMotion);
    };
  }, [value]);
  return <>{Math.round(display)}</>;
}

/** Round only the display; calculations and bar widths retain their precision. */
export function PreviewMetric({ value, preview }: { value: number; preview?: MetricPreview }) {
  if (!preview) return <span className="bunker-metric-number">{Math.round(value)}%</span>;
  const change = `${preview.change > 0 ? '+' : ''}${fmt(preview.change)}`;
  return <span className="bunker-metric-number bunker-preview-number" role="group" data-preview-tone={preview.tone}
    aria-label={`Current ${fmt(value)} percent; projected ${fmt(preview.projected)} percent; change ${change}`}>
    <span aria-hidden="true">
      <AnimatedNumber value={preview.projected} initial={value} />%
    </span>
  </span>;
}

export function PreviewBar({ value, level, label, preview }: {
  value: number; level: StatusLevel; label: string; preview?: MetricPreview;
}) {
  return <div className="bunker-preview-bar" data-preview-tone={preview?.tone}>
    <ProgressBar value={preview?.projected ?? value} level={level}
      label={preview ? `${label} projected after planned action` : label} />
    {preview ? <span className="bunker-preview-marker" aria-hidden="true" style={{ left: `${value}%` }} /> : null}
  </div>;
}
