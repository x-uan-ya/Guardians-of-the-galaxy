/**
 * formatFlow.ts
 * -------------
 * Text formatting only (no game maths) for the per-Sol figures that the engine
 * works out in resourceForecast.ts.
 */

/** "+1.2 / Sol", "-3.4 / Sol" (true minus sign), or "0 / Sol". */
export function formatPerSol(value: number): string {
  // Anything that rounds to zero would print as "-0.0", so show it as steady.
  if (Math.abs(value) < 0.05) return '0 / Sol';
  const sign = value > 0 ? '+' : '\u2212';
  return `${sign}${Math.abs(value).toFixed(1)} / Sol`;
}

/** "5 Sols left" / "1 Sol left" / "Empty". */
export function formatSolsLeft(days: number): string {
  if (days <= 0) return 'Empty';
  return `${days} Sol${days === 1 ? '' : 's'} left`;
}

/** Runway text for a resource: a Sol count, or a calm note when it outlasts the mission. */
export function formatRunway(days: number, lastsToRescue: boolean): string {
  return lastsToRescue ? 'Lasts to rescue' : formatSolsLeft(days);
}
