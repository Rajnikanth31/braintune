import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningRecap } from './learningRecapLogic';
import { ChildStats } from '../storage/db';

const baseStats = (): ChildStats => ({
  memory: { gameId: 'memory', starsEarned: 4, sessionsPlayed: 1, successRate: 85, highestDifficultyReached: 2 },
  letters: { gameId: 'letters', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
  numbers: { gameId: 'numbers', starsEarned: 3, sessionsPlayed: 1, successRate: 70, highestDifficultyReached: 2 },
  colors: { gameId: 'colors', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
  math: { gameId: 'math', starsEarned: 2, sessionsPlayed: 1, successRate: 72, highestDifficultyReached: 2 },
});

test('buildLearningRecap highlights accuracy gain and level unlock on completed skill', () => {
  const prev = baseStats();
  const next: ChildStats = {
    ...prev,
    math: { gameId: 'math', starsEarned: 7, sessionsPlayed: 2, successRate: 86, highestDifficultyReached: 3 },
  };

  const recap = buildLearningRecap({
    playerName: 'Liam',
    completedGameId: 'math',
    sessionAccuracy: 100,
    starsEarned: 5,
    difficultyLevel: 2,
    prevStats: prev,
    nextStats: next,
  });

  assert.equal(recap.mostImproved.gameId, 'math');
  assert.ok(recap.mostImproved.metricBadge.includes('+14%'));
  // Since letters & colors are unplayed, suggests trying a fresh skill next
  assert.equal(recap.suggestedNext.gameId, 'letters');
  assert.equal(recap.suggestedNext.targetLevel, 1);
});

test('buildLearningRecap recommends gentle confidence practice when accuracy is below 70%', () => {
  const prev = baseStats();
  const next: ChildStats = {
    ...prev,
    numbers: { gameId: 'numbers', starsEarned: 4, sessionsPlayed: 2, successRate: 60, highestDifficultyReached: 2 },
  };

  const recap = buildLearningRecap({
    playerName: 'Sophia',
    completedGameId: 'numbers',
    sessionAccuracy: 50,
    starsEarned: 2,
    difficultyLevel: 2,
    prevStats: prev,
    nextStats: next,
  });

  assert.equal(recap.suggestedNext.gameId, 'numbers');
  assert.ok(recap.suggestedNext.modeLabel.includes('Confidence Practice'));
  assert.equal(recap.suggestedNext.targetLevel, 2);
});

test('buildLearningRecap suggests newly unlocked Normal Mode tier when crossing level 6', () => {
  const prev: ChildStats = {
    ...baseStats(),
    letters: { gameId: 'letters', starsEarned: 15, sessionsPlayed: 3, successRate: 90, highestDifficultyReached: 5 },
  };
  const next: ChildStats = {
    ...prev,
    letters: { gameId: 'letters', starsEarned: 20, sessionsPlayed: 4, successRate: 93, highestDifficultyReached: 6 },
  };

  const recap = buildLearningRecap({
    playerName: 'Noah',
    completedGameId: 'letters',
    sessionAccuracy: 100,
    starsEarned: 5,
    difficultyLevel: 5,
    prevStats: prev,
    nextStats: next,
  });

  assert.equal(recap.suggestedNext.gameId, 'letters');
  assert.equal(recap.suggestedNext.targetLevel, 6);
  assert.ok(recap.suggestedNext.modeLabel.includes('Normal Mode'));
});

test('buildLearningRecap boosts lowest-accuracy active skill once all 5 skills have been played', () => {
  const prev: ChildStats = {
    memory: { gameId: 'memory', starsEarned: 10, sessionsPlayed: 2, successRate: 95, highestDifficultyReached: 4 },
    letters: { gameId: 'letters', starsEarned: 10, sessionsPlayed: 2, successRate: 90, highestDifficultyReached: 4 },
    numbers: { gameId: 'numbers', starsEarned: 6, sessionsPlayed: 2, successRate: 74, highestDifficultyReached: 3 },
    colors: { gameId: 'colors', starsEarned: 10, sessionsPlayed: 2, successRate: 92, highestDifficultyReached: 4 },
    math: { gameId: 'math', starsEarned: 10, sessionsPlayed: 2, successRate: 91, highestDifficultyReached: 4 },
  };
  const next: ChildStats = {
    ...prev,
    math: { gameId: 'math', starsEarned: 15, sessionsPlayed: 3, successRate: 94, highestDifficultyReached: 5 },
  };

  const recap = buildLearningRecap({
    playerName: 'Mia',
    completedGameId: 'math',
    sessionAccuracy: 100,
    starsEarned: 5,
    difficultyLevel: 4,
    prevStats: prev,
    nextStats: next,
  });

  assert.equal(recap.suggestedNext.gameId, 'numbers');
  assert.ok(recap.suggestedNext.modeLabel.includes('Skill Boost'));
});
