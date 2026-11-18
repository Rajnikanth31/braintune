import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TutorialCard,
  PauseMenu,
} from '../shared/GameShell';

interface MemoryGameProps {
  onBack: () => void;
  initialLevel?: number;
}

interface Card {
  id: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface AttentionItem {
  id: string;
  emoji: string;
  isTarget: boolean;
}

const MEMORY_EMOJIS = ['🐶', '🐱', '🐸', '🐼', '🦁', '🐨', '🦊', '🐰', '🐵', '🐯', '🐧', '🐙'];
const ATTENTION_EMOJIS = [
  '🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍊', '🍒',
  '🥝', '🥥', '🍑', '🍐', '🍔', '🍕', '🍩', '🍪',
  '🎈', '🎁', '🌈', '🎨', '🧸', '🎺', '🎸', '✈️',
];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());

const pairsForLevel = (level: number) => {
  if (level <= 5) return 1 + level;
  if (level <= 10) return 6;
  if (level <= 15) return 8;
  return Math.min(8 + (level - 15) * 2, MEMORY_EMOJIS.length);
};

const itemsForLevel = (level: number) => {
  if (level <= 5) return 3 + level;
  if (level <= 10) return 8 + (level - 5);
  if (level <= 15) return 13 + (level - 10);
  return Math.min(18 + (level - 15), ATTENTION_EMOJIS.length);
};

