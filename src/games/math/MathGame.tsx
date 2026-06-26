import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../../theme/colors';
import { Mascot, MascotExpression } from '../../components/Mascot';
import { useApp } from '../../state/AppContext';
import { Celebration } from '../../components/Celebration';
import { useGameSession } from '../shared/useGameSession';
import { MAX_LEVEL, highestUnlockedLevel } from '../shared/progression';
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
 * 20 difficulty levels ( Beginner 1-5, Easy-Medium 6-10, Medium-Hard 11-15, Advanced 16-20 ):
 */
function makeQuestion(level: number): Question {
  let a: number, b: number, c: number, op: string, answer: number;

  switch (level) {
    case 1: // Add up to 5
      op = '+'; a = randInt(1, 4); b = randInt(1, 4 - a + 1); answer = a + b; break;
    case 2: // Add up to 10
      op = '+'; a = randInt(1, 8); b = randInt(1, 10 - a); answer = a + b; break;
    case 3: // Sub up to 10
      op = '−'; a = randInt(2, 10); b = randInt(1, a - 1); answer = a - b; break;
    case 4: // Mixed Add/Sub up to 10
      if (Math.random() > 0.5) {
        op = '+'; a = randInt(1, 8); b = randInt(1, 10 - a); answer = a + b;
      } else {
        op = '−'; a = randInt(2, 10); b = randInt(1, a - 1); answer = a - b;
      }
      break;
    case 5: // Add up to 20
      op = '+'; a = randInt(5, 15); b = randInt(1, 20 - a); answer = a + b; break;
    case 6: // Sub up to 20
      op = '−'; a = randInt(10, 20); b = randInt(1, a - 1); answer = a - b; break;
    case 7: // Mixed Add/Sub up to 20
      if (Math.random() > 0.5) {
        op = '+'; a = randInt(5, 15); b = randInt(1, 20 - a); answer = a + b;
      } else {
        op = '−'; a = randInt(10, 20); b = randInt(1, a - 1); answer = a - b;
      }
      break;
    case 8: // Mult by 2
      op = '×'; a = 2; b = randInt(1, 10); answer = a * b; break;
    case 9: // Mult by 5
      op = '×'; a = 5; b = randInt(1, 10); answer = a * b; break;
    case 10: // Mult by 10
      op = '×'; a = 10; b = randInt(1, 10); answer = a * b; break;
    case 11: // Mult up to 10
      op = '×'; a = randInt(2, 9); b = randInt(2, 9); answer = a * b; break;
    case 12: // Div by 2, 5, 10
      op = '÷'; b = [2, 5, 10][randInt(0, 2)]; answer = randInt(1, 10); a = b * answer; break;
    case 13: // Div up to 50
      op = '÷'; b = randInt(2, 6); answer = randInt(2, 8); a = b * answer; break;
    case 14: // 3-number Add/Sub up to 20
      a = randInt(3, 10); b = randInt(2, 8); c = randInt(1, 5);
      if (Math.random() > 0.5) {
        answer = a + b - c;
        return { text: `${a} + ${b} − ${c}`, answer, choices: buildChoices(answer, numChoices(level)) };
      } else {
        answer = a - b + c;
        return { text: `${a} − ${b} + ${c}`, answer, choices: buildChoices(answer, numChoices(level)) };
      }
    case 15: // Mult and Add/Sub
      a = randInt(2, 5); b = randInt(2, 5); c = randInt(1, 10);
      if (Math.random() > 0.5) {
        answer = a * b + c;
        return { text: `${a} × ${b} + ${c}`, answer, choices: buildChoices(answer, numChoices(level)) };
      } else {
        answer = a * b - c;
        if (answer < 0) answer = a * b + c; // keep positive
        return { text: `${a} × ${b} − ${c}`, answer, choices: buildChoices(answer, numChoices(level)) };
      }
    case 16: // Mult up to 12
      op = '×'; a = randInt(2, 12); b = randInt(2, 12); answer = a * b; break;
    case 17: // Div up to 100
      op = '÷'; b = randInt(2, 10); answer = randInt(2, 10); a = b * answer; break;
    case 18: // Mixed priority, e.g. 18 - 3 * 4
      a = randInt(10, 25); b = randInt(2, 5); c = randInt(2, 4);
      answer = a - b * c;
      if (answer < 0) answer = a + b * c;
      return { text: `${a} − ${b} × ${c}`, answer, choices: buildChoices(answer, numChoices(level)) };
    case 19: // Missing number in sequence, e.g. 5, 10, ?, 20
      a = [2, 3, 5, 10][randInt(0, 3)]; // skip value
      b = randInt(1, 5); // starting multiplier
      c = randInt(1, 2); // gap index: index 1 or index 2
      if (c === 1) {
        answer = (b + 1) * a;
        return { text: `${b * a},  ?,  ${(b + 2) * a},  ${(b + 3) * a}`, answer, choices: buildChoices(answer, numChoices(level)) };
      } else {
        answer = (b + 2) * a;
        return { text: `${b * a},  ${(b + 1) * a},  ?,  ${(b + 3) * a}`, answer, choices: buildChoices(answer, numChoices(level)) };
      }
    default: { // Level 20: Parenthesis / 3-step equations
      a = randInt(2, 10); b = randInt(2, 8); c = randInt(2, 4);
      if (Math.random() > 0.5) {
        answer = (a + b) * c;
        return { text: `(${a} + ${b}) × ${c}`, answer, choices: buildChoices(answer, numChoices(level)) };
      } else {
        answer = a * b - c;
        if (answer < 0) answer = a * b + c;
        return { text: `(${a} × ${b}) − ${c}`, answer, choices: buildChoices(answer, numChoices(level)) };
      }
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
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!started) return;
    setQuestion(makeQuestion(session.level));
    setLocked(false);
    setPicked(null);
    setMascotExpr('thinking');
    setMascotMsg('What is the answer?');
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
          body={`Solve the math problems to earn stars and coins! Levels 1-5 build basic adding, while levels 6-15 test multiplication and division. Advanced levels 16-20 present skip counting and mixed operations!`}
          themeColor={COLORS.math}
          onStart={() => setStarted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
  problemText: { fontSize: 40, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
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
  answerText: { fontSize: 26, fontWeight: 'bold', color: COLORS.math },
});
