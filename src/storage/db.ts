import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChildProfile {
  id: string;
  name: string;
  avatar: string; // Name/key of the avatar asset
  stars: number; // Total stars earned
  completedSessions: number;
  lastPlayed: string; // ISO string
}

export interface GameStat {
  gameId: string; // 'letters', 'numbers', 'colors', 'memory'
  starsEarned: number;
  sessionsPlayed: number;
  successRate: number; // Percentage of correct taps
  highestDifficultyReached: number;
}

export interface ChildStats {
  [gameId: string]: GameStat;
}

const KEYS = {
  PROFILES: 'braintune_profiles',
  ACTIVE_PROFILE_ID: 'braintune_active_profile_id',
  STATS_PREFIX: 'braintune_stats_',
  SETTINGS: 'braintune_settings',
};

export interface AppSettings {
  soundEffectsEnabled: boolean;
  musicEnabled: boolean;
  voiceInstructionsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEffectsEnabled: true,
  musicEnabled: true,
  voiceInstructionsEnabled: true,
};

export const DB = {
  // Profiles
  async getProfiles(): Promise<ChildProfile[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PROFILES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get profiles', e);
      return [];
    }
  },

  async saveProfiles(profiles: ChildProfile[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save profiles', e);
    }
  },

  async addProfile(name: string, avatar: string): Promise<ChildProfile> {
    const profiles = await this.getProfiles();
    const newProfile: ChildProfile = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      avatar,
      stars: 0,
      completedSessions: 0,
      lastPlayed: new Date().toISOString(),
    };
    profiles.push(newProfile);
    await this.saveProfiles(profiles);
    return newProfile;
  },

  async getActiveProfileId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.ACTIVE_PROFILE_ID);
    } catch (e) {
      console.error('Failed to get active profile ID', e);
      return null;
    }
  },

  async setActiveProfileId(id: string | null): Promise<void> {
    try {
      if (id) {
        await AsyncStorage.setItem(KEYS.ACTIVE_PROFILE_ID, id);
      } else {
        await AsyncStorage.removeItem(KEYS.ACTIVE_PROFILE_ID);
      }
    } catch (e) {
      console.error('Failed to set active profile ID', e);
    }
  },

  // Stats
  async getChildStats(childId: string): Promise<ChildStats> {
    try {
      const data = await AsyncStorage.getItem(`${KEYS.STATS_PREFIX}${childId}`);
      if (data) {
        return JSON.parse(data);
      }
      
      // Default empty stats structure
      const defaultStats: ChildStats = {
        letters: { gameId: 'letters', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
        numbers: { gameId: 'numbers', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
        colors: { gameId: 'colors', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
        memory: { gameId: 'memory', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
      };
      return defaultStats;
    } catch (e) {
      console.error(`Failed to get stats for child ${childId}`, e);
      return {};
    }
  },

  async saveChildStats(childId: string, stats: ChildStats): Promise<void> {
    try {
      await AsyncStorage.setItem(`${KEYS.STATS_PREFIX}${childId}`, JSON.stringify(stats));
    } catch (e) {
      console.error(`Failed to save stats for child ${childId}`, e);
    }
  },

  async updateGameSession(
    childId: string,
    gameId: string,
    starsEarned: number,
    correctTaps: number,
    totalTaps: number,
    difficultyLevel: number
  ): Promise<void> {
    try {
      // 1. Update stats for this game
      const stats = await this.getChildStats(childId);
      const gameStat = stats[gameId] || {
        gameId,
        starsEarned: 0,
        sessionsPlayed: 0,
        successRate: 100,
        highestDifficultyReached: 1,
      };

      const prevTotalTaps = gameStat.sessionsPlayed * 10; // estimate past taps
      const prevCorrectTaps = Math.round((gameStat.successRate / 100) * prevTotalTaps);
      
      const newSessions = gameStat.sessionsPlayed + 1;
      const newTotal = prevTotalTaps + totalTaps;
      const newCorrect = prevCorrectTaps + correctTaps;
      const newRate = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 100;

      stats[gameId] = {
        gameId,
        starsEarned: gameStat.starsEarned + starsEarned,
        sessionsPlayed: newSessions,
        successRate: newRate,
        highestDifficultyReached: Math.max(gameStat.highestDifficultyReached, difficultyLevel),
      };
      await this.saveChildStats(childId, stats);

      // 2. Update profile star count and completed sessions
      const profiles = await this.getProfiles();
      const profileIndex = profiles.findIndex(p => p.id === childId);
      if (profileIndex > -1) {
        profiles[profileIndex].stars += starsEarned;
        profiles[profileIndex].completedSessions += 1;
        profiles[profileIndex].lastPlayed = new Date().toISOString();
        await this.saveProfiles(profiles);
      }
    } catch (e) {
      console.error(`Failed to update game session for child ${childId}`, e);
    }
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed to get settings', e);
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },
};
