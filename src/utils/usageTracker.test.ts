import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDailyWordDelta,
  calculateUsageCostUsd,
  formatUsdCompact,
  getDailyGoalProgress,
  setDailyGoalWords,
} from './usageTracker';

test('calculateUsageCostUsd computes accurate prompt + completion cost per 1M tokens', () => {
  const cost = calculateUsageCostUsd(10000, 2000, 0.10, 0.36);
  // (10000 * 0.10 + 2000 * 0.36) / 1_000_000 = (1000 + 720) / 1_000_000 = 0.00172
  assert.ok(Math.abs(cost - 0.00172) < 1e-9);
  assert.equal(formatUsdCompact(cost), '$0.0017');
  assert.equal(formatUsdCompact(0), '$0.000');
  assert.equal(formatUsdCompact(0.0523), '$0.052');
});

test('applyDailyWordDelta accumulates positive deltas and preserves daily goal across date rollover', () => {
  const withGoal = setDailyGoalWords({ date: '2026-11-17', wordsAdded: 120 }, 2000, '2026-11-17');
  const day1 = applyDailyWordDelta(withGoal, 45, '2026-11-17');
  assert.equal(day1.wordsAdded, 165);
  assert.equal(day1.goalWords, 2000);

  const deletionIgnored = applyDailyWordDelta(day1, -20, '2026-11-17');
  assert.equal(deletionIgnored.wordsAdded, 165);

  const nextDay = applyDailyWordDelta(day1, 30, '2026-11-18');
  assert.equal(nextDay.date, '2026-11-18');
  assert.equal(nextDay.wordsAdded, 30);
  assert.equal(nextDay.goalWords, 2000);

  const prog = getDailyGoalProgress({ date: '2026-11-18', wordsAdded: 1000, goalWords: 2000 }, '2026-11-18');
  assert.equal(prog.percent, 50);
  assert.equal(prog.reached, false);
});

