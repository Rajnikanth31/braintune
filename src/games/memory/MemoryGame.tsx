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
  PauseMenu,
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
const ATTENTION_EMOJIS = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍊', '🍒', '🥝', '🥥', '🍑', '🍐', '🍔', '🍕', '🍩', '🍪', '🎈', '🎁', '🎈', '🎨', '🧸', '🎺', '🎸', '✈️'];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());

// Scale pairs and attention items up to 20 levels
const pairsForLevel = (level: number) => {
  if (level <= 5) return 1 + level; // L1=2..L5=6 pairs
  if (level <= 10) return 6; // L6-10=6 pairs
  if (level <= 15) return 8; // L11-15=8 pairs
  return Math.min(8 + (level - 15) * 2, MEMORY_EMOJIS.length); // L16-20=10..12 pairs
};

const itemsForLevel = (level: number) => {
  if (level <= 5) return 3 + level; // L1=4..L5=8 items
  if (level <= 10) return 8 + (level - 5); // L6-10=9..13 items
  if (level <= 15) return 13 + (level - 10); // L11-15=14..18 items
  return Math.min(18 + (level - 15), ATTENTION_EMOJIS.length); // L16-20=19..24 items
};

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
  const [paused, setPaused] = useState(false);

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
    
    // Choose columns dynamically based on number of cards
    if (numPairs <= 2) setBoardCols(2);
    else if (numPairs <= 4) setBoardCols(3);
    else if (numPairs <= 8) setBoardCols(4);
    else setBoardCols(5);

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

  // Calculate card sizing dynamically so they fit on all device dimensions
  const getCardSize = () => {
    const horizontalPadding = 48;
    const spacing = 16;
    const availableWidth = width - horizontalPadding - ((boardCols - 1) * spacing);
    return Math.min(availableWidth / boardCols, 84); // cap max card size
  };

  const renderCardItem = ({ item, index }: { item: Card; index: number }) => {
    const anim = flipAnims[item.id];
    const rotateY = anim
      ? anim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] })
      : '0deg';
    const rotateYBack = anim
      ? anim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] })
      : '180deg';

    const cardSideSize = getCardSize();

    return (
      <TouchableOpacity
        style={[styles.cardContainer, { width: cardSideSize, height: cardSideSize }]}
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
          <Text style={[styles.cardEmoji, { fontSize: cardSideSize * 0.45 }]}>{item.emoji}</Text>
        </Animated.View>
        <Animated.View
          style={[styles.cardSide, styles.cardFront, { transform: [{ rotateY }] }]}
        >
          <Text style={[styles.cardQuestion, { fontSize: cardSideSize * 0.4 }]}>?</Text>
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
          body="First, all the cards show for a quick peek — memorize them! Then they hide and you find the matching pairs. Or switch to Spot the Target. Grids grow up to 5x6 for a legendary advanced challenge!"
          themeColor={COLORS.memory}
          onStart={() => setStarted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      <View style={styles.gameContent}>
        <Mascot expression={mascotExpr} message={mascotMsg} size={90} />

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
            <ScrollView contentContainerStyle={styles.attentionScroll}>
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
            </ScrollView>
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
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: COLORS.background, borderBottomWidth: 3, borderBottomColor: COLORS.memory },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
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
  peekText: { fontSize: 13, fontWeight: 'bold', color: COLORS.secondary },
  gridContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  cardContainer: {
    margin: 6,
    position: 'relative',
  },
  cardSide: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    borderWidth: 2,
    ...SHADOWS.small,
  },
  cardFront: { backgroundColor: COLORS.primary, borderColor: '#4A90E2' },
  cardBack: { backgroundColor: COLORS.cardBackground, borderColor: COLORS.memory },
  cardQuestion: { fontWeight: 'bold', color: '#FFF' },
  cardEmoji: {},
  cardMatched: { backgroundColor: COLORS.correctGreen, borderColor: COLORS.success },
  attentionScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  attentionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  attentionItemCard: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  attentionEmoji: { fontSize: 32 },
});
