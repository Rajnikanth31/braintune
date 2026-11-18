/**
 * Pure game logic for Braintune's Family Challenge mode (Kids + Adults).
 * Supports 3 modes:
 *  - 'coop': Child & Adult alternate rounds to build a shared Team Score.
 *  - 'duel': Balanced Child vs. Adult match with tier-matched puzzles.
 *  - 'blitz': Fast-paced solo/pass-and-play Adult & Big-Kid brain workout.
 */

export type FamilyMode = 'coop' | 'duel' | 'blitz';
export type PlayerTier = 'kid' | 'adult';
export type PuzzleCategory = 'math' | 'word' | 'sequence' | 'flash';

export interface FlashCell {
  emoji: string;
  highlighted?: boolean;
}

export interface FamilyQuestion {
  id: string;
  category: PuzzleCategory;
  tier: PlayerTier;
  categoryLabel: string;
  prompt: string;
  clue?: string;
  /** Flash memory cells shown briefly before hiding (only for 'flash' category). */
  flashCells?: FlashCell[];
  /** Index of the target cell in flashCells (if asking about highlighted box). */
  flashTargetIndex?: number;
  choices: string[];
  answer: string;
}

export interface FamilyOutcome {
  headline: string;
  subtitle: string;
  winner: 'p1' | 'p2' | 'tie' | 'team';
  starsEarned: number;
  coinsEarned: number;
}

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const KID_WORDS: { word: string; emoji: string; distractors: string[] }[] = [
  { word: 'CAT', emoji: '🐱', distractors: ['DOG', 'BAT', 'HAT'] },
  { word: 'SUN', emoji: '☀️', distractors: ['RUN', 'FUN', 'BUN'] },
  { word: 'FISH', emoji: '🐟', distractors: ['FROG', 'BIRD', 'WISH'] },
  { word: 'STAR', emoji: '⭐', distractors: ['MOON', 'BEAR', 'CARS'] },
  { word: 'CAKE', emoji: '🎂', distractors: ['LAKE', 'BIKE', 'BAKE'] },
  { word: 'TREE', emoji: '🌳', distractors: ['FROG', 'FREE', 'LEAF'] },
  { word: 'DUCK', emoji: '🦆', distractors: ['LUCK', 'BEAR', 'FROG'] },
  { word: 'LION', emoji: '🦁', distractors: ['TIGER', 'WOLF', 'BEAR'] },
];

const ADULT_WORDS: {
  scrambled: string;
  word: string;
  clue: string;
  distractors: string[];
}[] = [
  { scrambled: 'T A P L E N', word: 'PLANET', clue: '🪐 Orbits a star', distractors: ['PLATES', 'PALACE', 'PLANTS'] },
  { scrambled: 'B R A N I', word: 'BRAIN', clue: '🧠 Thinking organ', distractors: ['TRAIN', 'GRAIN', 'CHAIN'] },
  { scrambled: 'C O M S A P S', word: 'COMPASS', clue: '🧭 Finds north', distractors: ['CAMPING', 'CUSTOMS', 'CAMERAS'] },
  { scrambled: 'G A L A Y X', word: 'GALAXY', clue: '🌌 Billions of stars', distractors: ['GRAVITY', 'GLACIER', 'GALLERY'] },
  { scrambled: 'P U Z L E Z', word: 'PUZZLE', clue: '🧩 Brain teaser', distractors: ['MUZZLE', 'DAZZLE', 'FIZZLE'] },
  { scrambled: 'R I V E R S', word: 'RIVERS', clue: '🏞️ Flowing water', distractors: ['DRIVERS', 'SILVER', 'MIRROR'] },
  { scrambled: 'B R I D G E', word: 'BRIDGE', clue: '🌉 Crosses a canyon', distractors: ['FRIDGE', 'BADGES', 'RIDGES'] },
  { scrambled: 'L A N T E R N', word: 'LANTERN', clue: '🏮 Portable light', distractors: ['PATTERN', 'CAVERN', 'PLANNER'] },
];

const FLASH_POOL = ['🦊', '🚀', '🍎', '🎨', '🐼', '⭐', '🎈', '🦁', '🍕', '🐸', '🌈', '💎'];

