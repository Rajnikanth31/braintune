import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../../theme/colors';
import { Mascot, MascotExpression } from '../../components/Mascot';
import { useApp } from '../../state/AppContext';
import { Celebration } from '../../components/Celebration';
import { useGameSession } from '../shared/useGameSession';
import { MAX_LEVEL, highestUnlockedLevel, levelLabel } from '../shared/progression';
import {
  GameHeader,
  SessionBar,
  LevelPicker,
  GameSuccess,
  GameBody,
  TutorialCard,
} from '../shared/GameShell';

interface MathGameProps {
  onBack: () => void;
}

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());
const numChoices = (level: number) => Math.min(2 + level, 6);

interface Question {
  text: string; // e.g. "3 + 4"
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

/**
 * Difficulty ladder (Basic -> Master), so one game spans ~4 to ~15 year olds:
 *  1 add ≤5 · 2 add ≤10 · 3 subtract ≤10 · 4 add/sub ≤20
 *  5 ×(2,5,10) · 6 × up to 12 · 7 ÷ (exact) · 8 mixed two-step
 */
function makeQuestion(level: number): Question {
  let a: number, b: number, op: string, answer: number;

  switch (level) {
    case 1:
      op = '+'; a = randInt(1, 5); b = randInt(1, 5); answer = a + b; break;
    case 2:
      op = '+'; a = randInt(2, 10); b = randInt(1, 10); answer = a + b; break;
    case 3:
      op = '−'; a = randInt(3, 10); b = randInt(1, a); answer = a - b; break;
    case 4:
      if (Math.random() > 0.5) {
        op = '+'; a = randInt(5, 15); b = randInt(1, 20 - a); answer = a + b;
      } else {
        op = '−'; a = randInt(8, 20); b = randInt(1, a); answer = a - b;
      }
      break;
    case 5: {
      op = '×'; a = [2, 5, 10][randInt(0, 2)]; b = randInt(1, 10); answer = a * b; break;
    }
    case 6:
      op = '×'; a = randInt(2, 12); b = randInt(2, 12); answer = a * b; break;
    case 7:
      op = '÷'; b = randInt(2, 9); answer = randInt(2, 9); a = b * answer; break;
    default: {
      // Level 8 — mixed two-step, e.g. "3 × 4 + 5"
      const x = randInt(2, 9), y = randInt(2, 6), z = randInt(1, 9);
      answer = x * y + z;
      return { text: `${x} × ${y} + ${z}`, answer, choices: buildChoices(answer, numChoices(level)) };
    }
  }
  return { text: `${a} ${op} ${b}`, answer, choices: buildChoices(answer, numChoices(level)) };
}

export const MathGame: React.FC<MathGameProps> = ({ onBack }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.math);

  const session = useGameSession({ gameId: 'math', startLevel: 1 });
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(1));
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('thinking');
  const [mascotMsg, setMascotMsg] = useState('Solve the problem!');

  useEffect(() => {
    if (!started) return;
    setQuestion(makeQuestion(session.level));
    setLocked(false);
    setPicked(null);
    setMascotExpr('thinking');
    setMascotMsg('What is the answer?');
    // Regenerate only on a new round — never mid-question on a level shift.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.round, started]);

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
      <View style={styles.container}>
        <GameHeader title="Math & Logic" themeColor={COLORS.math} stars={session.stars} onBack={onBack} />
        <GameSuccess
          session={session}
          themeColor={COLORS.math}
          onRestart={() => {
            session.restart();
            setStarted(true);
          }}
          onBack={onBack}
        />
      </View>
    );
  }

  if (!started) {
    return (
      <View style={styles.container}>
        <GameHeader title="Math & Logic" themeColor={COLORS.math} stars={0} onBack={onBack} />
        <LevelPicker
          maxLevel={MAX_LEVEL}
          unlocked={unlocked}
          selected={session.level}
          themeColor={COLORS.math}
          onSelect={session.setLevel}
        />
        <TutorialCard
          title="Math & Logic ➕"
          body={`Solve the problem and tap the right answer. It grows with you: counting and adding at ${levelLabel(1)}, all the way to multiplication, division and two-step puzzles at ${levelLabel(MAX_LEVEL)}!`}
          themeColor={COLORS.math}
          onStart={() => setStarted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameHeader title="Math & Logic" themeColor={COLORS.math} stars={session.stars} onBack={onBack} />
      <Celebration trigger={session.correctPulse} />
      <View style={styles.content}>
        <Mascot expression={mascotExpr} message={mascotMsg} size={100} />
        <GameBody>
          <SessionBar session={session} themeColor={COLORS.math} />

          <View style={styles.problemCard}>
            <Text style={styles.problemText}>{question.text}</Text>
            <Text style={styles.equals}>= ?</Text>
          </View>

          <View style={styles.choices}>
            {question.choices.map(n => {
              const isPicked = picked === n;
              const isAnswer = n === question.answer;
              const showCorrect = locked && isAnswer;
              const showWrong = isPicked && !isAnswer;
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.answerBtn,
                    showCorrect && styles.correctBtn,
                    showWrong && styles.wrongBtn,
                  ]}
                  onPress={() => handlePick(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`Answer ${n}`}
                >
                  <Text style={styles.answerText}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GameBody>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 16, alignItems: 'center' },
  problemCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingVertical: 26,
    marginBottom: 24,
  },
  problemText: { fontSize: 48, fontWeight: 'bold', color: COLORS.text },
  equals: { fontSize: 28, fontWeight: 'bold', color: COLORS.math, marginTop: 4 },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  answerBtn: {
    minWidth: 72,
    height: 64,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.math,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  correctBtn: { backgroundColor: COLORS.correctGreen, borderColor: COLORS.success },
  wrongBtn: { backgroundColor: COLORS.incorrectRed, borderColor: COLORS.secondary },
  answerText: { fontSize: 30, fontWeight: 'bold', color: COLORS.math },
});
