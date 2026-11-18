import React, { useEffect, useState, useCallback } from 'react';
import { COLORS } from '../../theme/colors';
import { Mascot, MascotExpression } from '../../components/Mascot';
import { useApp } from '../../state/AppContext';
import { Celebration } from '../../components/Celebration';
import { useGameSession, useUnlockDifficulty } from '../shared/useGameSession';
import { MAX_LEVEL, highestUnlockedLevel } from '../shared/progression';
import { SoundService } from '../../audio/SoundService';
import {
  GameHeader,
  SessionBar,
  LevelPicker,
  GameSuccess,
  GameBody,
  TutorialCard,
  PauseMenu,
} from '../shared/GameShell';

interface NumbersGameProps {
  onBack: () => void;
  initialLevel?: number;
}

const COUNT_EMOJIS = ['🍎', '⭐', '🐠', '🌸', '🎈', '🐝', '🍓', '🚗', '🐸', '🐨', '🦖', '🍭'];
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const maxCountForLevel = (level: number) => {
  if (level <= 5) return 1 + level * 2;
  if (level <= 10) return 10 + (level - 5) * 2;
  return 20 + (level - 10) * 4;
};

const numChoices = (level: number) => Math.min(3 + Math.floor(level / 5), 6);

type Mode = 'count' | 'sequence';

interface Question {
  mode: Mode;
  emoji: string;
  count: number;
  sequence: number[];
  answer: number;
  choices: number[];
}

function buildChoices(answer: number, count: number, max: number): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < count && guard < 50) {
    guard += 1;
    const candidate = randInt(Math.max(1, answer - 5), answer + 5);
    if (candidate >= 1 && candidate <= max + 5) set.add(candidate);
  }
  let n = 1;
  while (set.size < count) {
    if (!set.has(n)) set.add(n);
    n += 1;
  }
  return shuffle([...set]);
}

function makeQuestion(level: number): Question {
  const max = maxCountForLevel(level);
  const choicesCount = numChoices(level);

  const mode: Mode = level >= 3 && Math.random() > 0.5 ? 'sequence' : 'count';

  if (mode === 'sequence') {
    let start = 1;
    let step = 1;
    let seq: number[] = [];
    let answer = 0;

    if (level <= 5) {
      start = randInt(1, 10);
      step = 1;
      seq = [start, start + 1, start + 2];
      answer = start + 3;
    } else if (level <= 10) {
      step = Math.random() > 0.5 ? 2 : 5;
      start = randInt(1, 5) * step;
      seq = [start, start + step, start + step * 2];
      answer = start + step * 3;
    } else if (level <= 15) {
      step = Math.random() > 0.5 ? -2 : -5;
      start = step === -2 ? randInt(8, 15) * 2 : randInt(4, 7) * 5;
      seq = [start, start + step, start + step * 2];
      answer = start + step * 3;
    } else {
      step = [3, 4, 10][randInt(0, 2)];
      start = randInt(1, 5) * Math.abs(step);
      if (Math.random() > 0.5) {
        seq = [start, start + step, start + step * 2];
        answer = start + step * 3;
      } else {
        start = step === 10 ? 100 : step * 10;
        seq = [start, start - step, start - step * 2];
        answer = start - step * 3;
      }
    }

    return {
      mode,
      emoji: '',
      count: 0,
      sequence: seq,
      answer,
      choices: buildChoices(answer, choicesCount, Math.max(answer, 10)),
    };
  }

  const count = randInt(1, Math.min(max, 24));
  return {
    mode,
    emoji: shuffle(COUNT_EMOJIS)[0],
    count,
    sequence: [],
    answer: count,
    choices: buildChoices(count, choicesCount, count),
  };
}

