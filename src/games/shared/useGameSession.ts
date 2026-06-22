import { useCallback, useRef, useState } from 'react';
import { useApp } from '../../state/AppContext';
import { MAX_LEVEL, ROUNDS_PER_SESSION, nextDifficulty } from './progression';

export interface UseGameSessionOptions {
  gameId: string;
  rounds?: number;
  startLevel?: number;
  maxLevel?: number;
  adaptive?: boolean;
}

export interface GameSession {
  level: number;
  setLevel: (n: number) => void;
  round: number;
  totalRounds: number;
  stars: number;
  correct: number;
  total: number;
  streak: number;
  bestStreak: number;
  accuracy: number;
  isComplete: boolean;
  newBadges: string[];
  /** Record one answer. Returns whether it was correct (for convenience). */
  recordAnswer: (isCorrect: boolean, starsAwarded?: number) => boolean;
  /** Advance to the next round, or finish + save the session on the last round. */
  completeRound: () => void;
  /** Reset everything for another play-through. */
  restart: () => void;
}

/**
 * Centralizes scoring, rounds, adaptive difficulty, and persistence for every
 * mini-game so individual games only describe *content*, not bookkeeping.
 */
export function useGameSession(options: UseGameSessionOptions): GameSession {
  const {
    gameId,
    rounds = ROUNDS_PER_SESSION,
    startLevel = 1,
    maxLevel = MAX_LEVEL,
    adaptive = true,
  } = options;

  const { updateGameResult } = useApp();

  const [level, setLevel] = useState(startLevel);
  const [round, setRound] = useState(1);
  const [stars, setStars] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  // Refs mirror the latest values so completeRound/finish use fresh numbers
  // without depending on stale closures.
  const starsRef = useRef(0);
  const correctRef = useRef(0);
  const totalRef = useRef(0);
  const levelRef = useRef(startLevel);
  const savedRef = useRef(false);

  const recordAnswer = useCallback(
    (isCorrect: boolean, starsAwarded: number = 1): boolean => {
      totalRef.current += 1;
      setTotal(totalRef.current);

      let nextStreak = 0;
      setStreak(prev => {
        nextStreak = isCorrect ? prev + 1 : 0;
        setBestStreak(b => Math.max(b, nextStreak));
        // Adaptive difficulty uses the freshly computed streak.
        if (adaptive) {
          setLevel(curr => {
            const nl = nextDifficulty(curr, nextStreak, isCorrect, maxLevel);
            levelRef.current = nl;
            return nl;
          });
        }
        return nextStreak;
      });

      if (isCorrect) {
        correctRef.current += 1;
        setCorrect(correctRef.current);
        starsRef.current += starsAwarded;
        setStars(starsRef.current);
      }
      return isCorrect;
    },
    [adaptive, maxLevel],
  );

  const finish = useCallback(async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    setIsComplete(true);
    const result = await updateGameResult(
      gameId,
      starsRef.current,
      correctRef.current,
      totalRef.current,
      levelRef.current,
    );
    setNewBadges(result.newBadges);
  }, [gameId, updateGameResult]);

  const completeRound = useCallback(() => {
    setRound(prev => {
      if (prev >= rounds) {
        finish();
        return prev;
      }
      return prev + 1;
    });
  }, [rounds, finish]);

  const restart = useCallback(() => {
    starsRef.current = 0;
    correctRef.current = 0;
    totalRef.current = 0;
    levelRef.current = startLevel;
    savedRef.current = false;
    setStars(0);
    setCorrect(0);
    setTotal(0);
    setStreak(0);
    setBestStreak(0);
    setLevel(startLevel);
    setRound(1);
    setIsComplete(false);
    setNewBadges([]);
  }, [startLevel]);

  const setLevelExternal = useCallback((n: number) => {
    const clamped = Math.min(Math.max(n, 1), maxLevel);
    levelRef.current = clamped;
    setLevel(clamped);
  }, [maxLevel]);

  return {
    level,
    setLevel: setLevelExternal,
    round,
    totalRounds: rounds,
    stars,
    correct,
    total,
    streak,
    bestStreak,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 100,
    isComplete,
    newBadges,
    recordAnswer,
    completeRound,
    restart,
  };
}
