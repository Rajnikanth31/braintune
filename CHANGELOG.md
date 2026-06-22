# Changelog

All notable changes to Braintune are documented here. This project follows
[Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Fixed
- **Parent Zone crash:** `DB` was used but not imported in `App.tsx` (`TS2304`). Imported and hardened the async stats load.
- **Memory game adaptive difficulty:** corrected stale-streak off-by-one and a mid-round board-rebuild race; card state now updated immutably.

### Added
- **Basic→Advanced progression:** 5 difficulty levels per game, accuracy-gated unlocking, and in-session adaptive difficulty.
- **Three new playable games:** Letters & Phonics, Numbers & Counting, Colors & Shapes (replacing the static scaffolds).
- **Rewards system:** XP + global player level, 8 unlockable badges, and daily play streaks.
- **Shared game engine:** `progression.ts` (pure logic), `useGameSession.ts` (session + persistence), and `GameShell.tsx` (reusable UI).
- **Onboarding & UX:** per-game tutorial cards, level pickers, richer mascot/streak feedback, hub progress cards.
- **Accessibility settings:** High Contrast, Reduced Motion, Larger Text (persisted) plus `accessibility*` props on interactive elements.
- **Tests:** `__tests__/progression.test.ts` (17 tests) covering XP, adaptive difficulty, unlocks, streaks, and badges.

### Changed
- Storage `ChildProfile` extended with `xp`, `level`, `streak`, `lastDayKey`, `badges`, with safe migration for legacy saves.
- `DB.updateGameSession` now returns newly earned badges so the UI can celebrate them.
