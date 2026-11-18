import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DANCE_DURATION_MS,
  recordLevelUpCelebration,
  activateLevelUpCelebration,
  getActiveLevelUpCelebration,
  pruneExpiredCelebrations,
} from './levelUpCelebrationLogic';

test('recordLevelUpCelebration records only when newLevel exceeds prevLevel', () => {
  const initial = {};
  const unchanged = recordLevelUpCelebration(initial, 'p1', 2, 2);
  assert.deepEqual(unchanged, {});

  const recorded = recordLevelUpCelebration(initial, 'p1', 1, 2);
  assert.equal(recorded.p1.newLevel, 2);
  assert.equal(recorded.p1.expiresAt, null);
});

test('activateLevelUpCelebration starts countdown once and keeps it until expiry', () => {
  const map = recordLevelUpCelebration({}, 'p1', 1, 2);
  const start = 10_000;

  const first = activateLevelUpCelebration(map, 'p1', start);
  assert.equal(first.activated, true);
  assert.equal(first.expiresAt, start + DANCE_DURATION_MS);

  // Subsequent call while already active does not reset the timer
  const second = activateLevelUpCelebration(first.map, 'p1', start + 2000);
  assert.equal(second.activated, false);
  assert.equal(second.expiresAt, start + DANCE_DURATION_MS);

  assert.ok(getActiveLevelUpCelebration(first.map, 'p1', start + 3000));
  assert.equal(getActiveLevelUpCelebration(first.map, 'p1', start + DANCE_DURATION_MS), null);
});

test('pruneExpiredCelebrations removes expired entries and keeps pending ones', () => {
  let map = recordLevelUpCelebration({}, 'p1', 1, 2);
  map = recordLevelUpCelebration(map, 'p2', 2, 3);
  const { map: activated } = activateLevelUpCelebration(map, 'p1', 1000, 5000);

  const prunedEarly = pruneExpiredCelebrations(activated, 4000);
  assert.ok(prunedEarly.p1);
  assert.ok(prunedEarly.p2);

  const prunedAfter = pruneExpiredCelebrations(activated, 6500);
  assert.equal(prunedAfter.p1, undefined);
  assert.ok(prunedAfter.p2);
});
