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

interface LettersGameProps {
  onBack: () => void;
  initialLevel?: number;
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
    wordTemplate = '_ '.repeat(target.word.length).trim();
    distractorsPool = PHONICS.filter(p => p.letter !== target.letter).map(p => p.letter);
  } else if (mode === 'start_lower') {
    answer = target.letter.toLowerCase();
    wordTemplate = '_ '.repeat(target.word.length).trim();
    distractorsPool = PHONICS.filter(p => p.letter !== target.letter).map(p =>
      p.letter.toLowerCase(),
    );
  } else if (mode === 'fill_start') {
    answer = target.letter;
    wordTemplate = '_ ' + target.word.substring(1).toUpperCase();
    distractorsPool = PHONICS.filter(p => p.letter !== target.letter).map(p => p.letter);
  } else {
    const word = target.word.toUpperCase();
    const midIdx = Math.floor(word.length / 2);
    answer = word[midIdx];
    wordTemplate = word.substring(0, midIdx) + ' _ ' + word.substring(midIdx + 1);
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

export const LettersGame: React.FC<LettersGameProps> = ({ onBack, initialLevel = 1 }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.letters);

  const session = useGameSession({ gameId: 'letters', startLevel: initialLevel });
  const handleUnlockDifficulty = useUnlockDifficulty('letters');
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(initialLevel));
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('thinking');
  const [mascotMsg, setMascotMsg] = useState('Which letter makes this sound?');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!started) return;
    const q = makeQuestion(session.level);
    setQuestion(q);
    setLocked(false);
    setPicked(null);
    setMascotExpr('thinking');
    setMascotMsg('Look at the picture. Which letter fits?');
    SoundService.speak(`Find the missing letter for ${q.prompt.word}`);
  }, [session.round, session.level, started]);

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
      <div className="bt-game-screen">
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
          onUnlockDifficulty={handleUnlockDifficulty}
        />
        <TutorialCard
          title="Letters & Phonics 🅰"
          body="Complete spelling and phonics puzzles! Levels 1-10 match starting letters (uppercase and lowercase). Levels 11-20 test advanced spelling, fill-in-the-blanks, and phonics blend recognition!"
          themeColor={COLORS.letters}
          onStart={() => setStarted(true)}
        />
      </div>
    );
  }

  return (
    <div className="bt-game-screen">
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
      <div className="bt-game-content">
        <Mascot expression={mascotExpr} message={mascotMsg} size={100} />
        <GameBody>
          <SessionBar session={session} themeColor={COLORS.letters} />

          <div className="bt-prompt-box">
            <div style={{ fontSize: 72, lineHeight: 1.1 }}>{question.prompt.emoji}</div>
            {locked ? (
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginTop: 8,
                  letterSpacing: 2,
                }}
              >
                {question.prompt.word.toUpperCase()}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: COLORS.letters,
                  marginTop: 8,
                  letterSpacing: 4,
                }}
              >
                {question.wordTemplate}
              </div>
            )}
          </div>

          <div className="bt-choices-grid">
            {question.choices.map(letter => {
              const isPicked = picked === letter;
              const isAnswer = letter === question.answer;
              const showCorrect = locked && isAnswer;
              const showWrong = isPicked && !isAnswer;
              return (
                <button
                  type="button"
                  key={letter}
                  className={`bt-choice-btn ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                  style={{
                    width: 60,
                    height: 60,
                    borderColor: COLORS.letters,
                    color: COLORS.letters,
                    fontSize: 28,
                  }}
                  onClick={() => handlePick(letter)}
                  aria-label={`Letter ${letter}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </GameBody>
      </div>
    </div>
  );
};