function makeMathQuestion(tier: PlayerTier, uid: string): FamilyQuestion {
  if (tier === 'kid') {
    const isAdd = Math.random() > 0.35;
    const a = randInt(2, 10);
    const b = randInt(1, isAdd ? 9 : a - 1);
    const ans = isAdd ? a + b : a - b;
    const prompt = isAdd ? `${a} + ${b} = ?` : `${a} − ${b} = ?`;
    const set = new Set<string>([String(ans)]);
    while (set.size < 4) {
      const cand = Math.max(0, ans + randInt(-4, 4));
      set.add(String(cand));
    }
    return {
      id: uid,
      category: 'math',
      tier,
      categoryLabel: 'Quick Math ➕',
      prompt,
      clue: 'Count carefully!',
      choices: shuffle([...set]),
      answer: String(ans),
    };
  }

  // Adult tier: order of operations or missing operand
  const style = randInt(0, 2);
  let prompt = '';
  let ans = 0;
  let clue = 'Remember order of operations!';

  if (style === 0) {
    const a = randInt(3, 9);
    const b = randInt(3, 8);
    const c = randInt(4, 15);
    ans = a * b + c;
    prompt = `${a} × ${b} + ${c} = ?`;
  } else if (style === 1) {
    const x = randInt(4, 12);
    const m = randInt(3, 7);
    const offset = randInt(2, 12);
    const total = m * x + offset;
    ans = x;
    prompt = `${m} × ? + ${offset} = ${total}`;
    clue = 'Find the missing number!';
  } else {
    const halfOf = randInt(6, 24) * 2;
    const add = randInt(5, 19);
    ans = halfOf / 2 + add;
    prompt = `Half of ${halfOf}, plus ${add} = ?`;
    clue = 'Mental math sprint!';
  }

  const set = new Set<string>([String(ans)]);
  let guard = 0;
  while (set.size < 4 && guard < 40) {
    guard += 1;
    const delta = randInt(1, 8) * (Math.random() > 0.5 ? 1 : -1);
    const cand = ans + delta;
    if (cand > 0) set.add(String(cand));
  }
  while (set.size < 4) {
    set.add(String(ans + set.size + 1));
  }

  return {
    id: uid,
    category: 'math',
    tier,
    categoryLabel: 'Mental Math 🧠',
    prompt,
    clue,
    choices: shuffle([...set]),
    answer: String(ans),
  };
}

function makeWordQuestion(tier: PlayerTier, uid: string): FamilyQuestion {
  if (tier === 'kid') {
    const item = KID_WORDS[randInt(0, KID_WORDS.length - 1)];
    const scrambled = item.word.split('').sort(() => 0.5 - Math.random()).join(' ');
    return {
      id: uid,
      category: 'word',
      tier,
      categoryLabel: 'Word Match 🔤',
      prompt: `Which word matches ${item.emoji}?`,
      clue: `Letters: ${scrambled}`,
      choices: shuffle([item.word, ...item.distractors.slice(0, 3)]),
      answer: item.word,
    };
  }

  const item = ADULT_WORDS[randInt(0, ADULT_WORDS.length - 1)];
  return {
    id: uid,
    category: 'word',
    tier,
    categoryLabel: 'Word Scramble 🔤',
    prompt: `Unscramble: ${item.scrambled}`,
    clue: item.clue,
    choices: shuffle([item.word, ...item.distractors.slice(0, 3)]),
    answer: item.word,
  };
}

function makeSequenceQuestion(tier: PlayerTier, uid: string): FamilyQuestion {
  if (tier === 'kid') {
    const step = Math.random() > 0.5 ? 2 : 1;
    const start = randInt(1, 5) * step;
    const seq = [start, start + step, start + step * 2];
    const ans = start + step * 3;
    const set = new Set<string>([String(ans)]);
    while (set.size < 4) {
      const cand = Math.max(1, ans + randInt(-3, 4));
      set.add(String(cand));
    }
    return {
      id: uid,
      category: 'sequence',
      tier,
      categoryLabel: 'Number Pattern 🔢',
      prompt: `${seq.join(' , ')} , ?`,
      clue: 'What number comes next?',
      choices: shuffle([...set]),
      answer: String(ans),
    };
  }

  // Adult tier: growing steps or alternating rule
  const style = randInt(0, 2);
  let seq: number[] = [];
  let ans = 0;
  let clue = 'Spot the hidden pattern!';

  if (style === 0) {
    // Growing difference: +2, +4, +6, +8
    const start = randInt(1, 7);
    const mult = randInt(1, 2);
    const s1 = start;
    const s2 = s1 + 2 * mult;
    const s3 = s2 + 4 * mult;
    const s4 = s3 + 6 * mult;
    seq = [s1, s2, s3, s4];
    ans = s4 + 8 * mult;
  } else if (style === 1) {
    // Fibonacci-like sum of previous two
    const a = randInt(1, 4);
    const b = randInt(2, 5);
    const c = a + b;
    const d = b + c;
    seq = [a, b, c, d];
    ans = c + d;
  } else {
    // Multiply by 2 then add 1 (or similar)
    const a = randInt(2, 4);
    const b = a * 2 + 1;
    const c = b * 2 + 1;
    const d = c * 2 + 1;
    seq = [a, b, c, d];
    ans = d * 2 + 1;
  }

  const set = new Set<string>([String(ans)]);
  let guard = 0;
  while (set.size < 4 && guard < 40) {
    guard += 1;
    const cand = ans + randInt(-6, 8);
    if (cand > 0 && cand !== ans) set.add(String(cand));
  }
  while (set.size < 4) {
    set.add(String(ans + set.size + 1));
  }

  return {
    id: uid,
    category: 'sequence',
    tier,
    categoryLabel: 'Logic Sequence 🧩',
    prompt: `${seq.join(' , ')} , ?`,
    clue,
    choices: shuffle([...set]),
    answer: String(ans),
  };
}

