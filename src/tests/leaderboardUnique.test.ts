import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  bestPerPlayer,
  getLeaderboard,
  rankEntries,
  resetLeaderboard,
  submitScore,
} from '../features/leaderboard/leaderboardService';
import type { LeaderboardEntry } from '../features/leaderboard/leaderboardTypes';

function entry(over: Partial<LeaderboardEntry> & { id: string }): LeaderboardEntry {
  return {
    name: 'Pilot',
    daysSurvived: 10,
    score: 100,
    missionType: 'mars',
    occupation: 'engineer',
    outcome: 'failed',
    timestamp: 1000,
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  resetLeaderboard();
});
afterEach(() => localStorage.clear());

describe('each player appears once on the leaderboard', () => {
  it('keeps only the best run of an account', () => {
    const rows = rankEntries([
      entry({ id: 'a1', userId: 'u1', name: 'alex', daysSurvived: 12, score: 90 }),
      entry({ id: 'a2', userId: 'u1', name: 'alex', daysSurvived: 25, score: 200 }),
      entry({ id: 'a3', userId: 'u1', name: 'alex', daysSurvived: 5, score: 40 }),
      entry({ id: 'b1', userId: 'u2', name: 'bo', daysSurvived: 8, score: 80 }),
    ]);
    expect(rows.filter((r) => r.userId === 'u1')).toHaveLength(1);
    expect(rows.find((r) => r.userId === 'u1')?.id).toBe('a2');
    expect(rows.find((r) => r.userId === 'u2')?.id).toBe('b1');
  });

  it('a worse later run does not replace the best one, a better one does', () => {
    const board0 = submitScore(entry({ id: 'r1', userId: 'u9', name: 'sam', daysSurvived: 20, score: 150 }));
    expect(board0.find((e) => e.userId === 'u9')?.id).toBe('r1');

    const board1 = submitScore(entry({ id: 'r2', userId: 'u9', name: 'sam', daysSurvived: 6, score: 50 }));
    expect(board1.filter((e) => e.userId === 'u9')).toHaveLength(1);
    expect(board1.find((e) => e.userId === 'u9')?.id).toBe('r1');

    const board2 = submitScore(entry({ id: 'r3', userId: 'u9', name: 'sam', daysSurvived: 29, score: 240 }));
    expect(board2.filter((e) => e.userId === 'u9')).toHaveLength(1);
    expect(board2.find((e) => e.userId === 'u9')?.id).toBe('r3');
    // And it is stored that way.
    expect(getLeaderboard().filter((e) => e.userId === 'u9')).toHaveLength(1);
  });

  it('two different accounts with the same display name are two players', () => {
    const rows = bestPerPlayer([
      entry({ id: 'x1', userId: 'u1', name: 'sam' }),
      entry({ id: 'x2', userId: 'u2', name: 'sam' }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it('old rows without an account are merged with the account of the same name', () => {
    const rows = rankEntries([
      entry({ id: 'old', name: 'Jo', daysSurvived: 22, score: 190 }), // saved before accounts were recorded
      entry({ id: 'new', userId: 'u7', name: 'jo', daysSurvived: 9, score: 70 }),
    ]);
    const jo = rows.filter((r) => r.name.toLowerCase() === 'jo');
    expect(jo).toHaveLength(1);
    expect(jo[0]?.id).toBe('old'); // the better run wins
  });

  it('old rows with no account are de-duplicated by name', () => {
    const rows = rankEntries([
      entry({ id: 'l1', name: 'Kim', daysSurvived: 4 }),
      entry({ id: 'l2', name: 'kim ', daysSurvived: 14 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('l2');
  });

  it('cleans a board that was saved with repeated players', () => {
    localStorage.setItem(
      'mars-outpost-zero:leaderboard:v1',
      JSON.stringify([
        entry({ id: 'd1', userId: 'u1', name: 'dup', daysSurvived: 3, score: 30 }),
        entry({ id: 'd2', userId: 'u1', name: 'dup', daysSurvived: 17, score: 170 }),
        entry({ id: 'd3', userId: 'u1', name: 'dup', daysSurvived: 9, score: 90 }),
      ])
    );
    const board = getLeaderboard();
    expect(board).toHaveLength(1);
    expect(board[0]?.id).toBe('d2');
  });

  it('still shows at most 10 rows, ranked by sols then score', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      entry({ id: `p${i}`, userId: `u${i}`, name: `p${i}`, daysSurvived: i + 1, score: 10 * i })
    );
    const rows = rankEntries(many);
    expect(rows).toHaveLength(10);
    expect(rows[0]?.id).toBe('p14');
    expect(rows.map((r) => r.daysSurvived)).toEqual([...rows.map((r) => r.daysSurvived)].sort((a, b) => b - a));
  });
});
