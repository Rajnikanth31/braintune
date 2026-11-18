export type TileKind = 'grass' | 'path' | 'bridge' | 'water' | 'tree' | 'house' | 'flower';

export const TILE_SIZE = 48;
export const MAP_COLS = 24;
export const MAP_ROWS = 16;
export const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

// 24 columns x 16 rows
// T = tree, W = water, B = bridge, P = path, F = flower, H = house, . = grass
const RAW_MAP: string[] = [
  'TTTTTTTTTTTTWTTTTTTTTTTT', // 0
  'T..F....T...W...F....T.T', // 1
  'T...HH..T...W..T....F..T', // 2  Library (4,2)-(5,2)
  'T...PP..F...W....HH....T', // 3  Bakery (17,3)-(18,3)
  'T..PPPP.....W....PPP...T', // 4
  'T..P..P..F..W..F.P.P..TT', // 5
  'T.FP..PPPPPPBPPPPP.P...T', // 6  Main bridge y=6..7? Let's make bridge at y=7..8
  'T..PPPPPP...W...PPPP...T', // 7
  'T..PPPPPPPPPBP..P..P.F.T', // 8  Bridge at x=12, y=8 and y=6
  'T..P..F.....W...P..P...T', // 9
  'TF.P.....T..W..TP.HH...T', // 10 Observatory (18,10)-(19,10)
  'T..PPPP..T..W...P.PP...T', // 11
  'T.....P.....W..F..P....T', // 12
  'T.F...PPPPPPBPPPPPP..F.T', // 13 Southern bridge at x=12, y=13
  'T.........F.W..........T', // 14
  'TTTTTTTTTTTTWTTTTTTTTTTT', // 15
];

const CHAR_TO_TILE: Record<string, TileKind> = {
  '.': 'grass',
  P: 'path',
  B: 'bridge',
  W: 'water',
  T: 'tree',
  H: 'house',
  F: 'flower',
};

export const WORLD_MAP: TileKind[][] = RAW_MAP.map(row =>
  row.split('').map(ch => CHAR_TO_TILE[ch] || 'grass'),
);

export function getTileAt(tx: number, ty: number): TileKind {
  if (tx < 0 || ty < 0 || tx >= MAP_COLS || ty >= MAP_ROWS) {
    return 'tree';
  }
  return WORLD_MAP[ty][tx];
}

export function isTileWalkable(tx: number, ty: number): boolean {
  const tile = getTileAt(tx, ty);
  return tile === 'grass' || tile === 'path' || tile === 'bridge' || tile === 'flower';
}

export function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return {
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2,
  };
}

export const PLAYER_SPAWN = tileCenter(5, 7);
export const PLAYER_RADIUS = 14;
export const PLAYER_SPEED = 205; // px per second
export const INTERACT_RADIUS = 64;
export const PICKUP_RADIUS = 34;

export interface WorldPoint {
  x: number;
  y: number;
}

export function canStandAt(x: number, y: number, radius: number = PLAYER_RADIUS): boolean {
  const minX = x - radius;
  const maxX = x + radius;
  const minY = y - radius;
  const maxY = y + radius;

  const corners = [
    { cx: minX, cy: minY },
    { cx: maxX, cy: minY },
    { cx: minX, cy: maxY },
    { cx: maxX, cy: maxY },
  ];

  for (const { cx, cy } of corners) {
    if (cx < 0 || cy < 0 || cx >= WORLD_WIDTH || cy >= WORLD_HEIGHT) {
      return false;
    }
    const tx = Math.floor(cx / TILE_SIZE);
    const ty = Math.floor(cy / TILE_SIZE);
    if (!isTileWalkable(tx, ty)) {
      return false;
    }
  }
  return true;
}

