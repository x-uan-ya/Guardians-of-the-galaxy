/**
 * leaderboard.test.ts
 * -------------------
 * Tests the leaderboard ranking + persistence:
 *  - ranks by days survived (desc), score as tiebreaker, earlier timestamp next,
 *  - keeps only the top 10,
 *  - seeds placeholder data on first read,
 *  - a strong submission lands on the board; a weak one does not displace it.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  LEADERBOARD_KEY,
  getLeaderboard,
  rankEntries,
  submitScore,
} from '../features/leaderboard/leaderboardService';
import { LEADERBOARD_SIZE, type LeaderboardEntry } from '../features/leaderboard/leaderboardTypes';

function entry(partial: Partial<LeaderboardEntry> & { id: string; daysSurvived: number }): LeaderboardEntry {
  return {
    name: partial.name ?? partial.id,
    score: partial.score ?? 0,
    missionType: partial.missionType ?? 'mars',
    occupation: partial.occupation ?? 'engineer',
    outcome: partial.outcome ?? 'failed',
    timestamp: partial.timestamp ?? 1,
    ...partial,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('rankEntries', () => {
  it('orders by days survived, then score, then earlier timestamp', () => {
    const ranked = rankEntries([
      entry({ id: 'a', daysSurvived: 10, score: 100, timestamp: 5 }),
      entry({ id: 'b', daysSurvived: 20, score: 100, timestamp: 5 }),
      entry({ id: 'c', daysSurvived: 20, score: 200, timestamp: 5 }), // higher score than b
      entry({ id: 'd', daysSurvived: 20, score: 200, timestamp: 1 }), // same as c, earlier
    ]);
    expect(ranked.map((e) => e.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('keeps only the top N', () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      entry({ id: `e${i}`, daysSurvived: i })
    );
    expect(rankEntries(many)).toHaveLength(LEADERBOARD_SIZE);
    // The top entry is the highest daysSurvived (24).
    expect(rankEntries(many)[0]?.daysSurvived).toBe(24);
  });

  it('does not mutate the input array', () => {
    const input = [entry({ id: 'a', daysSurvived: 1 }), entry({ id: 'b', daysSurvived: 2 })];
    const snapshot = input.map((e) => e.id);
    rankEntries(input);
    expect(input.map((e) => e.id)).toEqual(snapshot);
  });
});

describe('getLeaderboard', () => {
  it('seeds placeholder data on first read', () => {
    const board = getLeaderboard();
    expect(board).toHaveLength(LEADERBOARD_SIZE);
    expect(board.every((e) => e.seed)).toBe(true);
    // And persisted it for next time.
    expect(window.localStorage.getItem(LEADERBOARD_KEY)).not.toBeNull();
  });

  it('falls back to the seed board when stored data is corrupt', () => {
    window.localStorage.setItem(LEADERBOARD_KEY, '{not json');
    const board = getLeaderboard();
    expect(board).toHaveLength(LEADERBOARD_SIZE);
  });
});

describe('submitScore', () => {
  it('places a record-breaking run at the top', () => {
    const updated = submitScore(
      entry({ id: 'me', name: 'Me', daysSurvived: 30, score: 999, timestamp: 2_000_000_000_000 })
    );
    expect(updated[0]?.id).toBe('me');
    expect(updated).toHaveLength(LEADERBOARD_SIZE);
  });

  it('does not place a run worse than the whole board', () => {
    const updated = submitScore(entry({ id: 'weak', daysSurvived: 0, score: 0 }));
    expect(updated.some((e) => e.id === 'weak')).toBe(false);
    expect(updated).toHaveLength(LEADERBOARD_SIZE);
  });
});
