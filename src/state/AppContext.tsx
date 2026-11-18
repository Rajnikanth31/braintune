import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { DB, ChildProfile, ChildStats, AppSettings } from '../storage/db';
import { AchievementToast } from '../components/AchievementToast';
import {
  AchievementToastItem,
  buildAchievementToasts,
  enqueueAchievements,
  dismissAchievement,
} from '../components/achievementToastLogic';
import {
  DANCE_DURATION_MS,
  LevelUpCelebrationMap,
  recordLevelUpCelebration,
  activateLevelUpCelebration,
  pruneExpiredCelebrations,
} from '../components/levelUpCelebrationLogic';
import { resolveStoredRpgMiniQuest } from '../games/rpg/rpgWorldLogic';
import { LearningRecapModal } from '../components/LearningRecapModal';
import {
  LearningGameId,
  LearningRecapData,
  buildLearningRecap,
  isLearningGameId,
} from '../components/learningRecapLogic';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm?: () => void | Promise<void>;
}

interface AppContextType {
  profiles: ChildProfile[];
  activeProfile: ChildProfile | null;
  activeStats: ChildStats | null;
  settings: AppSettings;
  isLoading: boolean;
  createProfile: (name: string, avatar: string) => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;
  renameProfile: (id: string, name: string, avatar?: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  unlockLevelWithCoins: (gameId: string, targetLevel: number, coinCost: number) => Promise<boolean>;
  updateGameResult: (
    gameId: string,
    starsEarned: number,
    correctTaps: number,
    totalTaps: number,
    difficultyLevel: number,
    coinsEarned?: number
  ) => Promise<{ newBadges: string[] }>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  showDialog: (opts: DialogOptions) => void;
  levelUpCelebrations: LevelUpCelebrationMap;
  startLevelUpCelebration: (profileId: string) => void;
  learningRecap: LearningRecapData | null;
  openLearningRecap: () => void;
  closeLearningRecap: () => void;
  registerRecapPlayHandler: (
    handler: (gameId: LearningGameId, targetLevel: number) => void,
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [activeStats, setActiveStats] = useState<ChildStats | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    soundEffectsEnabled: true,
    musicEnabled: true,
    voiceInstructionsEnabled: true,
    highContrast: false,
    reducedMotion: false,
    largeText: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<AchievementToastItem[]>([]);
  const [levelUpCelebrations, setLevelUpCelebrations] = useState<LevelUpCelebrationMap>({});
  const danceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [learningRecap, setLearningRecap] = useState<LearningRecapData | null>(null);
  const [isLearningRecapOpen, setIsLearningRecapOpen] = useState(false);
  const recapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recapPlayHandlerRef = useRef<
    ((gameId: LearningGameId, targetLevel: number) => void) | null
  >(null);

  useEffect(() => {
    const timers = danceTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      if (recapTimerRef.current) clearTimeout(recapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const savedSettings = await DB.getSettings();
        setSettings(savedSettings);

        const list = await DB.getProfiles();
        setProfiles(list);

        const activeId = await DB.getActiveProfileId();
        if (activeId && list.some(p => p.id === activeId)) {
          const profile = list.find(p => p.id === activeId) || null;
          setActiveProfile(profile);
          if (profile) {
            const stats = await DB.getChildStats(profile.id);
            setActiveStats(stats);
          }
        }
      } catch (e) {
        console.error('Failed to load initial AppContext data', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshProfiles = async () => {
    const list = await DB.getProfiles();
    setProfiles(list);
    if (activeProfile) {
      const updatedProfile = list.find(p => p.id === activeProfile.id) || null;
      setActiveProfile(updatedProfile);
    }
  };

  const createProfile = async (name: string, avatar: string) => {
    const newProfile = await DB.addProfile(name, avatar);
    const list = await DB.getProfiles();
    setProfiles(list);
    if (list.length === 1) {
      await selectProfile(newProfile.id);
    }
  };

  const selectProfile = async (id: string | null) => {
    await DB.setActiveProfileId(id);
    if (id) {
      await DB.syncBadges(id);
      const list = await DB.getProfiles();
      setProfiles(list);
      const profile = list.find(p => p.id === id) || null;
      setActiveProfile(profile);
      if (profile) {
        const stats = await DB.getChildStats(profile.id);
        setActiveStats(stats);
      } else {
        setActiveStats(null);
      }
    } else {
      setActiveProfile(null);
      setActiveStats(null);
    }
  };

  const updateGameResult = async (
    gameId: string,
    starsEarned: number,
    correctTaps: number,
    totalTaps: number,
    difficultyLevel: number,
    coinsEarned: number = 0
  ) => {
    const unlockedKey = resolveStoredRpgMiniQuest(activeProfile?.id ?? null, gameId, correctTaps);
    if (unlockedKey) {
      setAchievementQueue(prev =>
        enqueueAchievements(prev, [
          {
            id: `rpg_key_${unlockedKey.keyId}_${Date.now()}`,
            kind: 'badge',
            kicker: 'Quest Key Unlocked',
            emoji: unlockedKey.keyEmoji,
            title: `${unlockedKey.keyName} Unlocked!`,
            subtitle: `Quest World reward from ${unlockedKey.npcName}`,
            accentColor: '#10B981',
            bgTint: '#ECFDF5',
          },
        ]),
      );
    }

    const sessionAccuracy = totalTaps > 0 ? Math.round((correctTaps / totalTaps) * 100) : 100;

    if (!activeProfile) {
      if (isLearningGameId(gameId)) {
        const guestNext: ChildStats = {
          [gameId]: {
            gameId,
            starsEarned,
            sessionsPlayed: 1,
            successRate: sessionAccuracy,
            highestDifficultyReached: sessionAccuracy >= 60 ? difficultyLevel + 1 : difficultyLevel,
          },
        };
        const recap = buildLearningRecap({
          playerName: 'Explorer',
          completedGameId: gameId,
          sessionAccuracy,
          starsEarned,
          difficultyLevel,
          prevStats: null,
          nextStats: guestNext,
        });
        setLearningRecap(recap);
        if (recapTimerRef.current) clearTimeout(recapTimerRef.current);
        recapTimerRef.current = setTimeout(() => setIsLearningRecapOpen(true), 350);
      }
      return { newBadges: [] };
    }

    const prevStatsSnapshot = activeStats || (await DB.getChildStats(activeProfile.id));

    const result = await DB.updateGameSession(
      activeProfile.id,
      gameId,
      starsEarned,
      correctTaps,
      totalTaps,
      difficultyLevel,
      coinsEarned
    );

    const list = await DB.getProfiles();
    setProfiles(list);
    const updatedProfile = list.find(p => p.id === activeProfile.id) || null;
    setActiveProfile(updatedProfile);
    const updatedStats = await DB.getChildStats(activeProfile.id);
    setActiveStats(updatedStats);

    if (isLearningGameId(gameId)) {
      const recap = buildLearningRecap({
        playerName: updatedProfile?.name || activeProfile.name,
        completedGameId: gameId,
        sessionAccuracy,
        starsEarned,
        difficultyLevel,
        prevStats: prevStatsSnapshot,
        nextStats: updatedStats,
      });
      setLearningRecap(recap);
      if (recapTimerRef.current) clearTimeout(recapTimerRef.current);
      recapTimerRef.current = setTimeout(() => setIsLearningRecapOpen(true), 350);
    }

    if (result.newLevel > result.prevLevel) {
      setLevelUpCelebrations(prev =>
        recordLevelUpCelebration(prev, activeProfile.id, result.prevLevel, result.newLevel),
      );
    }

    const toasts = buildAchievementToasts(
      result.newBadges,
      result.prevLevel,
      result.newLevel,
    );
    if (toasts.length > 0) {
      setAchievementQueue(prev => enqueueAchievements(prev, toasts));
    }

    return { newBadges: result.newBadges };
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await DB.saveSettings(updated);
  };

  const renameProfile = async (id: string, name: string, avatar?: string) => {
    await DB.renameProfile(id, name, avatar);
    await refreshProfiles();
  };

  const deleteProfile = async (id: string) => {
    await DB.deleteProfile(id);
    if (activeProfile?.id === id) {
      await selectProfile(null);
    } else {
      await refreshProfiles();
    }
  };

  const unlockLevelWithCoins = async (
    gameId: string,
    targetLevel: number,
    coinCost: number
  ): Promise<boolean> => {
    if (!activeProfile) return false;
    const result = await DB.unlockLevelWithCoins(activeProfile.id, gameId, targetLevel, coinCost);
    if (result) {
      const list = await DB.getProfiles();
      setProfiles(list);
      const updatedProfile = list.find(p => p.id === activeProfile.id) || null;
      setActiveProfile(updatedProfile);
      const updatedStats = await DB.getChildStats(activeProfile.id);
      setActiveStats(updatedStats);
      return true;
    }
    return false;
  };

  const showDialog = useCallback((opts: DialogOptions) => {
    setDialog(opts);
  }, []);

  const handleDismissAchievement = useCallback((id: string) => {
    setAchievementQueue(prev => dismissAchievement(prev, id));
  }, []);

  const startLevelUpCelebration = useCallback((profileId: string) => {
    const now = Date.now();
    setLevelUpCelebrations(prev => {
      const { map, activated } = activateLevelUpCelebration(prev, profileId, now, DANCE_DURATION_MS);
      if (activated) {
        if (danceTimersRef.current[profileId]) {
          clearTimeout(danceTimersRef.current[profileId]);
        }
        danceTimersRef.current[profileId] = setTimeout(() => {
          delete danceTimersRef.current[profileId];
          setLevelUpCelebrations(curr => pruneExpiredCelebrations(curr, Date.now()));
        }, DANCE_DURATION_MS);
      }
      return map;
    });
  }, []);

  const openLearningRecap = useCallback(() => {
    setIsLearningRecapOpen(true);
  }, []);

  const closeLearningRecap = useCallback(() => {
    setIsLearningRecapOpen(false);
  }, []);

  const registerRecapPlayHandler = useCallback(
    (handler: (gameId: LearningGameId, targetLevel: number) => void) => {
      recapPlayHandlerRef.current = handler;
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{
        profiles,
        activeProfile,
        activeStats,
        settings,
        isLoading,
        createProfile,
        selectProfile,
        renameProfile,
        deleteProfile,
        unlockLevelWithCoins,
        updateGameResult,
        updateSettings,
        refreshProfiles,
        showDialog,
        levelUpCelebrations,
        startLevelUpCelebration,
        learningRecap,
        openLearningRecap,
        closeLearningRecap,
        registerRecapPlayHandler,
      }}
    >
      {children}
      {dialog && (
        <div
          className="bt-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setDialog(null)}
        >
          <div className="bt-modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="bt-modal-title">{dialog.title}</h3>
            <p
              style={{
                fontSize: 15,
                color: 'var(--text-muted)',
                textAlign: 'center',
                lineHeight: 1.5,
                margin: '0 0 20px',
              }}
            >
              {dialog.message}
            </p>
            <div className="bt-modal-buttons">
              {dialog.onConfirm && (
                <button
                  type="button"
                  className="bt-modal-btn bt-modal-cancel"
                  onClick={() => setDialog(null)}
                >
                  {dialog.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                className={`bt-modal-btn ${dialog.destructive ? 'bt-modal-delete' : 'bt-modal-save'}`}
                onClick={async () => {
                  const cb = dialog.onConfirm;
                  setDialog(null);
                  if (cb) await cb();
                }}
              >
                {dialog.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
      <LearningRecapModal
        recap={isLearningRecapOpen ? learningRecap : null}
        onClose={closeLearningRecap}
        onPlaySuggested={(gameId, targetLevel) => {
          setIsLearningRecapOpen(false);
          recapPlayHandlerRef.current?.(gameId, targetLevel);
        }}
      />
      <AchievementToast
        items={achievementQueue}
        reducedMotion={settings.reducedMotion}
        highContrast={settings.highContrast}
        largeText={settings.largeText}
        onDismiss={handleDismissAchievement}
      />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
