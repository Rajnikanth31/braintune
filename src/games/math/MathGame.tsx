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

interface MathGameProps {
  onBack: () => void;
}

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());
const numChoices = (level: number) => Math.min(2 + Math.floor(level / 3), 6);

interface Question {
  text: string;
  answer: number;
  choices: number[];
}

function buildChoices(answer: number, count: number): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < count && guard < 60) {
    guard += 1;
    const delta = randInt(1, Math.max(3, Math.round(answer * 0.3) + 2));
    const cand = Math.random() > 0.5 ? answer + delta : answer - delta;
    if (cand >= 0 && cand !== answer) set.add(cand);
  }
  let n = 0;
  while (set.size < count) {
    if (!set.has(n)) set.add(n);
    n += 1;
  }
  return shuffle([...set]);
}

function makeQuestion(level: number): Question {
  let a = 0;
  let b = 0;
  let c = 0;
  let answer = 0;
  let text = '';
  const choicesCount = numChoices(level);

  const allowedOps = ['+', '−', '×'];
  if (level > 10) {
    allowedOps.push('÷');
  }
  const selectedOp = allowedOps[Math.floor(Math.random() * allowedOps.length)];

  if (level <= 5) {
    const maxVal = level * 4;
    if (selectedOp === '+') {
      a = randInt(1, maxVal - 1);
      b = randInt(1, maxVal - a);
      answer = a + b;
      text = `${a} + ${b}`;
    } else if (selectedOp === '−') {
      a = randInt(2, maxVal);
      b = randInt(1, a - 1);
      answer = a - b;
      text = `${a} − ${b}`;
    } else if (selectedOp === '×') {
      a = randInt(1, Math.min(2 + level, 4));
      b = randInt(1, Math.min(2 + level, 4));
      answer = a * b;
      text = `${a} × ${b}`;
    } else {
      b = randInt(1, 3);
      answer = randInt(1, 4);
      a = b * answer;
      text = `${a} ÷ ${b}`;
    }
  } else if (level <= 10) {
    const maxVal = 20 + (level - 5) * 6;
    if (selectedOp === '+') {
      a = randInt(5, maxVal - 5);
      b = randInt(5, maxVal - a);
      answer = a + b;
      text = `${a} + ${b}`;
    } else if (selectedOp === '−') {
      a = randInt(10, maxVal);
      b = randInt(5, a - 1);
      answer = a - b;
      text = `${a} − ${b}`;
    } else if (selectedOp === '×') {
      a = randInt(2, Math.min(level, 7));
      b = randInt(1, 8);
      answer = a * b;
      text = `${a} × ${b}`;
    } else {
      b = randInt(2, 4);
      answer = randInt(2, 6);
      a = b * answer;
      text = `${a} ÷ ${b}`;
    }
  } else if (level <= 15) {
    if (Math.random() > 0.4) {
      a = randInt(3, 10);
      b = randInt(2, 6);
      c = randInt(1, 8);
      const subOp = Math.random() > 0.5 ? '+' : '−';
      if (Math.random() > 0.5) {
        if (subOp === '+') {
          answer = a * b + c;
          text = `${a} × ${b} + ${c}`;
        } else {
          answer = a * b - c;
          if (answer < 0) answer = a * b + c;
          text = `${a} × ${b} − ${c}`;
        }
      } else {
        if (subOp === '+') {
          answer = a + b + c;
          text = `${a} + ${b} + ${c}`;
        } else {
          answer = a + b - c;
          if (answer < 0) answer = a + b + c;
          text = `${a} + ${b} − ${c}`;
        }
      }
    } else {
      if (selectedOp === '+') {
        a = randInt(10, 60);
        b = randInt(10, 60);
        answer = a + b;
        text = `${a} + ${b}`;
      } else if (selectedOp === '−') {
        a = randInt(20, 80);
        b = randInt(10, a - 5);
        answer = a - b;
        text = `${a} − ${b}`;
      } else if (selectedOp === '×') {
        a = randInt(2, 9);
        b = randInt(3, 9);
        answer = a * b;
        text = `${a} × ${b}`;
      } else {
        b = randInt(2, 8);
        answer = randInt(2, 8);
        a = b * answer;
        text = `${a} ÷ ${b}`;
      }
    }
  } else {
    const styleRoll = Math.random();
    if (styleRoll < 0.4) {
      a = randInt(2, 10);
      b = randInt(2, 8);
      c = randInt(2, 5);
      if (Math.random() > 0.5) {
        answer = (a + b) * c;
        text = `(${a} + ${b}) × ${c}`;
      } else {
        answer = a * b - c;
        if (answer < 0) answer = a * b + c;
        text = `(${a} × ${b}) − ${c}`;
      }
    } else if (styleRoll < 0.7) {
      a = [3, 4, 5, 10][randInt(0, 3)];
      b = randInt(2, 6);
      c = randInt(1, 2);
      if (c === 1) {
        answer = (b + 1) * a;
        text = `${b * a},  ?,  ${(b + 2) * a},  ${(b + 3) * a}`;
      } else {
        answer = (b + 2) * a;
        text = `${b * a},  ${(b + 1) * a},  ?,  ${(b + 3) * a}`;
      }
    } else {
      a = randInt(15, 30);
      b = randInt(2, 6);
      c = randInt(2, 5);
      answer = a - b * c;
      if (answer < 0) answer = a + b * c;
      text = `${a} − ${b} × ${c}`;
    }
  }

  return {
    text,
    answer,
    choices: buildChoices(answer, choicesCount),
  };
}

