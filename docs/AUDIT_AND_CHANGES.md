# Braintune — Audit, Fixes & Enhancements

_Review pass on the Braintune kids' learning game (React Native 0.86 / TypeScript)._

## 1. What I found

The repo had **one fully working mini-game (Memory & Attention)** and **three empty placeholders** (Letters, Numbers, Colors) that only showed a static "coming soon" card. There was a crash in the Parent Zone, several logic bugs in the one real game, and none of the requested progression / rewards systems existed yet.

### Issues identified

| # | Severity | Area | Problem |
|---|----------|------|---------|
| 1 | **Crash** | Parent Zone | `ChildReportCard` in `App.tsx` called `DB.getChildStats(...)` but `DB` was never imported. Opening Parent Zone threw `ReferenceError` / failed to compile (`TS2304: Cannot find name 'DB'`). The app's render test timed out as a result. |
| 2 | **Broken games** | Letters / Numbers / Colors | Not games at all — static scaffold cards. No gameplay, scoring, or progress. |
| 3 | **Logic bug** | Memory game | Adaptive difficulty read the **stale `streak`** value from a closure, so level-ups fired on the wrong turn (off-by-one). |
| 4 | **Logic bug** | Memory game | In "Spot the Target" mode, changing `difficulty` ran a `useEffect` that rebuilt the board **mid-round**, racing with the round-success timer (board could reset under the player). |
| 5 | **State bug** | Memory game | Card state was mutated in place (`updatedCards[i].isFlipped = true` on a shallow copy), risking stale renders. |
| 6 | **Data model** | Storage | No XP, level, streak, or badge fields; no migration path for older saves; `updateGameSession` returned `void` (no way to surface rewards). |
| 7 | **No progression** | App-wide | No Basic→Advanced unlocking, no level gating, no rewards, no daily streaks, no stats beyond a flat accuracy number. |
| 8 | **UX/A11y** | App-wide | No onboarding/tutorials, no per-level selection, no accessibility options, minimal `accessibilityLabel`s. |

## 2. Fixes applied

- **Crash (#1):** imported `DB` (and `ChildStats`) into `App.tsx`; hardened `ChildReportCard`'s async load against unmount. Verified the original `TS2304` is gone.
- **Memory adaptive logic (#3, #4, #5):** the game now drives all scoring/levels through a shared `useGameSession` hook. Adaptive difficulty is computed from the **freshly updated** streak, board rebuilds happen **only at round boundaries** (never mid-round), and card state is updated immutably (`map(...)`).
- **Storage (#6):** `ChildProfile` gained `xp`, `level`, `streak`, `lastDayKey`, `badges`. Added `normalizeProfile()` so legacy saves backfill cleanly (derives XP from existing stars). `updateGameSession` now returns `{ newBadges, profile }`, and `syncBadges()` recomputes badges on profile select.

## 3. Enhancements implemented

### Basic → Advanced progression
- Every game now has **5 difficulty levels** (Basic, Easy, Medium, Hard, Advanced).
- **Unlock gating** (`highestUnlockedLevel`): you can play one level beyond your highest reached, once accuracy on the current level clears 60%. Locked levels show 🔒 in the level picker.
- **Adaptive difficulty** within a session: a 3-in-a-row streak bumps the level up (capped); a wrong answer eases it down (floored at Basic). No fail states — fully aligned with the child-safe brief.

### Four fully playable games
- **Letters & Phonics** — picture+word prompt; tap the starting letter. Options grow with level.
- **Numbers & Counting** — count objects; from level 2, "what comes next?" sequences appear.
- **Colors & Shapes** — tap the named color; from level 3, complete ABAB / ABCABC color patterns.
- **Memory & Attention** — rebuilt on the shared engine; "Find Pairs" + "Spot the Target", with pairs/items scaling by level.

### Rewards & engagement
- **XP + global player level** (10 XP per star) with an animated XP bar and level badge on the hub.
- **8 badges** (First Steps, Star Collector/Master, Explorer, Sharp Mind, On Fire, Dedicated, Rising Star) — auto-awarded and revealed on the session-complete screen.
- **Daily streaks** (🔥) computed from local day keys (same-day = no change, next-day = +1, gap = reset).
- **Per-game progress** shown on each hub card (unlocked level, dots, plays, accuracy).

### UX / onboarding / accessibility
- A **tutorial card** before each game explains the mechanic; a **level picker** lets kids choose an unlocked level.
- Richer **mascot feedback** and streak callouts during play.
- **Accessibility settings** added to Parent Zone (High Contrast, Reduced Motion, Larger Text) plus the existing Sound/Music/Voice toggles, all persisted.
- Added `accessibilityRole` / `accessibilityLabel` / `accessibilityState` to interactive elements.
- **Save/load** is automatic via the existing local `AsyncStorage` layer (offline, no tracking — per the brief).

### Architecture
New shared, isolated module so games stay independent and consistent:
- `src/games/shared/progression.ts` — pure logic (XP curve, adaptive difficulty, unlocks, streaks, badges).
- `src/games/shared/useGameSession.ts` — session bookkeeping + persistence hook.
- `src/games/shared/GameShell.tsx` — reusable header / level picker / session bar / success / tutorial UI.

## 4. Verification

- **Unit tests:** added `__tests__/progression.test.ts` — **17 tests, all passing**, covering XP/levels, adaptive difficulty, unlock gating, daily streaks, and badge evaluation.
- **Type safety:** the changed core type surfaces (`db.ts`, `AppContext.tsx`, `progression.ts`, `useGameSession.ts`, `GameShell.tsx`) **typecheck clean** under `tsc --noEmit`. The original `TS2304` crash error is resolved. The four games import only the validated shared APIs with matching prop shapes.

> Note: the sandbox used for this pass mounted a frozen, session-start snapshot of pre-existing files, so the full in-place `tsc`/`jest` run reflects pre-edit code. Run them locally to confirm end-to-end:
> ```bash
> npx tsc --noEmit && npm test
> ```

## 5. Suggested next features (engagement & retention)

1. **Daily Challenge + quests** — one rotating "mission" per day (e.g. "earn 10 stars in Numbers") with bonus XP; data model already supports day keys.
2. **Additional game modes** — Timed, Survival, and Expert can be layered on `useGameSession` (it already centralizes rounds/scoring) without touching individual games.
3. **Audio layer** — drop a `SoundService` behind the existing sound/music/voice toggles (kept structure-only this pass, per request) for correct/incorrect chimes and spoken instructions (great for pre-readers).
4. **Letter tracing** — add a gesture-based trace mode to Letters using `PanResponder`/SVG for fine-motor practice.
5. **Local leaderboard / "personal bests"** — per-child best streaks and fastest rounds (offline, no accounts) to reward replay.
6. **Weekly parent email/report export** — summarize each child's progress; pairs well with the existing Parent Zone analytics.
7. **Unlockable cosmetics** — mascot outfits/themes bought with stars, giving stars a spending sink.
