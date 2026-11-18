import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mascot, MascotExpression } from '../../components/Mascot';
import { Celebration } from '../../components/Celebration';
import { SoundService } from '../../audio/SoundService';
import { haptic } from '../../audio/haptics';
import { useApp } from '../../state/AppContext';
import { GameHeader, PauseMenu } from '../shared/GameShell';
import {
  FamilyMode,
  FamilyQuestion,
  PlayerTier,
  generateFamilyQuestion,
  calculateRoundPoints,
  evaluateFamilyOutcome,
} from './familyLogic';

interface FamilyChallengeProps {
  onBack: () => void;
  initialMode?: FamilyMode;
  autoStart?: boolean;
}

const TOTAL_ROUNDS = 6;
const ROUND_SECONDS = 15;
const THEME_COLOR = '#EC407A';

type Phase = 'title' | 'playing' | 'paused' | 'gameover';

export const FamilyChallenge: React.FC<FamilyChallengeProps> = ({
  onBack,
  initialMode = 'coop',
  autoStart = false,
}) => {
  const { activeProfile, settings, updateGameResult } = useApp();

  const [mode, setMode] = useState<FamilyMode>(initialMode);
  const [p1Name, setP1Name] = useState<string>(activeProfile?.name || 'Kiddo');
  const [p2Name, setP2Name] = useState<string>('Grown-Up');
  const [phase, setPhase] = useState<Phase>(autoStart ? 'playing' : 'title');

  const [round, setRound] = useState(1);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Streak, setP1Streak] = useState(0);
  const [p2Streak, setP2Streak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);

  const [question, setQuestion] = useState<FamilyQuestion>(() =>
    generateFamilyQuestion(initialMode === 'blitz' ? 'adult' : 'kid', 0),
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [flashHidden, setFlashHidden] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pickedChoice, setPickedChoice] = useState<string | null>(null);
  const [lastAwarded, setLastAwarded] = useState<number | null>(null);
  const [celebratePulse, setCelebratePulse] = useState(0);

  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('happy');
  const [mascotMsg, setMascotMsg] = useState('Ready for Family Brain Fun!');

  const savedOutcomeRef = useRef(false);
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPlayerIndex: 1 | 2 =
    mode === 'blitz' ? 1 : round % 2 === 1 ? 1 : 2;
  const currentTier: PlayerTier =
    mode === 'blitz' ? 'adult' : currentPlayerIndex === 1 ? 'kid' : 'adult';
  const currentPlayerName = currentPlayerIndex === 1 ? p1Name : p2Name;

  // Sync game state to body attribute for testability
  useEffect(() => {
    document.body.dataset.state = phase;
    return () => {
      delete document.body.dataset.state;
    };
  }, [phase]);

  const clearTimers = useCallback(() => {
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const setupRound = useCallback(
    (roundNum: number, targetMode: FamilyMode) => {
      clearTimers();
      const playerIdx = targetMode === 'blitz' ? 1 : roundNum % 2 === 1 ? 1 : 2;
      const tier: PlayerTier =
        targetMode === 'blitz' ? 'adult' : playerIdx === 1 ? 'kid' : 'adult';
      const q = generateFamilyQuestion(tier, roundNum - 1);

      setQuestion(q);
      setTimeLeft(ROUND_SECONDS);
      setLocked(false);
      setPickedChoice(null);
      setLastAwarded(null);

      const who = playerIdx === 1 ? p1Name : p2Name;
      if (q.category === 'flash') {
        setFlashHidden(false);
        setMascotExpr('thinking');
        setMascotMsg(
          targetMode === 'blitz'
            ? '👀 Watch the glowing box!'
            : `👀 ${who}, watch the glowing box!`,
        );
        flashTimerRef.current = setTimeout(() => {
          setFlashHidden(true);
          setMascotMsg('Which item was in the glowing box?');
        }, 2200);
      } else {
        setFlashHidden(true);
        setMascotExpr('thinking');
        setMascotMsg(
          targetMode === 'blitz'
            ? `${q.categoryLabel} — Go!`
            : `${who}'s turn! (${tier === 'kid' ? 'Kid Tier' : 'Adult Tier'})`,
        );
      }
      SoundService.speak(q.prompt);
    },
    [clearTimers, p1Name, p2Name],
  );

  const startGame = useCallback(() => {
    SoundService.playClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    savedOutcomeRef.current = false;
    setRound(1);
    setP1Score(0);
    setP2Score(0);
    setP1Streak(0);
    setP2Streak(0);
    setTotalCorrect(0);
    setPhase('playing');
    setupRound(1, mode);
  }, [mode, setupRound]);

  // If autoStart is active on first mount, initialize round 1 immediately
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      setupRound(1, mode);
    }
  }, [autoStart, mode, setupRound]);

  const finishMatch = useCallback(
    (finalP1: number, finalP2: number, finalCorrect: number) => {
      clearTimers();
      setPhase('gameover');
      SoundService.playSfx('win');

      if (activeProfile && !savedOutcomeRef.current) {
        savedOutcomeRef.current = true;
        const out = evaluateFamilyOutcome(
          mode,
          finalP1,
          finalP2,
          p1Name,
          p2Name,
          finalCorrect,
          TOTAL_ROUNDS,
        );
        updateGameResult(
          'family',
          out.starsEarned,
          finalCorrect,
          TOTAL_ROUNDS,
          1,
          out.coinsEarned,
        );
      }
    },
    [activeProfile, clearTimers, mode, p1Name, p2Name, updateGameResult],
  );

  const advanceOrFinish = useCallback(
    (nextP1: number, nextP2: number, nextCorrect: number) => {
      if (round >= TOTAL_ROUNDS) {
        finishMatch(nextP1, nextP2, nextCorrect);
      } else {
        const nextR = round + 1;
        setRound(nextR);
        setupRound(nextR, mode);
      }
    },
    [finishMatch, mode, round, setupRound],
  );

  // Live 1-second timer tick during active playing phase (after flash peek finishes)
  useEffect(() => {
    if (phase !== 'playing' || locked) return;
    if (question.category === 'flash' && !flashHidden) return;

    roundTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimers();
          setLocked(true);
          setMascotExpr('neutral');
          setMascotMsg(`Time's up! The answer was ${question.answer}.`);
          SoundService.playSfx('wrong');
          if (currentPlayerIndex === 1) setP1Streak(0);
          else setP2Streak(0);

          advanceTimerRef.current = setTimeout(() => {
            advanceOrFinish(p1Score, p2Score, totalCorrect);
          }, 1100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    };
  }, [
    phase,
    locked,
    question,
    flashHidden,
    clearTimers,
    currentPlayerIndex,
    advanceOrFinish,
    p1Score,
    p2Score,
    totalCorrect,
  ]);

  // Keyboard shortcuts: Enter/Space to start on title; Escape/P to pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (phase === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
      } else if (phase === 'playing' && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setPhase('paused');
      } else if (phase === 'paused' && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setPhase('playing');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, startGame]);

  const handlePickChoice = (choice: string) => {
    if (phase !== 'playing' || locked) return;
    if (question.category === 'flash' && !flashHidden) return;

    clearTimers();
    setLocked(true);
    setPickedChoice(choice);

    const isCorrect = choice === question.answer;
    const activeStreak = currentPlayerIndex === 1 ? p1Streak : p2Streak;
    const pts = calculateRoundPoints(isCorrect, timeLeft, activeStreak);

    SoundService.playSfx(isCorrect ? 'correct' : 'wrong');
    haptic(isCorrect ? 'success' : 'error', settings.soundEffectsEnabled);

    let nextP1 = p1Score;
    let nextP2 = p2Score;
    let nextCorrect = totalCorrect;

    if (isCorrect) {
      nextCorrect += 1;
      setTotalCorrect(nextCorrect);
      setLastAwarded(pts);
      setCelebratePulse(p => p + 1);
      setMascotExpr('cheering');
      setMascotMsg(`Awesome! +${pts} pts! ⭐`);

      if (currentPlayerIndex === 1) {
        nextP1 = p1Score + pts;
        setP1Score(nextP1);
        setP1Streak(s => s + 1);
      } else {
        nextP2 = p2Score + pts;
        setP2Score(nextP2);
        setP2Streak(s => s + 1);
      }
    } else {
      setLastAwarded(0);
      setMascotExpr('neutral');
      setMascotMsg(`Good try! Answer: ${question.answer}`);
      if (currentPlayerIndex === 1) setP1Streak(0);
      else setP2Streak(0);
    }

    advanceTimerRef.current = setTimeout(() => {
      advanceOrFinish(nextP1, nextP2, nextCorrect);
    }, 1050);
  };

  /* --------------------------- TITLE / LOBBY --------------------------- */
  if (phase === 'title') {
    const modeOptions: { id: FamilyMode; icon: string; title: string; desc: string }[] = [
      {
        id: 'coop',
        icon: '🤝',
        title: 'Co-Op Team',
        desc: 'Child & Grown-Up alternate turns to build one big Team Score!',
      },
      {
        id: 'duel',
        icon: '⚡',
        title: 'Friendly Duel',
        desc: 'Balanced Kid vs. Adult match — each plays puzzles at their own tier!',
      },
      {
        id: 'blitz',
        icon: '🧠',
        title: 'Brain Blitz',
        desc: 'Fast-paced Grown-Up & Big-Kid workout: word scrambles, logic & flash memory!',
      },
    ];

    return (
      <div className="bt-game-screen">
        <GameHeader
          title="Family Play Arena"
          themeColor={THEME_COLOR}
          stars={activeProfile?.stars ?? 0}
          onBack={onBack}
        />

        <div className="bt-game-content" style={{ paddingBottom: 32 }}>
          <Mascot
            expression="happy"
            message="Play together! Kids & Adults get balanced challenges."
            size={96}
          />

          <div className="bt-board-wrapper" style={{ gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', textAlign: 'center' }}>
              Choose How to Play
            </div>

            <div className="bt-family-mode-list">
              {modeOptions.map(opt => {
                const selected = mode === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    className={`bt-family-mode-card ${selected ? 'selected' : ''}`}
                    style={
                      selected
                        ? { borderColor: THEME_COLOR, backgroundColor: `${THEME_COLOR}12` }
                        : undefined
                    }
                    aria-pressed={selected}
                    onClick={() => {
                      SoundService.playClick();
                      setMode(opt.id);
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{opt.icon}</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                        {opt.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {mode !== 'blitz' && (
              <div className="bt-family-names-row">
                <div style={{ flex: 1 }}>
                  <label className="bt-input-label" htmlFor="p1-name-input" style={{ fontSize: 12 }}>
                    Player 1 (Child)
                  </label>
                  <input
                    id="p1-name-input"
                    className="bt-text-input"
                    style={{ marginBottom: 0, padding: '10px 12px', fontSize: 14 }}
                    value={p1Name}
                    onChange={e => setP1Name(e.target.value)}
                    maxLength={14}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="bt-input-label" htmlFor="p2-name-input" style={{ fontSize: 12 }}>
                    Player 2 (Grown-Up)
                  </label>
                  <input
                    id="p2-name-input"
                    className="bt-text-input"
                    style={{ marginBottom: 0, padding: '10px 12px', fontSize: 14 }}
                    value={p2Name}
                    onChange={e => setP2Name(e.target.value)}
                    maxLength={14}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              data-start="true"
              className="bt-start-btn"
              style={{ backgroundColor: THEME_COLOR, width: '100%' }}
              onClick={startGame}
            >
              Start Family Challenge ▶
            </button>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Press Enter or Space to start · P or Esc to pause
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------- RESULTS / PODIUM ------------------------ */
  if (phase === 'gameover') {
    const outcome = evaluateFamilyOutcome(
      mode,
      p1Score,
      p2Score,
      p1Name,
      p2Name,
      totalCorrect,
      TOTAL_ROUNDS,
    );

    return (
      <div className="bt-game-screen">
        <GameHeader
          title="Family Play Arena"
          themeColor={THEME_COLOR}
          stars={outcome.starsEarned}
          onBack={onBack}
        />
        <div className="bt-center-wrap" style={{ flexDirection: 'column' }}>
          <Celebration trigger={1} intensity="big" />
          <Mascot expression="cheering" message={outcome.headline} size={120} />

          <div className="bt-success-card" style={{ borderColor: THEME_COLOR }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', textAlign: 'center' }}>
              {outcome.headline}
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                textAlign: 'center',
                margin: '0 0 18px',
              }}
            >
              {outcome.subtitle}
            </p>

            {mode === 'duel' ? (
              <div className="bt-success-stats-row">
                <div className="bt-success-stat-item">
                  <div className="bt-success-stat-val" style={{ color: '#5D9CEC' }}>
                    {p1Score}
                  </div>
                  <div className="bt-success-stat-lbl">🦊 {p1Name}</div>
                </div>
                <div className="bt-success-stat-item">
                  <div className="bt-success-stat-val" style={{ color: THEME_COLOR }}>
                    {p2Score}
                  </div>
                  <div className="bt-success-stat-lbl">🌟 {p2Name}</div>
                </div>
              </div>
            ) : (
              <div className="bt-success-stats-row">
                <div className="bt-success-stat-item">
                  <div className="bt-success-stat-val" style={{ color: THEME_COLOR }}>
                    {p1Score + p2Score}
                  </div>
                  <div className="bt-success-stat-lbl">Total Score</div>
                </div>
                <div className="bt-success-stat-item">
                  <div className="bt-success-stat-val">
                    {totalCorrect}/{TOTAL_ROUNDS}
                  </div>
                  <div className="bt-success-stat-lbl">Solved</div>
                </div>
              </div>
            )}

            <div className="bt-success-stats-row" style={{ marginBottom: 18 }}>
              <div className="bt-success-stat-item">
                <div className="bt-success-stat-val">⭐ +{outcome.starsEarned}</div>
                <div className="bt-success-stat-lbl">Stars</div>
              </div>
              <div className="bt-success-stat-item">
                <div className="bt-success-stat-val">🪙 +{outcome.coinsEarned}</div>
                <div className="bt-success-stat-lbl">Coins</div>
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                data-start="true"
                style={{
                  backgroundColor: THEME_COLOR,
                  color: '#FFF',
                  padding: 14,
                  borderRadius: 18,
                  fontSize: 16,
                  fontWeight: 700,
                }}
                onClick={startGame}
              >
                Play Again 🔁
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: 'var(--card)',
                  border: `2px solid ${THEME_COLOR}`,
                  color: THEME_COLOR,
                  padding: 12,
                  borderRadius: 18,
                  fontSize: 15,
                  fontWeight: 700,
                }}
                onClick={() => {
                  SoundService.playClick();
                  setPhase('title');
                }}
              >
                Change Mode 🔄
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  padding: 12,
                  borderRadius: 18,
                  fontSize: 15,
                  fontWeight: 700,
                }}
                onClick={() => {
                  SoundService.playClick();
                  onBack();
                }}
              >
                Back to Hub 🏠
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------- ACTIVE GAMEPLAY ------------------------- */
  const timerPct = Math.max(0, Math.min(100, (timeLeft / ROUND_SECONDS) * 100));

  return (
    <div className="bt-game-screen">
      <GameHeader
        title="Family Play Arena"
        themeColor={THEME_COLOR}
        stars={activeProfile?.stars ?? 0}
        onBack={onBack}
        onPause={() => setPhase('paused')}
      />
      <Celebration trigger={celebratePulse} />

      <PauseMenu
        visible={phase === 'paused'}
        themeColor={THEME_COLOR}
        onResume={() => setPhase('playing')}
        onRestart={() => {
          startGame();
        }}
        onExit={onBack}
      />

      <div className="bt-game-content">
        {/* Compact Scoreboard Strip */}
        <div className="bt-family-hud-strip">
          {mode === 'duel' ? (
            <>
              <div
                className={`bt-family-score-pill ${currentPlayerIndex === 1 ? 'active' : ''}`}
              >
                <span>🦊 {p1Name}</span>
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{p1Score}</strong>
              </div>
              <div className="bt-family-round-pill">
                Round {round}/{TOTAL_ROUNDS}
              </div>
              <div
                className={`bt-family-score-pill ${currentPlayerIndex === 2 ? 'active' : ''}`}
              >
                <span>🌟 {p2Name}</span>
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{p2Score}</strong>
              </div>
            </>
          ) : (
            <>
              <div className="bt-family-score-pill active">
                <span>{mode === 'coop' ? '🤝 Team Score' : '🧠 Blitz Score'}</span>
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{p1Score + p2Score}</strong>
              </div>
              <div className="bt-family-round-pill">
                Round {round}/{TOTAL_ROUNDS}
              </div>
              <div className="bt-family-score-pill">
                <span>⏱️ Time</span>
                <strong
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: timeLeft <= 4 ? 'var(--secondary)' : 'var(--text)',
                  }}
                >
                  {timeLeft}s
                </strong>
              </div>
            </>
          )}
        </div>

        <Mascot expression={mascotExpr} message={mascotMsg} size={86} />

        <div className="bt-board-wrapper">
          {/* Turn + Category + Timer Bar */}
          <div className="bt-session-bar" style={{ marginBottom: 10 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 10,
                backgroundColor: currentTier === 'kid' ? '#E6F0FD' : '#FCE4EC',
                color: currentTier === 'kid' ? '#3B82F6' : '#C2185B',
              }}
            >
              {mode === 'blitz'
                ? '🧠 Pro Tier'
                : `${currentPlayerName} · ${currentTier === 'kid' ? 'Kid' : 'Adult'}`}
            </span>

            <span style={{ fontSize: 13, fontWeight: 700, color: THEME_COLOR }}>
              {question.categoryLabel}
            </span>

            {mode === 'duel' && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  color: timeLeft <= 4 ? 'var(--secondary)' : 'var(--text)',
                }}
              >
                ⏱️ {timeLeft}s
              </span>
            )}
          </div>

          <div className="bt-timer-track">
            <div
              className="bt-timer-fill"
              style={{
                width: `${timerPct}%`,
                backgroundColor: timeLeft <= 4 ? 'var(--secondary)' : THEME_COLOR,
              }}
            />
          </div>

          {/* Prompt Area */}
          <div className="bt-prompt-box" style={{ marginTop: 12 }}>
            {question.category === 'flash' && question.flashCells ? (
              <>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 12,
                    textAlign: 'center',
                  }}
                >
                  {flashHidden ? question.prompt : 'Memorize the items!'}
                </div>
                <div className="bt-flash-row">
                  {question.flashCells.map((cell, idx) => (
                    <div
                      key={idx}
                      className={`bt-flash-cell ${cell.highlighted ? 'highlighted' : ''}`}
                    >
                      {flashHidden ? (cell.highlighted ? '❓' : '•') : cell.emoji}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: question.prompt.length > 20 ? 24 : 32,
                    fontWeight: 800,
                    color: 'var(--text)',
                    textAlign: 'center',
                    lineHeight: 1.25,
                  }}
                >
                  {question.prompt}
                </div>
                {question.clue && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginTop: 8,
                      textAlign: 'center',
                    }}
                  >
                    {question.clue}
                  </div>
                )}
              </>
            )}
          </div>

          {lastAwarded !== null && (
            <div
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 800,
                color: lastAwarded > 0 ? '#4CAF50' : 'var(--secondary)',
                marginBottom: 10,
              }}
            >
              {lastAwarded > 0 ? `+${lastAwarded} points!` : 'No points this round'}
            </div>
          )}

          {/* Answer Choices */}
          <div className="bt-family-choices">
            {question.choices.map(choice => {
              const isPicked = pickedChoice === choice;
              const isAnswer = choice === question.answer;
              const showCorrect = locked && isAnswer;
              const showWrong = locked && isPicked && !isAnswer;
              const disabled = locked || (question.category === 'flash' && !flashHidden);

              return (
                <button
                  type="button"
                  key={choice}
                  disabled={disabled}
                  onClick={() => handlePickChoice(choice)}
                  className={`bt-family-choice-btn ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