export function movePlayerWithCollision(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number = PLAYER_RADIUS,
): WorldPoint {
  let nextX = x;
  let nextY = y;

  const clearsNpcs = (cx: number, cy: number) =>
    NPCS.every(npc => {
      const nc = tileCenter(npc.tileX, npc.tileY);
      const dist = Math.hypot(cx - nc.x, cy - nc.y);
      const prevDist = Math.hypot(x - nc.x, y - nc.y);
      return dist >= 30 || dist >= prevDist;
    });

  if (dx !== 0 && canStandAt(x + dx, nextY, radius) && clearsNpcs(x + dx, nextY)) {
    nextX = x + dx;
  }
  if (dy !== 0 && canStandAt(nextX, y + dy, radius) && clearsNpcs(nextX, y + dy)) {
    nextY = y + dy;
  }

  return { x: nextX, y: nextY };
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  emoji: string;
  accentColor: string;
  tileX: number;
  tileY: number;
  landmark: string;
  greeting: string;
  linkedGameId?: 'memory' | 'letters' | 'numbers' | 'colors' | 'math';
}

export const NPCS: NpcDef[] = [
  {
    id: 'npc_bino',
    name: 'Bino',
    title: 'Village Guide',
    emoji: '🧠',
    accentColor: '#3B82F6',
    tileX: 7,
    tileY: 7,
    landmark: 'Village Square',
    greeting:
      'Welcome to Quest World! Walk along the paths to meet friends, open chests, and take on new tasks!',
    linkedGameId: 'memory',
  },
  {
    id: 'npc_owl',
    name: 'Professor Owl',
    title: 'Story Keeper',
    emoji: '🦉',
    accentColor: '#8B5CF6',
    tileX: 4,
    tileY: 3,
    landmark: 'Library Oak',
    greeting:
      'Hoo-hoo! The gentle breeze scattered stories across the meadow. Want to help me or solve a word riddle?',
    linkedGameId: 'letters',
  },
  {
    id: 'npc_bear',
    name: 'Chef Bear',
    title: 'Honey Baker',
    emoji: '🐻',
    accentColor: '#F97316',
    tileX: 18,
    tileY: 4,
    landmark: 'Honey Bakery',
    greeting:
      'Smell those warm muffins? Walk into the woods for sweet berries or help me count cookie trays!',
    linkedGameId: 'numbers',
  },
  {
    id: 'npc_turtle',
    name: 'Captain Shell',
    title: 'Harbor Keeper',
    emoji: '🐢',
    accentColor: '#10B981',
    tileX: 9,
    tileY: 13,
    landmark: 'River Pier',
    greeting:
      'Ahoy, explorer! Lanterns and colorful shells line the riverbank. Ready for a coastal task?',
    linkedGameId: 'colors',
  },
  {
    id: 'npc_bot',
    name: 'Sparky Bot',
    title: 'Star Explorer',
    emoji: '🤖',
    accentColor: '#06B6D4',
    tileX: 19,
    tileY: 11,
    landmark: 'Star Observatory',
    greeting:
      'Beep-boop! My telescope spotted glowing star shards and math fuel puzzles on the hill!',
    linkedGameId: 'math',
  },
];

export interface MiniQuestDef {
  id: string;
  npcId: string;
  gameId: 'memory' | 'letters' | 'numbers' | 'colors' | 'math';
  gameLabel: string;
  title: string;
  promptLine: string;
  keyId: string;
  keyName: string;
  keyEmoji: string;
  rewardStars: number;
  rewardCoins: number;
}

