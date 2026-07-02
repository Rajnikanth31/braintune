import React, { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import { COLORS, SHADOWS } from '../../theme/colors';
import { Mascot, MascotExpression } from '../../components/Mascot';
import { Celebration } from '../../components/Celebration';
import { SoundService } from '../../audio/SoundService';
import { GameSession } from './useGameSession';
import { badgeById, levelLabel } from './progression';
import { useApp } from '../../state/AppContext';

/** Run a click sound then the action — for tactile/audio button feedback. */
const withClick = (fn: () => void) => () => {
  SoundService.playClick();
  fn();
};

/* --------------------------- Game header --------------------------- */

interface GameHeaderProps {
  title: string;
  themeColor: string;
  stars: number;
  onBack: () => void;
  onPause?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  title,
  themeColor,
  stars,
  onBack,
  onPause,
}) => (
  <View style={[styles.header, { backgroundColor: themeColor }]}>
    <TouchableOpacity
      style={styles.backButton}
      onPress={withClick(onBack)}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={styles.backButtonText}>◀ Back</Text>
    </TouchableOpacity>
    <Text style={styles.title} numberOfLines={1}>
      {title}
    </Text>
    <View style={styles.headerRightContainer}>
      <View style={styles.statsContainer}>
        <Text style={styles.starText}>⭐ {stars}</Text>
      </View>
      {onPause && (
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={withClick(onPause)}
          accessibilityRole="button"
          accessibilityLabel="Pause Game"
        >
          <Text style={styles.pauseButtonText}>⏸️</Text>
        </TouchableOpacity>
      )}
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
  onUnlockDifficulty?: (startLevel: number, difficultyName: string) => void;
}

