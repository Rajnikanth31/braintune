# Changelog

All notable changes to Braintune are documented here. This project follows
[Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Audio (round 4)
- **Background music + sound effects:** looping music while playing, plus click / correct / wrong / win cues, via a new crash-safe `SoundService` (wraps `react-native-sound`; no-ops safely until the native module is rebuilt).
- **Controlled by the existing settings:** the Parent Zone **Background Music** and **Sound Effects** toggles drive audio live.
- **Generated assets:** five royalty-free, kid-friendly clips synthesized and bundled in `android/app/src/main/res/raw/`.
- Added `react-native-sound` dependency; see `docs/AUDIO_SETUP.md` for the install / rebuild / iOS-bundle steps.

### Game feel / "juice" (round 3)
- **Celebration particles:** rising stars + confetti burst on every correct answer, and a bigger burst on the session-complete screen (`Celebration` component, shared across all games).
- **Haptic feedback:** gentle vibration on correct/incorrect answers via the built-in Vibration API (no new dependency), gated by the Sound Effects setting.
- **Screen transitions:** soft fade-and-slide between screens and when launching games (`FadeInView`).
- All juice honors the **Reduced Motion** accessibility setting (particles/animation disabled, instant appearance).

### Gameplay improvements (round 2)
- **Memory match "peek" phase:** every card is revealed first so the child can memorize the layout, then the cards hide and matching begins. Peek time scales with board size.
- **No more premature question changes:** Letters/Numbers/Colors now regenerate a question only on a new round, never when adaptive difficulty shifts mid-question — so feedback is always shown before the next question.
- **Letters is now picture-first:** only the picture shows; the word is revealed after the child taps a letter.
- **More levels & content:** difficulty levels raised from 5 to **8** (Basic→Master), with expanded letter/color/emoji pools and a new **Grand Master** badge.

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
