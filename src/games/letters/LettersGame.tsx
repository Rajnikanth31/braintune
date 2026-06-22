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
} from '../shared/GameShell';

interface LettersGameProps {
  onBack: () => void;
}

// Phonics: each letter with a friendly example word + emoji.
const PHONICS: { letter: string; word: string; emoji: string }[] = [
  { letter: 'A', word: 'Apple', emoji: '🍎' },
  { letter: 'B', word: 'Ball', emoji: '⚽' },
  { letter: 'C', word: 'Cat', emoji: '🐱' },
  { letter: 'D', word: 'Dog', emoji: '🐶' },
  { letter: 'E', word: 'Egg', emoji: '🥚' },
  { letter: 'F', word: 'Fish', emoji: '🐟' },
  { letter: 'G', word: 'Grapes', emoji: '🍇' },
  { letter: 'H', word: 'Hat', emoji: '🎩' },
  { letter: 'I', word: 'Ice cream', emoji: '🍦' },
  { letter: 'K', word: 'Key', emoji: '🔑' },
  { letter: 'L', word: 'Lion', emoji: '🦁' },
  { letter: 'M', word: 'Moon', emoji: '🌙' },
  { letter: 'P', word: 'Pizza', emoji: '🍕' },
  { letter: 'R', word: 'Rocket', emoji: '🚀' },
  { letter: 'S', word: 'Sun', emoji: '☀️' },
  { letter: 'T', word: 'Tree', emoji: '🌳' },
  { letter: 'U', word: 'Umbrella', emoji: '☂️' },
  { letter: 'W', word: 'Whale', emoji: '🐳' },
];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());
const optionsForLevel = (level: number): number =>
  Math.min(2 + level, 8); // L1=3 ... caps at 8 buttons

interface Question {
  prompt: { word: string; emoji: string };
  answer: string;
  choices: string[];
}

function makeQuestion(level: number): Question {
  const pool = shuffle(PHONICS);
  const target = pool[0];
  const numChoices = optionsForLevel(level);
  const distractors = pool
    .filter(p => p.letter !== target.letter)
    .slice(0, numChoices - 1)
    .map(p => p.letter);
  return {
    prompt: { word: target.word, emoji: target.emoji },
    answer: target.letter,
    choices: shuffle([target.letter, ...distractors]),
  };
}

export const LettersGame: React.FC<LettersGameProps> = ({ onBack }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.letters);

  const session = useGameSession({ gameId: 'letters', startLevel: 1 });
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(1));
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('thinking');
  const [mascotMsg, setMascotMsg] = useState('Which letter makes this sound?');

  // New question only on a fresh round (not when adaptive difficulty shifts
  // mid-question), so the current question is never swapped before answering.
  useEffect(() => {
    if (!started) return;
    setQuestion(makeQuestion(session.level));
    setLocked(false);
    setPicked(null);
    setMascotExpr('thinking');
    setMascotMsg('Look at the picture. Which letter does it start with?');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.round, started]);

  const handlePick = useCallback(
    (choice: string) => {
      if (locked) return;
      setPicked(choice);
      const correct = choice === question.answer;
      session.recordAnswer(correct, 1);
      if (correct) {
        setLocked(true);
        setMascotExpr('cheering');
        setMascotMsg(`Yes! ${question.prompt.word} starts with ${question.answer}! ⭐`);
        setTimeout(() => session.completeRound(), 1100);
      } else {
        setMascotExpr('neutral');
        setMascotMsg('Not quite — listen again and try another!');
      }
    },
    [locked, question, session],
  );

  if (session.isComplete) {
    return (
      <View style={styles.container}>
        <GameHeader
          title="Letters & Phonics"
          themeColor={COLORS.letters}
          stars={session.stars}
          onBack={onBack}
        />
        <GameSuccess
          session={session}
          themeColor={COLORS.letters}
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
        <GameHeader
          title="Letters & Phonics"
          themeColor={COLORS.letters}
          stars={0}
          onBack={onBack}
        />
        <LevelPicker
          maxLevel={MAX_LEVEL}
          unlocked={unlocked}
          selected={session.level}
          themeColor={COLORS.letters}
          onSelect={session.setLevel}
        />
        <TutorialCard
          title="Letters & Phonics 🅰"
          body="A picture will appear. Tap the letter its name starts with — then the word is revealed! Get a few right in a row to level up."
          themeColor={COLORS.letters}
          onStart={() => setStarted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameHeader
        title="Letters & Phonics"
        themeColor={COLORS.letters}
        stars={session.stars}
        onBack={onBack}
      />
      <Celebration trigger={session.correctPulse} />
      <View style={styles.content}>
        <Mascot expression={mascotExpr} message={mascotMsg} size={100} />
        <GameBody>
          <SessionBar session={session} themeColor={COLORS.letters} />

          <View style={styles.promptCard}>
            <Text style={styles.promptEmoji}>{question.prompt.emoji}</Text>
            {picked ? (
              <Text style={styles.promptWord}>{question.prompt.word}</Text>
            ) : (
              <Text style={styles.promptHint}>Tap the first letter…</Text>
            )}
          </View>

          <View style={styles.choices}>
            {question.choices.map(letter => {
              const isPicked = picked === letter;
              const isAnswer = letter === question.answer;
              const showCorrect = locked && isAnswer;
              const showWrong = isPicked && !isAnswer;
              return (
                <TouchableOpacity
                  key={letter}
                  style={[
                    styles.letterBtn,
                    showCorrect && styles.correctBtn,
                    showWrong && styles.wrongBtn,
                  ]}
                  onPress={() => handlePick(letter)}
                  accessibilityRole="button"
                  accessibilityLabel={`Letter ${letter}`}
                >
                  <Text style={styles.letterText}>{letter}</Text>
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
  promptCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },
  promptEmoji: { fontSize: 72 },
  promptWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  promptHint: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.textMuted,
    marginTop: 8,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  letterBtn: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.letters,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  correctBtn: { backgroundColor: COLORS.correctGreen, borderColor: COLORS.success },
  wrongBtn: { backgroundColor: COLORS.incorrectRed, borderColor: COLORS.secondary },
  letterText: { fontSize: 32, fontWeight: 'bold', color: COLORS.letters },
});
