/**
 * Shared progression logic for Braintune.
 *
 * This module is pure (no React, no storage side-effects) so it can be unit
 * tested in isolation. It defines:
 *  - The Basic -> Advanced difficulty ladder shared by every mini-game.
 *  - The global XP / level curve that spans all games.
 *  - Adaptive difficulty rules used inside a play session.
 *  - Badge definitions and evaluation.
 *  - Daily streak calculation.
 */

import { ChildProfile, ChildStats } from '../../storage/db';

/** Number of difficulty levels every game exposes (Basic .. Master). */
export const MAX_LEVEL = 8;

/** Rounds played in a single session before it completes. */
export const ROUNDS_PER_SESSION = 5;

/** Human-friendly label for a difficulty level (1-based). */
export const LEVEL_LABELS = [
  'Basic',
  'Easy',
  'Medium',
  'Tricky',
  'Hard',
  'Super',
  'Expert',
  'Master',
] as const;

export function levelLabel(level: number): string {
  const idx = Math.min(Math.max(level, 1), MAX_LEVEL) - 1;
  return LEVEL_LABELS[idx];
}

/* ------------------------------------------------------------------ *
 * XP + global level curve
 * ------------------------------------------------------------------ */

/** Each star is worth this much XP. */
export const XP_PER_STAR = 10;

/**
 * Cumulative XP required to *reach* a given player level. Index 0 is unused
 * (levels are 1-based). A gently increasing curve keeps young players
 * progressing quickly at first.
 */
export const XP_LEVEL_THRESHOLDS: number[] = [
  0, // (unused) level 0
  0, // level 1
  60, // level 2
  150, // level 3
  280, // level 4
  450, // level 5
  680, // level 6
  960, // level 7
  1300, // level 8
  1700, // level 9
  2200, // level 10
];

export function xpForStars(stars: number): number {
  return Math.max(0, Math.round(stars)) * XP_PER_STAR;
}

/** The player level for a given total XP. */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_LEVEL_THRESHOLDS.length; i++) {
    if (xp >= XP_LEVEL_THRESHOLDS[i]) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number; // span of the current level (0 if maxed)
  progress: number; // 0..1 toward next level
  isMaxLevel: boolean;
}

/** Progress detail for an XP bar. */
export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const isMaxLevel = level >= XP_LEVEL_THRESHOLDS.length - 1;
  const currentThreshold = XP_LEVEL_THRESHOLDS[level];
  const nextThreshold = isMaxLevel
    ? currentThreshold
    : XP_LEVEL_THRESHOLDS[level + 1];
  const span = Math.max(1, nextThreshold - currentThreshold);
  const xpIntoLevel = xp - currentThreshold;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel: isMaxLevel ? 0 : span,
    progress: isMaxLevel ? 1 : Math.min(1, xpIntoLevel / span),
    isMaxLevel,
  };
}

/* ------------------------------------------------------------------ *
 * Adaptive difficulty within a session
 * ------------------------------------------------------------------ */

/**
 * Decide the next difficulty level based on the current level, the active
 * success streak and whether the latest answer was correct.
 *
 *  - On a 3+ correct streak, bump difficulty up (capped at MAX_LEVEL).
 *  - On a wrong answer, ease difficulty down (floored at 1).
 *
 * Pure: returns the next level, never mutates input.
 */
export function nextDifficulty(
  current: number,
  streak: number,
  success: boolean,
  maxLevel: number = MAX_LEVEL,
): number {
  if (success) {
    // streak is the number of consecutive correct answers *including* this one.
    if (streak >= 3 && current < maxLevel) {
      return current + 1;
    }
    return current;
  }
  return current > 1 ? current - 1 : 1;
}

/* ------------------------------------------------------------------ *
 * Level unlocking (Basic -> Advanced gating)
 * ------------------------------------------------------------------ */

/** Accuracy (percentage) needed on a level to unlock the next one. */
export const UNLOCK_ACCURACY = 60;
/** Sessions needed on a level before the next can unlock. */
export const UNLOCK_SESSIONS = 1;

/**
 * Highest level a child may select for a game. Level 1 is always available.
 * A level N (>1) is unlocked once the child has reached at least level N-1 as
 * their highest difficulty *and* has a passing accuracy on that game.
 */
export function highestUnlockedLevel(gameStat?: {
  sessionsPlayed: number;
  successRate: number;
  highestDifficultyReached: number;
}): number {
  if (!gameStat || gameStat.sessionsPlayed < UNLOCK_SESSIONS) {
    return 1;
  }
  // The child can play one level beyond the highest they have reached,
  // provided their accuracy clears the bar.
  const reached = Math.min(gameStat.highestDifficultyReached, MAX_LEVEL);
  const canAdvance = gameStat.successRate >= UNLOCK_ACCURACY;
  const unlocked = canAdvance ? reached + 1 : reached;
  return Math.min(Math.max(unlocked, 1), MAX_LEVEL);
}

