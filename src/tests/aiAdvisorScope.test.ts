/**
 * Tests for the "AI Mission Advisor" scope: recommendations that explain risk,
 * Recommended / Alternative / Risky options, human override, a deterministic
 * fallback when the AI is unavailable, and an advisor history for the debrief.
 */

import { describe, expect, it, vi } from 'vitest';
import { advisorStats, advisorHistory } from '../features/decisions/decisionHistory';
import { buildDebriefSummary } from '../features/debrief/debriefBuilder';
import { buildAdvice, FALLBACK_NOTICE } from '../features/ai-advisor/adviceBuilder';
import { decisionWithAdvice } from '../features/ai-advisor/adviceSnapshot';
import {
  createHttpProvider,
  getAdvice,
  isSafeEndpoint,
  outageProvider,
  parseProviderAdvice,
  resolveProvider,
  type AdviceProvider,
} from '../features/ai-advisor/adviceService';
import { ruleBasedAdvisor } from '../features/ai-advisor/advisorInterface';
import { adviceInputFor } from '../features/ai-advisor/adviceContext';
import { applyPlayerDecision } from '../features/simulation/simulationEngine';
import { freshGame, withActiveEvent } from './helpers';

function withResources(patch: Partial<ReturnType<typeof freshGame>['resources']>) {
  const base = freshGame();
  return { ...base, resources: { ...base.resources, ...patch } };
}

