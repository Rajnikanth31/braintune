import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
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
  TutorialCard,
} from '../shared/GameShell';

const { width } = Dimensions.get('window');

interface MemoryGameProps {
  onBack: () => void;
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
const ATTENTION_EMOJIS = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍊', '🍒', '🥝', '🥥', '🍑', '🍐'];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());
// Pairs/items scale Basic -> Master.
const pairsForLevel = (level: number) => Math.min(1 + level, MEMORY_EMOJIS.length);
const itemsForLevel = (level: number) => Math.min(2 + level, ATTENTION_EMOJIS.length);

export const MemoryGame: React.FC<MemoryGameProps> = ({ onBack }) => {
  const { activeStats } = useApp();
  const unlocked = highestUnlockedLevel(activeStats?.memory);

  const session = useGameSession({ gameId: 'memory', startLevel: 1 });
  const [started, setStarted] = useState(false);
  const [gameSubMode, setGameSubMode] = useState<'match' | 'attention'>('match');

  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('happy');
  const [mascotMsg, setMascotMsg] = useState('Let\'s train your focus!');

  // Match mode
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [lockBoard, setLockBoard] = useState(false);
  const [boardCols, setBoardCols] = useState(2);
  const [previewing, setPreviewing] = useState(false);

  // Attention mode
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [targetEmoji, setTargetEmoji] = useState('');

  const flipAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending peek timer on unmount.
  useEffect(() => () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
  }, []);

  const initializeMatchGame = useCallback(() => {
    const numPairs = pairsForLevel(session.level);
    setBoardCols(numPairs <= 2 ? 2 : 3);
    const selectedEmojis = shuffle(MEMORY_EMOJIS).slice(0, numPairs);
    const shuffled = shuffle([...selectedEmojis, ...selectedEmojis]).map(
      (emoji, index) => {
        const id = `card_${index}_${Date.now()}_${Math.random()}`;
        flipAnims[id] = new Animated.Value(0);
        return { id, emoji, isFlipped: false, isMatched: false };
      },
    );
    setCards(shuffled);
    setSelectedIndices([]);

    // PEEK PHASE: reveal every card, let the child memorize, then hide them.
    setPreviewing(true);
    setLockBoard(true);
    setMascotExpr('thinking');
    setMascotMsg('👀 Peek! Remember where the pairs are…');
    shuffled.forEach(c =>
      Animated.timing(flipAnims[c.id], {
        toValue: 180,
        duration: 250,
        useNativeDriver: true,
      }).start(),
    );
    const peekMs = 1000 + numPairs * 350; // longer peek for harder boards
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      shuffled.forEach(c =>
        Animated.timing(flipAnims[c.id], {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(),
      );
      setPreviewing(false);
      setLockBoard(false);
      setMascotExpr('happy');
      setMascotMsg(`Now match all ${numPairs} pairs!`);
    }, peekMs);
  }, [session.level, flipAnims]);

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

  // Rebuild the board only at round boundaries / mode switches, so adaptive
  // level changes mid-round never yank the board out from under the player.
  useEffect(() => {
    if (!started) return;
    if (gameSubMode === 'match') initializeMatchGame();
    else initializeAttentionGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.round, gameSubMode, started]);

