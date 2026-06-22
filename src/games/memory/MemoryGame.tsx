import React, { useState, useEffect, useRef } from 'react';
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

const MEMORY_EMOJIS = ['🐶', '🐱', '🐸', '🐼', '🦁', '🐨', '🦊', '🐰'];
const ATTENTION_EMOJIS = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍊', '🍒'];

export const MemoryGame: React.FC<MemoryGameProps> = ({ onBack }) => {
  const { activeProfile, updateGameResult } = useApp();

  // Game configuration & state
  const [gameSubMode, setGameSubMode] = useState<'match' | 'attention'>('match');
  const [difficulty, setDifficulty] = useState<number>(1);
  const [streak, setStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Mascot state
  const [mascotExpr, setMascotExpr] = useState<MascotExpression>('happy');
  const [mascotMsg, setMascotMsg] = useState<string>('Hi there! Let\'s play a focus game!');

  // Match Mode state
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [lockBoard, setLockBoard] = useState<boolean>(false);

  // Attention Mode state
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [targetEmoji, setTargetEmoji] = useState<string>('');

  // General session state
  const [starsEarned, setStarsEarned] = useState<number>(0);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [roundNumber, setRoundNumber] = useState<number>(1);

  // Animated values for card flips
  const flipAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Initialize a new round
  useEffect(() => {
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSubMode, difficulty]);

  const startNewRound = () => {
    setSelectedIndices([]);
    setLockBoard(false);
    
    if (gameSubMode === 'match') {
      initializeMatchGame();
    } else {
      initializeAttentionGame();
    }
  };

  // Match Game initialization
  const initializeMatchGame = () => {
    // Number of pairs based on difficulty
    // Level 1: 2 pairs (4 cards)
    // Level 2: 3 pairs (6 cards)
    // Level 3: 4 pairs (8 cards)
    const numPairs = difficulty === 1 ? 2 : difficulty === 2 ? 3 : 4;
    
    // Select subset of emojis
    const selectedEmojis = [...MEMORY_EMOJIS]
      .sort(() => 0.5 - Math.random())
      .slice(0, numPairs);

    // Duplicate emojis to make pairs
    const doubleEmojis = [...selectedEmojis, ...selectedEmojis];
    
    // Shuffle cards
    const shuffled = doubleEmojis
      .sort(() => 0.5 - Math.random())
      .map((emoji, index) => {
        const id = `card_${index}_${Date.now()}`;
        flipAnims[id] = new Animated.Value(0);
        return {
          id,
          emoji,
          isFlipped: false,
          isMatched: false,
        };
      });

    setCards(shuffled);
    setMascotExpr('happy');
    setMascotMsg(`Can you match all ${numPairs * 2} cards?`);
  };

  // Attention Game initialization
  const initializeAttentionGame = () => {
    // Number of items: Level 1 (3 items), Level 2 (6 items), Level 3 (9 items)
    const numItems = difficulty === 1 ? 3 : difficulty === 2 ? 6 : 8;
    
    // Select subset of emojis
    const selectedEmojis = [...ATTENTION_EMOJIS]
      .sort(() => 0.5 - Math.random())
      .slice(0, numItems);

    // Set one item as the target
    const targetIdx = Math.floor(Math.random() * numItems);
    const target = selectedEmojis[targetIdx];
    setTargetEmoji(target);

    const items = selectedEmojis.map((emoji, index) => ({
      id: `item_${index}_${Date.now()}`,
      emoji,
      isTarget: index === targetIdx,
    }));

    setAttentionItems(items);
    setMascotExpr('thinking');
    setMascotMsg(`Find and tap the ${target}!`);
  };

  // Handle Card Click (Match Mode)
  const handleCardPress = (index: number) => {
    if (lockBoard || cards[index].isFlipped || cards[index].isMatched) return;

    setTotalCount(prev => prev + 1);

    // Flip card
    const updatedCards = [...cards];
    updatedCards[index].isFlipped = true;
    setCards(updatedCards);

    // Animate Flip
    Animated.timing(flipAnims[updatedCards[index].id], {
      toValue: 180,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);

    // Check match if 2 cards are selected
    if (newSelected.length === 2) {
      setLockBoard(true);
      const [firstIdx, secondIdx] = newSelected;

      if (cards[firstIdx].emoji === cards[secondIdx].emoji) {
        // MATCH SUCCESS
        setCorrectCount(prev => prev + 2);
        setStreak(prev => prev + 1);
        setStarsEarned(prev => prev + 1);

        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[firstIdx].isMatched = true;
          matchedCards[secondIdx].isMatched = true;
          setCards(matchedCards);
          setSelectedIndices([]);
          setLockBoard(false);

          setMascotExpr('cheering');
          setMascotMsg('Awesome! You found a match! ⭐');

          // Check if all cards matched
          if (matchedCards.every(c => c.isMatched)) {
            handleRoundSuccess();
          }
        }, 500);
      } else {
        // MATCH FAIL (no fail states, just flip back)
        setStreak(0);
        setMascotExpr('neutral');
        setMascotMsg('Oops, let\'s try again!');

        // Adaptive difficulty decrement (only if on higher difficulty)
        adjustDifficulty(false);

        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[firstIdx].isFlipped = false;
          resetCards[secondIdx].isFlipped = false;
          setCards(resetCards);

          // Animate Flip Back
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

  // Handle Item Click (Attention Mode)
  const handleAttentionPress = (item: AttentionItem) => {
    setTotalCount(prev => prev + 1);
    
    if (item.isTarget) {
      // Correct Tap
      setCorrectCount(prev => prev + 1);
      setStreak(prev => prev + 1);
      setStarsEarned(prev => prev + 1);
      setMascotExpr('cheering');
      setMascotMsg(`You found it! Great job! ⭐`);

      // Adaptive difficulty advancement
      adjustDifficulty(true);
      
      handleRoundSuccess();
    } else {
      // Incorrect Tap
      setStreak(0);
      setMascotExpr('neutral');
      setMascotMsg(`No, that is not it! Try to find the ${targetEmoji}`);
      
      // Adaptive difficulty reduction
      adjustDifficulty(false);
    }
  };

  // Adaptive difficulty logic
  const adjustDifficulty = (isSuccess: boolean) => {
    if (isSuccess) {
      // Increase difficulty after 3 consecutive successful round completions/streaks
      if (streak >= 2 && difficulty < 3) {
        setDifficulty(prev => prev + 1);
        setStreak(0);
      }
    } else {
      // Decrease difficulty after incorrect taps if we're not at minimum difficulty
      if (difficulty > 1) {
        setDifficulty(prev => prev - 1);
      }
    }
  };

  const handleRoundSuccess = () => {
    setTimeout(() => {
      if (roundNumber >= 3) {
        // Complete session after 3 rounds
        handleSessionComplete();
      } else {
        setRoundNumber(prev => prev + 1);
        startNewRound();
      }
    }, 1500);
  };

  const handleSessionComplete = async () => {
    setIsSessionComplete(true);
    setMascotExpr('cheering');
    setMascotMsg(`Hooray! You completed the focus training! You earned ${starsEarned} stars!`);

    // Save stats locally if there's an active profile
    if (activeProfile) {
      await updateGameResult(
        'memory',
        starsEarned,
        correctCount,
        totalCount,
        difficulty
      );
    }
  };

  const restartSession = () => {
    setIsSessionComplete(false);
    setRoundNumber(1);
    setStarsEarned(0);
    setCorrectCount(0);
    setTotalCount(0);
    setDifficulty(1);
    setStreak(0);
    startNewRound();
  };

  // Rendering Helpers
  const renderCardItem = ({ item, index }: { item: Card; index: number }) => {
    const cardId = item.id;
    const rotateY = flipAnims[cardId]
      ? flipAnims[cardId].interpolate({
          inputRange: [0, 180],
          outputRange: ['0deg', '180deg'],
        })
      : '0deg';

    const rotateYBack = flipAnims[cardId]
      ? flipAnims[cardId].interpolate({
          inputRange: [0, 180],
          outputRange: ['180deg', '360deg'],
        })
      : '180deg';

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => handleCardPress(index)}
        activeOpacity={0.8}
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
          style={[
            styles.cardSide,
            styles.cardFront,
            { transform: [{ rotateY: rotateY }] },
          ]}
        >
          <Text style={styles.cardQuestion}>?</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>◀ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Memory & Attention</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.starText}>⭐ {starsEarned}</Text>
        </View>
      </View>

      {/* Main Game Screen */}
      {!isSessionComplete ? (
        <View style={styles.gameContent}>
          {/* Mascot Section */}
          <Mascot expression={mascotExpr} message={mascotMsg} size={110} />

          {/* Sub-mode selector */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                gameSubMode === 'match' ? styles.activeTab : null,
                { borderBottomColor: COLORS.memory },
              ]}
              onPress={() => setGameSubMode('match')}
            >
              <Text
                style={[
                  styles.tabText,
                  gameSubMode === 'match' ? styles.activeTabText : null,
                ]}
              >
                Find Pairs 🃏
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                gameSubMode === 'attention' ? styles.activeTab : null,
                { borderBottomColor: COLORS.memory },
              ]}
              onPress={() => setGameSubMode('attention')}
            >
              <Text
                style={[
                  styles.tabText,
                  gameSubMode === 'attention' ? styles.activeTabText : null,
                ]}
              >
                Spot the Target 🔍
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sub-mode Content */}
          <View style={styles.boardWrapper}>
            <View style={styles.roundLabelContainer}>
              <Text style={styles.roundLabel}>Round {roundNumber}/3</Text>
              <Text style={styles.difficultyLabel}>
                Difficulty: {difficulty === 1 ? 'Easy' : difficulty === 2 ? 'Medium' : 'Hard'}
              </Text>
            </View>

            {gameSubMode === 'match' ? (
              <FlatList
                data={cards}
                renderItem={renderCardItem}
                keyExtractor={item => item.id}
                numColumns={difficulty === 1 ? 2 : 3}
                key={`match_list_${difficulty}`}
                contentContainerStyle={styles.gridContainer}
              />
            ) : (
              <View style={styles.attentionGrid}>
                {attentionItems.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.attentionItemCard}
                    onPress={() => handleAttentionPress(item)}
                  >
                    <Text style={styles.attentionEmoji}>{item.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      ) : (
        /* SUCCESS / COMPLETE SCREEN */
        <View style={styles.successContent}>
          <Mascot expression="cheering" message="You did it!" size={150} />

          <View style={styles.statsCard}>
            <Text style={styles.successTitle}>Focus Training Complete!</Text>
            <Text style={styles.successSub}>Amazing work! Here is what you achieved:</Text>

            <View style={styles.successStatsRow}>
              <View style={styles.successStatItem}>
                <Text style={styles.successStatVal}>⭐ {starsEarned}</Text>
                <Text style={styles.successStatLabel}>Stars Earned</Text>
              </View>
              <View style={styles.successStatItem}>
                <Text style={styles.successStatVal}>
                  {totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100}%
                </Text>
                <Text style={styles.successStatLabel}>Accuracy</Text>
              </View>
              <View style={styles.successStatItem}>
                <Text style={styles.successStatVal}>Lvl {difficulty}</Text>
                <Text style={styles.successStatLabel}>Final Difficulty</Text>
              </View>
            </View>

            <View style={styles.successButtons}>
              <TouchableOpacity style={styles.restartBtn} onPress={restartSession}>
                <Text style={styles.restartBtnText}>Play Again! 🔁</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitBtn} onPress={onBack}>
                <Text style={styles.exitBtnText}>Back to Hub 🏠</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: COLORS.memory,
    ...SHADOWS.small,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  starText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Game Play Layout
  gameContent: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  boardWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 16,
    ...SHADOWS.medium,
  },
  roundLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  roundLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  difficultyLabel: {
    fontSize: 14,
    color: COLORS.memory,
    fontWeight: '700',
  },
  // Match Game grid cards
  gridContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cardContainer: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
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
  cardFront: {
    backgroundColor: COLORS.primary,
    borderColor: '#4A90E2',
  },
  cardBack: {
    backgroundColor: COLORS.cardBackground,
    borderColor: COLORS.memory,
  },
  cardQuestion: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardEmoji: {
    fontSize: 38,
  },
  cardMatched: {
    backgroundColor: COLORS.correctGreen,
    borderColor: COLORS.success,
  },
  // Attention Game Grid
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
  attentionEmoji: {
    fontSize: 40,
  },
  // Success Screen
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  statsCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: COLORS.success,
    ...SHADOWS.large,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  successStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 16,
  },
  successStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  successStatVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  successStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  successButtons: {
    width: '100%',
    gap: 12,
  },
  restartBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  restartBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exitBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  exitBtnText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