export const NPC_MINI_QUESTS: MiniQuestDef[] = [
  {
    id: 'mq_bino_memory',
    npcId: 'npc_bino',
    gameId: 'memory',
    gameLabel: 'Memory Match',
    title: 'Memory Key Challenge',
    promptLine: 'Complete a Memory Match round to unlock the Village Guide Key!',
    keyId: 'key_village',
    keyName: 'Village Guide Key',
    keyEmoji: '🗝️',
    rewardStars: 3,
    rewardCoins: 20,
  },
  {
    id: 'mq_owl_letters',
    npcId: 'npc_owl',
    gameId: 'letters',
    gameLabel: 'Letters & Phonics',
    title: 'Library Letters Trial',
    promptLine: 'Solve a Letters & Phonics round to earn the Brass Library Key!',
    keyId: 'key_library',
    keyName: 'Brass Library Key',
    keyEmoji: '🔑',
    rewardStars: 3,
    rewardCoins: 20,
  },
  {
    id: 'mq_bear_numbers',
    npcId: 'npc_bear',
    gameId: 'numbers',
    gameLabel: 'Numbers & Counting',
    title: 'Bakery Counting Quest',
    promptLine: 'Finish a Numbers & Counting round to win the Golden Bakery Key!',
    keyId: 'key_bakery',
    keyName: 'Golden Bakery Key',
    keyEmoji: '🗝️',
    rewardStars: 3,
    rewardCoins: 25,
  },
  {
    id: 'mq_turtle_colors',
    npcId: 'npc_turtle',
    gameId: 'colors',
    gameLabel: 'Colors & Shapes',
    title: 'Harbor Colors Trial',
    promptLine: 'Match coastal colors and shapes to earn the Harbor Lantern Key!',
    keyId: 'key_harbor',
    keyName: 'Harbor Lantern Key',
    keyEmoji: '🔑',
    rewardStars: 3,
    rewardCoins: 25,
  },
  {
    id: 'mq_bot_math',
    npcId: 'npc_bot',
    gameId: 'math',
    gameLabel: 'Math & Logic',
    title: 'Observatory Math Key',
    promptLine: 'Solve the Math & Logic challenges to get the Observatory Key!',
    keyId: 'key_observatory',
    keyName: 'Observatory Key',
    keyEmoji: '🗝️',
    rewardStars: 4,
    rewardCoins: 30,
  },
];

export interface ChestDef {
  id: string;
  label: string;
  tileX: number;
  tileY: number;
  coins: number;
  stars: number;
  requiresKey?: boolean;
}

export const CHESTS: ChestDef[] = [
  { id: 'chest_key_vault', label: 'Royal Key Vault', tileX: 8, tileY: 5, coins: 40, stars: 5, requiresKey: true },
  { id: 'chest_grove', label: 'Blossom Chest', tileX: 2, tileY: 13, coins: 12, stars: 1 },
  { id: 'chest_north', label: 'Meadow Chest', tileX: 10, tileY: 2, coins: 15, stars: 1 },
  { id: 'chest_woods', label: 'Woods Chest', tileX: 21, tileY: 2, coins: 18, stars: 2 },
  { id: 'chest_hill', label: 'Observatory Chest', tileX: 21, tileY: 13, coins: 20, stars: 2 },
];

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answer: string;
}

export type QuestKind = 'collect' | 'quiz';

export interface QuestDef {
  id: string;
  npcId: string;
  title: string;
  description: string;
  kind: QuestKind;
  itemEmoji?: string;
  itemName?: string;
  locations?: { tileX: number; tileY: number }[];
  questions?: QuizQuestion[];
  rewardStars: number;
  rewardCoins: number;
  isDynamic?: boolean;
}

