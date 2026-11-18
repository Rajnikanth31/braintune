export const DANCE_DURATION_MS = 5500;

export interface LevelUpCelebrationEntry {
  profileId: string;
  newLevel: number;
  /** Null until the child actually sees a profile view where the avatar can dance. */
  expiresAt: number | null;
}

export type LevelUpCelebrationMap = Record<string, LevelUpCelebrationEntry>;

export function recordLevelUpCelebration(
  map: LevelUpCelebrationMap,
  profileId: string,
  prevLevel: number,
  newLevel: number,
): LevelUpCelebrationMap {
  if (!profileId || newLevel <= prevLevel) return map;
  return {
    ...map,
    [profileId]: {
      profileId,
      newLevel,
      expiresAt: null,
    },
  };
}

export function activateLevelUpCelebration(
  map: LevelUpCelebrationMap,
  profileId: string,
  now: number,
  durationMs: number = DANCE_DURATION_MS,
): { map: LevelUpCelebrationMap; activated: boolean; expiresAt: number | null } {
  const entry = map[profileId];
  if (!entry) {
    return { map, activated: false, expiresAt: null };
  }
  if (entry.expiresAt !== null) {
    return { map, activated: false, expiresAt: entry.expiresAt };
  }
  const expiresAt = now + durationMs;
  return {
    map: {
      ...map,
      [profileId]: {
        ...entry,
        expiresAt,
      },
    },
    activated: true,
    expiresAt,
  };
}

export function getActiveLevelUpCelebration(
  map: LevelUpCelebrationMap,
  profileId: string | undefined | null,
  now: number,
): LevelUpCelebrationEntry | null {
  if (!profileId) return null;
  const entry = map[profileId];
  if (!entry) return null;
  if (entry.expiresAt !== null && entry.expiresAt <= now) {
    return null;
  }
  return entry;
}

export function pruneExpiredCelebrations(
  map: LevelUpCelebrationMap,
  now: number,
): LevelUpCelebrationMap {
  let changed = false;
  const next: LevelUpCelebrationMap = {};
  for (const [id, entry] of Object.entries(map)) {
    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      changed = true;
    } else {
      next[id] = entry;
    }
  }
  return changed ? next : map;
}
