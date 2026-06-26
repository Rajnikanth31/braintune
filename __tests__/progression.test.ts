import {
  levelForXp,
  levelProgress,
  xpForStars,
  nextDifficulty,
  highestUnlockedLevel,
  isLevelUnlocked,
  updateStreak,
  dayKey,
  evaluateBadges,
  newlyEarnedBadges,
  MAX_LEVEL,
} from '../src/games/shared/progression';
import { ChildProfile, ChildStats } from '../src/storage/db';

const makeProfile = (over: Partial<ChildProfile> = {}): ChildProfile => ({
  id: 'p1',
  name: 'Test',
  avatar: '🦊',
  stars: 0,
  completedSessions: 0,
  lastPlayed: new Date().toISOString(),
  xp: 0,
  level: 1,
  streak: 0,
  badges: [],
  ...over,
});

const emptyStats = (): ChildStats => ({
  memory: { gameId: 'memory', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
  letters: { gameId: 'letters', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
  numbers: { gameId: 'numbers', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
  colors: { gameId: 'colors', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
  math: { gameId: 'math', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
});

describe('XP and levels', () => {
  test('xpForStars is non-negative and scales', () => {
    expect(xpForStars(0)).toBe(0);
    expect(xpForStars(5)).toBe(50);
    expect(xpForStars(-3)).toBe(0);
  });

  test('levelForXp climbs with XP and never drops below 1', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(59)).toBe(1);
    expect(levelForXp(60)).toBe(2);
    expect(levelForXp(100000)).toBeGreaterThanOrEqual(5);
  });

  test('levelProgress reports a sane 0..1 fraction', () => {
    const lp = levelProgress(60);
    expect(lp.level).toBe(2);
    expect(lp.progress).toBeGreaterThanOrEqual(0);
    expect(lp.progress).toBeLessThanOrEqual(1);
    const maxed = levelProgress(1_000_000);
    expect(maxed.isMaxLevel).toBe(true);
    expect(maxed.progress).toBe(1);
  });
});

describe('Adaptive difficulty', () => {
  test('bumps up only on a 3+ streak and caps at max', () => {
    expect(nextDifficulty(1, 1, true)).toBe(1);
    expect(nextDifficulty(1, 3, true)).toBe(2);
    expect(nextDifficulty(MAX_LEVEL, 5, true)).toBe(MAX_LEVEL);
  });
  test('eases down on a wrong answer but never below 1', () => {
    expect(nextDifficulty(3, 0, false)).toBe(2);
    expect(nextDifficulty(1, 0, false)).toBe(1);
  });
});

describe('Level unlocking', () => {
  test('only level 1 is available with no history', () => {
    expect(highestUnlockedLevel(undefined)).toBe(1);
    expect(isLevelUnlocked(2, undefined)).toBe(false);
  });
  test('advances one level beyond reached when accuracy passes', () => {
    const stat = { sessionsPlayed: 2, successRate: 80, highestDifficultyReached: 2 };
    expect(highestUnlockedLevel(stat)).toBe(3);
  });
  test('does not advance when accuracy is too low', () => {
    const stat = { sessionsPlayed: 2, successRate: 40, highestDifficultyReached: 2 };
    expect(highestUnlockedLevel(stat)).toBe(2);
  });
  test('never exceeds MAX_LEVEL', () => {
    const stat = { sessionsPlayed: 9, successRate: 100, highestDifficultyReached: MAX_LEVEL };
    expect(highestUnlockedLevel(stat)).toBe(MAX_LEVEL);
  });
});

describe('Daily streaks', () => {
  test('first ever play starts a streak of 1', () => {
    expect(updateStreak(0, undefined).streak).toBe(1);
  });
  test('same-day replay does not change the streak', () => {
    const today = new Date('2026-06-22T10:00:00');
    expect(updateStreak(4, dayKey(today), today).streak).toBe(4);
  });
  test('next-day play increments the streak', () => {
    const today = new Date('2026-06-22T10:00:00');
    const yesterday = new Date('2026-06-21T10:00:00');
    expect(updateStreak(4, dayKey(yesterday), today).streak).toBe(5);
  });
  test('a gap resets the streak to 1', () => {
    const today = new Date('2026-06-22T10:00:00');
    const longAgo = new Date('2026-06-10T10:00:00');
    expect(updateStreak(9, dayKey(longAgo), today).streak).toBe(1);
  });
});

describe('Badges', () => {
  test('first session earns First Steps', () => {
    const stats = emptyStats();
    stats.memory.sessionsPlayed = 1;
    const earned = evaluateBadges({ profile: makeProfile(), stats });
    expect(earned).toContain('first_steps');
  });
  test('newlyEarnedBadges excludes already-owned ones', () => {
    const stats = emptyStats();
    stats.memory.sessionsPlayed = 1;
    const fresh = newlyEarnedBadges({ profile: makeProfile(), stats }, ['first_steps']);
    expect(fresh).not.toContain('first_steps');
  });
  test('explorer requires all five games played', () => {
    const stats = emptyStats();
    (['memory', 'letters', 'numbers', 'colors', 'math'] as const).forEach(g => {
      stats[g].sessionsPlayed = 1;
    });
    expect(evaluateBadges({ profile: makeProfile(), stats })).toContain('explorer');
  });
  test('star and streak badges respond to profile fields', () => {
    const stats = emptyStats();
    const earned = evaluateBadges({
      profile: makeProfile({ stars: 120, streak: 3, xp: 600 }),
      stats,
    });
    expect(earned).toEqual(expect.arrayContaining(['star_collector', 'star_master', 'on_fire']));
  });
});