export const QUEST_DEFINITIONS: QuestDef[] = [
  {
    id: 'q_bino_tour',
    npcId: 'npc_bino',
    title: 'Sparkle Scout',
    description: 'Walk around Village Square & Meadow to gather 3 Sunny Sparkles, then report back to Bino!',
    kind: 'collect',
    itemEmoji: '✨',
    itemName: 'Sunny Sparkle',
    locations: [
      { tileX: 2, tileY: 6 },
      { tileX: 9, tileY: 8 },
      { tileX: 6, tileY: 11 },
    ],
    rewardStars: 2,
    rewardCoins: 15,
  },
  {
    id: 'q_owl_pages',
    npcId: 'npc_owl',
    title: 'Lost Story Pages',
    description: 'Walk through the western paths and wildflowers to find 3 Floating Pages for the Library!',
    kind: 'collect',
    itemEmoji: '📖',
    itemName: 'Story Page',
    locations: [
      { tileX: 2, tileY: 2 },
      { tileX: 10, tileY: 5 },
      { tileX: 2, tileY: 10 },
    ],
    rewardStars: 3,
    rewardCoins: 18,
  },
  {
    id: 'q_owl_riddles',
    npcId: 'npc_owl',
    title: 'Library Riddle Trial',
    description: "Solve Professor Owl's 3 playful word & memory riddles!",
    kind: 'quiz',
    questions: [
      { prompt: 'Which word starts with the letter B?', choices: ['Bear', 'Sun', 'Tree'], answer: 'Bear' },
      { prompt: 'What rhymes with "Star"?', choices: ['Car', 'Moon', 'Book'], answer: 'Car' },
      { prompt: 'Which animal says "Hoo-hoo"?', choices: ['Owl', 'Frog', 'Duck'], answer: 'Owl' },
    ],
    rewardStars: 3,
    rewardCoins: 20,
  },
  {
    id: 'q_bear_berries',
    npcId: 'npc_bear',
    title: 'Honey Berry Harvest',
    description: 'Cross the bridge to the east and gather 3 Golden Berries for Chef Bear!',
    kind: 'collect',
    itemEmoji: '🍓',
    itemName: 'Golden Berry',
    locations: [
      { tileX: 15, tileY: 4 },
      { tileX: 20, tileY: 3 },
      { tileX: 16, tileY: 8 },
    ],
    rewardStars: 3,
    rewardCoins: 20,
  },
  {
    id: 'q_bear_cookies',
    npcId: 'npc_bear',
    title: 'Bakery Cookie Count',
    description: 'Help Chef Bear count and pack freshly baked cookie boxes!',
    kind: 'quiz',
    questions: [
      { prompt: '2 cookies + 3 cookies = how many?', choices: ['4', '5', '6'], answer: '5' },
      { prompt: 'Which tray has 4 treats: 🍪🍪🍪 or 🍪🍪🍪🍪?', choices: ['3 treats', '4 treats', '2 treats'], answer: '4 treats' },
      { prompt: '6 muffins minus 2 eaten = how many left?', choices: ['4', '3', '5'], answer: '4' },
    ],
    rewardStars: 4,
    rewardCoins: 25,
  },
  {
    id: 'q_turtle_lanterns',
    npcId: 'npc_turtle',
    title: 'Harbor Lantern Run',
    description: 'Walk along the southern path to collect 3 Glowing Lanterns for Captain Shell!',
    kind: 'collect',
    itemEmoji: '🏮',
    itemName: 'Harbor Lantern',
    locations: [
      { tileX: 4, tileY: 13 },
      { tileX: 15, tileY: 13 },
      { tileX: 11, tileY: 11 },
    ],
    rewardStars: 3,
    rewardCoins: 20,
  },
  {
    id: 'q_bot_shards',
    npcId: 'npc_bot',
    title: 'Starlight Shards',
    description: 'Explore around Star Observatory and collect 3 fallen Starlight Shards!',
    kind: 'collect',
    itemEmoji: '🌠',
    itemName: 'Star Shard',
    locations: [
      { tileX: 16, tileY: 10 },
      { tileX: 21, tileY: 11 },
      { tileX: 18, tileY: 14 },
    ],
    rewardStars: 4,
    rewardCoins: 25,
  },
  {
    id: 'q_bot_rocket',
    npcId: 'npc_bot',
    title: 'Rocket Launch Math',
    description: 'Compute 3 rocket fuel equations with Sparky Bot!',
    kind: 'quiz',
    questions: [
      { prompt: '5 + 4 fuel cells = ?', choices: ['8', '9', '10'], answer: '9' },
      { prompt: '10 - 3 boosters = ?', choices: ['7', '6', '8'], answer: '7' },
      { prompt: '2 × 4 star engines = ?', choices: ['6', '8', '10'], answer: '8' },
    ],
    rewardStars: 4,
    rewardCoins: 30,
  },
];

export type QuestStatus = 'active' | 'ready_to_turn_in' | 'completed';

export interface ActiveQuestInstance {
  quest: QuestDef;
  status: QuestStatus;
  collectedIndices: number[]; // indices into quest.locations
}

export interface PendingMiniQuest {
  npcId: string;
  questId: string;
  gameId: 'memory' | 'letters' | 'numbers' | 'colors' | 'math';
  title: string;
  keyId: string;
  keyName: string;
  keyEmoji: string;
  rewardStars: number;
  rewardCoins: number;
}

export interface RpgSaveState {
  playerX: number;
  playerY: number;
  openedChests: string[];
  completedQuestIds: string[];
  activeQuest: ActiveQuestInstance | null;
  dynamicTasksCompleted: number;
  stepsWalked: number;
  earnedKeys: string[];
  pendingMiniQuest: PendingMiniQuest | null;
  recentUnlockedKey: { keyId: string; keyName: string; keyEmoji: string; npcName: string } | null;
}

