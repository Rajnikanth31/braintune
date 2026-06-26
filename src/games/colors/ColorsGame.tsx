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

interface ColorsGameProps {
  onBack: () => void;
}

interface ColorItem {
  name: string;
  hex: string;
}

interface ShapeItem {
  name: string;
  emoji: string;
}

const PALETTE: ColorItem[] = [
  { name: 'Red', hex: '#EF5350' },
  { name: 'Blue', hex: '#42A5F5' },
  { name: 'Green', hex: '#66BB6A' },
  { name: 'Yellow', hex: '#FFCA28' },
  { name: 'Purple', hex: '#AB47BC' },
  { name: 'Orange', hex: '#FF7043' },
  { name: 'Pink', hex: '#EC407A' },
  { name: 'Brown', hex: '#8D6E63' },
];

const SHAPES: ShapeItem[] = [
  { name: 'Circle', emoji: '🔴' },
  { name: 'Triangle', emoji: '🔺' },
  { name: 'Square', emoji: '🟩' },
  { name: 'Star', emoji: '⭐️' },
  { name: 'Diamond', emoji: '🔶' },
  { name: 'Heart', emoji: '❤️' },
  { name: 'Moon', emoji: '🌙' },
  { name: 'Cross', emoji: '➕' },
];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());
const numChoices = (level: number) => Math.min(3 + Math.floor(level / 5), 6);

type GameMode = 'color' | 'shape_color' | 'pattern_color' | 'pattern_shape';

interface Choice {
  id: string;
  text: string;
  hex: string;
  emoji: string;
  isShapeColor?: boolean;
}

interface Question {
  mode: GameMode;
  promptText: string;
  targetHex: string;
  targetEmoji: string;
  choices: Choice[];
  pattern: Choice[]; // hex sequence for pattern mode
}

