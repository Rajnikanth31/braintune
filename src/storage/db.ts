import {
  xpForStars,
  levelForXp,
  updateStreak,
  dayKey,
  evaluateBadges,
  newlyEarnedBadges,
  MAX_LEVEL,
  UNLOCK_ACCURACY,
} from '../games/shared/progression';

export interface ChildProfile {
  id: string;
  name: string;
  avatar: string;
  stars: number;
  completedSessions: number;
  lastPlayed: string;
  xp: number;
  level: number;
  streak: number;
  lastDayKey?: string;
  badges: string[];
  coins: number;
}

export interface GameStat {
  gameId: string;
  starsEarned: number;
  sessionsPlayed: number;
  successRate: number;
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
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEffectsEnabled: true,
  musicEnabled: true,
  voiceInstructionsEnabled: true,
  highContrast: false,
  reducedMotion: false,
  largeText: false,
};

const memoryFallback = new Map<string, string>();

const storage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback if localStorage is blocked
    }
    return memoryFallback.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback
    }
    memoryFallback.set(key, value);
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // Fallback
    }
    memoryFallback.delete(key);
  },
};

function normalizeProfile(p: Partial<ChildProfile> & { id: string }): ChildProfile {
  const stars = p.stars ?? 0;
  const xp = p.xp ?? xpForStars(stars);
  const coins = p.coins ?? stars * 5;
  return {
    id: p.id,
    name: p.name ?? 'Friend',
    avatar: p.avatar ?? '🦊',
    stars,
    completedSessions: p.completedSessions ?? 0,
    lastPlayed: p.lastPlayed ?? new Date().toISOString(),
    xp,
    level: levelForXp(xp),
    streak: p.streak ?? 0,
    lastDayKey: p.lastDayKey,
    badges: Array.isArray(p.badges) ? p.badges : [],
    coins,
  };
}

