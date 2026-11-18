import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Celebration } from '../../components/Celebration';
import { SoundService } from '../../audio/SoundService';
import { haptic } from '../../audio/haptics';
import { useApp } from '../../state/AppContext';
import {
  ActiveQuestInstance,
  CHESTS,
  MAP_COLS,
  MAP_ROWS,
  NPCS,
  NearestInteractable,
  NpcDef,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  QuestDef,
  RpgSaveState,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_MAP,
  WORLD_WIDTH,
  acceptQuest,
  checkCollectiblePickups,
  completeActiveQuest,
  createInitialRpgState,
  findNearestInteractable,
  generateDynamicTask,
  getActiveObjectivePoint,
  getNextQuestForNpc,
  getRpgStorageKey,
  markActiveQuizReady,
  movePlayerWithCollision,
  openChest,
  startNpcMiniQuest,
  tileCenter,
  getNpcMiniQuest,
  NPC_MINI_QUESTS,
  MiniQuestDef,
} from './rpgWorldLogic';
import {
  PET_CATALOG,
  PlayerPetState,
  getPetById,
  getPetDisplayEmoji,
  getPetDisplayName,
  getPetGrowthStage,
  isPetUnlocked,
  stepPetFollow,
} from '../pets/petLogic';
import { AdoptPetModal } from '../../components/AdoptPetModal';
import { NpcApproachDialog, NpcDialog } from './NpcDialog';

interface RpgWorldProps {
  onBack: () => void;
  onLaunchMiniGame?: (
    gameId: 'memory' | 'letters' | 'numbers' | 'colors' | 'math',
    miniQuest?: MiniQuestDef,
  ) => void;
  autoStart?: boolean;
}

type RpgPhase = 'title' | 'playing' | 'paused' | 'gameover';

const VIEW_W = 800;
const VIEW_H = 520;
const PARTICLE_POOL_SIZE = 48;

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

function loadSavedRpgState(profileId?: string | null): RpgSaveState {
  try {
    const raw = window.localStorage.getItem(getRpgStorageKey(profileId));
    if (raw) {
      return createInitialRpgState(JSON.parse(raw));
    }
  } catch {
    // Ignore storage read error
  }
  return createInitialRpgState();
}

function persistRpgState(profileId: string | null | undefined, state: RpgSaveState): void {
  try {
    window.localStorage.setItem(getRpgStorageKey(profileId), JSON.stringify(state));
  } catch {
    // Ignore storage write error
  }
}