export function createInitialRpgState(saved?: Partial<RpgSaveState> | null): RpgSaveState {
  const validSpawn =
    saved &&
    typeof saved.playerX === 'number' &&
    typeof saved.playerY === 'number' &&
    canStandAt(saved.playerX, saved.playerY)
      ? { x: saved.playerX, y: saved.playerY }
      : PLAYER_SPAWN;

  return {
    playerX: validSpawn.x,
    playerY: validSpawn.y,
    openedChests: Array.isArray(saved?.openedChests) ? saved.openedChests : [],
    completedQuestIds: Array.isArray(saved?.completedQuestIds) ? saved.completedQuestIds : [],
    activeQuest: saved?.activeQuest ?? null,
    dynamicTasksCompleted: saved?.dynamicTasksCompleted ?? 0,
    stepsWalked: saved?.stepsWalked ?? 0,
    earnedKeys: Array.isArray(saved?.earnedKeys) ? saved.earnedKeys : [],
    pendingMiniQuest: saved?.pendingMiniQuest ?? null,
    recentUnlockedKey: saved?.recentUnlockedKey ?? null,
  };
}

export function getNpcMiniQuest(npcId: string): MiniQuestDef | null {
  return NPC_MINI_QUESTS.find(mq => mq.npcId === npcId) ?? null;
}

export function startNpcMiniQuest(state: RpgSaveState, npcId: string): {
  state: RpgSaveState;
  miniQuest: MiniQuestDef | null;
} {
  const mq = getNpcMiniQuest(npcId);
  if (!mq) return { state, miniQuest: null };

  return {
    miniQuest: mq,
    state: {
      ...state,
      pendingMiniQuest: {
        npcId: mq.npcId,
        questId: mq.id,
        gameId: mq.gameId,
        title: mq.title,
        keyId: mq.keyId,
        keyName: mq.keyName,
        keyEmoji: mq.keyEmoji,
        rewardStars: mq.rewardStars,
        rewardCoins: mq.rewardCoins,
      },
    },
  };
}

export function resolvePendingMiniQuestOnGameComplete(
  state: RpgSaveState,
  gameId: string,
  correctCount: number,
): {
  state: RpgSaveState;
  unlockedKey: { keyId: string; keyName: string; keyEmoji: string; npcName: string } | null;
} {
  const pending = state.pendingMiniQuest;
  if (!pending || pending.gameId !== gameId || correctCount <= 0) {
    return { state, unlockedKey: null };
  }

  const npcName = NPCS.find(n => n.id === pending.npcId)?.name || 'a villager';
  const nextEarnedKeys = state.earnedKeys.includes(pending.keyId)
    ? state.earnedKeys
    : [...state.earnedKeys, pending.keyId];
  const unlockedKey = {
    keyId: pending.keyId,
    keyName: pending.keyName,
    keyEmoji: pending.keyEmoji,
    npcName,
  };

  return {
    unlockedKey,
    state: {
      ...state,
      earnedKeys: nextEarnedKeys,
      pendingMiniQuest: null,
      recentUnlockedKey: unlockedKey,
    },
  };
}

export function getNextQuestForNpc(npcId: string, state: RpgSaveState): QuestDef | null {
  if (
    state.activeQuest &&
    state.activeQuest.quest.npcId === npcId &&
    state.activeQuest.status !== 'completed'
  ) {
    return state.activeQuest.quest;
  }
  const done = new Set(state.completedQuestIds);
  return QUEST_DEFINITIONS.find(q => q.npcId === npcId && !done.has(q.id)) ?? null;
}

export function acceptQuest(state: RpgSaveState, quest: QuestDef): RpgSaveState {
  return {
    ...state,
    activeQuest: {
      quest,
      status: quest.kind === 'quiz' ? 'active' : 'active',
      collectedIndices: [],
    },
  };
}

export function markActiveQuizReady(state: RpgSaveState): RpgSaveState {
  if (!state.activeQuest) return state;
  return {
    ...state,
    activeQuest: {
      ...state.activeQuest,
      status: 'ready_to_turn_in',
    },
  };
}