export const MemoryGame: React.FC<MemoryGameProps> = ({ onBack, initialLevel = 1 }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.memory);

  const session = useGameSession({ gameId: 'memory', startLevel: initialLevel, adaptive: false });
  const handleUnlockDifficulty = useUnlockDifficulty('memory');
  const [started, setStarted] = useState(false);
  const [gameSubMode, setGameSubMode] = useState<'match' | 'attention'>('match');

  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('happy');
  const [mascotMsg, setMascotMsg] = useState("Let's train your focus!");

  const [cards, setCards] = useState<Card[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [lockBoard, setLockBoard] = useState(false);
  const [boardCols, setBoardCols] = useState(2);
  const [previewing, setPreviewing] = useState(false);
  const [paused, setPaused] = useState(false);

  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [targetEmoji, setTargetEmoji] = useState('');

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    [],
  );

  const initializeMatchGame = useCallback(() => {
    const numPairs = pairsForLevel(session.level);

    if (numPairs <= 2) setBoardCols(2);
    else if (numPairs <= 4) setBoardCols(3);
    else if (numPairs <= 8) setBoardCols(4);
    else setBoardCols(5);

    const selectedEmojis = shuffle(MEMORY_EMOJIS).slice(0, numPairs);
    const shuffled = shuffle([...selectedEmojis, ...selectedEmojis]).map((emoji, index) => ({
      id: `card_${index}_${Date.now()}_${Math.random()}`,
      emoji,
      isFlipped: true,
      isMatched: false,
    }));
    setCards(shuffled);
    setSelectedIndices([]);

    setPreviewing(true);
    setLockBoard(true);
    setMascotExpr('thinking');
    setMascotMsg('👀 Peek! Remember where the pairs are…');
    SoundService.speak('Peek! Remember where the pairs are!');

    const peekMs = 1000 + numPairs * 350;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      setCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
      setPreviewing(false);
      setLockBoard(false);
      setMascotExpr('happy');
      setMascotMsg(`Now match all ${numPairs} pairs!`);
    }, peekMs);
  }, [session.level]);

  const initializeAttentionGame = useCallback(() => {
    const numItems = itemsForLevel(session.level);
    const selectedEmojis = shuffle(ATTENTION_EMOJIS).slice(0, numItems);
    const targetIdx = Math.floor(Math.random() * numItems);
    setTargetEmoji(selectedEmojis[targetIdx]);
    setAttentionItems(
      selectedEmojis.map((emoji, index) => ({
        id: `item_${index}_${Date.now()}_${Math.random()}`,
        emoji,
        isTarget: index === targetIdx,
      })),
    );
    setMascotExpr('thinking');
    setMascotMsg(`Find and tap the ${selectedEmojis[targetIdx]}!`);
  }, [session.level]);

  useEffect(() => {
    if (!started) return;
    if (gameSubMode === 'match') initializeMatchGame();
    else initializeAttentionGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.round, gameSubMode, started]);

  const handleCardPress = (index: number) => {
    if (lockBoard || cards[index].isFlipped || cards[index].isMatched) return;

    const updated = cards.map((c, i) => (i === index ? { ...c, isFlipped: true } : c));
    setCards(updated);

    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);

    if (newSelected.length === 2) {
      setLockBoard(true);
      const [firstIdx, secondIdx] = newSelected;
      const isMatch = updated[firstIdx].emoji === updated[secondIdx].emoji;
      session.recordAnswer(isMatch, 1);

      if (isMatch) {
        setTimeout(() => {
          const matched = updated.map((c, i) =>
            i === firstIdx || i === secondIdx ? { ...c, isMatched: true } : c,
          );
          setCards(matched);
          setSelectedIndices([]);
          setLockBoard(false);
          setMascotExpr('cheering');
          setMascotMsg('Great match! ⭐');
          if (matched.every(c => c.isMatched)) {
            setTimeout(() => session.completeRound(), 800);
          }
        }, 500);
      } else {
        setMascotExpr('neutral');
        setMascotMsg('Not a match — try again!');
        setTimeout(() => {
          setCards(prev =>
            prev.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c,
            ),
          );
          setSelectedIndices([]);
          setLockBoard(false);
        }, 900);
      }
    }
  };

  const handleAttentionPress = (item: AttentionItem) => {
    session.recordAnswer(item.isTarget, 1);
    if (item.isTarget) {
      setMascotExpr('cheering');
      setMascotMsg('You found it! Great focus! ⭐');
      setTimeout(() => session.completeRound(), 900);
    } else {
      setMascotExpr('neutral');
      setMascotMsg(`Not that one — keep looking for the ${targetEmoji}`);
    }
  };

  const cardSize = boardCols >= 5 ? 64 : boardCols === 4 ? 72 : 84;

  if (session.isComplete) {
    return (
      <div className="bt-game-screen">
        <GameHeader
          title="Memory & Attention"
          themeColor={COLORS.memory}
          stars={session.stars}
          onBack={onBack}
        />
        <GameSuccess
          session={session}
          themeColor={COLORS.memory}
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
          title="Memory & Attention"
          themeColor={COLORS.memory}
          stars={0}
          onBack={onBack}
        />
        <LevelPicker
          maxLevel={MAX_LEVEL}
          unlocked={unlocked}
          selected={session.level}
          themeColor={COLORS.memory}
          onSelect={session.setLevel}
          onUnlockDifficulty={handleUnlockDifficulty}
        />
        <TutorialCard
          title="Memory & Attention 🃏"
          body="First, all the cards show for a quick peek — memorize them! Then they hide and you find the matching pairs. Or switch to Spot the Target. Grids grow up to 5x6 for a legendary advanced challenge!"
          themeColor={COLORS.memory}
          onStart={() => setStarted(true)}
        />
      </div>
    );
  }

  return (
    <div className="bt-game-screen">
      <GameHeader
        title="Memory & Attention"
        themeColor={COLORS.memory}
        stars={session.stars}
        onBack={onBack}
        onPause={() => setPaused(true)}
      />
      <Celebration trigger={session.correctPulse} />
      <PauseMenu
        visible={paused}
        themeColor={COLORS.memory}
        onResume={() => setPaused(false)}
        onRestart={() => {
          setPaused(false);
          session.restart();
        }}
        onExit={onBack}
      />
      <div className="bt-game-content">
        <Mascot expression={mascotExpr} message={mascotMsg} size={90} />

        <div className="bt-mode-tabs">
          <button
            type="button"
            className={`bt-mode-tab ${gameSubMode === 'match' ? 'active' : ''}`}
            onClick={() => {
              SoundService.playClick();
              setGameSubMode('match');
            }}
          >
            Find Pairs 🃏
          </button>
          <button
            type="button"
            className={`bt-mode-tab ${gameSubMode === 'attention' ? 'active' : ''}`}
            onClick={() => {
              SoundService.playClick();
              setGameSubMode('attention');
            }}
          >
            Spot the Target 🔍
          </button>
        </div>

        <div className="bt-board-wrapper">
          <SessionBar session={session} themeColor={COLORS.memory} />
          {gameSubMode === 'match' && previewing && (
            <div
              style={{
                backgroundColor: '#FFF3E0',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--secondary)',
              }}
            >
              👀 Memorize the cards!
            </div>
          )}

          {gameSubMode === 'match' ? (
            <div
              className="bt-memory-grid"
              style={{ gridTemplateColumns: `repeat(${boardCols}, ${cardSize}px)` }}
            >
              {cards.map((item, index) => {
                const flipped = item.isFlipped || item.isMatched;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className="bt-memory-card"
                    style={{ width: cardSize, height: cardSize }}
                    onClick={() => handleCardPress(index)}
                    aria-label={flipped ? item.emoji : 'Hidden card'}
                  >
                    <div className={`bt-memory-card-inner ${flipped ? 'flipped' : ''}`}>
                      <div
                        className="bt-card-face bt-card-front"
                        style={{ fontSize: cardSize * 0.4 }}
                      >
                        ?
                      </div>
                      <div
                        className={`bt-card-face bt-card-back ${item.isMatched ? 'matched' : ''}`}
                        style={{ fontSize: cardSize * 0.48 }}
                      >
                        {item.emoji}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 12,
                padding: '8px 0',
              }}
            >
              {attentionItems.map(item => (
                <button
                  type="button"
                  key={item.id}
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: 'var(--bg)',
                    border: '2px solid var(--border)',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  onClick={() => handleAttentionPress(item)}
                  aria-label={item.emoji}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