describe('recommendation = reason + risk + expected consequence', () => {
  it('returns all parts for an event, plus a human-override statement via options', () => {
    const state = withActiveEvent(freshGame(), 'solar-storm');
    const advice = buildAdvice({ state, eventId: 'solar-storm' });

    expect(advice).not.toBeNull();
    expect(advice?.headline.length).toBeGreaterThan(0);
    expect(advice?.reason.length).toBeGreaterThan(0);
    expect(advice?.risk.length).toBeGreaterThan(0);
    expect(advice?.expectedConsequence.length).toBeGreaterThan(0);
    expect(advice?.mode).toBe('rules');
    expect(advice?.notice).toBeUndefined();
  });

  it('recommends the same action as the rule-based advisor', () => {
    const state = withActiveEvent(freshGame(), 'solar-storm');
    const rec = ruleBasedAdvisor.recommend({ state, eventId: 'solar-storm' });
    const advice = buildAdvice({ state, eventId: 'solar-storm' });
    expect(advice?.actionId).toBe(rec?.actionId);
    expect(advice?.rationale).toBe(rec?.rationale);
  });

  it('returns null when the mission is over or the event is not active', () => {
    const state = freshGame();
    const failed = { ...state, mission: { ...state.mission, status: 'failed' as const } };
    expect(buildAdvice({ state: failed })).toBeNull();
    expect(buildAdvice({ state, eventId: 'not-an-active-event' })).toBeNull();
  });

  it('never mutates the game state', () => {
    const state = withActiveEvent(freshGame(), 'solar-storm');
    const before = JSON.stringify(state);
    buildAdvice({ state, eventId: 'solar-storm' });
    buildAdvice({ state });
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('risk explanations', () => {
  it('explains a low power reserve instead of just saying "don\'t"', () => {
    // Full shielding costs 30 power: 38 -> 8.
    const state = withActiveEvent(withResources({ power: 38 }), 'solar-storm');
    const advice = buildAdvice({ state, eventId: 'solar-storm' });
    const shielding = advice?.options.find((o) => o.actionId === 'solar-storm--activate-shielding');

    expect(shielding).toBeDefined();
    expect(shielding?.riskLevel).toBe('high');
    expect(shielding?.risk).toContain('only 8% power reserve');
    expect(shielding?.risk).toContain('life support may become unstable');
    expect(shielding?.risk.toLowerCase()).not.toContain("don't do this");
  });

  it('explains radiation risk for Maintain Operations', () => {
    const state = withActiveEvent(freshGame(), 'solar-storm');
    const advice = buildAdvice({ state, eventId: 'solar-storm' });
    const risky = advice?.options.find((o) => o.actionId === 'solar-storm--risk-it');
    expect(risky?.risk).toMatch(/radiation exposure/i);
    expect(risky?.riskLevel).not.toBe('low');
  });

  it('describes immediate and delayed consequences', () => {
    const state = withActiveEvent(freshGame(), 'solar-storm');
    const advice = buildAdvice({ state, eventId: 'solar-storm' });
    const shielding = advice?.options.find((o) => o.actionId === 'solar-storm--activate-shielding');
    expect(shielding?.consequence).toContain('Right away:');
    expect(shielding?.consequence).toContain('After 2 sols: Power generation +8');
    expect(shielding?.consequence).toContain('Outlook for the next sol');
  });

  it('reports low risk honestly when nothing is at stake', () => {
    const advice = buildAdvice({ state: freshGame() });
    expect(advice?.options[0]?.riskLevel).toBe('low');
    expect(advice?.risk).toMatch(/^Low risk/);
  });

  it('mentions an already scheduled problem in the reason', () => {
    const base = freshGame();
    const state = {
      ...base,
      pendingEffects: [
        {
          id: 'fx1',
          sourceDecisionId: 'dec1',
          scheduledDay: base.day + 2,
          type: 'system' as const,
          description: 'Solar panels lose output as dust settles',
          parameters: { kind: 'system' as const, changes: { powerGeneration: -8 } },
        },
      ],
    };
    const advice = buildAdvice({ state });
    expect(advice?.reason).toContain('Already scheduled in 2 sols: Solar panels lose output as dust settles.');
  });
});

describe('Recommended / Alternative / Risky', () => {
  it('offers three distinct options for a three-action event', () => {
    const state = withActiveEvent(freshGame(), 'solar-storm');
    const advice = buildAdvice({ state, eventId: 'solar-storm' });
    const roles = advice?.options.map((o) => o.role);
    expect(roles).toEqual(['recommended', 'alternative', 'risky']);
    expect(new Set(advice?.options.map((o) => o.actionId)).size).toBe(3);
  });

  it('labels an option Risky only when it carries real risk', () => {
    // Healthy outpost: nothing is risky, so the extra option is a second Alternative.
    const calm = buildAdvice({ state: freshGame() });
    expect(calm?.options.map((o) => o.role)).toEqual(['recommended', 'alternative', 'alternative']);
    expect(calm?.options.every((o) => o.riskLevel === 'low')).toBe(true);

    // Power 18%: an emergency allocation (-8 power) leaves 10%, the most dangerous
    // option on the list (a maintenance shift, -4 power, would leave 14%).
    const stressed = buildAdvice({ state: withResources({ power: 18 }) });
    expect(stressed?.options.map((o) => o.role)).toEqual(['recommended', 'alternative', 'risky']);
    const risky = stressed?.options.find((o) => o.role === 'risky');
    expect(risky?.actionId).toBe('emergency-allocation');
    expect(risky?.riskLevel).toBe('high');
    expect(risky?.risk).toContain('only 10% power reserve');
  });

  it('describes a problem that already exists without blaming the action', () => {
    const advice = buildAdvice({ state: withResources({ power: 12 }) });
    expect(advice?.options[0]?.risk).toContain('already low at 12%');
  });

  it('only offers actions that really exist for the event', () => {
    const state = withActiveEvent(freshGame(), 'solar-storm');
    const event = state.activeEvents[0];
    const advice = buildAdvice({ state, eventId: 'solar-storm' });
    for (const option of advice?.options ?? []) {
      expect(event?.availableActions.some((a) => a.id === option.actionId)).toBe(true);
    }
  });
});

describe('Mission Safety Protocol rules', () => {
  it('IF power < 20% -> reduce non-essential systems (routine operations)', () => {
    const advice = buildAdvice({ state: withResources({ power: 15 }) });
    expect(advice?.actionId).toBe('routine-operations');
    expect(advice?.headline).toBe('Reduce non-essential systems');
    expect(advice?.confidence).toBe('high');
  });

  it('does not suggest a power-hungry maintenance shift when power is low', () => {
    const base = freshGame();
    const state = {
      ...base,
      resources: { ...base.resources, power: 25 },
      systems: { ...base.systems, lifeSupportEfficiency: 20 },
    };
    expect(ruleBasedAdvisor.recommend({ state })?.actionId).toBe('routine-operations');
  });

  it('still suggests maintenance when life support is weak and power is healthy', () => {
    const base = freshGame();
    const state = { ...base, systems: { ...base.systems, lifeSupportEfficiency: 20 } };
    expect(ruleBasedAdvisor.recommend({ state })?.actionId).toBe('maintenance-shift');
  });

  it('still rations when food is the tightest resource', () => {
    expect(ruleBasedAdvisor.recommend({ state: withResources({ food: 20 }) })?.actionId).toBe(
      'ration-supplies'
    );
  });

  it('fallback mode carries the exact notice text', () => {
    const advice = buildAdvice({ state: freshGame() }, 'fallback');
    expect(advice?.mode).toBe('fallback');
    expect(advice?.notice).toBe('AI unavailable — switching to Mission Safety Protocol.');
    expect(advice?.notice).toBe(FALLBACK_NOTICE);
    expect(advice?.source).toBe('Mission Safety Protocol');
  });
});

describe('AI failure fallback', () => {
  const state = withActiveEvent(freshGame(), 'solar-storm');
  const context = { state, eventId: 'solar-storm' };

  const provider = (advise: AdviceProvider['advise']): AdviceProvider => ({ id: 'test', advise });
  const valid = (actionId: string) => ({
    actionId,
    confidence: 'high',
    reason: 'Because the model says so.',
    risk: 'Some power is spent.',
    expectedConsequence: 'Radiation stays low.',
  });

  it('uses rules only (no notice) when no provider is configured', async () => {
    const advice = await getAdvice(context);
    expect(advice?.mode).toBe('rules');
    expect(advice?.notice).toBeUndefined();
  });

  it('falls back when the provider rejects (network/model unavailable)', async () => {
    const advice = await getAdvice(context, {
      provider: provider(() => Promise.reject(new Error('network down'))),
    });
    expect(advice?.mode).toBe('fallback');
    expect(advice?.notice).toBe(FALLBACK_NOTICE);
    expect(advice?.options.length).toBeGreaterThan(0);
  });

  it('falls back when the provider throws synchronously', async () => {
    const advice = await getAdvice(context, {
      provider: provider(() => {
        throw new Error('boom');
      }),
    });
    expect(advice?.mode).toBe('fallback');
  });

  it('falls back on timeout and aborts the request', async () => {
    let aborted = false;
    const advice = await getAdvice(context, {
      timeoutMs: 20,
      provider: provider(
        (_ctx, signal) =>
          new Promise(() => {
            signal.addEventListener('abort', () => {
              aborted = true;
            });
          })
      ),
    });
    expect(advice?.mode).toBe('fallback');
    expect(aborted).toBe(true);
  });

  it.each([
    ['not an object', 'hello'],
    ['null', null],
    ['an array', []],
    ['missing fields', { actionId: 'solar-storm--risk-it' }],
    ['unknown action', valid('does-not-exist')],
    ['bad confidence', { ...valid('solar-storm--risk-it'), confidence: 'certain' }],
    ['empty text', { ...valid('solar-storm--risk-it'), risk: '   ' }],
  ])('falls back on an invalid response (%s)', async (_name, response) => {
    const advice = await getAdvice(context, { provider: provider(() => Promise.resolve(response)) });
    expect(advice?.mode).toBe('fallback');
    expect(advice?.notice).toBe(FALLBACK_NOTICE);
  });

  it('uses a valid AI answer, but only among the real actions', async () => {
    const advice = await getAdvice(context, {
      provider: provider(() => Promise.resolve(valid('solar-storm--shutdown-systems'))),
    });
    expect(advice?.mode).toBe('ai');
    expect(advice?.notice).toBeUndefined();
    expect(advice?.actionId).toBe('solar-storm--shutdown-systems');
    expect(advice?.reason).toBe('Because the model says so.');
    expect(advice?.options[0]).toMatchObject({
      role: 'recommended',
      actionId: 'solar-storm--shutdown-systems',
    });
    expect(advice?.options.map((o) => o.role)).toEqual(['recommended', 'alternative', 'risky']);
    expect(new Set(advice?.options.map((o) => o.actionId)).size).toBe(3);
  });

  it('the outage demo provider always triggers the fallback', async () => {
    const advice = await getAdvice(context, { provider: outageProvider });
    expect(advice?.mode).toBe('fallback');
  });

  it('returns null (not an error) when there is nothing to advise on', async () => {
    const failed = { ...freshGame(), mission: { ...freshGame().mission, status: 'failed' as const } };
    await expect(getAdvice({ state: failed }, { provider: outageProvider })).resolves.toBeNull();
  });

  it('parseProviderAdvice trims and limits text', () => {
    const parsed = parseProviderAdvice(
      { ...valid('a'), reason: `  ${'x'.repeat(1000)}  ` },
      ['a']
    );
    expect(parsed.reason.length).toBe(400);
  });
});

describe('HTTP provider', () => {
  const state = withActiveEvent(freshGame(), 'solar-storm');
  const context = { state, eventId: 'solar-storm' };

  it('sends a compact game summary and accepts a valid answer', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as ReturnType<typeof adviceInputFor>;
      expect(body.event?.id).toBe('solar-storm');
      expect(body.availableActions.length).toBe(3);
      expect(body.resources.power).toBe(state.resources.power);
      return new Response(
        JSON.stringify({
          actionId: 'solar-storm--activate-shielding',
          confidence: 'medium',
          reason: 'r',
          risk: 'k',
          expectedConsequence: 'c',
        }),
        { status: 200 }
      );
    });
    const provider = createHttpProvider('https://advisor.example/advise', fetchMock as unknown as typeof fetch);
    const advice = await getAdvice(context, { provider });
    expect(advice?.mode).toBe('ai');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back on HTTP 500 and on non-JSON bodies', async () => {
    const serverError = createHttpProvider('https://x.test', (async () =>
      new Response('oops', { status: 500 })) as unknown as typeof fetch);
    const notJson = createHttpProvider('https://x.test', (async () =>
      new Response('<html>', { status: 200 })) as unknown as typeof fetch);
    expect((await getAdvice(context, { provider: serverError }))?.mode).toBe('fallback');
    expect((await getAdvice(context, { provider: notJson }))?.mode).toBe('fallback');
  });

  it('only accepts http(s) endpoints', () => {
    expect(isSafeEndpoint('https://example.com/advise')).toBe(true);
    expect(isSafeEndpoint('http://localhost:8787/advise')).toBe(true);
    expect(isSafeEndpoint('/api/advise')).toBe(true);
    expect(isSafeEndpoint('javascript:alert(1)')).toBe(false);
    expect(isSafeEndpoint('file:///etc/passwd')).toBe(false);
    expect(isSafeEndpoint('')).toBe(false);
    expect(isSafeEndpoint(undefined)).toBe(false);
  });

  it('chooses the provider from the URL switch and the endpoint setting', () => {
    expect(resolveProvider('', undefined)).toBeNull();
    expect(resolveProvider('?advisor=outage', undefined)).toBe(outageProvider);
    expect(resolveProvider('', 'https://advisor.example/advise')?.id).toBe('http');
    expect(resolveProvider('', 'javascript:alert(1)')).toBeNull();
  });
});

describe('human override and AI history', () => {
  const eventId = 'solar-storm';
  const prepared = () => withActiveEvent(freshGame(), eventId);

  it('records the recommendation, the decision and the outcome when the player accepts', () => {
    const state = prepared();
    const advice = buildAdvice({ state, eventId });
    expect(advice).not.toBeNull();
    const decision = decisionWithAdvice(advice, advice!.actionId);
    expect(decision.playerChoice).toBe('accepted-recommendation');
    expect(decision.advice?.chosenRole).toBe('recommended');

    const next = applyPlayerDecision(state, {
      eventId,
      actionId: advice!.actionId,
      playerChoice: decision.playerChoice,
      advice: decision.advice,
    });
    const record = next.history[next.history.length - 1];
    expect(record?.playerChoice).toBe('accepted-recommendation');
    expect(record?.advice?.recommendedActionId).toBe(advice!.actionId);
    expect(record?.advice?.risk).toBe(advice!.risk);
    expect(record?.outcome?.summary.length).toBeGreaterThan(0);
    expect(record?.outcome?.resourcesAfter.power).toBe(next.resources.power);
    expect(record?.outcome?.statusAfter).toBe(next.mission.status);
  });

  it('records an override when the player picks a different action', () => {
    const state = prepared();
    const advice = buildAdvice({ state, eventId })!;
    const other = advice.options.find((o) => o.role === 'risky')!;
    const decision = decisionWithAdvice(advice, other.actionId);
    expect(decision.playerChoice).toBe('overrode-recommendation');
    expect(decision.advice?.chosenRole).toBe('risky');

    const next = applyPlayerDecision(state, {
      eventId,
      actionId: other.actionId,
      playerChoice: decision.playerChoice,
      advice: decision.advice,
    });
    expect(next.history[0]?.playerChoice).toBe('overrode-recommendation');
    expect(next.history[0]?.actionId).toBe(other.actionId);
  });

  it('the engine derives accepted/overrode from the action actually taken', () => {
    const state = prepared();
    const advice = buildAdvice({ state, eventId })!;
    const snapshot = decisionWithAdvice(advice, advice.actionId).advice!;
    const other = advice.options[1]!;
    // Caller lies: claims "accepted" but takes a different action.
    const next = applyPlayerDecision(state, {
      eventId,
      actionId: other.actionId,
      playerChoice: 'accepted-recommendation',
      advice: snapshot,
    });
    expect(next.history[0]?.playerChoice).toBe('overrode-recommendation');
  });

  it('ignores an unusable advice snapshot instead of failing the decision', () => {
    const state = prepared();
    const next = applyPlayerDecision(state, {
      eventId,
      actionId: 'solar-storm--shutdown-systems',
      playerChoice: 'self-directed',
      advice: { nonsense: true } as never,
    });
    expect(next.history[0]?.advice).toBeUndefined();
    expect(next.history[0]?.playerChoice).toBe('self-directed');
    expect(next.history[0]?.outcome).toBeDefined();
  });

  it('decisions without advice still work and have no advice snapshot', () => {
    const next = applyPlayerDecision(freshGame(), {
      actionId: 'ration-supplies',
      playerChoice: 'self-directed',
    });
    expect(next.history[0]?.advice).toBeUndefined();
    expect(next.history[0]?.outcome?.summary).toContain('Food +3');
  });

  it('decisionWithAdvice is self-directed when no advice was shown', () => {
    expect(decisionWithAdvice(null, 'x')).toEqual({ playerChoice: 'self-directed', advice: undefined });
  });

  it('advisor history and stats feed the debrief', () => {
    let state = freshGame();
    // 1: accept the advice. 2: override it. 3: decide alone (no advice).
    const a1 = buildAdvice({ state })!;
    const d1 = decisionWithAdvice(a1, a1.actionId);
    state = applyPlayerDecision(state, { actionId: a1.actionId, playerChoice: d1.playerChoice, advice: d1.advice });

    const a2 = buildAdvice({ state }, 'fallback')!;
    const other = a2.options.find((o) => o.actionId !== a2.actionId)!;
    const d2 = decisionWithAdvice(a2, other.actionId);
    state = applyPlayerDecision(state, { actionId: other.actionId, playerChoice: d2.playerChoice, advice: d2.advice });

    state = applyPlayerDecision(state, { actionId: 'routine-operations', playerChoice: 'self-directed' });

    const stats = advisorStats(state);
    expect(stats).toMatchObject({ total: 3, accepted: 1, overridden: 1, selfDirected: 1, fallbackAdvice: 1 });

    const history = advisorHistory(state);
    expect(history).toHaveLength(3);
    expect(history[0]?.advice?.mode).toBe('rules');
    expect(history[1]?.advice?.mode).toBe('fallback');
    expect(history[2]?.advice).toBeUndefined();

    const summary = buildDebriefSummary(state);
    expect(summary.advisor.stats.accepted).toBe(1);
    expect(summary.advisor.entries).toHaveLength(3);
  });

  it('old saves without advice or outcome do not break the history selectors', () => {
    const state = applyPlayerDecision(freshGame(), { actionId: 'routine-operations', playerChoice: 'self-directed' });
    const legacy = {
      ...state,
      history: state.history.map((r) => {
        const { advice: _a, outcome: _o, ...rest } = r;
        void _a;
        void _o;
        return rest;
      }),
    };
    expect(advisorHistory(legacy)[0]?.advice).toBeUndefined();
    expect(advisorHistory(legacy)[0]?.outcomeSummary).toBeUndefined();
    expect(buildDebriefSummary(legacy).advisor.stats.total).toBe(1);
  });
});