export function checkCollectiblePickups(
  playerX: number,
  playerY: number,
  state: RpgSaveState,
): { state: RpgSaveState; pickedUpCount: number } {
  const aq = state.activeQuest;
  if (!aq || aq.quest.kind !== 'collect' || !aq.quest.locations || aq.status !== 'active') {
    return { state, pickedUpCount: 0 };
  }

  const nextCollected = [...aq.collectedIndices];
  let picked = 0;

  aq.quest.locations.forEach((loc, idx) => {
    if (nextCollected.includes(idx)) return;
    const center = tileCenter(loc.tileX, loc.tileY);
    const dist = Math.hypot(playerX - center.x, playerY - center.y);
    if (dist <= PICKUP_RADIUS) {
      nextCollected.push(idx);
      picked += 1;
    }
  });

  if (picked === 0) {
    return { state, pickedUpCount: 0 };
  }

  const totalNeeded = aq.quest.locations.length;
  const nextStatus: QuestStatus =
    nextCollected.length >= totalNeeded ? 'ready_to_turn_in' : 'active';

  return {
    pickedUpCount: picked,
    state: {
      ...state,
      activeQuest: {
        ...aq,
        collectedIndices: nextCollected,
        status: nextStatus,
      },
    },
  };
}

export function completeActiveQuest(state: RpgSaveState): {
  state: RpgSaveState;
  starsEarned: number;
  coinsEarned: number;
  questTitle: string;
} {
  const aq = state.activeQuest;
  if (!aq) {
    return { state, starsEarned: 0, coinsEarned: 0, questTitle: '' };
  }

  const isDynamic = Boolean(aq.quest.isDynamic);
  const completedQuestIds = isDynamic
    ? state.completedQuestIds
    : Array.from(new Set([...state.completedQuestIds, aq.quest.id]));

  return {
    starsEarned: aq.quest.rewardStars,
    coinsEarned: aq.quest.rewardCoins,
    questTitle: aq.quest.title,
    state: {
      ...state,
      completedQuestIds,
      dynamicTasksCompleted: state.dynamicTasksCompleted + (isDynamic ? 1 : 0),
      activeQuest: null,
    },
  };
}

export function openChest(
  state: RpgSaveState,
  chestId: string,
): { state: RpgSaveState; chest: ChestDef | null; lockedReason?: string } {
  if (state.openedChests.includes(chestId)) {
    return { state, chest: null };
  }
  const chest = CHESTS.find(c => c.id === chestId) ?? null;
  if (!chest) return { state, chest: null };

  if (chest.requiresKey && state.earnedKeys.length === 0) {
    return {
      state,
      chest: null,
      lockedReason: 'Locked! Beat a villager learning mini-quest to earn a Key first.',
    };
  }

  return {
    chest,
    state: {
      ...state,
      openedChests: [...state.openedChests, chestId],
    },
  };
}

export type NearestInteractable =
  | { kind: 'npc'; npc: NpcDef; distance: number }
  | { kind: 'chest'; chest: ChestDef; distance: number };

export function findNearestInteractable(
  playerX: number,
  playerY: number,
  state: RpgSaveState,
): NearestInteractable | null {
  let best: NearestInteractable | null = null;

  for (const npc of NPCS) {
    const center = tileCenter(npc.tileX, npc.tileY);
    const dist = Math.hypot(playerX - center.x, playerY - center.y);
    if (dist <= INTERACT_RADIUS && (!best || dist < best.distance)) {
      best = { kind: 'npc', npc, distance: dist };
    }
  }

  for (const chest of CHESTS) {
    if (state.openedChests.includes(chest.id)) continue;
    const center = tileCenter(chest.tileX, chest.tileY);
    const dist = Math.hypot(playerX - center.x, playerY - center.y);
    if (dist <= INTERACT_RADIUS && (!best || dist < best.distance)) {
      best = { kind: 'chest', chest, distance: dist };
    }
  }

  return best;
}

