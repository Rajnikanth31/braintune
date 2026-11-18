import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DB, ChildProfile, ChildStats, AppSettings } from '../storage/db';

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
    if (!activeProfile) return { newBadges: [] };

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
