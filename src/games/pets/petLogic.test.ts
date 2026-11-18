import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PET_CATALOG,
  adoptPetInState,
  createInitialPetState,
  evaluatePetMilestones,
  getPetDisplayEmoji,
  getPetGrowthStage,
  getUnlockedPets,
  stepPetFollow,
} from './petLogic';

test('pet unlock milestones gate adoption until enough learning tasks are completed', () => {
  const fresh = createInitialPetState(null, 0);
  assert.equal(getUnlockedPets(fresh.tasksCompleted).length, 0);

  const blocked = adoptPetInState(fresh, 'pet_sprout_pup', 'Sunny');
  assert.equal(blocked.adopted, false);
  assert.match(blocked.reason ?? '', /1 more learning task/i);

  const afterOneTask = { ...fresh, tasksCompleted: 1 };
  assert.equal(getUnlockedPets(afterOneTask.tasksCompleted).length, 1);

  const adopted = adoptPetInState(afterOneTask, 'pet_sprout_pup', 'Sunny');
  assert.equal(adopted.adopted, true);
  assert.equal(adopted.state.adoptedPetId, 'pet_sprout_pup');
  assert.equal(adopted.state.customName, 'Sunny');
});

test('pet growth advances from Baby to Explorer, Champion, and Legend as tasks increase', () => {
  const dragon = PET_CATALOG.find(p => p.id === 'pet_little_dragon')!;

  const s1 = getPetGrowthStage(1);
  assert.equal(s1.stage, 1);
  assert.equal(s1.label, 'Baby');
  assert.equal(getPetDisplayEmoji(dragon, s1.stage), '🐣');

  const s2 = getPetGrowthStage(3);
  assert.equal(s2.stage, 2);
  assert.equal(s2.label, 'Explorer');
  assert.equal(getPetDisplayEmoji(dragon, s2.stage), '🦎');

  const s3 = getPetGrowthStage(6);
  assert.equal(s3.stage, 3);
  assert.equal(s3.label, 'Champion');
  assert.equal(getPetDisplayEmoji(dragon, s3.stage), '🐉');

  const s4 = getPetGrowthStage(10);
  assert.equal(s4.stage, 4);
  assert.equal(s4.label, 'Legend');
  assert.equal(s4.progress, 1);
  assert.equal(getPetDisplayEmoji(dragon, s4.stage), '🐲');
  assert.ok(s4.canvasScale > s1.canvasScale);
});

test('evaluatePetMilestones detects both newly unlocked companions and stage growth', () => {
  const adoptedPup = createInitialPetState({
    adoptedPetId: 'pet_sprout_pup',
    customName: 'Pip',
    tasksCompleted: 2,
  });

  const milestones = evaluatePetMilestones(2, 3, adoptedPup);
  assert.equal(milestones.newlyUnlockedPets.length, 1);
  assert.equal(milestones.newlyUnlockedPets[0].id, 'pet_star_cat');
  assert.equal(milestones.grewFromStage, 1);
  assert.equal(milestones.grewToStage, 2);
});

test('stepPetFollow smoothly moves companion toward trailing offset behind avatar', () => {
  const playerX = 320;
  const playerY = 240;
  let petX = 200;
  let petY = 240;

  for (let i = 0; i < 30; i++) {
    const next = stepPetFollow(petX, petY, playerX, playerY, 0, 0.016);
    petX = next.x;
    petY = next.y;
  }

  const distAfterWalk = Math.hypot(playerX - petX, playerY - petY);
  assert.ok(distAfterWalk < 110, `Expected pet to close distance, got ${distAfterWalk}`);
  assert.ok(distAfterWalk >= 25, `Expected pet to keep trailing space, got ${distAfterWalk}`);
});