function makeFlashQuestion(tier: PlayerTier, uid: string): FamilyQuestion {
  const count = tier === 'kid' ? 3 : 5;
  const chosen = shuffle(FLASH_POOL).slice(0, count);
  const targetIndex = randInt(0, count - 1);
  const answer = chosen[targetIndex];
  const distractors = shuffle(chosen.filter((_, idx) => idx !== targetIndex)).slice(0, 3);
  // Ensure 4 choices total even for kid count = 3
  const extraPool = FLASH_POOL.filter(e => e !== answer && !distractors.includes(e));
  while (distractors.length < 3 && extraPool.length > 0) {
    distractors.push(extraPool.shift()!);
  }

  return {
    id: uid,
    category: 'flash',
    tier,
    categoryLabel: 'Flash Memory ⚡',
    prompt: 'Which picture was in the highlighted box?',
    clue: 'Watch closely before it hides!',
    flashCells: chosen.map((emoji, idx) => ({
      emoji,
      highlighted: idx === targetIndex,
    })),
    flashTargetIndex: targetIndex,
    choices: shuffle([answer, ...distractors]),
    answer,
  };
}

const CATEGORIES: PuzzleCategory[] = ['math', 'word', 'sequence', 'flash'];

export function generateFamilyQuestion(
  tier: PlayerTier,
  roundIndex: number,
  forcedCategory?: PuzzleCategory,
): FamilyQuestion {
  const category = forcedCategory ?? CATEGORIES[roundIndex % CATEGORIES.length];
  const uid = `fq_${tier}_${roundIndex}_${Math.random().toString(36).slice(2, 7)}`;

  switch (category) {
    case 'math':
      return makeMathQuestion(tier, uid);
    case 'word':
      return makeWordQuestion(tier, uid);
    case 'sequence':
      return makeSequenceQuestion(tier, uid);
    case 'flash':
      return makeFlashQuestion(tier, uid);
  }
}

export function calculateRoundPoints(
  isCorrect: boolean,
  secondsRemaining: number,
  streak: number,
): number {
  if (!isCorrect) return 0;
  const clampedTime = Math.max(0, Math.min(15, Math.round(secondsRemaining)));
  const base = 100;
  const speedBonus = clampedTime * 5;
  const streakBonus = Math.max(0, streak) * 25;
  return base + speedBonus + streakBonus;
}

export function evaluateFamilyOutcome(
  mode: FamilyMode,
  p1Score: number,
  p2Score: number,
  p1Name: string,
  p2Name: string,
  totalCorrect: number,
  totalRounds: number,
): FamilyOutcome {
  const accuracy = totalRounds > 0 ? totalCorrect / totalRounds : 0;
  const starsEarned = Math.max(1, Math.round(accuracy * 5));
  const coinsEarned = totalCorrect * 10 + (accuracy >= 0.75 ? 20 : 0);

  if (mode === 'coop') {
    const teamScore = p1Score + p2Score;
    return {
      headline: teamScore >= 500 ? 'Super Team Victory! 🏆' : 'Great Teamwork! 🤝',
      subtitle: `${p1Name} & ${p2Name} scored ${teamScore} team points together!`,
      winner: 'team',
      starsEarned,
      coinsEarned,
    };
  }

  if (mode === 'blitz') {
    return {
      headline: accuracy >= 0.7 ? 'Brain Blitz Master! 🧠' : 'Blitz Complete! ⚡',
      subtitle: `You solved ${totalCorrect} of ${totalRounds} brain teasers for ${p1Score} pts!`,
      winner: 'team',
      starsEarned,
      coinsEarned,
    };
  }

  if (p1Score > p2Score) {
    return {
      headline: `${p1Name} Wins the Duel! 🎉`,
      subtitle: `${p1Score} pts vs ${p2Score} pts — awesome focus!`,
      winner: 'p1',
      starsEarned: starsEarned + 1,
      coinsEarned: coinsEarned + 15,
    };
  }

  if (p2Score > p1Score) {
    return {
      headline: `${p2Name} Wins the Duel! 🌟`,
      subtitle: `${p2Score} pts vs ${p1Score} pts — close match!`,
      winner: 'p2',
      starsEarned,
      coinsEarned,
    };
  }

  return {
    headline: "It's a Friendly Tie! 🤝",
    subtitle: `Both ${p1Name} and ${p2Name} finished with ${p1Score} pts!`,
    winner: 'tie',
    starsEarned: starsEarned + 1,
    coinsEarned: coinsEarned + 10,
  };
}