export const LevelPicker: React.FC<LevelPickerProps> = ({
  unlocked,
  selected,
  themeColor,
  onSelect,
  onUnlockDifficulty,
}) => {
  const difficulties = [
    { name: 'Basic', range: 'Lvl 1–5', startLevel: 1, icon: '🟢' },
    { name: 'Normal', range: 'Lvl 6–10', startLevel: 6, icon: '🟡' },
    { name: 'Hard', range: 'Lvl 11–15', startLevel: 11, icon: '🔵' },
    { name: 'Very Hard', range: 'Lvl 16–20', startLevel: 16, icon: '🔴' },
  ];

  return (
    <View style={styles.difficultyContainer}>
      <Text style={styles.difficultyTitle}>Choose Difficulty Level:</Text>
      <View style={styles.difficultyGrid}>
        {difficulties.map(diff => {
          const isUnlocked = unlocked >= diff.startLevel - 1 || diff.startLevel === 1;
          const isActive = selected >= diff.startLevel && selected < diff.startLevel + 5;
          return (
            <TouchableOpacity
              key={diff.name}
              onPress={withClick(() => {
                if (isUnlocked) {
                  onSelect(diff.startLevel);
                } else if (onUnlockDifficulty) {
                  onUnlockDifficulty(diff.startLevel, diff.name);
                }
              })}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isUnlocked, selected: isActive }}
              accessibilityLabel={`${diff.name} difficulty, ${diff.range}${isUnlocked ? '' : ', locked'}`}
              style={[
                styles.difficultyCard,
                isActive && { borderColor: themeColor, borderWidth: 3, backgroundColor: themeColor + '15' },
                !isUnlocked && styles.lockedDifficultyCard,
              ]}
            >
              <Text style={styles.difficultyIcon}>{isUnlocked ? diff.icon : '🔒'}</Text>
              <Text style={styles.difficultyName}>{diff.name}</Text>
              <Text style={styles.difficultyRange}>{diff.range}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/* --------------------------- Pause Menu --------------------------- */

interface PauseMenuProps {
  visible: boolean;
  themeColor: string;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  visible,
  themeColor,
  onResume,
  onRestart,
  onExit,
}) => {
  const { settings, updateSettings } = useApp();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onResume}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.pauseCard}>
          <Text style={[styles.pauseTitle, { color: themeColor }]}>Game Paused ⏸️</Text>
          <Mascot expression="neutral" message="Take a quick break, then let's play!" size={95} />

          <View style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>🎵 Music</Text>
              <Switch
                value={settings.musicEnabled}
                onValueChange={(val) => updateSettings({ musicEnabled: val })}
                trackColor={{ false: '#CCD1D9', true: themeColor }}
                thumbColor={settings.musicEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>🔊 Sound Effects</Text>
              <Switch
                value={settings.soundEffectsEnabled}
                onValueChange={(val) => updateSettings({ soundEffectsEnabled: val })}
                trackColor={{ false: '#CCD1D9', true: themeColor }}
                thumbColor={settings.soundEffectsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={styles.pauseButtons}>
            <TouchableOpacity
              style={[styles.resumeBtn, { backgroundColor: themeColor }]}
              onPress={withClick(onResume)}
            >
              <Text style={styles.resumeBtnText}>Resume Game ▶️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restartPauseBtn}
              onPress={withClick(onRestart)}
            >
              <Text style={styles.restartPauseBtnText}>Restart Round 🔁</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exitPauseBtn}
              onPress={withClick(onExit)}
            >
              <Text style={styles.exitPauseBtnText}>Back to Hub 🏠</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* --------------------------- Success screen ------------------------ */

interface GameSuccessProps {
  session: GameSession;
  themeColor: string;
  onRestart: () => void;
  onBack: () => void;
}

interface GameSuccessProps {
  session: GameSession;
  themeColor: string;
  onRestart: () => void;
  onBack: () => void;
  onPlayNextMode?: (nextLevel: number) => void;
}

export const GameSuccess: React.FC<GameSuccessProps> = ({
  session,
  themeColor,
  onRestart,
  onBack,
  onPlayNextMode,
}) => {
  const passed = session.accuracy >= 60;
  let currentDifficulty = 'Basic';
  let nextDifficultyName = '';
  let nextDifficultyStart = 1;
  let nextDifficultyIcon = '';

  if (session.level <= 5) {
    currentDifficulty = 'Basic';
    nextDifficultyName = passed ? 'Normal' : 'Basic';
    nextDifficultyStart = passed ? 6 : 1;
    nextDifficultyIcon = passed ? '🟡' : '🟢';
  } else if (session.level <= 10) {
    currentDifficulty = 'Normal';
    nextDifficultyName = passed ? 'Hard' : 'Normal';
    nextDifficultyStart = passed ? 11 : 6;
    nextDifficultyIcon = passed ? '🔵' : '🟡';
  } else if (session.level <= 15) {
    currentDifficulty = 'Hard';
    nextDifficultyName = passed ? 'Very Hard' : 'Hard';
    nextDifficultyStart = passed ? 16 : 11;
    nextDifficultyIcon = passed ? '🔴' : '🔵';
  } else {
    currentDifficulty = 'Very Hard';
    nextDifficultyName = passed ? 'Legend Completed' : 'Very Hard';
    nextDifficultyStart = passed ? 16 : 16;
    nextDifficultyIcon = passed ? '🏆' : '🔴';
  }

  const showNextButton = passed && onPlayNextMode && session.level < 16;

  return (
    <ScrollView contentContainerStyle={styles.successContent}>
      <Celebration trigger={1} intensity="big" />
      <Mascot expression="cheering" message={passed ? "You did it! 🎉" : "Good try! Keep practicing! 💪"} size={140} />

      <View style={styles.statsCard}>
        <Text style={styles.successTitle}>{passed ? "Session Complete!" : "Try Again!"}</Text>
        <Text style={styles.successSub}>
          {passed ? "Look how much you learned:" : "You're getting better! Let's check your stats:"}
        </Text>

        <View style={styles.successStatsRow}>
          <Stat value={`⭐ ${session.stars}`} label="Stars" />
          <Stat value={`🪙 ${session.coins}`} label="Coins" />
          <Stat value={`${session.accuracy}%`} label="Accuracy" />
        </View>

        <View style={styles.difficultyBanner}>
          <Text style={styles.difficultyBannerTitle}>Current Difficulty: {currentDifficulty}</Text>
          {passed ? (
            <Text style={styles.difficultyBannerSub}>
              {session.level >= 16 ? "🏆 You mastered all difficulties!" : `🔓 Next Mode Unlocked: ${nextDifficultyIcon} ${nextDifficultyName}`}
            </Text>
          ) : (
            <Text style={styles.difficultyBannerSub}>
              🔄 Try again to unlock the next difficulty!
            </Text>
          )}
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
          {showNextButton && (
            <TouchableOpacity
              style={[styles.nextModeBtn, { backgroundColor: themeColor }]}
              onPress={withClick(() => onPlayNextMode!(nextDifficultyStart))}
              accessibilityRole="button"
            >
              <Text style={styles.nextModeBtnText}>Play {nextDifficultyName} Mode! ➔</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.restartBtn,
              showNextButton
                ? { backgroundColor: COLORS.cardBackground, borderWidth: 2, borderColor: themeColor }
                : { backgroundColor: themeColor },
            ]}
            onPress={withClick(onRestart)}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.restartBtnText,
                showNextButton && { color: themeColor },
              ]}
            >
              {passed ? "Replay Mode 🔁" : "Try Again! 🔁"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exitBtn}
            onPress={withClick(onBack)}
            accessibilityRole="button"
          >
            <Text style={styles.exitBtnText}>Back to Hub 🏠</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

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
        onPress={withClick(onStart)}
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
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  starText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  pauseButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  pauseButtonText: { fontSize: 16 },
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
  difficultyContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  difficultyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 10,
    textAlign: 'center',
  },
  difficultyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  difficultyCard: {
    width: '47%',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  lockedDifficultyCard: {
    opacity: 0.5,
    backgroundColor: COLORS.background,
  },
  difficultyIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  difficultyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  difficultyRange: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
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
    marginBottom: 10,
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
  successLevelLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
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
  difficultyBanner: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginVertical: 14,
    alignItems: 'center',
  },
  difficultyBannerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  difficultyBannerSub: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
    textAlign: 'center',
  },
  nextModeBtn: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...SHADOWS.small,
  },
  nextModeBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  successButtons: { width: '100%', gap: 12 },
  restartBtn: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  restartBtnText: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pauseCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  pauseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  settingsGroup: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    gap: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  pauseButtons: {
    width: '100%',
    gap: 10,
  },
  resumeBtn: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  resumeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restartPauseBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  restartPauseBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  exitPauseBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  exitPauseBtnText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export type { MascotExpression };