export const NumbersGame: React.FC<NumbersGameProps> = ({ onBack, initialLevel = 1 }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.numbers);

  const session = useGameSession({ gameId: 'numbers', startLevel: initialLevel });
  const handleUnlockDifficulty = useUnlockDifficulty('numbers');
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(initialLevel));
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('thinking');
  const [mascotMsg, setMascotMsg] = useState('Count carefully!');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!started) return;
    const q = makeQuestion(session.level);
    setQuestion(q);
    setLocked(false);
    setPicked(null);
    setMascotExpr('thinking');
    const prompt =
      q.mode === 'count' ? 'How many do you see?' : 'What number comes next?';
    setMascotMsg(prompt);
    SoundService.speak(prompt);
  }, [session.round, session.level, started]);

  const handlePick = useCallback(
    (choice: number) => {
      if (locked) return;
      setPicked(choice);
      const correct = choice === question.answer;
      session.recordAnswer(correct, 1);
      if (correct) {
        setLocked(true);
        setMascotExpr('cheering');
        setMascotMsg(`That's right! The answer is ${question.answer}! ⭐`);
        setTimeout(() => session.completeRound(), 1100);
      } else {
        setMascotExpr('neutral');
        setMascotMsg('Almost! Try counting once more.');
      }
    },
    [locked, question, session],
  );

  if (session.isComplete) {
    return (
      <div className="bt-game-screen">
        <GameHeader
          title="Numbers & Counting"
          themeColor={COLORS.numbers}
          stars={session.stars}
          onBack={onBack}
        />
        <GameSuccess
          session={session}
          themeColor={COLORS.numbers}
          onRestart={() => {
            session.restart();
            setStarted(true);
          }}
          onPlayNextMode={nextLvl => {
            session.setLevel(nextLvl);
            session.restart();
            setStarted(true);
          }}
          onBack={onBack}
        />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="bt-game-screen">
        <GameHeader
          title="Numbers & Counting"
          themeColor={COLORS.numbers}
          stars={0}
          onBack={onBack}
        />
        <LevelPicker
          maxLevel={MAX_LEVEL}
          unlocked={unlocked}
          selected={session.level}
          themeColor={COLORS.numbers}
          onSelect={session.setLevel}
          onUnlockDifficulty={handleUnlockDifficulty}
        />
        <TutorialCard
          title="Numbers & Counting 🔢"
          body="Count the beautiful items or solve number sequences! Levels 1-5 build basic counting. Levels 6-15 test skip counting (2s, 5s) and reverse ordering. Advanced levels 16-20 challenge you with sequences up to 100!"
          themeColor={COLORS.numbers}
          onStart={() => setStarted(true)}
        />
      </div>
    );
  }

  return (
    <div className="bt-game-screen">
      <GameHeader
        title="Numbers & Counting"
        themeColor={COLORS.numbers}
        stars={session.stars}
        onBack={onBack}
        onPause={() => setPaused(true)}
      />
      <Celebration trigger={session.correctPulse} />
      <PauseMenu
        visible={paused}
        themeColor={COLORS.numbers}
        onResume={() => setPaused(false)}
        onRestart={() => {
          setPaused(false);
          session.restart();
        }}
        onExit={onBack}
      />
      <div className="bt-game-content">
        <Mascot expression={mascotExpr} message={mascotMsg} size={100} />
        <GameBody>
          <SessionBar session={session} themeColor={COLORS.numbers} />

          <div className="bt-prompt-box">
            {question.mode === 'count' ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 12,
                }}
              >
                {Array.from({ length: question.count }).map((_, i) => (
                  <span key={i} style={{ fontSize: 36, lineHeight: 1.1 }}>
                    {question.emoji}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {question.sequence.map((n, i) => (
                  <span
                    key={i}
                    style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}
                  >
                    {n}
                  </span>
                ))}
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.numbers,
                    borderBottom: `3px solid ${COLORS.numbers}`,
                    padding: '0 6px',
                  }}
                >
                  ?
                </span>
              </div>
            )}
          </div>

          <div className="bt-choices-grid">
            {question.choices.map(choice => {
              const isPicked = picked === choice;
              const isAnswer = choice === question.answer;
              const showCorrect = locked && isAnswer;
              const showWrong = isPicked && !isAnswer;
              return (
                <button
                  type="button"
                  key={choice}
                  className={`bt-choice-btn ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                  style={{
                    width: 60,
                    height: 60,
                    borderColor: COLORS.numbers,
                    color: COLORS.numbers,
                    fontSize: 26,
                  }}
                  onClick={() => handlePick(choice)}
                  aria-label={`Choice ${choice}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        </GameBody>
      </div>
    </div>
  );
};
