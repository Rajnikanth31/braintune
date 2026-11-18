import { ChildStats, GameStat } from '../storage/db';
import { MAX_LEVEL, levelLabel } from '../games/shared/progression';

export type LearningGameId = 'memory' | 'letters' | 'numbers' | 'colors' | 'math';

export interface SkillMeta {
  gameId: LearningGameId;
  skillName: string;
  gameName: string;
  emoji: string;
  accentColor: string;
}

export const LEARNING_SKILLS: SkillMeta[] = [
  {
    gameId: 'memory',
    skillName: 'Memory & Attention',
    gameName: 'Memory Match & Tap',
    emoji: '🧠',
    accentColor: '#AC92EC',
  },
  {
    gameId: 'letters',
    skillName: 'Letters & Phonics',
    gameName: 'Letters & Phonics',
    emoji: '🔤',
    accentColor: '#5D9CEC',
  },
  {
    gameId: 'numbers',
    skillName: 'Numbers & Counting',
    gameName: 'Numbers & Counting',
    emoji: '🔢',
    accentColor: '#FC6E51',
  },
  {
    gameId: 'colors',
    skillName: 'Colors & Patterns',
    gameName: 'Colors & Shapes',
    emoji: '🎨',
    accentColor: '#A0D468',
  },
  {
    gameId: 'math',
    skillName: 'Math & Logic',
    gameName: 'Math & Logic',
    emoji: '➕',
    accentColor: '#26C6DA',
  },
];

const LEARNING_GAME_IDS = new Set<string>(LEARNING_SKILLS.map(s => s.gameId));

export function isLearningGameId(id: string): id is LearningGameId {
  return LEARNING_GAME_IDS.has(id);
}

export interface SkillImprovementSummary {
  gameId: LearningGameId;
  skillName: string;
  emoji: string;
  accentColor: string;
  metricBadge: string;
  reason: string;
}

export interface RecommendedModeSummary {
  gameId: LearningGameId;
  gameName: string;
  emoji: string;
  accentColor: string;
  modeLabel: string;
  targetLevel: number;
  reason: string;
}

export interface LearningSkillBar {
  gameId: LearningGameId;
  label: string;
  emoji: string;
  accuracy: number;
  level: number;
  sessionsPlayed: number;
  accentColor: string;
  isImproved: boolean;
}

export interface LearningRecapData {
  playerName: string;
  completedGameId: LearningGameId;
  completedGameName: string;
  sessionAccuracy: number;
  starsEarned: number;
  mostImproved: SkillImprovementSummary;
  suggestedNext: RecommendedModeSummary;
  skillBars: LearningSkillBar[];
}

export interface BuildLearningRecapInput {
  playerName?: string;
  completedGameId: LearningGameId;
  sessionAccuracy: number;
  starsEarned: number;
  difficultyLevel: number;
  prevStats?: ChildStats | null;
  nextStats?: ChildStats | null;
}

function difficultyTierName(level: number): string {
  if (level <= 5) return 'Basic';
  if (level <= 10) return 'Normal';
  if (level <= 15) return 'Hard';
  return 'Very Hard';
}

function defaultStat(gameId: LearningGameId): GameStat {
  return {
    gameId,
    starsEarned: 0,
    sessionsPlayed: 0,
    successRate: 100,
    highestDifficultyReached: 1,
  };
}

function getStat(stats: ChildStats | null | undefined, gameId: LearningGameId): GameStat {
  return stats?.[gameId] ?? defaultStat(gameId);
}

