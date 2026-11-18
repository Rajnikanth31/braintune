import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateFamilyQuestion,
  calculateRoundPoints,
  evaluateFamilyOutcome,
  PuzzleCategory,
} from './familyLogic';

test('generateFamilyQuestion produces valid questions across all categories and tiers', () => {
  const categories: PuzzleCategory[] = ['math', 'word', 'sequence', 'flash'];
  const tiers = ['kid', 'adult'] as const;

  for (const tier of tiers) {
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const q = generateFamilyQuestion(tier, i, cat);
      assert.equal(q.category, cat);
      assert.equal(q.tier, tier);
      assert.ok(q.prompt.length > 0, 'prompt should be non-empty');
      assert.ok(q.choices.length >= 4, 'should have 4 choices');
      assert.ok(q.choices.includes(q.answer), 'choices must contain answer');
      assert.equal(new Set(q.choices).size, q.choices.length, 'choices must be unique');

      if (cat === 'flash') {
        assert.ok(Array.isArray(q.flashCells) && q.flashCells.length >= 3);
        const target = q.flashTargetIndex ?? 0;
        assert.equal(q.flashCells[target].emoji, q.answer);
        assert.equal(q.flashCells[target].highlighted, true);
      }
    }
  }
});

test('calculateRoundPoints rewards speed and streak, and returns 0 when wrong', () => {
  assert.equal(calculateRoundPoints(false, 12, 3), 0);
  assert.equal(calculateRoundPoints(true, 0, 0), 100);
  assert.equal(calculateRoundPoints(true, 10, 2), 100 + 50 + 50);
  // Clamps timer above 15s
  assert.equal(calculateRoundPoints(true, 99, 0), 100 + 75);
});

test('evaluateFamilyOutcome resolves duel winners, ties, and co-op totals', () => {
  const p1Win = evaluateFamilyOutcome('duel', 420, 310, 'Liam', 'Parent', 5, 6);
  assert.equal(p1Win.winner, 'p1');
  assert.ok(p1Win.headline.includes('Liam'));
  assert.ok(p1Win.starsEarned >= 1);

  const p2Win = evaluateFamilyOutcome('duel', 200, 450, 'Liam', 'Mom', 4, 6);
  assert.equal(p2Win.winner, 'p2');
  assert.ok(p2Win.headline.includes('Mom'));

  const tie = evaluateFamilyOutcome('duel', 300, 300, 'Liam', 'Dad', 4, 6);
  assert.equal(tie.winner, 'tie');

  const coop = evaluateFamilyOutcome('coop', 300, 350, 'Liam', 'Mom', 6, 6);
  assert.equal(coop.winner, 'team');
  assert.ok(coop.subtitle.includes('650'));
});
