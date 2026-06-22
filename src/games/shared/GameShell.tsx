import React, { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS, SHADOWS } from '../../theme/colors';
import { Mascot, MascotExpression } from '../../components/Mascot';
import { Celebration } from '../../components/Celebration';
import { GameSession } from './useGameSession';
import { badgeById, levelLabel } from './progression';

/* --------------------------- Game header --------------------------- */

interface GameHeaderProps {
  title: string;
  themeColor: string;
  stars: number;
  onBack: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  title,
  themeColor,
  stars,
  onBack,
}) => (
  <View style={[styles.header, { backgroundColor: themeColor }]}>
    <TouchableOpacity
      style={styles.backButton}
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={styles.backButtonText}>◀ Back</Text>
    </TouchableOpacity>
    <Text style={styles.title} numberOfLines={1}>
      {title}
    </Text>
    <View style={styles.statsContainer}>
      <Text style={styles.starText}>⭐ {stars}</Text>
    </View>
  </View>
);

/* --------------------------- Session bar --------------------------- */

export const SessionBar: React.FC<{ session: GameSession; themeColor: string }> = ({
  session,
  themeColor,
}) => (
  <View style={styles.sessionBar}>
    <Text style={styles.roundLabel}>
      Round {session.round}/{session.totalRounds}
    </Text>
    {session.streak >= 2 ? (
      <Text style={styles.streakLabel}>🔥 {session.streak} in a row!</Text>
    ) : (
      <View />
    )}
    <Text style={[styles.difficultyLabel, { color: themeColor }]}>
      {levelLabel(session.level)}
    </Text>
  </View>
);

/* --------------------------- Level picker -------------------------- */

interface LevelPickerProps {
  maxLevel: number;
  unlocked: number;
  selected: number;
  themeColor: string;
  onSelect: (level: number) => void;
}

export const LevelPicker: React.FC<LevelPickerProps> = ({
  maxLevel,
  unlocked,
  selected,
  themeColor,
  onSelect,
}) => (
  <View style={styles.levelPicker}>
    {Array.from({ length: maxLevel }, (_, i) => i + 1).map(lvl => {
      const isUnlocked = lvl <= unlocked;
      const isActive = lvl === selected;
      return (
        <TouchableOpacity
          key={lvl}
          disabled={!isUnlocked}
          onPress={() => onSelect(lvl)}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isUnlocked, selected: isActive }}
          accessibilityLabel={`Level ${lvl}, ${levelLabel(lvl)}${
            isUnlocked ? '' : ', locked'
          }`}
          style={[
            styles.levelPill,
            isActive && { backgroundColor: themeColor, borderColor: themeColor },
            !isUnlocked && styles.levelPillLocked,
          ]}
        >
          <Text
            style={[
              styles.levelPillText,
              isActive && { color: '#FFF' },
              !isUnlocked && styles.levelPillTextLocked,
            ]}
          >
            {isUnlocked ? lvl : '🔒'}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/* --------------------------- Success screen ------------------------ */

interface GameSuccessProps {
  session: GameSession;
  themeColor: string;
  onRestart: () => void;
  onBack: () => void;
}

export const GameSuccess: React.FC<GameSuccessProps> = ({
  session,
  themeColor,
  onRestart,
  onBack,
}) => (
  <ScrollView contentContainerStyle={styles.successContent}>
    <Celebration trigger={1} intensity="big" />
    <Mascot expression="cheering" message="You did it! 🎉" size={140} />

    <View style={styles.statsCard}>
      <Text style={styles.successTitle}>Session Complete!</Text>
      <Text style={styles.successSub}>Look how much you learned:</Text>

      <View style={styles.successStatsRow}>
        <Stat value={`⭐ ${session.stars}`} label="Stars" />
        <Stat value={`${session.accuracy}%`} label="Accuracy" />
        <Stat value={levelLabel(session.level)} label="Level" />
      </View>

      {session.newBadges.length > 0 && (
        <View style={styles.badgeReveal}>
          <Text style={styles.badgeRevealTitle}>New badge unlocked!</Text>
          <View style={styles.badgeRow}>
            {session.newBadges.map(id => {
              const b = badgeById(id);
              if (!b) return null;
              return (
                <View key={id} style={styles.badgeChip}>
                  <Text style={styles.badgeChipEmoji}>{b.emoji}</Text>
                  <Text style={styles.badgeChipName}>{b.name}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.successButtons}>
        <TouchableOpacity
          style={[styles.restartBtn, { backgroundColor: themeColor }]}
          onPress={onRestart}
          accessibilityRole="button"
        >
          <Text style={styles.restartBtnText}>Play Again! 🔁</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exitBtn}
          onPress={onBack}
          accessibilityRole="button"
        >
          <Text style={styles.exitBtnText}>Back to Hub 🏠</Text>
        </TouchableOpacity>
      </View>
    </View>
  </ScrollView>
);

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <View style={styles.successStatItem}>
    <Text style={styles.successStatVal}>{value}</Text>
    <Text style={styles.successStatLabel}>{label}</Text>
  </View>
);

/* --------------------------- Tutorial card ------------------------- */

interface TutorialProps {
  title: string;
  body: string;
  themeColor: string;
  onStart: () => void;
}

export const TutorialCard: React.FC<TutorialProps> = ({
  title,
  body,
  themeColor,
  onStart,
}) => (
  <View style={styles.tutorialOverlay}>
    <View style={styles.tutorialCard}>
      <Mascot expression="happy" message={title} size={110} />
      <Text style={styles.tutorialBody}>{body}</Text>
      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: themeColor }]}
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel="Start playing"
      >
        <Text style={styles.startBtnText}>Let's Go! ▶</Text>
      </TouchableOpacity>
    </View>
  </View>
);

/* --------------------------- Generic body wrapper ------------------ */

export const GameBody: React.FC<{ children: ReactNode }> = ({ children }) => (
  <View style={styles.boardWrapper}>{children}</View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 15,
    ...SHADOWS.small,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  backButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  starText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sessionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  roundLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  streakLabel: { fontSize: 13, fontWeight: 'bold', color: COLORS.secondary },
  difficultyLabel: { fontSize: 14, fontWeight: '700' },
  levelPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  levelPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  levelPillLocked: { backgroundColor: COLORS.background, opacity: 0.6 },
  levelPillText: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  levelPillTextLocked: { fontSize: 14 },
  boardWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 16,
    ...SHADOWS.medium,
  },
  successContent: {
    flexGrow: 1,
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
    marginBottom: 16,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 16,
  },
  successStatItem: { flex: 1, alignItems: 'center' },
  successStatVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  successStatLabel: { fontSize: 12, color: COLORS.textMuted },
  badgeReveal: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 12,
  },
  badgeRevealTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  badgeChip: { alignItems: 'center', width: 80 },
  badgeChipEmoji: { fontSize: 28 },
  badgeChipName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  successButtons: { width: '100%', gap: 12 },
  restartBtn: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  restartBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  exitBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  exitBtnText: { color: COLORS.textMuted, fontSize: 16, fontWeight: 'bold' },
  tutorialOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tutorialCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  tutorialBody: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 16,
  },
  startBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 18,
    ...SHADOWS.small,
  },
  startBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});

// Re-export so games import shared types from one place.
export type { MascotExpression };
