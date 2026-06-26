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

interface NumbersGameProps {
  onBack: () => void;
}

const COUNT_EMOJIS = ['🍎', '⭐', '🐠', '🌸', '🎈', '🐝', '🍓', '🚗', '🐸', '🐨', '🦖', '🍭'];
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Scaling rules
const maxCountForLevel = (level: number) => {
  if (level <= 5) return 1 + level * 2; // L1=3..L5=11
  if (level <= 10) return 10 + (level - 5) * 2; // L6-10=12..20
  return 20 + (level - 10) * 4; // L11-20=24..60
};

const numChoices = (level: number) => Math.min(3 + Math.floor(level / 5), 6);

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

  // Sequences only from level 3 onwards.
  const mode: Mode = level >= 3 && Math.random() > 0.5 ? 'sequence' : 'count';

  if (mode === 'sequence') {
    let start = 1;
    let step = 1;
    let seq: number[] = [];
    let answer = 0;

    if (level <= 5) {
      // simple counting: e.g. 2, 3, 4 -> 5
      start = randInt(1, 10);
      step = 1;
      seq = [start, start + 1, start + 2];
      answer = start + 3;
    } else if (level <= 10) {
      // simple skip by 2s or 5s: e.g. 2, 4, 6 -> 8 or 5, 10, 15 -> 20
      step = Math.random() > 0.5 ? 2 : 5;
      start = randInt(1, 5) * step;
      seq = [start, start + step, start + step * 2];
      answer = start + step * 3;
    } else if (level <= 15) {
      // descending sequences: e.g. 10, 8, 6 -> 4 or 20, 15, 10 -> 5
      step = Math.random() > 0.5 ? -2 : -5;
      start = step === -2 ? randInt(8, 15) * 2 : randInt(4, 7) * 5;
      seq = [start, start + step, start + step * 2];
      answer = start + step * 3;
    } else {
      // advanced skip counting: by 3s, 4s, 10s up to 100
      step = [3, 4, 10][randInt(0, 2)];
      start = randInt(1, 5) * Math.abs(step);
      if (Math.random() > 0.5) {
        seq = [start, start + step, start + step * 2];
        answer = start + step * 3;
      } else {
        // descending from 100 or 50
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

  // Count mode
  const count = randInt(1, Math.min(max, 24)); // cap count at 24 emojis for screen layout
  return {
    mode,
    emoji: shuffle(COUNT_EMOJIS)[0],
    count,
    sequence: [],
    answer: count,
    choices: buildChoices(count, choicesCount, count),
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
  const [paused, setPaused] = useState(false);

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
          body="Count the beautiful items or solve number sequences! Levels 1-5 build basic counting. Levels 6-15 test skip counting (2s, 5s) and reverse ordering. Advanced levels 16-20 challenge you with sequences up to 100!"
          themeColor={COLORS.numbers}
          onStart={() => setStarted(true)}
        />
      </View>
    );
  }

  // Generate grid of count emojis
  const renderCountItems = () => {
    return (
      <View style={styles.emojiGrid}>
        {Array.from({ length: question.count }).map((_, i) => (
          <Text key={i} style={styles.emojiItem}>
            {question.emoji}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
      <View style={styles.content}>
        <Mascot expression={mascotExpr} message={mascotMsg} size={100} />
        <GameBody>
          <SessionBar session={session} themeColor={COLORS.numbers} />

          <View style={styles.boardArea}>
            {question.mode === 'count' ? (
              renderCountItems()
            ) : (
              <View style={styles.sequenceCard}>
                {question.sequence.map((n, i) => (
                  <Text key={i} style={styles.seqItem}>
                    {n}
                  </Text>
                ))}
                <Text style={[styles.seqItem, styles.seqTarget]}>?</Text>
              </View>
            )}
          </View>

          <View style={styles.choices}>
            {question.choices.map(choice => {
              const isPicked = picked === choice;
              const isAnswer = choice === question.answer;
              const showCorrect = locked && isAnswer;
              const showWrong = isPicked && !isAnswer;
              return (
                <TouchableOpacity
                  key={choice}
                  style={[
                    styles.choiceBtn,
                    showCorrect && styles.correctBtn,
                    showWrong && styles.wrongBtn,
                  ]}
                  onPress={() => handlePick(choice)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choice ${choice}`}
                >
                  <Text style={styles.choiceText}>{choice}</Text>
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
  boardArea: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  emojiItem: { fontSize: 36 },
  sequenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  seqItem: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  seqTarget: {
    color: COLORS.numbers,
    fontSize: 32,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.numbers,
    paddingHorizontal: 6,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  choiceBtn: {
    width: 60,
    height: 60,
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
  choiceText: { fontSize: 26, fontWeight: 'bold', color: COLORS.numbers },
});