export function isLevelUnlocked(
  level: number,
  gameStat?: {
    sessionsPlayed: number;
    successRate: number;
    highestDifficultyReached: number;
  },
): boolean {
  return level <= highestUnlockedLevel(gameStat);
}

/* ------------------------------------------------------------------ *
 * Daily streaks
 * ------------------------------------------------------------------ */

/** Local YYYY-MM-DD for a date (defaults to now). */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface StreakResult {
  streak: number;
  isNewDay: boolean;
}

/**
 * Given the previously recorded streak and the last-played day key, compute the
 * updated streak for a play happening on `today`.
 *  - Same day  -> unchanged.
 *  - Next day   -> +1.
 *  - Gap > 1 day or no history -> reset to 1.
 */
export function updateStreak(
  prevStreak: number,
  lastDayKey: string | undefined,
  today: Date = new Date(),
): StreakResult {
  const todayKey = dayKey(today);
  if (!lastDayKey) {
    return { streak: 1, isNewDay: true };
  }
  if (lastDayKey === todayKey) {
    return { streak: Math.max(1, prevStreak), isNewDay: false };
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (lastDayKey === dayKey(yesterday)) {
    return { streak: Math.max(1, prevStreak) + 1, isNewDay: true };
  }
  return { streak: 1, isNewDay: true };
}

/* ------------------------------------------------------------------ *
 * Badges
 * ------------------------------------------------------------------ */

export interface BadgeContext {
  profile: ChildProfile;
  stats: ChildStats;
}

export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Returns true when the child has earned this badge. */
  earned: (ctx: BadgeContext) => boolean;
}

const totalSessions = (stats: ChildStats): number =>
  Object.values(stats).reduce((sum, g) => sum + (g.sessionsPlayed || 0), 0);

const gamesPlayed = (stats: ChildStats): number =>
  Object.values(stats).filter(g => (g.sessionsPlayed || 0) > 0).length;

const reachedLevel = (stats: ChildStats, level: number): boolean =>
  Object.values(stats).some(g => (g.highestDifficultyReached || 1) >= level);

export const BADGES: BadgeDef[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    emoji: '👣',
    description: 'Finish your very first game.',
    earned: ({ stats }) => totalSessions(stats) >= 1,
  },
  {
    id: 'star_collector',
    name: 'Star Collector',
    emoji: '⭐',
    description: 'Earn 25 stars.',
    earned: ({ profile }) => profile.stars >= 25,
  },
  {
    id: 'star_master',
    name: 'Star Master',
    emoji: '🌟',
    description: 'Earn 100 stars.',
    earned: ({ profile }) => profile.stars >= 100,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    emoji: '🧭',
    description: 'Try all four games.',
    earned: ({ stats }) => gamesPlayed(stats) >= 4,
  },
  {
    id: 'sharp_mind',
    name: 'Sharp Mind',
    emoji: '🧠',
    description: 'Reach the Hard level in any game.',
    earned: ({ stats }) => reachedLevel(stats, 5),
  },
  {
    id: 'grand_master',
    name: 'Grand Master',
    emoji: '👑',
    description: 'Reach the Master level in any game.',
    earned: ({ stats }) => reachedLevel(stats, MAX_LEVEL),
  },
  {
    id: 'on_fire',
    name: 'On Fire',
    emoji: '🔥',
    description: 'Keep a 3-day play streak.',
    earned: ({ profile }) => (profile.streak || 0) >= 3,
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    emoji: '🏅',
    description: 'Complete 20 game sessions.',
    earned: ({ stats }) => totalSessions(stats) >= 20,
  },
  {
    id: 'level_up',
    name: 'Rising Star',
    emoji: '🚀',
    description: 'Reach player level 5.',
    earned: ({ profile }) => levelForXp(profile.xp || 0) >= 5,
  },
];

/** All badge ids the child currently qualifies for. */
export function evaluateBadges(ctx: BadgeContext): string[] {
  return BADGES.filter(b => b.earned(ctx)).map(b => b.id);
}

/** Badges newly earned compared to a previously stored set. */
export function newlyEarnedBadges(
  ctx: BadgeContext,
  alreadyEarned: string[] = [],
): string[] {
  const owned = new Set(alreadyEarned);
  return evaluateBadges(ctx).filter(id => !owned.has(id));
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find(b => b.id === id);
}
