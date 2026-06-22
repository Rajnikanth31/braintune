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

interface ColorsGameProps {
  onBack: () => void;
}

const PALETTE = [
  { name: 'Red', hex: '#EF5350' },
  { name: 'Blue', hex: '#42A5F5' },
  { name: 'Green', hex: '#66BB6A' },
  { name: 'Yellow', hex: '#FFCA28' },
  { name: 'Purple', hex: '#AB47BC' },
  { name: 'Orange', hex: '#FF7043' },
];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());
const numChoices = (level: number) => Math.min(2 + level, PALETTE.length); // L1=3..L4+=6

type Mode = 'match' | 'pattern';

interface Swatch {
  name: string;
  hex: string;
}
interface Question {
  mode: Mode;
  targetName: string;
  answerHex: string;
  choices: Swatch[];
  pattern: string[]; // hex sequence for pattern mode
}

function makeQuestion(level: number): Question {
  const choices = numChoices(level);
  const pool = shuffle(PALETTE);
  // Pattern questions appear from level 3 onward.
  const mode: Mode = level >= 3 && Math.random() > 0.5 ? 'pattern' : 'match';

  if (mode === 'pattern') {
    // Simple ABAB (or ABCABC at higher levels) repeating pattern.
    const usePeriod3 = level >= 4 && Math.random() > 0.5;
    const base = pool.slice(0, usePeriod3 ? 3 : 2);
    const reps = 2;
    const full: string[] = [];
    for (let r = 0; r < reps; r++) base.forEach(b => full.push(b.hex));
    const answer = base[full.length % base.length];
    const shown = full; // child predicts the next item
    const distractors = pool
      .filter(p => p.hex !== answer.hex)
      .slice(0, choices - 1);
    return {
      mode,
      targetName: 'next',
      answerHex: answer.hex,
      choices: shuffle([answer, ...distractors]),
      pattern: shown,
    };
  }

  const target = pool[0];
  const distractors = pool.filter(p => p.hex !== target.hex).slice(0, choices - 1);
  return {
    mode,
    targetName: target.name,
    answerHex: target.hex,
    choices: shuffle([target, ...distractors]),
    pattern: [],
  };
}

export const ColorsGame: React.FC<ColorsGameProps> = ({ onBack }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.colors);

  const session = useGameSession({ gameId: 'colors', startLevel: 1 });
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(1));
  const [locked, setLocked] = useState(false);
  const [pickedHex, setPickedHex] = useState<string | null>(null);
  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('thinking');
  const [mascotMsg, setMascotMsg] = useState('Find the color!');

  useEffect(() => {
    if (!started) return;
    const q = makeQuestion(session.level);
    setQuestion(q);
    setLocked(false);
    setPickedHex(null);
    setMascotExpr('thinking');
    setMascotMsg(
      q.mode === 'match'
        ? `Tap the ${q.targetName} one!`
        : 'What color comes next in the pattern?',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.round, session.level, started]);

  const handlePick = useCallback(
    (hex: string) => {
      if (locked) return;
      setPickedHex(hex);
      const correct = hex === question.answerHex;
      session.recordAnswer(correct, 1);
      if (correct) {
        setLocked(true);
        setMascotExpr('cheering');
        setMascotMsg('Beautiful! That\'s the one! ⭐');
        setTimeout(() => session.completeRound(), 1100);
      } else {
        setMascotExpr('neutral');
        setMascotMsg('Oops! Look closely and try again.');
      }
    },
    [locked, question, session],
  );

  if (session.isComplete) {
    return (
      <View style={styles.container}>
        <GameHeader title="Colors & Shapes" themeColor={COLORS.colors} stars={session.stars} onBack={onBack} />
        <GameSuccess
          session={session}
          themeColor={COLORS.colors}
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
        <GameHeader title="Colors & Shapes" themeColor={COLORS.colors} stars={0} onBack={onBack} />
        <LevelPicker
          maxLevel={MAX_LEVEL}
          unlocked={unlocked}
          selected={session.level}
          themeColor={COLORS.colors}
          onSelect={session.setLevel}
        />
        <TutorialCard
          title="Colors & Shapes 🎨"
          body="Tap the color you are asked for. At higher levels you'll finish color patterns too. Match a few in a row to unlock harder levels!"
          themeColor={COLORS.colors}
          onStart={() => setStarted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameHeader title="Colors & Shapes" themeColor={COLORS.colors} stars={session.stars} onBack={onBack} />
      <View style={styles.content}>
        <Mascot expression={mascotExpr} message={mascotMsg} size={100} />
        <GameBody>
          <SessionBar session={session} themeColor={COLORS.colors} />

          {question.mode === 'pattern' && (
            <View style={styles.patternRow}>
              {question.pattern.map((hex, i) => (
                <View key={i} style={[styles.patternDot, { backgroundColor: hex }]} />
              ))}
              <View style={[styles.patternDot, styles.patternGap]}>
                <Text style={styles.patternGapText}>?</Text>
              </View>
            </View>
          )}

          {question.mode === 'match' && (
            <Text style={styles.targetPrompt}>{question.targetName}</Text>
          )}

          <View style={styles.choices}>
            {question.choices.map(swatch => {
              const isPicked = pickedHex === swatch.hex;
              const isAnswer = swatch.hex === question.answerHex;
              const showCorrect = locked && isAnswer;
              const showWrong = isPicked && !isAnswer;
              return (
                <TouchableOpacity
                  key={swatch.hex}
                  style={[
                    styles.swatch,
                    { backgroundColor: swatch.hex },
                    showCorrect && styles.correctSwatch,
                    showWrong && styles.wrongSwatch,
                  ]}
                  onPress={() => handlePick(swatch.hex)}
                  accessibilityRole="button"
                  accessibilityLabel={swatch.name}
                >
                  {showCorrect && <Text style={styles.swatchMark}>✓</Text>}
                  {showWrong && <Text style={styles.swatchMark}>✕</Text>}
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
  targetPrompt: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginVertical: 24,
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginVertical: 24,
    flexWrap: 'wrap',
  },
  patternDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  patternGap: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  patternGapText: { fontSize: 22, fontWeight: 'bold', color: COLORS.textMuted },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  swatch: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.08)',
    ...SHADOWS.small,
  },
  correctSwatch: { borderColor: COLORS.success, borderWidth: 4 },
  wrongSwatch: { borderColor: COLORS.secondary, borderWidth: 4, opacity: 0.7 },
  swatchMark: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 3,
  },
});
