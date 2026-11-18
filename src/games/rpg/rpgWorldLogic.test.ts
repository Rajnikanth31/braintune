import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER_SPAWN,
  NPCS,
  CHESTS,
  QUEST_DEFINITIONS,
  TILE_SIZE,
  canStandAt,
  isTileWalkable,
  tileCenter,
  createInitialRpgState,
  movePlayerWithCollision,
  acceptQuest,
  checkCollectiblePickups,
  completeActiveQuest,
  openChest,
  findNearestInteractable,
  generateDynamicTask,
  startNpcMiniQuest,
  resolvePendingMiniQuestOnGameComplete,
} from './rpgWorldLogic';

test('map integrity: spawn, NPCs, chests, and quest collectible tiles are all walkable', () => {
  assert.equal(canStandAt(PLAYER_SPAWN.x, PLAYER_SPAWN.y), true);

  for (const npc of NPCS) {
    assert.equal(
      isTileWalkable(npc.tileX, npc.tileY),
      true,
      `NPC ${npc.id} tile (${npc.tileX}, ${npc.tileY}) must be walkable`,
    );
  }

  for (const chest of CHESTS) {
    assert.equal(
      isTileWalkable(chest.tileX, chest.tileY),
      true,
      `Chest ${chest.id} tile (${chest.tileX}, ${chest.tileY}) must be walkable`,
    );
  }

  for (const q of QUEST_DEFINITIONS) {
    if (q.locations) {
      for (const loc of q.locations) {
        assert.equal(
          isTileWalkable(loc.tileX, loc.tileY),
          true,
          `Quest ${q.id} collectible (${loc.tileX}, ${loc.tileY}) must be walkable`,
        );
      }
    }
  }
});

test('movePlayerWithCollision blocks water and border trees while allowing open path movement', () => {
  const start = PLAYER_SPAWN;
  const movedRight = movePlayerWithCollision(start.x, start.y, 20, 0);
  assert.ok(movedRight.x > start.x);

  // Try walking straight into northern border tree at row 0
  const nearTop = tileCenter(5, 1);
  const blockedUp = movePlayerWithCollision(nearTop.x, nearTop.y, 0, -40);
  assert.equal(blockedUp.y, nearTop.y);

  // Water column x=12, row 1 is blocked, whereas bridge at x=12, row 8 is walkable
  assert.equal(isTileWalkable(12, 1), false);
  assert.equal(isTileWalkable(12, 8), true);
});

test('quest lifecycle: accept collect quest, gather all items by walking, and claim rewards', () => {
  let state = createInitialRpgState();
  const tourQuest = QUEST_DEFINITIONS.find(q => q.id === 'q_bino_tour')!;
  state = acceptQuest(state, tourQuest);
  assert.equal(state.activeQuest?.status, 'active');

  for (const loc of tourQuest.locations!) {
    const pos = tileCenter(loc.tileX, loc.tileY);
    const res = checkCollectiblePickups(pos.x, pos.y, state);
    assert.equal(res.pickedUpCount, 1);
    state = res.state;
  }

  assert.equal(state.activeQuest?.collectedIndices.length, 3);
  assert.equal(state.activeQuest?.status, 'ready_to_turn_in');

  const completed = completeActiveQuest(state);
  assert.equal(completed.starsEarned, tourQuest.rewardStars);
  assert.equal(completed.coinsEarned, tourQuest.rewardCoins);
  assert.equal(completed.state.activeQuest, null);
  assert.ok(completed.state.completedQuestIds.includes(tourQuest.id));
});

test('openChest awards chest once and prevents double opening', () => {
  let state = createInitialRpgState();
  const first = openChest(state, 'chest_grove');
  assert.ok(first.chest);
  assert.equal(first.chest?.coins, 12);
  state = first.state;

  const second = openChest(state, 'chest_grove');
  assert.equal(second.chest, null);
});

test('findNearestInteractable detects nearby NPC and generateDynamicTask picks valid tiles', () => {
  const state = createInitialRpgState();
  const binoPos = tileCenter(NPCS[0].tileX, NPCS[0].tileY);
  const nearest = findNearestInteractable(binoPos.x + TILE_SIZE * 0.5, binoPos.y, state);
  assert.equal(nearest?.kind, 'npc');
  if (nearest?.kind === 'npc') {
    assert.equal(nearest.npc.id, 'npc_bino');
  }

  const dyn = generateDynamicTask('npc_owl', 7);
  assert.equal(dyn.isDynamic, true);
  assert.equal(dyn.locations?.length, 3);
  for (const loc of dyn.locations!) {
    assert.equal(isTileWalkable(loc.tileX, loc.tileY), true);
  }
});

test('NPC mini-quest awards Key after completing linked learning game and unlocks Royal Key Vault', () => {
  let state = createInitialRpgState();

  // Royal Key Vault starts locked without any Key
  const lockedTry = openChest(state, 'chest_key_vault');
  assert.equal(lockedTry.chest, null);
  assert.ok(lockedTry.lockedReason);

  // Start Sparky Bot's math mini-quest to earn the Observatory Key
  const started = startNpcMiniQuest(state, 'npc_bot');
  assert.equal(started.miniQuest?.gameId, 'math');
  state = started.state;

  // Mismatched game does not unlock the key
  const wrongGame = resolvePendingMiniQuestOnGameComplete(state, 'colors', 5);
  assert.equal(wrongGame.unlockedKey, null);

  // Completing math with correct answers unlocks the Observatory Key
  const solved = resolvePendingMiniQuestOnGameComplete(state, 'math', 5);
  assert.equal(solved.unlockedKey?.keyId, 'key_observatory');
  state = solved.state;
  assert.ok(state.earnedKeys.includes('key_observatory'));
  assert.equal(state.pendingMiniQuest, null);

  // Now the Royal Key Vault opens!
  const vaultOpened = openChest(state, 'chest_key_vault');
  assert.ok(vaultOpened.chest);
  assert.equal(vaultOpened.chest?.stars, 5);
});
