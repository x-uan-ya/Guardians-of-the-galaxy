/**
 * adviceService.ts
 * ----------------
 * Gets advice for the player, with a guaranteed fallback.
 *
 *   rules only (default)  -> instant, deterministic advice. No network.
 *   optional AI provider  -> asked first, with a timeout. If it is unavailable,
 *                            slow, or returns something invalid, the game
 *                            switches to the Mission Safety Protocol and shows
 *                            "AI unavailable — switching to Mission Safety
 *                            Protocol." The game never waits on, or breaks
 *                            because of, the provider.
 *
 * SAFETY: a provider can only choose among the actions the game already offers.
 * Anything else is rejected as invalid. A provider never decides for the
 * player; the human always accepts or overrides.
 */

import { adviceInputFor } from './adviceContext';
import { ADVICE_SOURCE, buildAdvice, FALLBACK_NOTICE } from './adviceBuilder';
import type { Advice, AdvisorConfidence, AdvisorContext } from './advisorTypes';

/** What a remote AI provider must return (validated before use). */
export interface ProviderAdvice {
  actionId: string;
  confidence: AdvisorConfidence;
  reason: string;
  risk: string;
  expectedConsequence: string;
}

/** A source of AI advice. Implementations may throw or reject at any time. */
export interface AdviceProvider {
  readonly id: string;
  advise(context: AdvisorContext, signal: AbortSignal): Promise<unknown>;
}

/** How long we wait for a provider before falling back. */
export const PROVIDER_TIMEOUT_MS = 4000;

const MAX_PROVIDER_TEXT = 400;

/** Thrown when a provider answer is missing fields or names an unknown action. */
export class InvalidProviderResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProviderResponseError';
  }
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new InvalidProviderResponseError(`"${field}" must be text.`);
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) throw new InvalidProviderResponseError(`"${field}" is empty.`);
  return clean.slice(0, MAX_PROVIDER_TEXT);
}

/**
 * Validate an untrusted provider response against the actions that are really
 * available. Throws InvalidProviderResponseError on anything unexpected.
 */
export function parseProviderAdvice(raw: unknown, validActionIds: readonly string[]): ProviderAdvice {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new InvalidProviderResponseError('Response must be a JSON object.');
  }
  const obj = raw as Record<string, unknown>;
  const actionId = text(obj.actionId, 'actionId');
  if (!validActionIds.includes(actionId)) {
    throw new InvalidProviderResponseError(`"${actionId}" is not an available action.`);
  }
  const confidence = obj.confidence;
  if (confidence !== 'low' && confidence !== 'medium' && confidence !== 'high') {
    throw new InvalidProviderResponseError('"confidence" must be low, medium or high.');
  }
  return {
    actionId,
    confidence,
    reason: text(obj.reason, 'reason'),
    risk: text(obj.risk, 'risk'),
    expectedConsequence: text(obj.expectedConsequence, 'expectedConsequence'),
  };
}

/** Reject after `ms`, aborting the provider call as well. */
function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Advisor timed out.'));
    }, ms);
    let call: Promise<T>;
    try {
      call = run(controller.signal);
    } catch (error) {
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    call.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  });
}

export interface GetAdviceOptions {
  /** Optional AI provider. Omit for rule-based advice only. */
  provider?: AdviceProvider | null;
  timeoutMs?: number;
}

/**
 * Get advice for a context. Never rejects: any provider problem becomes the
 * Mission Safety Protocol fallback. Returns null only when the advisor has no
 * opinion (mission over, unknown event).
 */
export async function getAdvice(
  context: AdvisorContext,
  options: GetAdviceOptions = {}
): Promise<Advice | null> {
  const { provider, timeoutMs = PROVIDER_TIMEOUT_MS } = options;

  const safeBuild = (mode: 'rules' | 'fallback'): Advice | null => {
    try {
      return buildAdvice(context, mode);
    } catch {
      // Malformed state or event data: no advice is better than a crash.
      return null;
    }
  };

  if (!provider) return safeBuild('rules');

  const local = safeBuild('rules');
  if (!local) return null;

  try {
    const raw = await withTimeout((signal) => provider.advise(context, signal), timeoutMs);
    const answer = parseProviderAdvice(
      raw,
      local.options.map((o) => o.actionId)
    );
    return mergeProviderAdvice(local, answer);
  } catch {
    return safeBuild('fallback');
  }
}

/**
 * Put the provider's choice first. Its wording replaces the recommended text;
 * the other options keep their locally computed risks so the player always
 * sees an honest Recommended / Alternative / Risky comparison.
 */
function mergeProviderAdvice(local: Advice, answer: ProviderAdvice): Advice {
  const chosen = local.options.find((o) => o.actionId === answer.actionId);
  if (!chosen) return local;

  const rest = local.options.filter((o) => o.actionId !== answer.actionId);
  // Re-assign roles: provider pick is "recommended"; keep alternative/risky order.
  const roles: Array<'alternative' | 'risky'> = ['alternative', 'risky'];
  const options = [
    {
      ...chosen,
      role: 'recommended' as const,
      reason: answer.reason,
      risk: answer.risk,
      consequence: answer.expectedConsequence,
    },
    ...rest.slice(0, 2).map((o, i) => ({ ...o, role: roles[i] ?? ('alternative' as const) })),
  ];

  return {
    ...local,
    actionId: answer.actionId,
    confidence: answer.confidence,
    headline: chosen.label,
    reason: answer.reason,
    risk: answer.risk,
    expectedConsequence: answer.expectedConsequence,
    rationale: `${answer.reason} Risk: ${answer.risk}`,
    options,
    mode: 'ai',
    source: ADVICE_SOURCE.ai,
  };
}

// ---------------------------------------------------------------------------
// HTTP provider (optional)
// ---------------------------------------------------------------------------

/**
 * A provider that POSTs a compact summary of the game to a URL you control and
 * expects a ProviderAdvice JSON object back. Do NOT put API keys in the
 * browser: point this at your own server, which talks to the AI model.
 */
export function createHttpProvider(
  endpoint: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): AdviceProvider {
  return {
    id: 'http',
    async advise(context, signal) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adviceInputFor(context)),
        signal,
      });
      if (!response.ok) throw new Error(`Advisor responded with ${response.status}.`);
      return (await response.json()) as unknown;
    },
  };
}

/** A provider that always fails. Used by the `?advisor=outage` demo switch. */
export const outageProvider: AdviceProvider = {
  id: 'simulated-outage',
  advise() {
    return Promise.reject(new Error('Simulated advisor outage.'));
  },
};

/** Only plain http(s) endpoints are accepted. */
export function isSafeEndpoint(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value, 'http://localhost');
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Choose the provider for this session:
 *  - `?advisor=outage` in the URL simulates an AI outage (demo / testing),
 *  - `VITE_ADVISOR_ENDPOINT` enables the HTTP provider,
 *  - otherwise no provider: rule-based advice only.
 */
export function resolveProvider(
  search: string = typeof window === 'undefined' ? '' : window.location.search,
  endpoint: string | undefined = import.meta.env.VITE_ADVISOR_ENDPOINT as string | undefined
): AdviceProvider | null {
  const params = new URLSearchParams(search);
  if (params.get('advisor') === 'outage') return outageProvider;
  if (isSafeEndpoint(endpoint)) return createHttpProvider(endpoint);
  return null;
}

export { FALLBACK_NOTICE };