export const DB = {
  async getProfiles(): Promise<ChildProfile[]> {
    try {
      const data = storage.getItem(KEYS.PROFILES);
      const parsed: ChildProfile[] = data ? JSON.parse(data) : [];
      return parsed.map(normalizeProfile);
    } catch (e) {
      console.error('Failed to get profiles', e);
      return [];
    }
  },

  async saveProfiles(profiles: ChildProfile[]): Promise<void> {
    try {
      storage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
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
      xp: 0,
      level: 1,
      streak: 0,
      lastDayKey: undefined,
      badges: [],
      coins: 0,
    };
    profiles.push(newProfile);
    await this.saveProfiles(profiles);
    return newProfile;
  },

  async getActiveProfileId(): Promise<string | null> {
    try {
      return storage.getItem(KEYS.ACTIVE_PROFILE_ID);
    } catch (e) {
      console.error('Failed to get active profile ID', e);
      return null;
    }
  },

  async setActiveProfileId(id: string | null): Promise<void> {
    try {
      if (id) {
        storage.setItem(KEYS.ACTIVE_PROFILE_ID, id);
      } else {
        storage.removeItem(KEYS.ACTIVE_PROFILE_ID);
      }
    } catch (e) {
      console.error('Failed to set active profile ID', e);
    }
  },

  async getChildStats(childId: string): Promise<ChildStats> {
    try {
      const data = storage.getItem(`${KEYS.STATS_PREFIX}${childId}`);
      if (data) {
        return JSON.parse(data);
      }
      return {
        letters: { gameId: 'letters', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
        numbers: { gameId: 'numbers', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
        colors: { gameId: 'colors', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
        memory: { gameId: 'memory', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
        math: { gameId: 'math', starsEarned: 0, sessionsPlayed: 0, successRate: 100, highestDifficultyReached: 1 },
      };
    } catch (e) {
      console.error(`Failed to get stats for child ${childId}`, e);
      return {};
    }
  },

  async saveChildStats(childId: string, stats: ChildStats): Promise<void> {
    try {
      storage.setItem(`${KEYS.STATS_PREFIX}${childId}`, JSON.stringify(stats));
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
    difficultyLevel: number,
    coinsEarned: number = 0
  ): Promise<{ newBadges: string[]; prevLevel: number; newLevel: number; profile?: ChildProfile }> {
    try {
      const stats = await this.getChildStats(childId);
      const gameStat = stats[gameId] || {
        gameId,
        starsEarned: 0,
        sessionsPlayed: 0,
        successRate: 100,
        highestDifficultyReached: 1,
      };

      const prevTotalTaps = gameStat.sessionsPlayed * 10;
      const prevCorrectTaps = Math.round((gameStat.successRate / 100) * prevTotalTaps);

      const newSessions = gameStat.sessionsPlayed + 1;
      const newTotal = prevTotalTaps + totalTaps;
      const newCorrect = prevCorrectTaps + correctTaps;
      const newRate = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 100;

      const sessionAccuracy = totalTaps > 0 ? (correctTaps / totalTaps) * 100 : 100;
      const passed = sessionAccuracy >= UNLOCK_ACCURACY;
      const nextUnlockedLevel = passed ? difficultyLevel + 1 : difficultyLevel;
      const newHighest = Math.min(
        Math.max(gameStat.highestDifficultyReached, nextUnlockedLevel),
        MAX_LEVEL
      );

      stats[gameId] = {
        gameId,
        starsEarned: gameStat.starsEarned + starsEarned,
        sessionsPlayed: newSessions,
        successRate: newRate,
        highestDifficultyReached: newHighest,
      };
      await this.saveChildStats(childId, stats);

      const profiles = await this.getProfiles();
      const profileIndex = profiles.findIndex(p => p.id === childId);
      if (profileIndex > -1) {
        const profile = profiles[profileIndex];
        const prevLevel = profile.level ?? levelForXp(profile.xp);
        profile.stars += starsEarned;
        profile.coins = (profile.coins ?? 0) + coinsEarned;
        profile.xp += xpForStars(starsEarned);
        const newLevel = levelForXp(profile.xp);
        profile.level = newLevel;
        profile.completedSessions += 1;

        const streakResult = updateStreak(profile.streak, profile.lastDayKey);
        profile.streak = streakResult.streak;
        profile.lastDayKey = dayKey();
        profile.lastPlayed = new Date().toISOString();

        const fresh = newlyEarnedBadges({ profile, stats }, profile.badges);
        if (fresh.length) {
          profile.badges = [...profile.badges, ...fresh];
        }

        profiles[profileIndex] = profile;
        await this.saveProfiles(profiles);
        return { newBadges: fresh, prevLevel, newLevel, profile };
      }
      return { newBadges: [], prevLevel: 1, newLevel: 1, profile: undefined };
    } catch (e) {
      console.error(`Failed to update game session for child ${childId}`, e);
      return { newBadges: [], prevLevel: 1, newLevel: 1, profile: undefined };
    }
  },

  async syncBadges(childId: string): Promise<void> {
    try {
      const profiles = await this.getProfiles();
      const idx = profiles.findIndex(p => p.id === childId);
      if (idx < 0) return;
      const stats = await this.getChildStats(childId);
      const earned = evaluateBadges({ profile: profiles[idx], stats });
      profiles[idx].badges = earned;
      await this.saveProfiles(profiles);
    } catch (e) {
      console.error(`Failed to sync badges for child ${childId}`, e);
    }
  },

  async renameProfile(id: string, newName: string, newAvatar?: string): Promise<ChildProfile | null> {
    try {
      const profiles = await this.getProfiles();
      const idx = profiles.findIndex(p => p.id === id);
      if (idx > -1) {
        profiles[idx].name = newName;
        if (newAvatar) {
          profiles[idx].avatar = newAvatar;
        }
        await this.saveProfiles(profiles);
        return profiles[idx];
      }
      return null;
    } catch (e) {
      console.error(`Failed to rename profile ${id}`, e);
      return null;
    }
  },

  async deleteProfile(id: string): Promise<void> {
    try {
      const profiles = await this.getProfiles();
      const filtered = profiles.filter(p => p.id !== id);
      await this.saveProfiles(filtered);
      storage.removeItem(`${KEYS.STATS_PREFIX}${id}`);
    } catch (e) {
      console.error(`Failed to delete profile ${id}`, e);
    }
  },

  async unlockLevelWithCoins(
    childId: string,
    gameId: string,
    targetLevel: number,
    coinCost: number
  ): Promise<ChildProfile | null> {
    try {
      const profiles = await this.getProfiles();
      const idx = profiles.findIndex(p => p.id === childId);
      if (idx < 0) return null;
      const profile = profiles[idx];
      if (profile.coins < coinCost) {
        return null;
      }
      profile.coins -= coinCost;
      profiles[idx] = profile;
      await this.saveProfiles(profiles);

      const stats = await this.getChildStats(childId);
      const gameStat = stats[gameId] || {
        gameId,
        starsEarned: 0,
        sessionsPlayed: 0,
        successRate: 100,
        highestDifficultyReached: 1,
      };
      gameStat.highestDifficultyReached = Math.max(gameStat.highestDifficultyReached, targetLevel);
      stats[gameId] = gameStat;
      await this.saveChildStats(childId, stats);

      return profile;
    } catch (e) {
      console.error(`Failed to unlock level with coins for child ${childId}`, e);
      return null;
    }
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const data = storage.getItem(KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed to get settings', e);
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      storage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },
};