export const MathGame: React.FC<MathGameProps> = ({ onBack }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.math);

  const session = useGameSession({ gameId: 'math', startLevel: 1 });
  const handleUnlockDifficulty = useUnlockDifficulty('math');
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(1));
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('thinking');
  const [mascotMsg, setMascotMsg] = useState('Solve the problem!');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!started) return;
    const q = makeQuestion(session.level);
    setQuestion(q);
    setLocked(false);
    setPicked(null);
    setMascotExpr('thinking');
    setMascotMsg('What is the answer?');
    SoundService.speak('What is the answer?');
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
        setMascotMsg(`Correct! ${question.text} = ${question.answer} ⭐`);
        setTimeout(() => session.completeRound(), 1100);
      } else {
        setMascotExpr('neutral');
        setMascotMsg('Not quite — give it another go!');
      }
    },
    [locked, question, session],
  );

  if (session.isComplete) {
    return (
      <div className="bt-game-screen">
        <GameHeader
          title="Math & Logic"
          themeColor={COLORS.math}
          stars={session.stars}
          onBack={onBack}
        />
        <GameSuccess
          session={session}
          themeColor={COLORS.math}
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
          title="Math & Logic"
          themeColor={COLORS.math}
          stars={0}
          onBack={onBack}
        />
        <LevelPicker
          maxLevel={MAX_LEVEL}
          unlocked={unlocked}
          selected={session.level}
          themeColor={COLORS.math}
          onSelect={session.setLevel}
          onUnlockDifficulty={handleUnlockDifficulty}
        />
        <TutorialCard
          title="Math & Logic ➕"
          body="Solve the math problems to earn stars and coins! Levels 1-5 build basic adding, while levels 6-15 test multiplication and division. Advanced levels 16-20 present skip counting and mixed operations!"
          themeColor={COLORS.math}
          onStart={() => setStarted(true)}
        />
      </div>
    );
  }

  return (
    <div className="bt-game-screen">
      <GameHeader
        title="Math & Logic"
        themeColor={COLORS.math}
        stars={session.stars}
        onBack={onBack}
        onPause={() => setPaused(true)}
      />
      <Celebration trigger={session.correctPulse} />
      <PauseMenu
        visible={paused}
        themeColor={COLORS.math}
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
          <SessionBar session={session} themeColor={COLORS.math} />

          <div className="bt-prompt-box" style={{ padding: '24px 16px' }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
              {question.text}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.math, marginTop: 4 }}>
              = ?
            </div>
          </div>

          <div className="bt-choices-grid" style={{ gap: 14 }}>
            {question.choices.map(n => {
              const isPicked = picked === n;
              const isAnswer = n === question.answer;
              const showCorrect = locked && isAnswer;
              const showWrong = isPicked && !isAnswer;
              return (
                <button
                  type="button"
                  key={n}
                  className={`bt-choice-btn ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                  style={{
                    minWidth: 72,
                    height: 64,
                    borderColor: COLORS.math,
                    color: COLORS.math,
                    fontSize: 26,
                  }}
                  onClick={() => handlePick(n)}
                  aria-label={`Answer ${n}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </GameBody>
      </div>
    </div>
  );
};
