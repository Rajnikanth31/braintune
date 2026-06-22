import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DB, ChildProfile, ChildStats, AppSettings } from '../storage/db';

interface AppContextType {
  profiles: ChildProfile[];
  activeProfile: ChildProfile | null;
  activeStats: ChildStats | null;
  settings: AppSettings;
  isLoading: boolean;
  createProfile: (name: string, avatar: string) => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;
  updateGameResult: (
    gameId: string,
    starsEarned: number,
    correctTaps: number,
    totalTaps: number,
    difficultyLevel: number
  ) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  refreshProfiles: () => Promise<void>;
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
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load Settings
        const savedSettings = await DB.getSettings();
        setSettings(savedSettings);

        // Load Profiles
        const list = await DB.getProfiles();
        setProfiles(list);

        // Load Active Profile
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
    await refreshProfiles();
    // Auto-select if first profile
    if (profiles.length === 0) {
      await selectProfile(newProfile.id);
    }
  };

  const selectProfile = async (id: string | null) => {
    await DB.setActiveProfileId(id);
    if (id) {
      const profile = profiles.find(p => p.id === id) || null;
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
    difficultyLevel: number
  ) => {
    if (!activeProfile) return;

    await DB.updateGameSession(
      activeProfile.id,
      gameId,
      starsEarned,
      correctTaps,
      totalTaps,
      difficultyLevel
    );
    
    // Refresh local state
    await refreshProfiles();
    const updatedStats = await DB.getChildStats(activeProfile.id);
    setActiveStats(updatedStats);
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await DB.saveSettings(updated);
  };

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
        updateGameResult,
        updateSettings,
        refreshProfiles,
      }}
    >
      {children}
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
