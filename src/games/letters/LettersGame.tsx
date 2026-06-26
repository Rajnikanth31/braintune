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

interface LettersGameProps {
  onBack: () => void;
}

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
const optionsForLevel = (level: number) => Math.min(2 + Math.floor(level / 3), 8);

type QuestionMode = 'start_upper' | 'start_lower' | 'fill_start' | 'fill_middle';

interface Question {
  prompt: { word: string; emoji: string };
  answer: string;
  choices: string[];
  mode: QuestionMode;
  wordTemplate: string;
}

function makeQuestion(level: number): Question {
  const pool = shuffle(PHONICS);
  const target = pool[0];
  const choicesCount = optionsForLevel(level);

  let mode: QuestionMode = 'start_upper';
  if (level > 5 && level <= 10) mode = 'start_lower';
  else if (level > 10 && level <= 15) mode = 'fill_start';
  else if (level > 15) mode = 'fill_middle';

  let answer = '';
  let wordTemplate = '';
  let distractorsPool: string[] = [];

  if (mode === 'start_upper') {
    answer = target.letter;
    wordTemplate = target.word;
    distractorsPool = PHONICS.filter(p => p.letter !== target.letter).map(p => p.letter);
  } else if (mode === 'start_lower') {
    answer = target.letter.toLowerCase();
    wordTemplate = target.word.toLowerCase();
    distractorsPool = PHONICS.filter(p => p.letter !== target.letter).map(p => p.letter.toLowerCase());
  } else if (mode === 'fill_start') {
    answer = target.letter;
    wordTemplate = '_ ' + target.word.substring(1).toUpperCase();
    distractorsPool = PHONICS.filter(p => p.letter !== target.letter).map(p => p.letter);
  } else {
    // missing middle letter: e.g. "Cat" -> "C _ t" or "Ball" -> "B _ l l"
    const word = target.word.toUpperCase();
    const midIdx = Math.floor(word.length / 2);
    answer = word[midIdx];
    wordTemplate = word.substring(0, midIdx) + ' _ ' + word.substring(midIdx + 1);
    
    // Choose distractors from letters in the word alphabet, or letters in PHONICS
    distractorsPool = PHONICS.map(p => p.letter).filter(l => l !== answer);
  }

  const distractors = shuffle(distractorsPool).slice(0, choicesCount - 1);
  const finalChoices = shuffle([answer, ...distractors]);

  return {
    prompt: { word: target.word, emoji: target.emoji },
    answer,
    choices: finalChoices,
    mode,
    wordTemplate,
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
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!started) return;
    setQuestion(makeQuestion(session.level));
    setLocked(false);
    setPicked(null);
    setMascotExpr('thinking');
    setMascotMsg('Look at the picture. Which letter fits?');
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
        setMascotMsg(`Yes! The correct spelling is ${question.prompt.word}! ⭐`);
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
          body="Complete spelling and phonics puzzles! Levels 1-10 match starting letters (uppercase and lowercase). Levels 11-20 test advanced spelling, fill-in-the-blanks, and phonics blend recognition!"
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
        onPause={() => setPaused(true)}
      />
      <Celebration trigger={session.correctPulse} />
      <PauseMenu
        visible={paused}
        themeColor={COLORS.letters}
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
          <SessionBar session={session} themeColor={COLORS.letters} />

          <View style={styles.promptCard}>
            <Text style={styles.promptEmoji}>{question.prompt.emoji}</Text>
            {locked || picked ? (
              <Text style={styles.promptWord}>{question.prompt.word.toUpperCase()}</Text>
            ) : (
              <Text style={styles.promptWordTemplate}>{question.wordTemplate}</Text>
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
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    letterSpacing: 2,
  },
  promptWordTemplate: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.letters,
    marginTop: 8,
    letterSpacing: 4,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  letterBtn: {
    width: 60,
    height: 60,
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
  letterText: { fontSize: 28, fontWeight: 'bold', color: COLORS.letters },
});
