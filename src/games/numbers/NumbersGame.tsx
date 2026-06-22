import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../../theme/colors';
import { Mascot, MascotExpression } from '../../components/Mascot';
import { useApp } from '../../state/AppContext';
import { useGameSession } from '../shared/useGameSession';
import { MAX_LEVEL, highestUnlockedLevel } from '../shared/progression';
import {
  GameHeader,
  SessionBar,
  LevelPicker,
  GameSuccess,
  GameBody,
  TutorialCard,
} from '../shared/GameShell';

interface NumbersGameProps {
  onBack: () => void;
}

const COUNT_EMOJIS = ['🍎', '⭐', '🐠', '🌸', '🎈', '🐝', '🍓', '🚗'];
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Counting range grows with difficulty: L1 -> up to 3, L5 -> up to 10.
const maxCountForLevel = (level: number) => Math.min(2 + level, 10);
const numChoices = (level: number) => Math.min(2 + level, 5);

type Mode = 'count' | 'sequence';

interface Question {
  mode: Mode;
  emoji: string;
  count: number; // for count mode
  sequence: number[]; // for sequence mode (with a gap shown as null-equivalent)
  answer: number;
  choices: number[];
}

function buildChoices(answer: number, count: number, max: number): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < count && guard < 50) {
    guard += 1;
    const candidate = randInt(Math.max(1, answer - 3), answer + 3);
    if (candidate >= 1 && candidate <= max + 2) set.add(candidate);
  }
  // top up if range was too tight
  let n = 1;
  while (set.size < count) {
    if (!set.has(n)) set.add(n);
    n += 1;
  }
  return shuffle([...set]);
}

function makeQuestion(level: number): Question {
  const max = maxCountForLevel(level);
  const choices = numChoices(level);
  // Sequence questions only appear from level 2 onward.
  const mode: Mode = level >= 2 && Math.random() > 0.5 ? 'sequence' : 'count';

  if (mode === 'sequence') {
    const start = randInt(1, Math.max(1, max - 3));
    const seq = [start, start + 1, start + 2];
    const answer = start + 3; // "what comes next?"
    return {
      mode,
      emoji: '',
      count: 0,
      sequence: seq,
      answer,
      choices: buildChoices(answer, choices, max + 2),
    };
  }

  const count = randInt(1, max);
  return {
    mode,
    emoji: shuffle(COUNT_EMOJIS)[0],
    count,
    sequence: [],
    answer: count,
    choices: buildChoices(count, choices, max),
  };
}

export const NumbersGame: React.FC<NumbersGameProps> = ({ onBack }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.numbers);

  const session = useGameSession({ gameId: 'numbers', startLevel: 1 });
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(1));
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('thinking');
  const [mascotMsg, setMascotMsg] = useState('Count carefully!');

  useEffect(() => {
    if (!started) return;
    const q = makeQuestion(session.level);
    setQuestion(q);
    setLocked(false);
    setPicked(null);
    setMascotExpr('thinking');
    setMascotMsg(
      q.mode === 'count' ? 'How many do you see?' : 'What number comes next?',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <View style={styles.container}>
        <GameHeader title="Numbers & Counting" themeColor={COLORS.numbers} stars={session.stars} onBack={onBack} />
        <GameSuccess
          session={session}
          themeColor={COLORS.numbers}
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
        <GameHeader title="Numbers & Counting" themeColor={COLORS.numbers} stars={0} onBack={onBack} />
        <LevelPicker
          maxLevel={MAX_LEVEL}
          unlocked={unlocked}
          selected={session.level}
          themeColor={COLORS.numbers}
          onSelect={session.setLevel}
        />
        <TutorialCard
          title="Numbers & Counting 🔢"
          body="Count the objects and tap the right number. Higher levels add 'what comes next?' sequences. Keep a streak to climb the levels!"
          themeColor={COLORS.numbers}
          onStart={() => setStarted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameHeader title="Numbers & Counting" themeColor={COLORS.numbers} stars={session.stars} onBack={onBack} />
      <View style={styles.content}>
        <Mascot expression={mascotExpr} message={mascotMsg} size={100} />
        <GameBody>
          <SessionBar session={session} themeColor={COLORS.numbers} />

          {question.mode === 'count' ? (
            <View style={styles.objectsArea}>
              {Array.from({ length: question.count }).map((_, i) => (
                <Text key={i} style={styles.objectEmoji}>
                  {question.emoji}
                </Text>
              ))}
            </View>
          ) : (
            <View style={styles.sequenceArea}>
              {question.sequence.map(n => (
                <View key={n} style={styles.seqTile}>
                  <Text style={styles.seqText}>{n}</Text>
                </View>
              ))}
              <View style={[styles.seqTile, styles.seqGap]}>
                <Text style={styles.seqGapText}>?</Text>
              </View>
            </View>
          )}

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
                    styles.numberBtn,
                    showCorrect && styles.correctBtn,
                    showWrong && styles.wrongBtn,
                  ]}
                  onPress={() => handlePick(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`Number ${n}`}
                >
                  <Text style={styles.numberText}>{n}</Text>
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
  objectsArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 12,
    marginBottom: 20,
    gap: 6,
  },
  objectEmoji: { fontSize: 40, margin: 2 },
  sequenceArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    minHeight: 100,
  },
  seqTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.numbers,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seqText: { fontSize: 26, fontWeight: 'bold', color: COLORS.numbers },
  seqGap: { borderStyle: 'dashed', backgroundColor: COLORS.cardBackground },
  seqGapText: { fontSize: 26, fontWeight: 'bold', color: COLORS.textMuted },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  numberBtn: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.numbers,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  correctBtn: { backgroundColor: COLORS.correctGreen, borderColor: COLORS.success },
  wrongBtn: { backgroundColor: COLORS.incorrectRed, borderColor: COLORS.secondary },
  numberText: { fontSize: 30, fontWeight: 'bold', color: COLORS.numbers },
});
