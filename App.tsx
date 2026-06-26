import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from './src/theme/colors';
import { AppProvider, useApp } from './src/state/AppContext';
import { Mascot } from './src/components/Mascot';
import { FadeInView } from './src/components/FadeInView';
import { AnimatedBackground } from './src/components/AnimatedBackground';
import { ParentGate } from './src/components/ParentGate';
import { SoundService } from './src/audio/SoundService';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { MemoryGame } from './src/games/memory/MemoryGame';
import { LettersGame } from './src/games/letters/LettersGame';
import { NumbersGame } from './src/games/numbers/NumbersGame';
import { ColorsGame } from './src/games/colors/ColorsGame';
import { MathGame } from './src/games/math/MathGame';
import { GAME_REGISTRY } from './src/games/GameRegistry';
import { DB, ChildStats } from './src/storage/db';
import {
  levelProgress,
  highestUnlockedLevel,
  levelLabel,
  MAX_LEVEL,
  BADGES,
  badgeById,
} from './src/games/shared/progression';

// List of fun avatar emojis for children profiles
const AVATARS = ['🦊', '🐨', '🐰', '🐯', '🐼', '🦁', '🐻', '🦄', '🐸', '🐵'];

function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
          <AppContent />
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const {
    profiles,
    activeProfile,
    activeStats,
    settings,
    createProfile,
    selectProfile,
    updateSettings,
  } = useApp();

  const [currentScreen, setCurrentScreen] = useState<
    'profile_select' | 'hub' | 'memory_game' | 'letters_game' | 'numbers_game' | 'colors_game' | 'math_game' | 'parent_zone'
  >('profile_select');

  // Modal / Gate controls
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showParentGate, setShowParentGate] = useState(false);
  
  // Form fields
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [formError, setFormError] = useState('');

  const handleCreateProfile = async () => {
    if (!newName.trim()) {
      setFormError('Please enter a name!');
      return;
    }
    await createProfile(newName.trim(), selectedAvatar);
    setNewName('');
    setFormError('');
    setShowAddProfileModal(false);
  };

  const handleSelectProfile = async (id: string) => {
    await selectProfile(id);
    setCurrentScreen('hub');
  };

  const handleLogoutProfile = async () => {
    await selectProfile(null);
    setCurrentScreen('profile_select');
  };

  const handleParentGateSuccess = () => {
    setShowParentGate(false);
    setCurrentScreen('parent_zone');
  };

  const launchGame = (gameId: string) => {
    SoundService.playClick();
    if (gameId === 'memory') setCurrentScreen('memory_game');
    if (gameId === 'letters') setCurrentScreen('letters_game');
    if (gameId === 'numbers') setCurrentScreen('numbers_game');
    if (gameId === 'colors') setCurrentScreen('colors_game');
    if (gameId === 'math') setCurrentScreen('math_game');
  };

  // Preload audio clips once.
  useEffect(() => {
    SoundService.load();
  }, []);

  // Keep audio engine in sync with the parent-controlled settings.
  useEffect(() => {
    SoundService.setSfxEnabled(settings.soundEffectsEnabled);
  }, [settings.soundEffectsEnabled]);

  useEffect(() => {
    SoundService.setMusicEnabled(settings.musicEnabled);
  }, [settings.musicEnabled]);

  // Play looping background music while a game is on screen; pause elsewhere.
  useEffect(() => {
    if (currentScreen.endsWith('_game')) {
      SoundService.startMusic();
    } else {
      SoundService.stopMusic();
    }
  }, [currentScreen]);

  // SCREEN RENDERING
  const backToHub = () => setCurrentScreen('hub');
  if (currentScreen === 'memory_game') {
    return (
      <FadeInView style={styles.container} key="memory_game">
        <MemoryGame onBack={backToHub} />
      </FadeInView>
    );
  }

  if (currentScreen === 'letters_game') {
    return (
      <FadeInView style={styles.container} key="letters_game">
        <LettersGame onBack={backToHub} />
      </FadeInView>
    );
  }

  if (currentScreen === 'numbers_game') {
    return (
      <FadeInView style={styles.container} key="numbers_game">
        <NumbersGame onBack={backToHub} />
      </FadeInView>
    );
  }

  if (currentScreen === 'colors_game') {
    return (
      <FadeInView style={styles.container} key="colors_game">
        <ColorsGame onBack={backToHub} />
      </FadeInView>
    );
  }

  if (currentScreen === 'math_game') {
    return (
      <FadeInView style={styles.container} key="math_game">
        <MathGame onBack={backToHub} />
      </FadeInView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedBackground />
      <FadeInView style={styles.flexFill} key={currentScreen}>
      {/* 1. PROFILE SELECT SCREEN */}
      {currentScreen === 'profile_select' && (
        <View style={styles.screenWrapper}>
          <View style={styles.topSpacer} />
          <Mascot expression="happy" message="Welcome to Braintune! Let's choose your profile!" size={120} />
          
          <Text style={styles.screenTitle}>Who is playing?</Text>
          
          <ScrollView
            contentContainerStyle={styles.profilesList}
            showsVerticalScrollIndicator={false}
          >
            {profiles.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.profileCard}
                onPress={() => handleSelectProfile(p.id)}
              >
                <Text style={styles.profileAvatar}>{p.avatar}</Text>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{p.name}</Text>
                  <Text style={styles.profileStars}>⭐ {p.stars} stars  •  🪙 {p.coins || 0} coins</Text>
                </View>
                <Text style={styles.chevron}>▶</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.profileCard, styles.addProfileBtn]}
              onPress={() => setShowAddProfileModal(true)}
            >
              <Text style={styles.addIcon}>➕</Text>
              <Text style={styles.addText}>Add New Child Profile</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Quick Parental Gate Trigger for Analytics */}
          <TouchableOpacity
            style={styles.parentZoneTrigger}
            onPress={() => setShowParentGate(true)}
          >
            <Text style={styles.parentZoneTriggerText}>🔒 Parent Zone</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. GAME HUB SCREEN */}
      {currentScreen === 'hub' && activeProfile && (
        <View style={styles.screenWrapper}>
          {/* Header */}
          <View style={styles.hubHeader}>
            <TouchableOpacity style={styles.headerProfile} onPress={handleLogoutProfile}>
              <Text style={styles.headerAvatar}>{activeProfile.avatar}</Text>
              <View>
                <Text style={styles.headerName}>{activeProfile.name}</Text>
                <Text style={styles.headerSubtitle}>Change Profile 🔁</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <View style={styles.headerStars}>
                <Text style={styles.headerStarsText}>⭐ {activeProfile.stars}  •  🪙 {activeProfile.coins || 0}</Text>
              </View>
              <TouchableOpacity
                style={styles.settingsIconBtn}
                onPress={() => setShowParentGate(true)}
              >
                <Text style={styles.settingsEmoji}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hub Content */}
          <ScrollView contentContainerStyle={styles.hubContent} showsVerticalScrollIndicator={false}>
            <Mascot
              expression="happy"
              message={`Hi ${activeProfile.name}! Pick a fun game to build your brain power today!`}
              size={110}
            />

            <PlayerProgressCard
              xp={activeProfile.xp}
              streak={activeProfile.streak}
              badges={activeProfile.badges}
            />

            <Text style={styles.sectionTitle}>Your Play Center</Text>

            <View style={styles.gamesGrid}>
              {GAME_REGISTRY.map(game => {
                const stat = activeStats?.[game.id];
                const unlocked = highestUnlockedLevel(stat);
                return (
                  <TouchableOpacity
                    key={game.id}
                    style={[
                      styles.gameCard,
                      { borderLeftColor: game.themeColor, borderLeftWidth: 6 },
                    ]}
                    onPress={() => launchGame(game.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${game.name}, unlocked up to ${levelLabel(unlocked)} level`}
                  >
                    <View style={styles.gameCardHeader}>
                      <Text style={styles.gameCardTitle}>{game.name}</Text>
                      <View style={[styles.levelBadge, { backgroundColor: game.themeColor }]}>
                        <Text style={styles.levelBadgeText}>
                          Lvl {unlocked}/{MAX_LEVEL}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.gameCardDesc}>{game.description}</Text>
                    <View style={styles.levelDots}>
                      {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(l => (
                        <View
                          key={l}
                          style={[
                            styles.levelDot,
                            l <= unlocked && { backgroundColor: game.themeColor },
                          ]}
                        />
                      ))}
                    </View>
                    <View style={styles.gameCardFooter}>
                      <Text style={styles.gameCardAge}>
                        {stat && stat.sessionsPlayed > 0
                          ? `${stat.sessionsPlayed} plays · ${stat.successRate}% accuracy`
                          : `Ages ${game.minAge}+ · New!`}
                      </Text>
                      <Text style={styles.playArrow}>Play Now ▶</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* 3. PARENT ZONE / SETTINGS & ANALYTICS */}
      {currentScreen === 'parent_zone' && (
        <View style={styles.screenWrapper}>
          {/* Header */}
          <View style={[styles.hubHeader, { backgroundColor: COLORS.primary }]}>
            <Text style={[styles.headerTitle, { color: '#FFF' }]}>Parent Settings & Reports</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen(activeProfile ? 'hub' : 'profile_select')}
            >
              <Text style={styles.backButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.parentContent} showsVerticalScrollIndicator={false}>
            {/* Reports / Analytics Section */}
            <Text style={styles.parentSectionTitle}>Child Performance Reports</Text>
            {profiles.length === 0 ? (
              <View style={styles.noProfilesCard}>
                <Text style={styles.noProfilesText}>No children profiles created yet.</Text>
              </View>
            ) : (
              profiles.map(p => (
                <ChildReportCard key={p.id} profile={p} />
              ))
            )}

            {/* App Settings Toggles */}
            <Text style={styles.parentSectionTitle}>App Preferences</Text>
            <View style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingTitle}>Sound Effects</Text>
                  <Text style={styles.settingDesc}>Play sounds for correct/incorrect answers</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, settings.soundEffectsEnabled ? styles.toggleOn : styles.toggleOff]}
                  onPress={() => updateSettings({ soundEffectsEnabled: !settings.soundEffectsEnabled })}
                >
                  <Text style={styles.toggleText}>{settings.soundEffectsEnabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingTitle}>Background Music</Text>
                  <Text style={styles.settingDesc}>Play relaxing background tunes</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, settings.musicEnabled ? styles.toggleOn : styles.toggleOff]}
                  onPress={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
                >
                  <Text style={styles.toggleText}>{settings.musicEnabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={styles.settingTitle}>Voice Instructions</Text>
                  <Text style={styles.settingDesc}>Read game commands out loud</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, settings.voiceInstructionsEnabled ? styles.toggleOn : styles.toggleOff]}
                  onPress={() => updateSettings({ voiceInstructionsEnabled: !settings.voiceInstructionsEnabled })}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: settings.voiceInstructionsEnabled }}
                >
                  <Text style={styles.toggleText}>{settings.voiceInstructionsEnabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Accessibility */}
            <Text style={styles.parentSectionTitle}>Accessibility</Text>
            <View style={styles.settingsCard}>
              <SettingToggle
                title="High Contrast"
                desc="Stronger colors for better visibility"
                value={settings.highContrast}
                onToggle={() => updateSettings({ highContrast: !settings.highContrast })}
              />
              <SettingToggle
                title="Reduced Motion"
                desc="Calm down animations and transitions"
                value={settings.reducedMotion}
                onToggle={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
              />
              <SettingToggle
                title="Larger Text"
                desc="Increase text size across the app"
                value={settings.largeText}
                onToggle={() => updateSettings({ largeText: !settings.largeText })}
                last
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      </FadeInView>

      {/* CREATE PROFILE MODAL */}
      <Modal
        animationType="slide"
        transparent
        visible={showAddProfileModal}
        onRequestClose={() => setShowAddProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Child Profile</Text>

            <Text style={styles.inputLabel}>Name / Nickname</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Liam, Sophia"
              placeholderTextColor={COLORS.textMuted}
              value={newName}
              onChangeText={setNewName}
              maxLength={12}
            />

            <Text style={styles.inputLabel}>Choose Avatar</Text>
            <FlatList
              data={AVATARS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item}
              contentContainerStyle={styles.avatarsRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.avatarSelection,
                    selectedAvatar === item ? styles.selectedAvatarBorder : null,
                  ]}
                  onPress={() => setSelectedAvatar(item)}
                >
                  <Text style={styles.avatarSelectionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setNewName('');
                  setFormError('');
                  setShowAddProfileModal(false);
                }}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleCreateProfile}
              >
                <Text style={styles.modalSaveBtnText}>Save Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PARENTAL GATE OVERLAY */}
      <ParentGate
        isVisible={showParentGate}
        onSuccess={handleParentGateSuccess}
        onClose={() => setShowParentGate(false)}
      />
    </SafeAreaView>
  );
}

// Player progress card shown on the hub (level, XP bar, streak, badges).
const PlayerProgressCard: React.FC<{
  xp: number;
  streak: number;
  badges: string[];
}> = ({ xp, streak, badges }) => {
  const lp = levelProgress(xp);
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressTopRow}>
        <View style={styles.levelCircle}>
          <Text style={styles.levelCircleNum}>{lp.level}</Text>
          <Text style={styles.levelCircleLabel}>LEVEL</Text>
        </View>
        <View style={styles.progressMid}>
          <Text style={styles.progressXpText}>
            {lp.isMaxLevel
              ? 'Max level reached! 🌟'
              : `${lp.xpIntoLevel} / ${lp.xpForNextLevel} XP to next level`}
          </Text>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${Math.round(lp.progress * 100)}%` }]} />
          </View>
        </View>
        <View style={styles.streakChip}>
          <Text style={styles.streakNum}>🔥 {streak}</Text>
          <Text style={styles.streakLabel}>day{streak === 1 ? '' : 's'}</Text>
        </View>
      </View>
      <Text style={styles.badgesInline}>
        🏅 {badges.length} / {BADGES.length} badges earned
      </Text>
    </View>
  );
};

const GAME_META: Record<string, string> = {
  memory: '🃏 Memory',
  letters: '🅰 Letters',
  numbers: '🔢 Numbers',
  colors: '🎨 Colors',
  math: '➕ Math',
};

// Reusable settings row with an ON/OFF toggle.
const SettingToggle: React.FC<{
  title: string;
  desc: string;
  value: boolean;
  onToggle: () => void;
  last?: boolean;
}> = ({ title, desc, value, onToggle, last }) => (
  <View style={[styles.settingRow, last ? { borderBottomWidth: 0 } : null]}>
    <View>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDesc}>{desc}</Text>
    </View>
    <TouchableOpacity
      style={[styles.toggleBtn, value ? styles.toggleOn : styles.toggleOff]}
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
    >
      <Text style={styles.toggleText}>{value ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  </View>
);

// Subcomponent: Child analytics report card
const ChildReportCard: React.FC<{ profile: any }> = ({ profile }) => {
  const [stats, setStats] = useState<ChildStats | null>(null);

  React.useEffect(() => {
    let mounted = true;
    DB.getChildStats(profile.id).then(data => {
      if (mounted) setStats(data);
    });
    return () => {
      mounted = false;
    };
  }, [profile.id]);

  if (!stats) return null;
  const lp = levelProgress(profile.xp || 0);

  return (
    <View style={styles.reportCard}>
      <View style={styles.reportCardHeader}>
        <Text style={styles.reportAvatar}>{profile.avatar}</Text>
        <View>
          <Text style={styles.reportName}>{profile.name}</Text>
          <Text style={styles.reportPlayed}>
            Last played: {new Date(profile.lastPlayed).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.reportBadge}>
          <Text style={styles.reportBadgeText}>⭐ {profile.stars}  •  🪙 {profile.coins || 0}</Text>
        </View>
      </View>

      <View style={styles.reportSummaryRow}>
        <Text style={styles.reportSummaryItem}>Level {lp.level}</Text>
        <Text style={styles.reportSummaryItem}>🔥 {profile.streak || 0} day streak</Text>
        <Text style={styles.reportSummaryItem}>
          🏅 {(profile.badges || []).length} badges
        </Text>
      </View>

      <Text style={styles.statsTableHeader}>Learning Performance</Text>

      {Object.values(stats).map((g: any) => (
        <View key={g.gameId} style={styles.statDetailRow}>
          <Text style={styles.statGameName}>{GAME_META[g.gameId] || g.gameId}</Text>
          <View style={styles.statSubRow}>
            <Text style={styles.statSubVal}>Played: {g.sessionsPlayed}</Text>
            <Text style={styles.statSubVal}>Accuracy: {g.successRate}%</Text>
            <Text style={styles.statSubVal}>
              Max: {levelLabel(g.highestDifficultyReached)}
            </Text>
          </View>
        </View>
      ))}

      {(profile.badges || []).length > 0 && (
        <>
          <Text style={styles.statsTableHeader}>Badges Earned</Text>
          <View style={styles.reportBadgeRow}>
            {profile.badges.map((id: string) => {
              const b = badgeById(id);
              if (!b) return null;
              return (
                <Text key={id} style={styles.reportBadgeEmoji} accessibilityLabel={b.name}>
                  {b.emoji}
                </Text>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flexFill: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    position: 'relative',
  },
  topSpacer: {
    height: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginVertical: 16,
  },
  // Profiles Screen styles
  profilesList: {
    gap: 16,
    paddingBottom: 80,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  profileAvatar: {
    fontSize: 48,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileStars: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  chevron: {
    fontSize: 18,
    color: COLORS.border,
    fontWeight: 'bold',
  },
  addProfileBtn: {
    justifyContent: 'center',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  addIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  addText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  parentZoneTrigger: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  parentZoneTriggerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  // Hub Screen styles
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    fontSize: 36,
    marginRight: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerStars: {
    backgroundColor: COLORS.warning,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  headerStarsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  settingsIconBtn: {
    backgroundColor: COLORS.border,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsEmoji: {
    fontSize: 18,
  },
  hubContent: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  gamesGrid: {
    gap: 16,
    paddingBottom: 40,
  },
  gameCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gameCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  levelBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  levelBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  levelDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  levelDot: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  // Player progress card
  progressCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
    ...SHADOWS.small,
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCircleNum: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  levelCircleLabel: { color: '#FFF', fontSize: 8, fontWeight: 'bold', letterSpacing: 1 },
  progressMid: { flex: 1 },
  progressXpText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontWeight: '600' },
  xpBarTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: COLORS.success,
  },
  streakChip: {
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  streakNum: { fontSize: 15, fontWeight: 'bold', color: COLORS.secondary },
  streakLabel: { fontSize: 10, color: COLORS.textMuted },
  badgesInline: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  gameCardDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  gameCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameCardAge: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  playArrow: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  // Parent Screen styles
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  parentContent: {
    paddingVertical: 16,
  },
  parentSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  reportCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  reportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  reportAvatar: {
    fontSize: 36,
    marginRight: 10,
  },
  reportName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  reportPlayed: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  reportBadge: {
    marginLeft: 'auto',
    backgroundColor: COLORS.warning,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  reportBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  reportSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  reportSummaryItem: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  reportBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 6,
  },
  reportBadgeEmoji: {
    fontSize: 24,
  },
  statsTableHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  statDetailRow: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  statGameName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  statSubRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statSubVal: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  noProfilesCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  noProfilesText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  settingsCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    maxWidth: 220,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: COLORS.success,
  },
  toggleOff: {
    backgroundColor: COLORS.border,
  },
  toggleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
  },
  avatarsRow: {
    gap: 12,
    paddingBottom: 20,
  },
  avatarSelection: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  selectedAvatarBorder: {
    borderColor: COLORS.primary,
    backgroundColor: '#E6F0FD',
  },
  avatarSelectionText: {
    fontSize: 32,
  },
  errorText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelBtnText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    backgroundColor: COLORS.primary,
  },
  modalSaveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default App;