const WALKABLE_LANDMARK_TILES: { tileX: number; tileY: number }[] = (() => {
  const list: { tileX: number; tileY: number }[] = [];
  for (let ty = 1; ty < MAP_ROWS - 1; ty++) {
    for (let tx = 1; tx < MAP_COLS - 1; tx++) {
      if (!isTileWalkable(tx, ty)) continue;
      // Avoid spawning right on top of an NPC tile
      const onNpc = NPCS.some(n => n.tileX === tx && n.tileY === ty);
      const onChest = CHESTS.some(c => c.tileX === tx && c.tileY === ty);
      if (!onNpc && !onChest) {
        list.push({ tileX: tx, tileY: ty });
      }
    }
  }
  return list;
})();

const DYNAMIC_THEMES = [
  { title: 'Glowing Firefly Hunt', emoji: '🪲', itemName: 'Firefly', npcId: 'npc_bino' },
  { title: 'Lucky Clover Patrol', emoji: '🍀', itemName: 'Lucky Clover', npcId: 'npc_turtle' },
  { title: 'Golden Acorn Delivery', emoji: '🌰', itemName: 'Golden Acorn', npcId: 'npc_owl' },
  { title: 'Cinnamon Roll Run', emoji: '🥐', itemName: 'Warm Pastry', npcId: 'npc_bear' },
  { title: 'Meteor Pebble Search', emoji: '💎', itemName: 'Space Gem', npcId: 'npc_bot' },
];

/**
 * Generates a brand-new walkable scavenger quest for players who want another task anytime!
 */
export function generateDynamicTask(npcId: string, seed: number): QuestDef {
  const theme =
    DYNAMIC_THEMES.find(t => t.npcId === npcId) ||
    DYNAMIC_THEMES[Math.abs(seed) % DYNAMIC_THEMES.length];
  const pool = WALKABLE_LANDMARK_TILES;
  const picks: { tileX: number; tileY: number }[] = [];
  const step = Math.max(7, Math.floor(pool.length / 5));

  for (let i = 0; i < 3; i++) {
    const idx = Math.abs(seed * 13 + i * step + 5) % pool.length;
    picks.push(pool[idx]);
  }

  return {
    id: `q_dyn_${npcId}_${seed}`,
    npcId,
    title: theme.title,
    description: `Explore the world to gather 3 ${theme.itemName}s, then return to claim your prize!`,
    kind: 'collect',
    itemEmoji: theme.emoji,
    itemName: theme.itemName,
    locations: picks,
    rewardStars: 2 + (seed % 2),
    rewardCoins: 15 + (seed % 3) * 5,
    isDynamic: true,
  };
}

export function getActiveObjectivePoint(state: RpgSaveState): { x: number; y: number; label: string } | null {
  const aq = state.activeQuest;
  if (!aq) return null;

  if (aq.status === 'ready_to_turn_in') {
    const npc = NPCS.find(n => n.id === aq.quest.npcId);
    if (!npc) return null;
    const c = tileCenter(npc.tileX, npc.tileY);
    return { x: c.x, y: c.y, label: `Return to ${npc.name}` };
  }

  if (aq.quest.kind === 'collect' && aq.quest.locations) {
    const remainingIdx = aq.quest.locations.findIndex((_, i) => !aq.collectedIndices.includes(i));
    if (remainingIdx >= 0) {
      const loc = aq.quest.locations[remainingIdx];
      const c = tileCenter(loc.tileX, loc.tileY);
      return { x: c.x, y: c.y, label: aq.quest.itemName || 'Find Item' };
    }
  }

  const npc = NPCS.find(n => n.id === aq.quest.npcId);
  if (npc) {
    const c = tileCenter(npc.tileX, npc.tileY);
    return { x: c.x, y: c.y, label: npc.name };
  }
  return null;
}

export function getRpgStorageKey(profileId?: string | null): string {
  return `braintune_rpg_${profileId || 'guest'}`;
}

export function resolveStoredRpgMiniQuest(
  profileId: string | null | undefined,
  gameId: string,
  correctCount: number,
): { keyId: string; keyName: string; keyEmoji: string; npcName: string } | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const storageKey = getRpgStorageKey(profileId);
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const current = createInitialRpgState(JSON.parse(raw));
    const res = resolvePendingMiniQuestOnGameComplete(current, gameId, correctCount);
    if (!res.unlockedKey) return null;
    window.localStorage.setItem(storageKey, JSON.stringify(res.state));
    return res.unlockedKey;
  } catch {
    return null;
  }
}
