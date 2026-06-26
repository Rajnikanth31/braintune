# Diagnosing the "crashes on some phones" issue

The app now has a top-level **ErrorBoundary** (`src/components/ErrorBoundary.tsx`).
If the crash is a JavaScript error, the failing phone will now show a recovery
screen **with the error text** — please screenshot that and share it.

If the screen still goes fully black / the app closes instantly, it's a
**native** crash (the ErrorBoundary can't catch those). Capture the real cause
one of these ways:

## Option A — Play Console (easiest once published)
Play Console → **Test and release → App quality → Crashes & ANRs**. It shows
stack traces grouped by device/Android version — ideal for "only some phones."

## Option B — adb logcat (a phone plugged into your machine)
```bash
adb logcat -c                      # clear old logs
# launch the app on the device, reproduce the crash, then:
adb logcat *:E | grep -iE "AndroidRuntime|FATAL|braintune|ReactNative"
```
Copy the `FATAL EXCEPTION` block.

## Option C — Metro (debug build)
```bash
npx react-native log-android
```

## Most likely suspects for a launch crash (given recent changes)
1. **`react-native-sound` on the New Architecture.** This project has
   `newArchEnabled=true`. The library works through the interop layer for most
   setups, but is the first thing to rule out. Quick test: temporarily remove it
   from `package.json`, rebuild, and see if the crash disappears. `SoundService`
   already no-ops safely without it, so the app stays functional. If it's the
   culprit, switch to a New-Architecture-native audio lib (e.g.
   `react-native-nitro-sound`) — `SoundService` is the only file to update.
2. **Stale native build vs. JS.** After adding native deps you must rebuild:
   `npm install`, `cd ios && pod install`, then `npm run android` / `npm run ios`.
   A JS-only reload won't include new native modules.
3. **Device ABI / low memory** on older phones — the Play Console pre-launch
   report (real devices) will surface these.

Once you share the stack trace (Option A/B), the fix is usually one or two lines.
