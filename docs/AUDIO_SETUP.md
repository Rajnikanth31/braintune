# Audio Setup

Braintune plays a looping background track while a game is on screen, plus
click / correct / wrong / win sound effects. Audio is controlled by the two
existing Parent Zone toggles:

- **Background Music** → looping music (`musicEnabled`)
- **Sound Effects** → clicks + answer/win cues (`soundEffectsEnabled`)

The audio engine (`src/audio/SoundService.ts`) is **crash-safe**: if the native
module isn't installed/linked yet, every call no-ops and the app runs silently —
so the JS will not break before you rebuild.

## 1. Install the native dependency

```bash
npm install            # picks up react-native-sound (already in package.json)
cd ios && pod install   # iOS only
```

A **native rebuild is required** (the JS bundle alone won't include it):

```bash
npm run android    # or: npm run ios
```

> Do **not** also add `@types/react-native-sound` — `SoundService` accesses the
> library through `require` and defines its own minimal facade, so no extra
> typings are needed (and a separate `@types` package can cause duplicate
> declarations).

## 2. Audio assets

Five generated, royalty-free clips ship with the app:

| File           | Use                          |
|----------------|------------------------------|
| `bg_music.mp3` | looping background music (~24s) |
| `click.mp3`    | UI taps                      |
| `correct.mp3`  | correct answer               |
| `wrong.mp3`    | gentle "try again" (no harsh buzzer) |
| `win.mp3`      | session complete fanfare     |

### Android — already wired
The files live in `android/app/src/main/res/raw/`. React Native autolinks
`react-native-sound`, and `res/raw` assets are bundled automatically. Nothing
else to do for Android.

### iOS — one manual step
`react-native-sound` loads iOS audio from the **app bundle**, so the files must
be added to the Xcode project:

1. Open `ios/Braintune.xcworkspace` in Xcode.
2. Drag the five `.mp3` files (from `android/app/src/main/res/raw/`, or copy them
   into `ios/`) into the project navigator.
3. In the dialog, tick **"Copy items if needed"** and your app target, so they
   land in **Build Phases → Copy Bundle Resources**.

## 3. Replacing the sounds

Drop a new file with the same name into `res/raw/` (Android) and re-add it to the
iOS bundle. Keep names **lowercase** with no spaces (Android resource rule).
File names are defined once in `SoundService.ts`.

## How it's wired

- `useGameSession` fires `correct` / `wrong` on each answer and `win` on session
  completion.
- Shared buttons (`GameShell`) and game launch (`App.tsx`) fire `click`.
- `App.tsx` starts the music loop when a `*_game` screen is active, pauses it
  elsewhere, and keeps the engine in sync with the two settings toggles in real
  time. All audio also respects these toggles internally.
