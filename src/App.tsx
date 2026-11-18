import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './state/AppContext';
import { Mascot } from './components/Mascot';
import { FadeInView } from './components/FadeInView';
import { AnimatedBackground } from './components/AnimatedBackground';
import { ParentGate } from './components/ParentGate';
import { SoundService } from './audio/SoundService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MemoryGame } from './games/memory/MemoryGame';
import { LettersGame } from './games/letters/LettersGame';
import { NumbersGame } from './games/numbers/NumbersGame';
import { ColorsGame } from './games/colors/ColorsGame';
import { MathGame } from './games/math/MathGame';
import { GAME_REGISTRY } from './games/GameRegistry';
import { DB, ChildProfile, ChildStats } from './storage/db';
import {
  levelProgress,
  highestUnlockedLevel,
  levelLabel,
  MAX_LEVEL,
  BADGES,
  badgeById,
} from './games/shared/progression';

const AVATARS = ['🦊', '🐨', '🐰', '🐯', '🐼', '🦁', '🐻', '🦄', '🐸', '🐵'];

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
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
    renameProfile,
    deleteProfile,
    showDialog,
  } = useApp();

  const [currentScreen, setCurrentScreen] = useState<
    | 'profile_select'
    | 'hub'
    | 'memory_game'
    | 'letters_game'
    | 'numbers_game'
    | 'colors_game'
    | 'math_game'
    | 'parent_zone'
  >('profile_select');

  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showParentGate, setShowParentGate] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ChildProfile | null>(null);

  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState(AVATARS[0]);
  const [formError, setFormError] = useState('');

  const handleCreateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim()) {
      setFormError('Please enter a name!');
      return;
    }
    const willAutoSelect = profiles.length === 0;
    await createProfile(newName.trim(), selectedAvatar);
    setNewName('');
    setFormError('');
    setShowAddProfileModal(false);
    if (willAutoSelect) {
      setCurrentScreen('hub');
    }
  };

  const handleEditProfileSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingProfile) return;
    if (!editName.trim()) {
      setFormError('Please enter a name!');
      return;
    }
    await renameProfile(editingProfile.id, editName.trim(), editAvatar);
    setEditName('');
    setFormError('');
    setShowEditProfileModal(false);
    setEditingProfile(null);
  };

  const handleDeleteProfile = () => {
    if (!editingProfile) return;
    const target = editingProfile;
    showDialog({
      title: 'Delete Profile? ⚠️',
      message: `Are you sure you want to delete ${target.name}'s profile? All stars, coins, and progress will be permanently lost.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
      onConfirm: async () => {
        await deleteProfile(target.id);
        setEditName('');
        setFormError('');
        setShowEditProfileModal(false);
        setEditingProfile(null);
        if (profiles.length <= 1) {
          setIsEditing(false);
        }
      },
    });
  };

  const handleSelectProfile = async (id: string) => {
    SoundService.playClick();
    await selectProfile(id);
    setCurrentScreen('hub');
  };

  const handleLogoutProfile = async () => {
    SoundService.playClick();
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

  useEffect(() => {
    SoundService.load();
  }, []);

  useEffect(() => {
    SoundService.setSfxEnabled(settings.soundEffectsEnabled);
  }, [settings.soundEffectsEnabled]);

  useEffect(() => {
    SoundService.setMusicEnabled(settings.musicEnabled);
  }, [settings.musicEnabled]);

  useEffect(() => {
    SoundService.setVoiceEnabled(settings.voiceInstructionsEnabled);
  }, [settings.voiceInstructionsEnabled]);

  useEffect(() => {
    if (currentScreen.endsWith('_game')) {
      SoundService.startMusic();
    } else {
      SoundService.stopMusic();
    }
  }, [currentScreen]);

  const rootClasses = [
    'bt-root',
    settings.highContrast ? 'high-contrast' : '',
    settings.largeText ? 'large-text' : '',
    settings.reducedMotion ? 'bt-reduced-motion' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const backToHub = () => setCurrentScreen('hub');

  if (currentScreen === 'memory_game') {
    return (
      <div className={rootClasses}>
        <FadeInView key="memory_game">
          <MemoryGame onBack={backToHub} />
        </FadeInView>
      </div>
    );
  }

  if (currentScreen === 'letters_game') {
    return (
      <div className={rootClasses}>
        <FadeInView key="letters_game">
          <LettersGame onBack={backToHub} />
        </FadeInView>
      </div>
    );
  }

  if (currentScreen === 'numbers_game') {
    return (
      <div className={rootClasses}>
        <FadeInView key="numbers_game">
          <NumbersGame onBack={backToHub} />
        </FadeInView>
      </div>
    );
  }

  if (currentScreen === 'colors_game') {
    return (
      <div className={rootClasses}>
        <FadeInView key="colors_game">
          <ColorsGame onBack={backToHub} />
        </FadeInView>
      </div>
    );
  }

  if (currentScreen === 'math_game') {
    return (
      <div className={rootClasses}>
        <FadeInView key="math_game">
          <MathGame onBack={backToHub} />
        </FadeInView>
      </div>
    );
  }

  return (
    <div className={rootClasses}>
      <AnimatedBackground />
      <FadeInView key={currentScreen}>
        {/* 1. PROFILE SELECT SCREEN */}
        {currentScreen === 'profile_select' && (
          <div className="bt-screen-wrapper">
            <div style={{ height: 24 }} />
            <Mascot
              expression="happy"
              message="Welcome to Braintune! Let's choose your profile!"
              size={115}
            />

            <div className="bt-profile-header-row">
              <h1 className="bt-profile-title">Who is playing?</h1>
              {profiles.length > 0 && (
                <button
                  type="button"
                  className="bt-edit-toggle"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Done ✅' : 'Edit ✏️'}
                </button>
              )}
            </div>

            <div className="bt-profiles-list">
              {profiles.map(p => (
                <button
                  type="button"
                  key={p.id}
                  className="bt-profile-card"
                  onClick={() => {
                    if (isEditing) {
                      setEditingProfile(p);
                      setEditName(p.name);
                      setEditAvatar(p.avatar);
                      setFormError('');
                      setShowEditProfileModal(true);
                    } else {
                      handleSelectProfile(p.id);
                    }
                  }}
                >
                  <span className="bt-profile-avatar">{p.avatar}</span>
                  <div className="bt-profile-info">
                    <div className="bt-profile-name">{p.name}</div>
                    <div className="bt-profile-stars">
                      ⭐ {p.stars} stars • 🪙 {p.coins || 0} coins
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: isEditing ? 'var(--secondary)' : 'var(--border)',
                    }}
                  >
                    {isEditing ? '✏️' : '▶'}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className="bt-profile-card bt-add-profile-btn"
                onClick={() => {
                  setFormError('');
                  setShowAddProfileModal(true);
                }}
              >
                <span style={{ fontSize: 22 }}>➕</span>
                <span className="bt-add-profile-text">Add New Child Profile</span>
              </button>
            </div>

            <button
              type="button"
              className="bt-parent-trigger"
              onClick={() => setShowParentGate(true)}
            >
              🔒 Parent Zone
            </button>
          </div>
        )}

        {/* 2. GAME HUB SCREEN */}
        {currentScreen === 'hub' && activeProfile && (
          <div className="bt-screen-wrapper" style={{ paddingBottom: 32 }}>
            <header className="bt-hub-header">
              <button
                type="button"
                className="bt-header-profile"
                onClick={handleLogoutProfile}
              >
                <span className="bt-header-avatar">{activeProfile.avatar}</span>
                <div>
                  <div className="bt-header-name">{activeProfile.name}</div>
                  <div className="bt-header-sub">Change Profile 🔁</div>
                </div>
              </button>

              <div className="bt-header-right">
                <div className="bt-header-stars">
                  ⭐ {activeProfile.stars} • 🪙 {activeProfile.coins || 0}
                </div>
                <button
                  type="button"
                  className="bt-settings-btn"
                  onClick={() => setShowParentGate(true)}
                  aria-label="Parent Settings"
                >
                  ⚙️
                </button>
              </div>
            </header>

            <Mascot
              expression="happy"
              message={`Hi ${activeProfile.name}! Pick a fun game to build your brain power today!`}
              size={105}
            />

            <PlayerProgressCard
              xp={activeProfile.xp}
              streak={activeProfile.streak}
              badges={activeProfile.badges}
            />

            <h2 className="bt-section-title">Your Play Center</h2>

            <div className="bt-games-grid">
              {GAME_REGISTRY.map(game => {
                const stat = activeStats?.[game.id];
                const unlocked = highestUnlockedLevel(stat);
                return (
                  <button
                    type="button"
                    key={game.id}
                    className="bt-game-card"
                    style={{ borderLeftColor: game.themeColor }}
                    onClick={() => launchGame(game.id)}
                    aria-label={`${game.name}, unlocked up to ${levelLabel(unlocked)} level`}
                  >
                    <div className="bt-game-card-header">
                      <span className="bt-game-card-title">{game.name}</span>
                      <span
                        className="bt-level-badge"
                        style={{ backgroundColor: game.themeColor }}
                      >
                        Lvl {unlocked}/{MAX_LEVEL}
                      </span>
                    </div>
                    <div className="bt-game-card-desc">{game.description}</div>
                    <div className="bt-progress-bar-wrap">
                      <div
                        className="bt-progress-bar-fill"
                        style={{
                          width: `${(unlocked / MAX_LEVEL) * 100}%`,
                          backgroundColor: game.themeColor,
                        }}
                      />
                    </div>
                    <div className="bt-game-card-footer">
                      <span className="bt-game-card-age">
                        {stat && stat.sessionsPlayed > 0
                          ? `${stat.sessionsPlayed} plays · ${stat.successRate}% accuracy`
                          : `Ages ${game.minAge}+ · New!`}
                      </span>
                      <span className="bt-play-arrow">Play Now ▶</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. PARENT ZONE / SETTINGS & ANALYTICS */}
        {currentScreen === 'parent_zone' && (
          <div className="bt-screen-wrapper" style={{ paddingTop: 0, paddingBottom: 40 }}>
            <header className="bt-parent-header">
              <span className="bt-parent-header-title">Parent Settings &amp; Reports</span>
              <button
                type="button"
                className="bt-parent-exit-btn"
                onClick={() => setCurrentScreen(activeProfile ? 'hub' : 'profile_select')}
              >
                Exit
              </button>
            </header>

            <h2 className="bt-section-title">Child Performance Reports</h2>
            {profiles.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--card)',
                  padding: 20,
                  borderRadius: 16,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                }}
              >
                No children profiles created yet.
              </div>
            ) : (
              profiles.map(p => <ChildReportCard key={p.id} profile={p} />)
            )}

            <h2 className="bt-section-title">App Preferences</h2>
            <div className="bt-settings-card">
              <SettingToggle
                title="Sound Effects"
                desc="Play sounds for correct/incorrect answers"
                value={settings.soundEffectsEnabled}
                onToggle={() =>
                  updateSettings({ soundEffectsEnabled: !settings.soundEffectsEnabled })
                }
              />
              <SettingToggle
                title="Background Music"
                desc="Play relaxing background tunes"
                value={settings.musicEnabled}
                onToggle={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
              />
              <SettingToggle
                title="Voice Instructions"
                desc="Read game commands out loud"
                value={settings.voiceInstructionsEnabled}
                onToggle={() =>
                  updateSettings({
                    voiceInstructionsEnabled: !settings.voiceInstructionsEnabled,
                  })
                }
                last
              />
            </div>

            <h2 className="bt-section-title">Accessibility</h2>
            <div className="bt-settings-card">
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
            </div>
          </div>
        )}
      </FadeInView>

      {/* CREATE PROFILE MODAL */}
      {showAddProfileModal && (
        <div
          className="bt-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddProfileModal(false)}
        >
          <div className="bt-modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="bt-modal-title">New Child Profile</h2>
            <form onSubmit={handleCreateProfile}>
              <label className="bt-input-label" htmlFor="new-profile-name">
                Name / Nickname
              </label>
              <input
                id="new-profile-name"
                className="bt-text-input"
                type="text"
                placeholder="e.g. Liam, Sophia"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={12}
                autoFocus
              />

              <span className="bt-input-label">Choose Avatar</span>
              <div className="bt-avatars-row">
                {AVATARS.map(item => (
                  <button
                    type="button"
                    key={item}
                    className={`bt-avatar-btn ${selectedAvatar === item ? 'selected' : ''}`}
                    onClick={() => setSelectedAvatar(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {formError ? <div className="bt-error-text">{formError}</div> : null}

              <div className="bt-modal-buttons">
                <button
                  type="button"
                  className="bt-modal-btn bt-modal-cancel"
                  onClick={() => {
                    setNewName('');
                    setFormError('');
                    setShowAddProfileModal(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="bt-modal-btn bt-modal-save">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditProfileModal && (
        <div
          className="bt-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setShowEditProfileModal(false);
            setEditingProfile(null);
          }}
        >
          <div className="bt-modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="bt-modal-title">Edit Child Profile</h2>
            <form onSubmit={handleEditProfileSave}>
              <label className="bt-input-label" htmlFor="edit-profile-name">
                Name / Nickname
              </label>
              <input
                id="edit-profile-name"
                className="bt-text-input"
                type="text"
                placeholder="e.g. Liam, Sophia"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={12}
                autoFocus
              />

              <span className="bt-input-label">Choose Avatar</span>
              <div className="bt-avatars-row">
                {AVATARS.map(item => (
                  <button
                    type="button"
                    key={item}
                    className={`bt-avatar-btn ${editAvatar === item ? 'selected' : ''}`}
                    onClick={() => setEditAvatar(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {formError ? <div className="bt-error-text">{formError}</div> : null}

              <div className="bt-modal-buttons">
                <button
                  type="button"
                  className="bt-modal-btn bt-modal-delete"
                  onClick={handleDeleteProfile}
                >
                  Delete 🗑️
                </button>
                <button
                  type="button"
                  className="bt-modal-btn bt-modal-cancel"
                  onClick={() => {
                    setEditName('');
                    setFormError('');
                    setShowEditProfileModal(false);
                    setEditingProfile(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="bt-modal-btn bt-modal-save">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARENTAL GATE OVERLAY */}
      <ParentGate
        isVisible={showParentGate}
        onSuccess={handleParentGateSuccess}
        onClose={() => setShowParentGate(false)}
      />
    </div>
  );
}

const PlayerProgressCard: React.FC<{
  xp: number;
  streak: number;
  badges: string[];
}> = ({ xp, streak, badges }) => {
  const lp = levelProgress(xp);
  return (
    <div className="bt-progress-card">
      <div className="bt-progress-top">
        <div className="bt-level-circle">
          <span className="bt-level-circle-num">{lp.level}</span>
          <span className="bt-level-circle-lbl">LEVEL</span>
        </div>
        <div className="bt-progress-mid">
          <div className="bt-progress-xp">
            {lp.isMaxLevel
              ? 'Max level reached! 🌟'
              : `${lp.xpIntoLevel} / ${lp.xpForNextLevel} XP to next level`}
          </div>
          <div className="bt-xp-track">
            <div
              className="bt-xp-fill"
              style={{ width: `${Math.round(lp.progress * 100)}%` }}
            />
          </div>
        </div>
        <div className="bt-streak-chip">
          <span className="bt-streak-num">🔥 {streak}</span>
          <span className="bt-streak-lbl">day{streak === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div className="bt-badges-inline">
        🏅 {badges.length} / {BADGES.length} badges earned
      </div>
    </div>
  );
};

const GAME_META: Record<string, string> = {
  memory: '🃏 Memory',
  letters: '🅰 Letters',
  numbers: '🔢 Numbers',
  colors: '🎨 Colors',
  math: '➕ Math',
};

const SettingToggle: React.FC<{
  title: string;
  desc: string;
  value: boolean;
  onToggle: () => void;
  last?: boolean;
}> = ({ title, desc, value, onToggle, last }) => (
  <div className={`bt-setting-row ${last ? 'last' : ''}`}>
    <div>
      <div className="bt-setting-title">{title}</div>
      <div className="bt-setting-desc">{desc}</div>
    </div>
    <button
      type="button"
      className={`bt-toggle-btn ${value ? 'bt-toggle-on' : 'bt-toggle-off'}`}
      onClick={onToggle}
      role="switch"
      aria-checked={value}
      aria-label={title}
    >
      {value ? 'ON' : 'OFF'}
    </button>
  </div>
);

const ChildReportCard: React.FC<{ profile: ChildProfile }> = ({ profile }) => {
  const [stats, setStats] = useState<ChildStats | null>(null);

  useEffect(() => {
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
    <div className="bt-report-card">
      <div className="bt-report-header">
        <span className="bt-report-avatar">{profile.avatar}</span>
        <div>
          <div className="bt-report-name">{profile.name}</div>
          <div className="bt-report-played">
            Last played: {new Date(profile.lastPlayed).toLocaleDateString()}
          </div>
        </div>
        <div className="bt-report-badge">
          ⭐ {profile.stars} • 🪙 {profile.coins || 0}
        </div>
      </div>

      <div className="bt-report-summary">
        <span>Level {lp.level}</span>
        <span>🔥 {profile.streak || 0} day streak</span>
        <span>🏅 {(profile.badges || []).length} badges</span>
      </div>

      <div className="bt-stats-table-header">Learning Performance</div>

      {Object.values(stats).map(g => (
        <div key={g.gameId} className="bt-stat-detail-row">
          <div className="bt-stat-game-name">{GAME_META[g.gameId] || g.gameId}</div>
          <div className="bt-stat-sub-row">
            <span>Played: {g.sessionsPlayed}</span>
            <span>Accuracy: {g.successRate}%</span>
            <span>Max: {levelLabel(g.highestDifficultyReached)}</span>
          </div>
        </div>
      ))}

      {(profile.badges || []).length > 0 && (
        <>
          <div className="bt-stats-table-header" style={{ marginTop: 12 }}>
            Badges Earned
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' }}>
            {profile.badges.map(id => {
              const b = badgeById(id);
              if (!b) return null;
              return (
                <span
                  key={id}
                  style={{ fontSize: 24 }}
                  title={`${b.name}: ${b.description}`}
                  aria-label={b.name}
                >
                  {b.emoji}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