function makeQuestion(level: number): Question {
  const choicesCount = numChoices(level);
  const colorPool = shuffle(PALETTE);
  const shapePool = shuffle(SHAPES);

  let mode: GameMode = 'color';
  if (level <= 5) {
    mode = level >= 4 ? 'pattern_color' : 'color';
  } else if (level <= 10) {
    mode = level >= 8 ? 'pattern_color' : 'shape_color';
  } else if (level <= 15) {
    mode = level >= 13 ? 'pattern_shape' : 'shape_color';
  } else {
    mode = Math.random() > 0.5 ? 'pattern_shape' : 'shape_color';
  }

  if (mode === 'color') {
    const target = colorPool[0];
    const distractors = colorPool.filter(c => c.hex !== target.hex).slice(0, choicesCount - 1);
    const finalChoices = shuffle([target, ...distractors]).map(c => ({
      id: c.hex,
      text: c.name,
      hex: c.hex,
      emoji: '■',
    }));

    return {
      mode,
      promptText: `Tap the ${target.name} box!`,
      targetHex: target.hex,
      targetEmoji: '',
      choices: finalChoices,
      pattern: [],
    };
  }

  if (mode === 'shape_color') {
    const targetColor = colorPool[0];
    const targetShape = shapePool[0];
    
    // Choose distractors: mix matching color/diff shape or diff color/matching shape
    const finalChoices: Choice[] = [];
    finalChoices.push({
      id: `${targetShape.name}_${targetColor.hex}`,
      text: `${targetColor.name} ${targetShape.name}`,
      hex: targetColor.hex,
      emoji: targetShape.emoji,
      isShapeColor: true,
    });

    const otherColors = colorPool.filter(c => c.hex !== targetColor.hex);
    const otherShapes = shapePool.filter(s => s.name !== targetShape.name);

    let guard = 0;
    while (finalChoices.length < choicesCount && guard < 30) {
      guard++;
      const randColor = Math.random() > 0.5 ? targetColor : otherColors[guard % otherColors.length];
      const randShape = randColor.hex === targetColor.hex ? otherShapes[guard % otherShapes.length] : shapePool[guard % shapePool.length];
      const id = `${randShape.name}_${randColor.hex}`;
      if (!finalChoices.some(c => c.id === id)) {
        finalChoices.push({
          id,
          text: `${randColor.name} ${randShape.name}`,
          hex: randColor.hex,
          emoji: randShape.emoji,
          isShapeColor: true,
        });
      }
    }

    return {
      mode,
      promptText: `Find the ${targetColor.name} ${targetShape.name}!`,
      targetHex: targetColor.hex,
      targetEmoji: targetShape.emoji,
      choices: shuffle(finalChoices),
      pattern: [],
    };
  }

  if (mode === 'pattern_color') {
    // ABAB or ABCABC patterns
    const isABC = level >= 8;
    const base = colorPool.slice(0, isABC ? 3 : 2);
    const reps = 2;
    const patternList: Choice[] = [];
    for (let r = 0; r < reps; r++) {
      base.forEach(b => {
        patternList.push({ id: b.hex, text: b.name, hex: b.hex, emoji: '■' });
      });
    }
    const answer = base[patternList.length % base.length];
    const distractors = colorPool.filter(c => c.hex !== answer.hex).slice(0, choicesCount - 1);
    const finalChoices = shuffle([answer, ...distractors]).map(c => ({
      id: c.hex,
      text: c.name,
      hex: c.hex,
      emoji: '■',
    }));

    return {
      mode,
      promptText: 'What color comes next in the pattern?',
      targetHex: answer.hex,
      targetEmoji: '',
      choices: finalChoices,
      pattern: patternList,
    };
  }

  // mode === 'pattern_shape'
  // Shape pattern: e.g. 🔺, 🔵, 🔺, ?
  const isABC = level >= 15;
  const base = shapePool.slice(0, isABC ? 3 : 2);
  const color = colorPool[0]; // keep color constant so they focus on shape
  const reps = 2;
  const patternList: Choice[] = [];
  for (let r = 0; r < reps; r++) {
    base.forEach(b => {
      patternList.push({ id: b.name, text: b.name, hex: color.hex, emoji: b.emoji });
    });
  }
  const answer = base[patternList.length % base.length];
  const distractors = shapePool.filter(s => s.name !== answer.name).slice(0, choicesCount - 1);
  const finalChoices = shuffle([answer, ...distractors]).map(s => ({
    id: s.name,
    text: s.name,
    hex: color.hex,
    emoji: s.emoji,
  }));

  return {
    mode,
    promptText: 'What shape comes next in the pattern?',
    targetHex: color.hex,
    targetEmoji: answer.emoji,
    choices: finalChoices,
    pattern: patternList,
  };
}