  const handleCardPress = (index: number) => {
    if (lockBoard || cards[index].isFlipped || cards[index].isMatched) return;

    const updated = cards.map((c, i) =>
      i === index ? { ...c, isFlipped: true } : c,
    );
    setCards(updated);
    Animated.timing(flipAnims[cards[index].id], {
      toValue: 180,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);

    if (newSelected.length === 2) {
      setLockBoard(true);
      const [firstIdx, secondIdx] = newSelected;
      const isMatch = cards[firstIdx].emoji === cards[secondIdx].emoji;
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
          Animated.parallel([
            Animated.timing(flipAnims[cards[firstIdx].id], {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(flipAnims[cards[secondIdx].id], {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setSelectedIndices([]);
            setLockBoard(false);
          });
        }, 1000);
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

  const renderCardItem = ({ item, index }: { item: Card; index: number }) => {
    const anim = flipAnims[item.id];
    const rotateY = anim
      ? anim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] })
      : '0deg';
    const rotateYBack = anim
      ? anim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] })
      : '180deg';
    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => handleCardPress(index)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={item.isFlipped || item.isMatched ? item.emoji : 'Hidden card'}
      >
        <Animated.View
          style={[
            styles.cardSide,
            styles.cardBack,
            { transform: [{ rotateY: rotateYBack }] },
            item.isMatched ? styles.cardMatched : null,
          ]}
        >
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
        </Animated.View>
        <Animated.View
          style={[styles.cardSide, styles.cardFront, { transform: [{ rotateY }] }]}
        >
          <Text style={styles.cardQuestion}>?</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  if (session.isComplete) {
    return (
      <View style={styles.container}>
        <GameHeader title="Memory & Attention" themeColor={COLORS.memory} stars={session.stars} onBack={onBack} />
        <GameSuccess
          session={session}
          themeColor={COLORS.memory}
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
        <GameHeader title="Memory & Attention" themeColor={COLORS.memory} stars={0} onBack={onBack} />
        <LevelPicker
          maxLevel={MAX_LEVEL}
          unlocked={unlocked}
          selected={session.level}
          themeColor={COLORS.memory}
          onSelect={session.setLevel}
        />
        <TutorialCard
          title="Memory & Attention 🃏"
          body="First all the cards show for a quick peek — memorize them! Then they hide and you find the matching pairs. Or switch to Spot the Target. More cards appear as you level up!"
          themeColor={COLORS.memory}
          onStart={() => setStarted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameHeader title="Memory & Attention" themeColor={COLORS.memory} stars={session.stars} onBack={onBack} />
      <Celebration trigger={session.correctPulse} />
      <View style={styles.gameContent}>
        <Mascot expression={mascotExpr} message={mascotMsg} size={100} />

        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.tab, gameSubMode === 'match' ? styles.activeTab : null]}
            onPress={() => setGameSubMode('match')}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, gameSubMode === 'match' ? styles.activeTabText : null]}>
              Find Pairs 🃏
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, gameSubMode === 'attention' ? styles.activeTab : null]}
            onPress={() => setGameSubMode('attention')}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, gameSubMode === 'attention' ? styles.activeTabText : null]}>
              Spot the Target 🔍
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.boardWrapper}>
          <SessionBar session={session} themeColor={COLORS.memory} />
          {gameSubMode === 'match' && previewing && (
            <View style={styles.peekBanner}>
              <Text style={styles.peekText}>👀 Memorize the cards!</Text>
            </View>
          )}
          {gameSubMode === 'match' ? (
            <FlatList
              data={cards}
              renderItem={renderCardItem}
              keyExtractor={item => item.id}
              numColumns={boardCols}
              key={`match_list_${boardCols}`}
              contentContainerStyle={styles.gridContainer}
            />
          ) : (
            <View style={styles.attentionGrid}>
              {attentionItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.attentionItemCard}
                  onPress={() => handleAttentionPress(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.emoji}
                >
                  <Text style={styles.attentionEmoji}>{item.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gameContent: { flex: 1, padding: 16, alignItems: 'center' },
  modeTabs: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: COLORS.background, borderBottomWidth: 3, borderBottomColor: COLORS.memory },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  activeTabText: { color: COLORS.text, fontWeight: 'bold' },
  boardWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 16,
    ...SHADOWS.medium,
  },
  peekBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  peekText: { fontSize: 14, fontWeight: 'bold', color: COLORS.secondary },
  gridContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  cardContainer: {
    width: (width - 90) / 3,
    height: (width - 90) / 3,
    margin: 8,
    position: 'relative',
    maxWidth: 100,
    maxHeight: 100,
  },
  cardSide: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    borderWidth: 2,
    ...SHADOWS.small,
  },
  cardFront: { backgroundColor: COLORS.primary, borderColor: '#4A90E2' },
  cardBack: { backgroundColor: COLORS.cardBackground, borderColor: COLORS.memory },
  cardQuestion: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  cardEmoji: { fontSize: 38 },
  cardMatched: { backgroundColor: COLORS.correctGreen, borderColor: COLORS.success },
  attentionGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: 16,
  },
  attentionItemCard: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  attentionEmoji: { fontSize: 40 },
});