export function buildLearningRecap(input: BuildLearningRecapInput): LearningRecapData {
  const playerName = input.playerName?.trim() || 'Explorer';
  const sessionAccuracy = Math.max(0, Math.min(100, Math.round(input.sessionAccuracy)));
  const completedMeta = LEARNING_SKILLS.find(s => s.gameId === input.completedGameId) ?? LEARNING_SKILLS[0];

  // 1. Evaluate skill improvements comparing before/after stats and session performance
  let bestSkill = completedMeta;
  let bestScore = -999;
  let bestBadge = `${sessionAccuracy}% Session`;
  let bestReason = `Strong effort in ${completedMeta.skillName}!`;

  for (const meta of LEARNING_SKILLS) {
    const prev = getStat(input.prevStats, meta.gameId);
    const next = getStat(input.nextStats, meta.gameId);
    const isCurrent = meta.gameId === input.completedGameId;

    const levelGain = Math.max(0, next.highestDifficultyReached - prev.highestDifficultyReached);
    const accuracyGain = prev.sessionsPlayed > 0 ? next.successRate - prev.successRate : 0;
    const isFreshSkill = isCurrent && prev.sessionsPlayed === 0;

    let score = -100;
    let badge = `${next.successRate}% Avg`;
    let reason = `Consistent practice in ${meta.skillName}.`;

    if (isCurrent) {
      const accuracyBonus = sessionAccuracy >= 90 ? 18 : sessionAccuracy >= 75 ? 12 : 4;
      score = levelGain * 30 + Math.max(0, accuracyGain) * 2 + (isFreshSkill ? 14 : 0) + accuracyBonus;

      if (levelGain > 0 && accuracyGain > 0) {
        badge = `+${accuracyGain}% · Lvl ${next.highestDifficultyReached}`;
        reason = `Accuracy rose to ${next.successRate}% and unlocked ${levelLabel(next.highestDifficultyReached)} level in ${meta.skillName}!`;
      } else if (levelGain > 0) {
        badge = `Unlocked Lvl ${next.highestDifficultyReached}`;
        reason = `Great focus in ${meta.skillName} — leveled up to Level ${next.highestDifficultyReached} (${levelLabel(next.highestDifficultyReached)})!`;
      } else if (accuracyGain > 0) {
        badge = `+${accuracyGain}% Accuracy`;
        reason = `${meta.skillName} overall accuracy improved to ${next.successRate}%!`;
      } else if (isFreshSkill) {
        badge = `${sessionAccuracy}% Debut`;
        reason = `Strong first ${meta.skillName} session with ${sessionAccuracy}% accuracy!`;
      } else {
        badge = `${sessionAccuracy}% Accuracy`;
        reason = `Kept ${meta.skillName} sharp at ${next.successRate}% overall accuracy!`;
      }
    } else if (next.sessionsPlayed > 0) {
      // Consider previously recorded skills if current session had low score or another skill shows high mastery/gain
      score = levelGain * 25 + accuracyGain * 2 + (next.successRate >= 85 ? 8 : 0);
      if (accuracyGain > 0) {
        badge = `+${accuracyGain}% Accuracy`;
        reason = `${meta.skillName} jumped to ${next.successRate}% overall accuracy!`;
      } else {
        badge = `Lvl ${next.highestDifficultyReached} · ${next.successRate}%`;
        reason = `${meta.skillName} stands out with ${next.successRate}% accuracy across ${next.sessionsPlayed} sessions.`;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestSkill = meta;
      bestBadge = badge;
      bestReason = reason;
    }
  }

  // 2. Determine personalized suggested next game & mode
  const curPrev = getStat(input.prevStats, input.completedGameId);
  const curNext = getStat(input.nextStats, input.completedGameId);
  const prevTier = difficultyTierName(curPrev.highestDifficultyReached);
  const nextTier = difficultyTierName(curNext.highestDifficultyReached);
  const unlockedNewTier =
    curNext.highestDifficultyReached > curPrev.highestDifficultyReached && prevTier !== nextTier;

  let suggestedNext: RecommendedModeSummary;

  if (sessionAccuracy < 70) {
    const gentleLevel = Math.max(1, Math.min(input.difficultyLevel, curNext.highestDifficultyReached));
    suggestedNext = {
      gameId: completedMeta.gameId,
      gameName: completedMeta.gameName,
      emoji: completedMeta.emoji,
      accentColor: completedMeta.accentColor,
      modeLabel: `${difficultyTierName(gentleLevel)} Confidence Practice · Lvl ${gentleLevel}`,
      targetLevel: gentleLevel,
      reason: `You scored ${sessionAccuracy}% — one quick replay here will lock in ${completedMeta.skillName}!`,
    };
  } else if (unlockedNewTier) {
    const targetLevel = curNext.highestDifficultyReached;
    suggestedNext = {
      gameId: completedMeta.gameId,
      gameName: completedMeta.gameName,
      emoji: completedMeta.emoji,
      accentColor: completedMeta.accentColor,
      modeLabel: `${nextTier} Mode · Lvl ${targetLevel}`,
      targetLevel,
      reason: `${sessionAccuracy}% unlocked ${nextTier} Mode! Step up and test your new skills.`,
    };
  } else {
    // Check for an unplayed or lowest-accuracy complementary skill to keep learning well-rounded
    const otherSkills = LEARNING_SKILLS.filter(s => s.gameId !== input.completedGameId);
    const unplayed = otherSkills.find(s => getStat(input.nextStats, s.gameId).sessionsPlayed === 0);
    const lowestOther = [...otherSkills].sort((a, b) => {
      const sa = getStat(input.nextStats, a.gameId);
      const sb = getStat(input.nextStats, b.gameId);
      return sa.successRate - sb.successRate;
    })[0];

    if (unplayed) {
      suggestedNext = {
        gameId: unplayed.gameId,
        gameName: unplayed.gameName,
        emoji: unplayed.emoji,
        accentColor: unplayed.accentColor,
        modeLabel: `Basic Starter · Lvl 1`,
        targetLevel: 1,
        reason: `Nice ${sessionAccuracy}% run! Try ${unplayed.skillName} next to train a fresh brain skill.`,
      };
    } else if (lowestOther && getStat(input.nextStats, lowestOther.gameId).successRate < 85) {
      const targetStat = getStat(input.nextStats, lowestOther.gameId);
      const targetLevel = Math.min(MAX_LEVEL, targetStat.highestDifficultyReached);
      suggestedNext = {
        gameId: lowestOther.gameId,
        gameName: lowestOther.gameName,
        emoji: lowestOther.emoji,
        accentColor: lowestOther.accentColor,
        modeLabel: `${difficultyTierName(targetLevel)} Skill Boost · Lvl ${targetLevel}`,
        targetLevel,
        reason: `${lowestOther.skillName} is at ${targetStat.successRate}% — a focused round will raise your overall average!`,
      };
    } else {
      const nextLvl = Math.min(MAX_LEVEL, Math.max(curNext.highestDifficultyReached, input.difficultyLevel + 1));
      suggestedNext = {
        gameId: completedMeta.gameId,
        gameName: completedMeta.gameName,
        emoji: completedMeta.emoji,
        accentColor: completedMeta.accentColor,
        modeLabel: `${difficultyTierName(nextLvl)} Challenge · Lvl ${nextLvl}`,
        targetLevel: nextLvl,
        reason: `All skills look strong (${sessionAccuracy}%)! Push higher in ${completedMeta.skillName} at Level ${nextLvl}.`,
      };
    }
  }

  // 3. Build 5-skill snapshot bars
  const skillBars: LearningSkillBar[] = LEARNING_SKILLS.map(meta => {
    const stat = getStat(input.nextStats, meta.gameId);
    return {
      gameId: meta.gameId,
      label: meta.skillName.split(' ')[0],
      emoji: meta.emoji,
      accuracy: stat.sessionsPlayed > 0 ? stat.successRate : 0,
      level: stat.highestDifficultyReached,
      sessionsPlayed: stat.sessionsPlayed,
      accentColor: meta.accentColor,
      isImproved: meta.gameId === bestSkill.gameId,
    };
  });

  return {
    playerName,
    completedGameId: completedMeta.gameId,
    completedGameName: completedMeta.gameName,
    sessionAccuracy,
    starsEarned: input.starsEarned,
    mostImproved: {
      gameId: bestSkill.gameId,
      skillName: bestSkill.skillName,
      emoji: bestSkill.emoji,
      accentColor: bestSkill.accentColor,
      metricBadge: bestBadge,
      reason: bestReason,
    },
    suggestedNext,
    skillBars,
  };
}
