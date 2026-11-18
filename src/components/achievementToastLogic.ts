import { badgeById, levelLabel } from '../games/shared/progression';

export type AchievementKind = 'badge' | 'level_up';

export interface AchievementToastItem {
  id: string;
  kind: AchievementKind;
  kicker: string;
  title: string;
  subtitle: string;
  emoji: string;
  accentColor: string;
  bgTint: string;
}

let seq = 0;
function nextToastId(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now()}_${seq}`;
}

/**
 * Pure factory that turns progression deltas (newly earned badges and/or a
 * player level-up) into ordered AchievementToastItem objects.
 */
export function buildAchievementToasts(
  newBadgeIds: string[],
  prevLevel: number,
  newLevel: number,
): AchievementToastItem[] {
  const items: AchievementToastItem[] = [];

  if (newLevel > prevLevel) {
    items.push({
      id: nextToastId(`lvl_${newLevel}`),
      kind: 'level_up',
      kicker: 'Level Up!',
      title: `Level ${newLevel} · ${levelLabel(newLevel)}`,
      subtitle: 'Your brain power just leveled up!',
      emoji: '🎉',
      accentColor: '#6366F1',
      bgTint: '#EEF2FF',
    });
  }

  for (const badgeId of newBadgeIds) {
    const def = badgeById(badgeId);
    if (!def) continue;
    items.push({
      id: nextToastId(`badge_${def.id}`),
      kind: 'badge',
      kicker: 'Badge Unlocked!',
      title: def.name,
      subtitle: def.description,
      emoji: def.emoji,
      accentColor: '#F59E0B',
      bgTint: '#FFFBEB',
    });
  }

  return items;
}

export function enqueueAchievements(
  queue: AchievementToastItem[],
  incoming: AchievementToastItem[],
): AchievementToastItem[] {
  if (incoming.length === 0) return queue;
  const existingIds = new Set(queue.map(item => item.id));
  const uniqueIncoming = incoming.filter(item => !existingIds.has(item.id));
  return uniqueIncoming.length > 0 ? [...queue, ...uniqueIncoming] : queue;
}

export function dismissAchievement(
  queue: AchievementToastItem[],
  id: string,
): AchievementToastItem[] {
  return queue.filter(item => item.id !== id);
}
