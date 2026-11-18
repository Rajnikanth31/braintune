export type PetSpeciesId =
  | 'pet_sprout_pup'
  | 'pet_star_cat'
  | 'pet_blossom_bunny'
  | 'pet_little_dragon';

export interface PetSpeciesDef {
  id: PetSpeciesId;
  name: string;
  speciesLabel: string;
  eggEmoji: string;
  stageEmojis: [string, string, string, string];
  accentColor: string;
  bgTint: string;
  unlockTasks: number;
  personality: string;
}

export const PET_CATALOG: PetSpeciesDef[] = [
  {
    id: 'pet_sprout_pup',
    name: 'Pip',
    speciesLabel: 'Sprout Pup',
    eggEmoji: '🥚',
    stageEmojis: ['🐶', '🐶', '🐕', '🐕'],
    accentColor: '#F59E0B',
    bgTint: '#FEF3C7',
    unlockTasks: 1,
    personality: 'Loyal trail buddy who wags faster every time you learn!',
  },
  {
    id: 'pet_star_cat',
    name: 'Mochi',
    speciesLabel: 'Starlight Cat',
    eggEmoji: '🟣',
    stageEmojis: ['🐱', '🐱', '🐈', '🐈'],
    accentColor: '#8B5CF6',
    bgTint: '#EDE9FE',
    unlockTasks: 3,
    personality: 'Curious whisker pal who spots patterns and hidden sparkles.',
  },
  {
    id: 'pet_blossom_bunny',
    name: 'Pebble',
    speciesLabel: 'Blossom Bunny',
    eggEmoji: '🌸',
    stageEmojis: ['🐰', '🐰', '🐇', '🐇'],
    accentColor: '#EC4899',
    bgTint: '#FCE7F3',
    unlockTasks: 5,
    personality: 'Cheerful meadow hopper who celebrates every new high score.',
  },
  {
    id: 'pet_little_dragon',
    name: 'Ember',
    speciesLabel: 'Little Dragon',
    eggEmoji: '🔥',
    stageEmojis: ['🐣', '🦎', '🐉', '🐲'],
    accentColor: '#10B981',
    bgTint: '#D1FAE5',
    unlockTasks: 8,
    personality: 'Hatches from a cozy emerald egg into a soaring Quest Dragon!',
  },
];

export interface PetGrowthStageInfo {
  stage: 1 | 2 | 3 | 4;
  label: string;
  badgeEmoji: string;
  minTasks: number;
  nextTasks: number | null;
  progress: number; // 0..1 toward next stage (1 if Legend)
  canvasScale: number;
  ringColor: string;
}

const STAGE_THRESHOLDS: Array<{
  stage: 1 | 2 | 3 | 4;
  label: string;
  badgeEmoji: string;
  minTasks: number;
  nextTasks: number | null;
  canvasScale: number;
  ringColor: string;
}> = [
  {
    stage: 1,
    label: 'Baby',
    badgeEmoji: '🌱',
    minTasks: 0,
    nextTasks: 3,
    canvasScale: 0.78,
    ringColor: '#34D399',
  },
  {
    stage: 2,
    label: 'Explorer',
    badgeEmoji: '⭐',
    minTasks: 3,
    nextTasks: 6,
    canvasScale: 0.94,
    ringColor: '#60A5FA',
  },
  {
    stage: 3,
    label: 'Champion',
    badgeEmoji: '👑',
    minTasks: 6,
    nextTasks: 10,
    canvasScale: 1.1,
    ringColor: '#FBBF24',
  },
  {
    stage: 4,
    label: 'Legend',
    badgeEmoji: '🌟',
    minTasks: 10,
    nextTasks: null,
    canvasScale: 1.24,
    ringColor: '#F472B6',
  },
];

export interface PlayerPetState {
  adoptedPetId: PetSpeciesId | null;
  customName: string;
  tasksCompleted: number;
  adoptedAt?: string;
}

export function createInitialPetState(
  saved?: Partial<PlayerPetState> | null,
  fallbackTasks: number = 0,
): PlayerPetState {
  const validId =
    saved?.adoptedPetId && PET_CATALOG.some(p => p.id === saved.adoptedPetId)
      ? saved.adoptedPetId
      : null;

  return {
    adoptedPetId: validId,
    customName: typeof saved?.customName === 'string' ? saved.customName : '',
    tasksCompleted: Math.max(saved?.tasksCompleted ?? 0, fallbackTasks),
    adoptedAt: saved?.adoptedAt,
  };
}

export function getPetById(id: PetSpeciesId | null | undefined): PetSpeciesDef | null {
  if (!id) return null;
  return PET_CATALOG.find(p => p.id === id) ?? null;
}

export function isPetUnlocked(pet: PetSpeciesDef, tasksCompleted: number): boolean {
  return tasksCompleted >= pet.unlockTasks;
}

export function getUnlockedPets(tasksCompleted: number): PetSpeciesDef[] {
  return PET_CATALOG.filter(pet => isPetUnlocked(pet, tasksCompleted));
}

export function getNextLockedPet(tasksCompleted: number): PetSpeciesDef | null {
  return PET_CATALOG.find(pet => !isPetUnlocked(pet, tasksCompleted)) ?? null;
}

