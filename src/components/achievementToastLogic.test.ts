import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAchievementToasts,
  enqueueAchievements,
  dismissAchievement,
} from './achievementToastLogic';

test('buildAchievementToasts creates badge and level-up notifications accurately', () => {
  const both = buildAchievementToasts(['first_steps', 'unknown_id'], 1, 2);
  assert.equal(both.length, 2);

  assert.equal(both[0].kind, 'level_up');
  assert.equal(both[0].kicker, 'Level Up!');
  assert.match(both[0].title, /Level 2/);

  assert.equal(both[1].kind, 'badge');
  assert.equal(both[1].title, 'First Steps');
  assert.equal(both[1].emoji, '👣');
});

test('buildAchievementToasts omits level-up when level is unchanged', () => {
  const badgeOnly = buildAchievementToasts(['star_collector'], 3, 3);
  assert.equal(badgeOnly.length, 1);
  assert.equal(badgeOnly[0].kind, 'badge');
  assert.equal(badgeOnly[0].title, 'Star Collector');

  const none = buildAchievementToasts([], 2, 2);
  assert.equal(none.length, 0);
});

test('enqueueAchievements and dismissAchievement preserve FIFO order without duplicates', () => {
  const firstBatch = buildAchievementToasts(['first_steps'], 1, 2);
  const secondBatch = buildAchievementToasts(['explorer'], 2, 2);

  const q1 = enqueueAchievements([], firstBatch);
  const q2 = enqueueAchievements(q1, firstBatch); // duplicate IDs ignored
  assert.equal(q2.length, 2);

  const q3 = enqueueAchievements(q2, secondBatch);
  assert.equal(q3.length, 3);
  assert.equal(q3[0].kind, 'level_up');
  assert.equal(q3[2].title, 'Explorer');

  const afterDismiss = dismissAchievement(q3, q3[0].id);
  assert.equal(afterDismiss.length, 2);
  assert.equal(afterDismiss[0].title, 'First Steps');
});