export const RpgWorld: React.FC<RpgWorldProps> = ({
  onBack,
  onLaunchMiniGame,
  autoStart = false,
}) => {
  const { activeProfile, settings, updateGameResult, petState, adoptPet } = useApp();
  const profileId = activeProfile?.id ?? null;
  const heroAvatar = activeProfile?.avatar || '🦊';
  const heroName = activeProfile?.name || 'Explorer';

  const [phase, setPhase] = useState<RpgPhase>(autoStart ? 'playing' : 'title');
  const [rpgState, setRpgState] = useState<RpgSaveState>(() => loadSavedRpgState(profileId));
  const [nearest, setNearest] = useState<NearestInteractable | null>(null);
  const [dismissedNpcId, setDismissedNpcId] = useState<string | null>(null);
  const [activeNpc, setActiveNpc] = useState<NpcDef | null>(null);
  const [showQuestLog, setShowQuestLog] = useState(false);
  const [showAdoptPetModal, setShowAdoptPetModal] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [celebratePulse, setCelebratePulse] = useState(0);
  const [playerCoords, setPlayerCoords] = useState<{ x: number; y: number }>(() => ({
    x: Math.round(loadSavedRpgState(profileId).playerX),
    y: Math.round(loadSavedRpgState(profileId).playerY),
  }));
  const [petCoords, setPetCoords] = useState<{ x: number; y: number }>(() => ({
    x: Math.round(loadSavedRpgState(profileId).playerX - 36),
    y: Math.round(loadSavedRpgState(profileId).playerY + 10),
  }));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<RpgSaveState>(rpgState);
  const petStateRef = useRef<PlayerPetState>(petState);
  const petPosRef = useRef<{ x: number; y: number }>({
    x: rpgState.playerX - 36,
    y: rpgState.playerY + 10,
  });
  const petWalkDistRef = useRef(0);
  const phaseRef = useRef<RpgPhase>(phase);
  const modalOpenRef = useRef<boolean>(false);
  const modalDrawDoneRef = useRef<boolean>(false);
  const lastIdleDrawRef = useRef<number>(-1);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const dpadDirRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetPointRef = useRef<{ x: number; y: number } | null>(null);
  const walkDistRef = useRef(0);
  const facingAngleRef = useRef(0);
  const worldTimeRef = useRef(0);
  const lastStepEmitRef = useRef(0);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particlesRef = useRef<PooledParticle[]>(
    Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.5,
      size: 4,
      color: '#FBBF24',
    })),
  );
  const particleCursorRef = useRef(0);

  // Keep refs synchronized with React state
  useEffect(() => {
    stateRef.current = rpgState;
    persistRpgState(profileId, rpgState);
  }, [rpgState, profileId]);

  useEffect(() => {
    petStateRef.current = petState;
    modalDrawDoneRef.current = false;
  }, [petState]);

  useEffect(() => {
    phaseRef.current = phase;
    document.body.dataset.state = phase;
    return () => {
      delete document.body.dataset.state;
    };
  }, [phase]);

  useEffect(() => {
    modalOpenRef.current = Boolean(activeNpc) || showQuestLog || showAdoptPetModal;
  }, [activeNpc, showQuestLog, showAdoptPetModal]);

  useEffect(() => {
    if (!nearest || nearest.kind !== 'npc') {
      setDismissedNpcId(null);
    } else if (dismissedNpcId && dismissedNpcId !== nearest.npc.id) {
      setDismissedNpcId(null);
    }
  }, [nearest, dismissedNpcId]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const showNotice = useCallback((msg: string) => {
    setBannerNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setBannerNotice(null), 3200);
  }, []);

  // Celebrate when returning to Quest World with a newly unlocked Key from a mini-game
  useEffect(() => {
    const recent = stateRef.current.recentUnlockedKey;
    if (!recent) return;
    SoundService.playSfx('win');
    haptic('success');
    setCelebratePulse(p => p + 1);
    showNotice(
      `${recent.keyEmoji} ${recent.keyName} unlocked from ${recent.npcName}! Check the Royal Key Vault!`,
    );
    const cleared: RpgSaveState = { ...stateRef.current, recentUnlockedKey: null };
    stateRef.current = cleared;
    setRpgState(cleared);
  }, [showNotice]);

  const spawnParticle = useCallback(
    (x: number, y: number, vx: number, vy: number, color: string, size: number, maxLife: number) => {
      if (settings.reducedMotion) return;
      const pool = particlesRef.current;
      const idx = particleCursorRef.current % PARTICLE_POOL_SIZE;
      particleCursorRef.current += 1;
      const p = pool[idx];
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.color = color;
      p.size = size;
      p.life = maxLife;
      p.maxLife = maxLife;
    },
    [settings.reducedMotion],
  );

  const spawnBurst = useCallback(
    (x: number, y: number, color: string, count: number = 14) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 45 + Math.random() * 90;
        spawnParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 18,
          color,
          3.5 + Math.random() * 3,
          0.45 + Math.random() * 0.25,
        );
      }
    },
    [spawnParticle],
  );

  const startGame = useCallback(() => {
    SoundService.playClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysPressedRef.current.clear();
    targetPointRef.current = null;
    setPhase('playing');
  }, []);

  const handleOpenChest = useCallback(
    async (chestId: string) => {
      const res = openChest(stateRef.current, chestId);
      if (res.lockedReason) {
        SoundService.playSfx('wrong');
        haptic('error');
        showNotice(res.lockedReason);
        return;
      }
      if (!res.chest) return;
      stateRef.current = res.state;
      setRpgState(res.state);
      const c = tileCenter(res.chest.tileX, res.chest.tileY);
      spawnBurst(c.x, c.y, '#FBBF24', 18);
      SoundService.playSfx('win');
      haptic('success');
      setCelebratePulse(p => p + 1);
      showNotice(`Opened ${res.chest.label}! +${res.chest.stars} ⭐ & +${res.chest.coins} 🪙`);
      await updateGameResult('rpg', res.chest.stars, 1, 1, 1, res.chest.coins);
    },
    [showNotice, spawnBurst, updateGameResult],
  );

  const triggerInteract = useCallback(() => {
    if (phaseRef.current !== 'playing' || modalOpenRef.current) return;
    const current = findNearestInteractable(
      stateRef.current.playerX,
      stateRef.current.playerY,
      stateRef.current,
    );
    if (!current) return;

    SoundService.playClick();
    targetPointRef.current = null;

    if (current.kind === 'chest') {
      handleOpenChest(current.chest.id);
    } else if (current.kind === 'npc') {
      setQuizIndex(0);
      setQuizFeedback(null);
      setActiveNpc(current.npc);
    }
  }, [handleOpenChest]);

  // Global keyboard controls
  useEffect(() => {
    const clearInputs = () => {
      keysPressedRef.current.clear();
      dpadDirRef.current = { x: 0, y: 0 };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (phaseRef.current === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (activeNpc) {
          setActiveNpc(null);
          return;
        }
        if (showAdoptPetModal) {
          setShowAdoptPetModal(false);
          return;
        }
        if (showQuestLog) {
          setShowQuestLog(false);
          return;
        }
        setPhase(prev => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        return;
      }

      if (phaseRef.current !== 'playing') return;

      if (e.key.toLowerCase() === 'q' && !activeNpc) {
        e.preventDefault();
        setShowQuestLog(prev => !prev);
        return;
      }

      if ((e.key.toLowerCase() === 'e' || e.key === ' ') && !modalOpenRef.current) {
        e.preventDefault();
        triggerInteract();
        return;
      }

      const lower = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(lower)) {
        e.preventDefault();
        keysPressedRef.current.add(lower);
        targetPointRef.current = null;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
    };
  }, [activeNpc, showQuestLog, showAdoptPetModal, startGame, triggerInteract]);

  // 60fps simulation & Canvas2D world renderer
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const stepAndDraw = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      worldTimeRef.current += dt;

      const curState = stateRef.current;

      // Update particles in real dt
      for (const p of particlesRef.current) {
        if (!p.active) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        }
      }

      // Movement update when playing and no dialogue/drawer is open
      if (phaseRef.current === 'playing' && !modalOpenRef.current) {
        const keys = keysPressedRef.current;
        let ix = dpadDirRef.current.x;
        let iy = dpadDirRef.current.y;

        if (keys.has('w') || keys.has('arrowup')) iy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) iy += 1;
        if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
        if (keys.has('d') || keys.has('arrowright')) ix += 1;

        if (ix === 0 && iy === 0 && targetPointRef.current) {
          const tx = targetPointRef.current.x - curState.playerX;
          const ty = targetPointRef.current.y - curState.playerY;
          const dist = Math.hypot(tx, ty);
          if (dist < 10) {
            targetPointRef.current = null;
          } else {
            ix = tx / dist;
            iy = ty / dist;
          }
        }

        if (ix !== 0 || iy !== 0) {
          const mag = Math.hypot(ix, iy) || 1;
          const nx = ix / mag;
          const ny = iy / mag;
          facingAngleRef.current = Math.atan2(ny, nx);

          const moved = movePlayerWithCollision(
            curState.playerX,
            curState.playerY,
            nx * PLAYER_SPEED * dt,
            ny * PLAYER_SPEED * dt,
            PLAYER_RADIUS,
          );

          const movedDist = Math.hypot(moved.x - curState.playerX, moved.y - curState.playerY);
          if (movedDist > 0.05) {
            walkDistRef.current += movedDist;
            if (walkDistRef.current - lastStepEmitRef.current > 24) {
              lastStepEmitRef.current = walkDistRef.current;
              spawnParticle(
                moved.x + (Math.random() - 0.5) * 10,
                moved.y + 12,
                -nx * 14,
                -ny * 10 - 8,
                'rgba(226, 232, 240, 0.85)',
                3.5,
                0.35,
              );
            }

            let nextState: RpgSaveState = {
              ...curState,
              playerX: moved.x,
              playerY: moved.y,
              stepsWalked: curState.stepsWalked + Math.round(movedDist / 14),
            };

            // Auto-pick up active quest items on walk-over
            const pickupRes = checkCollectiblePickups(moved.x, moved.y, nextState);
            if (pickupRes.pickedUpCount > 0) {
              nextState = pickupRes.state;
              spawnBurst(moved.x, moved.y, '#10B981', 14);
              SoundService.playSfx('correct');
              haptic('tap');
              const aq = nextState.activeQuest;
              if (aq) {
                const count = aq.collectedIndices.length;
                const total = aq.quest.locations?.length || 3;
                if (aq.status === 'ready_to_turn_in') {
                  const giver = NPCS.find(n => n.id === aq.quest.npcId);
                  showNotice(
                    `All ${total} collected! Walk back to ${giver?.name || 'the villager'}!`,
                  );
                } else {
                  showNotice(`Found ${aq.quest.itemName || 'item'} (${count}/${total})!`);
                }
              }
              setRpgState(nextState);
            }

            stateRef.current = nextState;

            // Update lightweight HUD refs at discrete changes
            const rx = Math.round(moved.x);
            const ry = Math.round(moved.y);
            setPlayerCoords(prev =>
              Math.abs(prev.x - rx) >= 8 || Math.abs(prev.y - ry) >= 8
                ? { x: rx, y: ry }
                : prev,
            );
          } else {
            // Hit obstacle while click-walking
            targetPointRef.current = null;
          }

          const nearNow = findNearestInteractable(moved.x, moved.y, stateRef.current);
          setNearest(prev => {
            const prevKey = prev ? `${prev.kind}:${prev.kind === 'npc' ? prev.npc.id : prev.chest.id}` : '';
            const nextKey = nearNow
              ? `${nearNow.kind}:${nearNow.kind === 'npc' ? nearNow.npc.id : nearNow.chest.id}`
              : '';
            return prevKey === nextKey ? prev : nearNow;
          });
        } else {
          // Still check nearest on idle (e.g. after closing chest)
          const nearNow = findNearestInteractable(curState.playerX, curState.playerY, curState);
          setNearest(prev => {
            const prevKey = prev ? `${prev.kind}:${prev.kind === 'npc' ? prev.npc.id : prev.chest.id}` : '';
            const nextKey = nearNow
              ? `${nearNow.kind}:${nearNow.kind === 'npc' ? nearNow.npc.id : nearNow.chest.id}`
              : '';
            return prevKey === nextKey ? prev : nearNow;
          });
        }

        // Update virtual pet companion follow kinematics
        if (petStateRef.current.adoptedPetId) {
          const latestState = stateRef.current;
          const nextPet = stepPetFollow(
            petPosRef.current.x,
            petPosRef.current.y,
            latestState.playerX,
            latestState.playerY,
            facingAngleRef.current,
            dt,
          );
          if (nextPet.movedDist > 0) {
            petPosRef.current = { x: nextPet.x, y: nextPet.y };
            petWalkDistRef.current += nextPet.movedDist;
            const prx = Math.round(nextPet.x);
            const pry = Math.round(nextPet.y);
            setPetCoords(prev =>
              Math.abs(prev.x - prx) >= 6 || Math.abs(prev.y - pry) >= 6
                ? { x: prx, y: pry }
                : prev,
            );
          }
        }
      }

      // Draw Canvas2D world (skip continuous redraws while modal covers stage, and pace idle frames)
      const canvas = canvasRef.current;
      const isPetCatchingUp = Boolean(
        petStateRef.current.adoptedPetId &&
          Math.hypot(
            stateRef.current.playerX - petPosRef.current.x,
            stateRef.current.playerY - petPosRef.current.y,
          ) > 46,
      );
      const isMovingOrAnimating =
        Boolean(targetPointRef.current) ||
        keysPressedRef.current.size > 0 ||
        dpadDirRef.current.x !== 0 ||
        dpadDirRef.current.y !== 0 ||
        isPetCatchingUp ||
        particlesRef.current.some(p => p.active);

      const idleReady = worldTimeRef.current - lastIdleDrawRef.current >= 0.085;
      const shouldDraw =
        phaseRef.current === 'playing' && !modalOpenRef.current
          ? isMovingOrAnimating || idleReady || !modalDrawDoneRef.current
          : !modalDrawDoneRef.current;

      if (canvas && shouldDraw) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawWorld(
            ctx,
            stateRef.current,
            worldTimeRef.current,
            walkDistRef.current,
            targetPointRef.current,
            particlesRef.current,
            heroAvatar,
            settings.reducedMotion,
            petStateRef.current,
            petPosRef.current,
            petWalkDistRef.current,
          );
          lastIdleDrawRef.current = worldTimeRef.current;
          if (modalOpenRef.current || phaseRef.current !== 'playing') {
            modalDrawDoneRef.current = true;
          } else {
            modalDrawDoneRef.current = true;
          }
        }
      }
      if (phaseRef.current === 'playing' && !modalOpenRef.current && isMovingOrAnimating) {
        modalDrawDoneRef.current = false;
      }

      rafId = requestAnimationFrame(stepAndDraw);
    };

    rafId = requestAnimationFrame(stepAndDraw);
    return () => cancelAnimationFrame(rafId);
  }, [heroAvatar, settings.reducedMotion, showNotice, spawnBurst, spawnParticle]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing' || modalOpenRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIEW_W / rect.width;
    const scaleY = VIEW_H / rect.height;
    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;

    const camX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_W, stateRef.current.playerX - VIEW_W / 2));
    const camY = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_H, stateRef.current.playerY - VIEW_H / 2));
    const worldX = camX + screenX;
    const worldY = camY + screenY;

    // Check if user clicked directly on a nearby NPC or Chest
    const clickNear = findNearestInteractable(worldX, worldY, stateRef.current);
    const playerDist = Math.hypot(
      worldX - stateRef.current.playerX,
      worldY - stateRef.current.playerY,
    );
    if (clickNear && playerDist <= 96) {
      triggerInteract();
      return;
    }

    targetPointRef.current = { x: worldX, y: worldY };
  };

  const handleAcceptQuest = (quest: QuestDef) => {
    SoundService.playClick();
    const next = acceptQuest(stateRef.current, quest);
    stateRef.current = next;
    setRpgState(next);
    setQuizIndex(0);
    setQuizFeedback(null);
    if (quest.kind === 'collect') {
      showNotice(`New Task: ${quest.title}! Walk to find ${quest.itemName}s!`);
      setActiveNpc(null);
    }
  };

  const handleRequestNewDynamicTask = (npc: NpcDef) => {
    SoundService.playClick();
    const seed =
      stateRef.current.completedQuestIds.length +
      stateRef.current.dynamicTasksCompleted +
      Math.floor(worldTimeRef.current * 10);
    const dynamicQuest = generateDynamicTask(npc.id, seed);
    handleAcceptQuest(dynamicQuest);
  };

  const handleStartMiniQuest = (npc: NpcDef) => {
    SoundService.playClick();
    const res = startNpcMiniQuest(stateRef.current, npc.id);
    if (!res.miniQuest || !onLaunchMiniGame) return;
    stateRef.current = res.state;
    setRpgState(res.state);
    persistRpgState(profileId, res.state);
    setActiveNpc(null);
    onLaunchMiniGame(res.miniQuest.gameId, res.miniQuest);
  };

  const handleClaimQuestReward = async () => {
    const completed = completeActiveQuest(stateRef.current);
    if (!completed.questTitle) return;
    stateRef.current = completed.state;
    setRpgState(completed.state);
    setActiveNpc(null);
    SoundService.playSfx('win');
    haptic('success');
    setCelebratePulse(p => p + 1);
    showNotice(
      `Quest Complete: ${completed.questTitle}! +${completed.starsEarned} ⭐ & +${completed.coinsEarned} 🪙`,
    );
    await updateGameResult(
      'rpg',
      completed.starsEarned,
      3,
      3,
      1,
      completed.coinsEarned,
    );
  };

  const handleAnswerQuiz = (choice: string) => {
    const aq = rpgState.activeQuest;
    if (!aq || aq.quest.kind !== 'quiz' || !aq.quest.questions) return;
    const currentQ = aq.quest.questions[quizIndex];
    if (!currentQ) return;

    if (choice === currentQ.answer) {
      SoundService.playSfx('correct');
      haptic('tap');
      if (quizIndex + 1 >= aq.quest.questions.length) {
        const next = markActiveQuizReady(stateRef.current);
        stateRef.current = next;
        setRpgState(next);
        setQuizFeedback('All answers correct! Claim your reward below!');
      } else {
        setQuizFeedback('Nice job! Next question...');
        setTimeout(() => {
          setQuizFeedback(null);
          setQuizIndex(i => i + 1);
        }, 420);
      }
    } else {
      SoundService.playSfx('wrong');
      haptic('error');
      setQuizFeedback('Almost! Try another answer.');
    }
  };

  const setDpadHold = (dx: number, dy: number) => {
    targetPointRef.current = null;
    dpadDirRef.current = { x: dx, y: dy };
  };

  const activeQuest = rpgState.activeQuest;
  const activeNpcAvailableQuest = activeNpc ? getNextQuestForNpc(activeNpc.id, rpgState) : null;
  const activeNpcMiniQuest = activeNpc ? getNpcMiniQuest(activeNpc.id) : null;
  const nearestNpc = nearest?.kind === 'npc' ? nearest.npc : null;
  const showApproachDialog = Boolean(
    phase === 'playing' &&
      nearestNpc &&
      !activeNpc &&
      !showQuestLog &&
      dismissedNpcId !== nearestNpc.id,
  );
  const nearestNpcMiniQuest = nearestNpc ? getNpcMiniQuest(nearestNpc.id) : null;
  const nearestNpcAvailableQuest = nearestNpc
    ? getNextQuestForNpc(nearestNpc.id, rpgState)
    : null;
  const totalQuestsDone =
    rpgState.completedQuestIds.length + rpgState.dynamicTasksCompleted;
  const activePet = getPetById(petState.adoptedPetId);
  const petGrowth = getPetGrowthStage(petState.tasksCompleted);
  const hasAnyUnlockedPet = PET_CATALOG.some(p => isPetUnlocked(p, petState.tasksCompleted));

  return (
    <div className="bt-rpg-shell">
      <Celebration trigger={celebratePulse} intensity="big" />

      <div className="bt-rpg-stage">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="bt-rpg-canvas"
          data-testid="rpg-canvas"
          data-player-x={playerCoords.x}
          data-player-y={playerCoords.y}
          data-pet-id={petState.adoptedPetId || ''}
          data-pet-stage={petState.adoptedPetId ? petGrowth.stage : 0}
          data-pet-x={petState.adoptedPetId ? petCoords.x : ''}
          data-pet-y={petState.adoptedPetId ? petCoords.y : ''}
          data-nearest={nearest ? (nearest.kind === 'npc' ? nearest.npc.id : nearest.chest.id) : ''}
          onPointerDown={handleCanvasPointerDown}
          aria-label="Quest World adventure map. Use WASD or Arrow keys to walk, or click anywhere on the path."
        />

        {/* World-Matched Floating HUD */}
        {phase !== 'title' && (
          <div className="bt-rpg-hud-overlay">
            <div className="bt-rpg-hud-top">
              <div className="bt-rpg-hud-left">
                <button
                  type="button"
                  className="bt-rpg-pill-btn"
                  onClick={() => {
                    SoundService.playClick();
                    onBack();
                  }}
                  aria-label="Back to Hub"
                >
                  <span aria-hidden="true">◀</span>
                  <span>Hub</span>
                </button>

                <div className="bt-rpg-hero-badge">
                  <span aria-hidden="true">{heroAvatar}</span>
                  <span className="bt-rpg-hero-name">{heroName}</span>
                  <span className="bt-meta-sep" aria-hidden="true">·</span>
                  <span className="bt-rpg-num">⭐ {activeProfile?.stars ?? 0}</span>
                  <span className="bt-meta-sep" aria-hidden="true">·</span>
                  <span className="bt-rpg-num">🪙 {activeProfile?.coins ?? 0}</span>
                </div>
              </div>

              <div className="bt-rpg-hud-right">
                <div className="bt-rpg-task-pill" data-testid="rpg-active-task">
                  {activeQuest ? (
                    activeQuest.status === 'ready_to_turn_in' ? (
                      <>
                        <span>✅</span>
                        <span>
                          {activeQuest.quest.title} · Return to{' '}
                          {NPCS.find(n => n.id === activeQuest.quest.npcId)?.name}
                        </span>
                      </>
                    ) : activeQuest.quest.kind === 'collect' ? (
                      <>
                        <span>{activeQuest.quest.itemEmoji || '✨'}</span>
                        <span>
                          {activeQuest.quest.title} ({activeQuest.collectedIndices.length}/
                          {activeQuest.quest.locations?.length || 3})
                        </span>
                      </>
                    ) : (
                      <>
                        <span>💬</span>
                        <span>{activeQuest.quest.title}</span>
                      </>
                    )
                  ) : (
                    <>
                      <span>🗺️</span>
                      <span>Walk to any villager [!] for a task</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className="bt-rpg-pill-btn"
                  data-testid="rpg-pet-pill"
                  onClick={() => {
                    SoundService.playClick();
                    setShowAdoptPetModal(true);
                  }}
                  aria-label="Adopt or manage virtual pet companion"
                >
                  {activePet ? (
                    <>
                      <span aria-hidden="true">{getPetDisplayEmoji(activePet, petGrowth.stage)}</span>
                      <span>
                        {getPetDisplayName(petState)} · {petGrowth.label}
                      </span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">🐾</span>
                      <span>{hasAnyUnlockedPet ? 'Adopt Pet!' : 'Adopt-a-Pet'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="bt-rpg-pill-btn"
                  data-testid="rpg-keys-pill"
                  onClick={() => {
                    SoundService.playClick();
                    setShowQuestLog(v => !v);
                  }}
                  aria-label="Open Quest Log and Keys"
                >
                  🗝️ {rpgState.earnedKeys.length}/{NPC_MINI_QUESTS.length} · 📜 Tasks ({totalQuestsDone})
                </button>

                <button
                  type="button"
                  className="bt-rpg-pill-btn"
                  onClick={() => {
                    SoundService.playClick();
                    setPhase(p => (p === 'playing' ? 'paused' : 'playing'));
                  }}
                  aria-label="Pause Quest World"
                >
                  ⏸️
                </button>
              </div>
            </div>

            {bannerNotice && (
              <div className="bt-rpg-notice" role="status">
                {bannerNotice}
              </div>
            )}

            <div className="bt-rpg-hud-bottom">
              {/* Compact On-Screen Walk Pad for Touch & Mouse */}
              <div className="bt-rpg-dpad" aria-label="Directional movement pad">
                <span />
                <button
                  type="button"
                  className="bt-dpad-btn"
                  aria-label="Walk Up"
                  onPointerDown={() => setDpadHold(0, -1)}
                  onPointerUp={() => setDpadHold(0, 0)}
                  onPointerLeave={() => setDpadHold(0, 0)}
                >
                  ▲
                </button>
                <span />
                <button
                  type="button"
                  className="bt-dpad-btn"
                  aria-label="Walk Left"
                  onPointerDown={() => setDpadHold(-1, 0)}
                  onPointerUp={() => setDpadHold(0, 0)}
                  onPointerLeave={() => setDpadHold(0, 0)}
                >
                  ◀
                </button>
                <button
                  type="button"
                  className="bt-dpad-btn"
                  aria-label="Walk Down"
                  onPointerDown={() => setDpadHold(0, 1)}
                  onPointerUp={() => setDpadHold(0, 0)}
                  onPointerLeave={() => setDpadHold(0, 0)}
                >
                  ▼
                </button>
                <button
                  type="button"
                  className="bt-dpad-btn"
                  aria-label="Walk Right"
                  onPointerDown={() => setDpadHold(1, 0)}
                  onPointerUp={() => setDpadHold(0, 0)}
                  onPointerLeave={() => setDpadHold(0, 0)}
                >
                  ▶
                </button>
              </div>

              {showApproachDialog && nearestNpc ? (
                <NpcApproachDialog
                  npc={nearestNpc}
                  miniQuest={nearestNpcMiniQuest}
                  hasEarnedKey={Boolean(
                    nearestNpcMiniQuest && rpgState.earnedKeys.includes(nearestNpcMiniQuest.keyId),
                  )}
                  activeQuest={activeQuest}
                  availableQuest={nearestNpcAvailableQuest}
                  onOpenFullDialog={() => triggerInteract()}
                  onStartMiniQuest={handleStartMiniQuest}
                  onDismiss={() => setDismissedNpcId(nearestNpc.id)}
                />
              ) : nearest && !activeNpc ? (
                <button
                  type="button"
                  className="bt-rpg-interact-btn"
                  data-testid="rpg-interact-btn"
                  onClick={triggerInteract}
                >
                  {nearest.kind === 'npc' ? (
                    <>
                      <span>{nearest.npc.emoji}</span>
                      <span>Talk to {nearest.npc.name} [E]</span>
                    </>
                  ) : (
                    <>
                      <span>{nearest.chest.requiresKey && rpgState.earnedKeys.length === 0 ? '🔐' : '🎁'}</span>
                      <span>Open {nearest.chest.label} [E]</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Title Screen Stage Overlay */}
        {phase === 'title' && (
          <div className="bt-rpg-title-overlay">
            <div className="bt-rpg-title-card">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                aria-hidden="true"
                style={{ marginBottom: 8 }}
              >
                <circle cx="32" cy="32" r="28" fill="#ECFDF5" stroke="#10B981" strokeWidth="3" />
                <path d="M32 12L38 26L52 32L38 38L32 52L26 38L12 32L26 26L32 12Z" fill="#10B981" />
                <circle cx="32" cy="32" r="6" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
              <h1 className="bt-rpg-title-heading">Quest World</h1>
              <p className="bt-rpg-title-sub">
                Walk through storybook meadows, meet friendly villagers for new tasks, and discover hidden treasure chests!
              </p>
              <div className="bt-rpg-title-actions">
                <button
                  type="button"
                  className="bt-rpg-start-btn"
                  data-start="true"
                  onClick={startGame}
                >
                  <span>Enter World</span>
                  <span aria-hidden="true">▶</span>
                </button>
                <button
                  type="button"
                  className="bt-rpg-secondary-btn"
                  onClick={() => {
                    SoundService.playClick();
                    onBack();
                  }}
                >
                  Back to Hub
                </button>
              </div>
              <div className="bt-rpg-control-hint">
                WASD / Arrows Walk · Click Path to Move · E / Space Talk · P Pause
              </div>
            </div>
          </div>
        )}

        {/* Pause Modal */}
        {phase === 'paused' && (
          <div className="bt-rpg-modal-overlay" role="dialog" aria-modal="true">
            <div className="bt-rpg-dialog-card" style={{ maxWidth: 360, textAlign: 'center' }}>
              <h2 className="bt-rpg-dialog-title">Adventure Paused ⏸️</h2>
              <p className="bt-rpg-dialog-body">
                You&apos;ve completed {totalQuestsDone} tasks and opened {rpgState.openedChests.length}/{CHESTS.length} treasure chests.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  className="bt-rpg-start-btn"
                  onClick={() => setPhase('playing')}
                >
                  Resume Walking ▶
                </button>
                <button
                  type="button"
                  className="bt-rpg-secondary-btn"
                  onClick={() => {
                    const resetState = createInitialRpgState();
                    stateRef.current = resetState;
                    setRpgState(resetState);
                    setPhase('playing');
                  }}
                >
                  Return to Village Square
                </button>
                <button
                  type="button"
                  className="bt-rpg-secondary-btn"
                  onClick={onBack}
                >
                  Back to Hub
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NPC Dialogue & Mini-Quest Modal */}
        {phase === 'playing' && activeNpc && (
          <NpcDialog
            npc={activeNpc}
            miniQuest={activeNpcMiniQuest}
            hasEarnedKey={Boolean(
              activeNpcMiniQuest && rpgState.earnedKeys.includes(activeNpcMiniQuest.keyId),
            )}
            activeQuest={activeQuest}
            availableQuest={activeNpcAvailableQuest}
            quizIndex={quizIndex}
            quizFeedback={quizFeedback}
            onClose={() => setActiveNpc(null)}
            onStartMiniQuest={handleStartMiniQuest}
            onAcceptQuest={handleAcceptQuest}
            onRequestDynamicTask={handleRequestNewDynamicTask}
            onClaimQuestReward={handleClaimQuestReward}
            onAnswerQuiz={handleAnswerQuiz}
          />
        )}

        {/* Quest Board Drawer / Modal */}
        {phase === 'playing' && showQuestLog && (
          <div
            className="bt-rpg-modal-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowQuestLog(false)}
          >
            <div className="bt-rpg-dialog-card" onClick={e => e.stopPropagation()}>
              <div className="bt-rpg-npc-header">
                <span className="bt-rpg-npc-portrait" style={{ backgroundColor: '#EEF2FF', borderColor: '#6366F1' }}>
                  📜
                </span>
                <div>
                  <div className="bt-rpg-npc-name">Explorer Journal</div>
                  <div className="bt-rpg-npc-role">
                    {totalQuestsDone} tasks done · {rpgState.openedChests.length}/{CHESTS.length} chests · {rpgState.stepsWalked} steps
                  </div>
                </div>
                <button
                  type="button"
                  className="bt-rpg-close-x"
                  onClick={() => setShowQuestLog(false)}
                  aria-label="Close Explorer Journal"
                >
                  ✕
                </button>
              </div>

              <div className="bt-rpg-quest-list">
                {NPCS.map(npc => {
                  const nextQ = getNextQuestForNpc(npc.id, rpgState);
                  const isCurrent = activeQuest?.quest.npcId === npc.id;
                  return (
                    <div key={npc.id} className="bt-rpg-journal-row">
                      <span className="bt-rpg-journal-emoji">{npc.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div className="bt-rpg-journal-title">
                          {npc.name} · {npc.landmark}
                        </div>
                        <div className="bt-rpg-journal-sub">
                          {isCurrent
                            ? `Active: ${activeQuest?.quest.title}`
                            : nextQ
                              ? `Task available: ${nextQ.title}`
                              : 'All story tasks done · Extra walk tasks ready!'}
                        </div>
                      </div>
                      {!isCurrent && (
                        <button
                          type="button"
                          className="bt-rpg-mini-btn"
                          onClick={() => {
                            const task = nextQ || generateDynamicTask(npc.id, totalQuestsDone + 1);
                            handleAcceptQuest(task);
                            setShowQuestLog(false);
                          }}
                        >
                          Take Task
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <AdoptPetModal
          isOpen={phase === 'playing' && showAdoptPetModal}
          petState={petState}
          onClose={() => setShowAdoptPetModal(false)}
          onAdopt={adoptPet}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Canvas2D World Renderer (pure drawing function)
 * ------------------------------------------------------------------ */

let cachedTerrainCanvas: HTMLCanvasElement | null = null;

function getTerrainCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (cachedTerrainCanvas) return cachedTerrainCanvas;

  const off = document.createElement('canvas');
  off.width = WORLD_WIDTH;
  off.height = WORLD_HEIGHT;
  const ctx = off.getContext('2d');
  if (!ctx) return null;

  for (let ty = 0; ty < MAP_ROWS; ty++) {
    for (let tx = 0; tx < MAP_COLS; tx++) {
      const tile = WORLD_MAP[ty][tx];
      const px = tx * TILE_SIZE;
      const py = ty * TILE_SIZE;

      if (tile === 'water') {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      } else if (tile === 'bridge') {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#B45309';
        ctx.fillRect(px, py + 4, TILE_SIZE, TILE_SIZE - 8);
        ctx.fillStyle = '#D97706';
        for (let p = 2; p < TILE_SIZE; p += 10) {
          ctx.fillRect(px + p, py + 6, 7, TILE_SIZE - 12);
        }
        ctx.fillStyle = '#78350F';
        ctx.fillRect(px, py + 3, TILE_SIZE, 4);
        ctx.fillRect(px, py + TILE_SIZE - 7, TILE_SIZE, 4);
      } else if (tile === 'path') {
        ctx.fillStyle = '#86EFAC';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#FEF3C7';
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4, 10);
        ctx.fill();
        ctx.fillStyle = '#FDE68A';
        ctx.beginPath();
        ctx.arc(px + 15, py + 16, 4, 0, Math.PI * 2);
        ctx.arc(px + 33, py + 32, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? '#A7F3D0' : '#9AE6B4';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        if (tile === 'flower') {
          const colors = ['#F472B6', '#FBBF24', '#A78BFA'];
          ctx.fillStyle = colors[(tx + ty) % colors.length];
          ctx.beginPath();
          ctx.arc(px + 14, py + 16, 4.5, 0, Math.PI * 2);
          ctx.arc(px + 32, py + 30, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(px + 14, py + 16, 1.8, 0, Math.PI * 2);
          ctx.arc(px + 32, py + 30, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (tile === 'tree') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
        ctx.beginPath();
        ctx.ellipse(px + 24, py + 41, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#92400E';
        ctx.fillRect(px + 19, py + 24, 10, 16);
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(px + 24, py + 20, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(px + 21, py + 16, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 'house') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
        ctx.fillRect(px + 4, py + 38, TILE_SIZE - 8, 7);
        ctx.fillStyle = '#FFFBEB';
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px + 4, py + 16, TILE_SIZE - 8, 26, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = tx < 12 ? '#8B5CF6' : ty < 7 ? '#F97316' : '#06B6D4';
        ctx.beginPath();
        ctx.moveTo(px + 1, py + 18);
        ctx.lineTo(px + 24, py + 3);
        ctx.lineTo(px + TILE_SIZE - 1, py + 18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(px + 18, py + 24, 12, 10);
      }
    }
  }

  cachedTerrainCanvas = off;
  return off;
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  state: RpgSaveState,
  time: number,
  walkDist: number,
  targetPoint: { x: number; y: number } | null,
  particles: PooledParticle[],
  heroAvatar: string,
  reducedMotion: boolean,
  petState: PlayerPetState,
  petPos: { x: number; y: number },
  petWalkDist: number,
) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  const camX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_W, state.playerX - VIEW_W / 2));
  const camY = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_H, state.playerY - VIEW_H / 2));

  // 1. Blit pre-rendered static terrain layer in a single drawImage call
  const terrain = getTerrainCanvas();
  if (terrain) {
    ctx.drawImage(
      terrain,
      Math.round(camX),
      Math.round(camY),
      VIEW_W,
      VIEW_H,
      0,
      0,
      VIEW_W,
      VIEW_H,
    );
  }

  ctx.save();
  ctx.translate(-Math.round(camX), -Math.round(camY));

  const startCol = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
  const endCol = Math.min(MAP_COLS - 1, Math.ceil((camX + VIEW_W) / TILE_SIZE) + 1);
  const startRow = Math.max(0, Math.floor(camY / TILE_SIZE) - 1);
  const endRow = Math.min(MAP_ROWS - 1, Math.ceil((camY + VIEW_H) / TILE_SIZE) + 1);

  // 2. Animated water ripples only
  for (let ty = startRow; ty <= endRow; ty++) {
    for (let tx = startCol; tx <= endCol; tx++) {
      if (WORLD_MAP[ty][tx] !== 'water') continue;
      const px = tx * TILE_SIZE;
      const py = ty * TILE_SIZE;
      const waveOffset = reducedMotion ? 0 : Math.sin(time * 2.5 + ty * 0.9) * 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 8, py + 16 + waveOffset);
      ctx.quadraticCurveTo(px + 24, py + 12 + waveOffset, px + 40, py + 16 + waveOffset);
      ctx.stroke();
    }
  }

  // 3. Click-walk target ring
  if (targetPoint) {
    const pulse = reducedMotion ? 10 : 9 + Math.sin(time * 7) * 3;
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4. Treasure Chests (including Royal Key Vault)
  for (const chest of CHESTS) {
    const c = tileCenter(chest.tileX, chest.tileY);
    const opened = state.openedChests.includes(chest.id);
    const isLockedVault = Boolean(chest.requiresKey && state.earnedKeys.length === 0 && !opened);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 13, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = opened
      ? '#CBD5E1'
      : chest.requiresKey
        ? '#10B981'
        : '#D97706';
    ctx.strokeStyle = opened
      ? '#64748B'
      : chest.requiresKey
        ? '#047857'
        : '#78350F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c.x - 13, c.y - 9, 26, 20, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = opened ? '#94A3B8' : '#FBBF24';
    ctx.fillRect(c.x - 13, c.y - 2, 26, 4);
    if (!opened) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (isLockedVault) {
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#065F46';
      ctx.fillText('🔐 Key Vault', c.x, c.y - 16);
    }
  }

  // 5. Active Quest Collectibles
  const aq: ActiveQuestInstance | null = state.activeQuest;
  if (aq && aq.quest.kind === 'collect' && aq.quest.locations && aq.status === 'active') {
    aq.quest.locations.forEach((loc, idx) => {
      if (aq.collectedIndices.includes(idx)) return;
      const c = tileCenter(loc.tileX, loc.tileY);
      const bob = reducedMotion ? 0 : Math.sin(time * 4 + idx) * 4;
      const glowRadius = reducedMotion ? 20 : 19 + Math.sin(time * 5 + idx) * 2.5;

      ctx.fillStyle = 'rgba(245, 158, 11, 0.24)';
      ctx.beginPath();
      ctx.arc(c.x, c.y + bob, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(c.x, c.y + bob, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(aq.quest.itemEmoji || '✨', c.x, c.y + bob + 0.5);
    });
  }

  // 6. Villager NPCs
  for (const npc of NPCS) {
    const c = tileCenter(npc.tileX, npc.tileY);
    const bob = reducedMotion ? 0 : Math.sin(time * 2.4 + npc.tileX) * 2;
    const isGiver = aq && aq.quest.npcId === npc.id;
    const isReady = isGiver && aq?.status === 'ready_to_turn_in';
    const hasStoryLeft = Boolean(getNextQuestForNpc(npc.id, state));

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 16, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // NPC medallion
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = npc.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y + bob, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(npc.emoji, c.x, c.y + bob + 1);

    // Name label
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(npc.name, c.x, c.y + 29);

    // Floating quest badge (! or ?)
    if (isReady || (!aq && hasStoryLeft)) {
      const markerY = c.y - 26 + (reducedMotion ? 0 : Math.sin(time * 5) * 2.5);
      ctx.fillStyle = isReady ? '#10B981' : '#F59E0B';
      ctx.beginPath();
      ctx.arc(c.x, markerY, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px "Outfit", sans-serif';
      ctx.fillText(isReady ? '?' : '!', c.x, markerY + 0.5);
    }
  }

  // 7A. Adopted Virtual Pet Companion (trails behind hero & scales with growth stage)
  const adoptedPet = getPetById(petState.adoptedPetId);
  if (adoptedPet) {
    const petGrowth = getPetGrowthStage(petState.tasksCompleted);
    const petEmoji = getPetDisplayEmoji(adoptedPet, petGrowth.stage);
    const petBob = reducedMotion
      ? 0
      : Math.abs(Math.sin(petWalkDist * 0.18)) * 4 + Math.sin(time * 3.5) * 1.5;
    const radius = 14 * petGrowth.canvasScale;

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
    ctx.beginPath();
    ctx.ellipse(
      petPos.x,
      petPos.y + 13 * petGrowth.canvasScale,
      12 * petGrowth.canvasScale,
      4.5 * petGrowth.canvasScale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Stage 3+ golden/legend halo aura
    if (petGrowth.stage >= 3) {
      ctx.fillStyle =
        petGrowth.stage === 4 ? 'rgba(244, 114, 182, 0.22)' : 'rgba(251, 191, 36, 0.22)';
      ctx.beginPath();
      ctx.arc(petPos.x, petPos.y - petBob, radius + 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Companion medallion
    ctx.fillStyle = adoptedPet.bgTint;
    ctx.strokeStyle = petGrowth.stage >= 2 ? petGrowth.ringColor : adoptedPet.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(petPos.x, petPos.y - petBob, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pet sprite
    ctx.font = `${Math.round(19 * petGrowth.canvasScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(petEmoji, petPos.x, petPos.y - petBob + 0.5);

    // Stage 4 Legend orbiting star
    if (petGrowth.stage >= 4 && !reducedMotion) {
      const orbitAngle = time * 2.6;
      const sx = petPos.x + Math.cos(orbitAngle) * (radius + 6);
      const sy = petPos.y - petBob + Math.sin(orbitAngle) * (radius + 6);
      ctx.font = '11px sans-serif';
      ctx.fillText('✨', sx, sy);
    }

    // Pet nameplate
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(getPetDisplayName(petState), petPos.x, petPos.y + radius + 11);
  }

  // 7B. Player Hero Avatar
  const gaitBob = reducedMotion ? 0 : Math.abs(Math.sin(walkDist * 0.14)) * 4;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.beginPath();
  ctx.ellipse(state.playerX, state.playerY + 16, 15 - gaitBob * 0.6, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(state.playerX, state.playerY - gaitBob, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(heroAvatar, state.playerX, state.playerY - gaitBob + 1);

  // 8. Pooled Dust & Sparkle Particles
  for (const p of particles) {
    if (!p.active) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // 9. Off-screen Waypoint Arrow pointing toward Active Quest Objective
  const objective = getActiveObjectivePoint(state);
  if (objective) {
    const ox = objective.x - camX;
    const oy = objective.y - camY;
    if (ox < 24 || ox > VIEW_W - 24 || oy < 56 || oy > VIEW_H - 24) {
      const cx = VIEW_W / 2;
      const cy = VIEW_H / 2;
      const angle = Math.atan2(oy - cy, ox - cx);
      const ax = Math.max(44, Math.min(VIEW_W - 44, ox));
      const ay = Math.max(72, Math.min(VIEW_H - 44, oy));

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