export function getPetGrowthStage(tasksCompleted: number): PetGrowthStageInfo {
  const safeTasks = Math.max(0, Math.floor(tasksCompleted));
  let matched = STAGE_THRESHOLDS[0];
  for (const tier of STAGE_THRESHOLDS) {
    if (safeTasks >= tier.minTasks) {
      matched = tier;
    }
  }

  let progress = 1;
  if (matched.nextTasks !== null) {
    const span = Math.max(1, matched.nextTasks - matched.minTasks);
    progress = Math.min(1, Math.max(0, (safeTasks - matched.minTasks) / span));
  }

  return {
    ...matched,
    progress,
  };
}

export function getPetDisplayEmoji(pet: PetSpeciesDef, stage: 1 | 2 | 3 | 4): string {
  return pet.stageEmojis[stage - 1] ?? pet.stageEmojis[0];
}

export function getPetDisplayName(state: PlayerPetState): string {
  const pet = getPetById(state.adoptedPetId);
  if (!pet) return '';
  const trimmed = state.customName.trim();
  return trimmed || pet.name;
}

export function adoptPetInState(
  state: PlayerPetState,
  petId: PetSpeciesId,
  customName?: string,
  nowIso: string = new Date().toISOString(),
): { state: PlayerPetState; adopted: boolean; reason?: string } {
  const pet = getPetById(petId);
  if (!pet) {
    return { state, adopted: false, reason: 'Pet not found.' };
  }
  if (!isPetUnlocked(pet, state.tasksCompleted)) {
    const remaining = pet.unlockTasks - state.tasksCompleted;
    return {
      state,
      adopted: false,
      reason: `Complete ${remaining} more learning task${remaining === 1 ? '' : 's'} to unlock ${pet.name}!`,
    };
  }

  const trimmedName = (customName ?? '').trim().slice(0, 14);
  return {
    adopted: true,
    state: {
      ...state,
      adoptedPetId: pet.id,
      customName: trimmedName || pet.name,
      adoptedAt: state.adoptedAt ?? nowIso,
    },
  };
}

export interface PetMilestoneEvents {
  newlyUnlockedPets: PetSpeciesDef[];
  grewFromStage: 1 | 2 | 3 | 4 | null;
  grewToStage: 1 | 2 | 3 | 4 | null;
}

export function evaluatePetMilestones(
  prevTasks: number,
  nextTasks: number,
  petState: PlayerPetState,
): PetMilestoneEvents {
  const newlyUnlockedPets = PET_CATALOG.filter(
    pet => prevTasks < pet.unlockTasks && nextTasks >= pet.unlockTasks,
  );

  let grewFromStage: 1 | 2 | 3 | 4 | null = null;
  let grewToStage: 1 | 2 | 3 | 4 | null = null;

  if (petState.adoptedPetId) {
    const prevStage = getPetGrowthStage(prevTasks).stage;
    const nextStage = getPetGrowthStage(nextTasks).stage;
    if (nextStage > prevStage) {
      grewFromStage = prevStage;
      grewToStage = nextStage;
    }
  }

  return {
    newlyUnlockedPets,
    grewFromStage,
    grewToStage,
  };
}

/**
 * Pure follower kinematics for Quest World RPG: keeps the pet smoothly trailing
 * ~38px behind/beside the hero without jitter or sticking inside the hero sprite.
 */
export function stepPetFollow(
  petX: number,
  petY: number,
  playerX: number,
  playerY: number,
  facingAngle: number,
  dt: number,
): { x: number; y: number; movedDist: number } {
  const followDist = 38;
  // Sit slightly behind & angled left relative to hero facing so pet is never hidden under hero
  const restAngle = facingAngle + Math.PI * 0.82;
  const targetX = playerX + Math.cos(restAngle) * followDist;
  const targetY = playerY + Math.sin(restAngle) * followDist;

  const dx = targetX - petX;
  const dy = targetY - petY;
  const dist = Math.hypot(dx, dy);

  // Snap softly if spawning far away (e.g. initial load or reset)
  if (dist > 220) {
    return { x: targetX, y: targetY, movedDist: 0 };
  }

  if (dist <= 2.5) {
    return { x: petX, y: petY, movedDist: 0 };
  }

  const speed = Math.min(240, Math.max(95, dist * 5.2));
  const step = Math.min(dist, speed * Math.max(0, Math.min(dt, 0.05)));
  const nx = petX + (dx / dist) * step;
  const ny = petY + (dy / dist) * step;

  return { x: nx, y: ny, movedDist: step };
}

export const GUEST_PET_STORAGE_KEY = 'braintune_guest_pet';

export function loadGuestPetState(): PlayerPetState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialPetState();
  }
  try {
    const raw = window.localStorage.getItem(GUEST_PET_STORAGE_KEY);
    if (raw) {
      return createInitialPetState(JSON.parse(raw));
    }
  } catch {
    // Ignore storage error
  }
  return createInitialPetState();
}

export function saveGuestPetState(state: PlayerPetState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(GUEST_PET_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage error
  }
}