export const ColorsGame: React.FC<ColorsGameProps> = ({ onBack }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.colors);

  const session = useGameSession({ gameId: 'colors', startLevel: 1 });
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(1));
  const [locked, setLocked] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('thinking');
  const [mascotMsg, setMascotMsg] = useState('Find the color!');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!started) return;
    const q = makeQuestion(session.level);
    setQuestion(q);
    setLocked(false);
    setPickedId(null);
    setMascotExpr('thinking');
    setMascotMsg(q.promptText);
  }, [session.round, session.level, started]);

  const handlePick = useCallback(
    (choice: Choice) => {
      if (locked) return;
      setPickedId(choice.id);

      let correct = false;
      if (question.mode === 'color' || question.mode === 'pattern_color') {
        correct = choice.hex === question.targetHex;
      } else if (question.mode === 'shape_color') {
        correct = choice.hex === question.targetHex && choice.emoji === question.targetEmoji;
      } else { // pattern_shape
        correct = choice.emoji === question.targetEmoji;
      }

      session.recordAnswer(correct, 1);
      if (correct) {
        setLocked(true);
        setMascotExpr('cheering');
        setMascotMsg("Beautiful! That's correct! ⭐");
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
          body="Identify colors and complete shape patterns! Levels 1-5 build basic matching. Levels 6-15 test shape + color combinations and ABC patterns. Advanced levels 16-20 challenge you with complex double-attribute patterns!"
          themeColor={COLORS.colors}
          onStart={() => setStarted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameHeader
        title="Colors & Shapes"
        themeColor={COLORS.colors}
        stars={session.stars}
        onBack={onBack}
        onPause={() => setPaused(true)}
      />
      <Celebration trigger={session.correctPulse} />
      <PauseMenu
        visible={paused}
        themeColor={COLORS.colors}
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
          <SessionBar session={session} themeColor={COLORS.colors} />

          <View style={styles.promptArea}>
            {question.pattern.length > 0 ? (
              <View style={styles.patternCard}>
                {question.pattern.map((p, i) => (
                  <View
                    key={i}
                    style={[
                      styles.patternItem,
                      { backgroundColor: p.hex, borderColor: COLORS.border },
                    ]}
                  >
                    <Text style={styles.patternEmoji}>{p.emoji === '■' ? '' : p.emoji}</Text>
                  </View>
                ))}
                <View style={[styles.patternItem, styles.patternTarget]}>
                  <Text style={styles.targetText}>?</Text>
                </View>
              </View>
            ) : (
              <View style={styles.singlePromptCard}>
                {question.targetEmoji ? (
                  <Text style={styles.promptEmoji}>{question.targetEmoji}</Text>
                ) : (
                  <View style={[styles.colorBlock, { backgroundColor: question.targetHex }]} />
                )}
              </View>
            )}
          </View>

          <View style={styles.choices}>
            {question.choices.map(choice => {
              const isPicked = pickedId === choice.id;
              
              let isAnswer = false;
              if (question.mode === 'color' || question.mode === 'pattern_color') {
                isAnswer = choice.hex === question.targetHex;
              } else if (question.mode === 'shape_color') {
                isAnswer = choice.hex === question.targetHex && choice.emoji === question.targetEmoji;
              } else {
                isAnswer = choice.emoji === question.targetEmoji;
              }

              const showCorrect = locked && isAnswer;
              const showWrong = isPicked && !isAnswer;

              return (
                <TouchableOpacity
                  key={choice.id}
                  style={[
                    styles.choiceCard,
                    choice.isShapeColor ? styles.shapeColorCard : { backgroundColor: choice.hex },
                    showCorrect && styles.correctCard,
                    showWrong && styles.wrongCard,
                  ]}
                  onPress={() => handlePick(choice)}
                  accessibilityRole="button"
                  accessibilityLabel={choice.text}
                >
                  {choice.isShapeColor ? (
                    <View style={styles.shapeColorContainer}>
                      <Text style={styles.choiceEmoji}>{choice.emoji}</Text>
                      <Text style={[styles.choiceSubText, { color: choice.hex }]}>{choice.text.split(' ')[0]}</Text>
                    </View>
                  ) : (
                    <Text style={styles.choiceEmoji}>{choice.emoji === '■' ? '' : choice.emoji}</Text>
                  )}
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
  promptArea: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patternItem: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternEmoji: { fontSize: 24 },
  patternTarget: {
    borderColor: COLORS.colors,
    borderStyle: 'dashed',
    backgroundColor: '#FFF',
  },
  targetText: { fontSize: 24, fontWeight: 'bold', color: COLORS.colors },
  singlePromptCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptEmoji: { fontSize: 64 },
  colorBlock: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  choiceCard: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  shapeColorCard: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  shapeColorContainer: {
    alignItems: 'center',
  },
  choiceEmoji: { fontSize: 36 },
  choiceSubText: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  correctCard: {
    borderColor: COLORS.success,
    borderWidth: 4,
  },
  wrongCard: {
    borderColor: COLORS.secondary,
    borderWidth: 4,
  },
});
