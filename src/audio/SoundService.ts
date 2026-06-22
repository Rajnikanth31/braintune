/**
 * Crash-safe audio service for Braintune.
 *
 * Wraps `react-native-sound` behind a small facade so the rest of the app never
 * touches the native module directly. If the library isn't installed yet (e.g.
 * before a native rebuild) every call safely no-ops — the app keeps working,
 * just silent.
 *
 * Asset files live in:
 *   Android: android/app/src/main/res/raw/   (lowercase names, no spaces)
 *   iOS:     added to the app bundle in Xcode
 * referenced by filename via Sound.MAIN_BUNDLE.
 */

// `require` keeps this resilient: a missing native module throws here and we
// fall back to a silent no-op service instead of crashing the bundle.
let Sound: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sound = require('react-native-sound');
  if (Sound?.setCategory) {
    // Allow playback in silent mode / mixing on iOS.
    Sound.setCategory('Playback', true);
  }
} catch {
  Sound = null;
}

export type SfxKey = 'click' | 'correct' | 'wrong' | 'win';

const SFX_FILES: Record<SfxKey, string> = {
  click: 'click.mp3',
  correct: 'correct.mp3',
  wrong: 'wrong.mp3',
  win: 'win.mp3',
};

const MUSIC_FILE = 'bg_music.mp3';
const MUSIC_VOLUME = 0.35; // gentle background level
const SFX_VOLUME = 0.8;

class SoundManager {
  private sfx: Record<string, any> = {};
  private music: any = null;
  private musicReady = false;
  private loaded = false;
  private sfxEnabled = true;
  private musicEnabled = true;
  private musicShouldPlay = false;

  /** Preload all clips once. Safe to call multiple times. */
  load(): void {
    if (!Sound || this.loaded) return;
    this.loaded = true;

    (Object.keys(SFX_FILES) as SfxKey[]).forEach(key => {
      try {
        const clip = new Sound(SFX_FILES[key], Sound.MAIN_BUNDLE, (err: any) => {
          if (!err) clip.setVolume(SFX_VOLUME);
        });
        this.sfx[key] = clip;
      } catch {
        // ignore a missing individual asset
      }
    });

    try {
      this.music = new Sound(MUSIC_FILE, Sound.MAIN_BUNDLE, (err: any) => {
        if (err) return;
        this.musicReady = true;
        this.music.setNumberOfLoops(-1);
        this.music.setVolume(MUSIC_VOLUME);
        if (this.musicShouldPlay && this.musicEnabled) this.music.play();
      });
    } catch {
      this.music = null;
    }
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.pauseMusic();
    } else if (this.musicShouldPlay) {
      this.startMusic();
    }
  }

  /** Play a one-shot effect (restarts if already playing). Gated by SFX setting. */
  playSfx(key: SfxKey): void {
    if (!Sound || !this.sfxEnabled) return;
    const clip = this.sfx[key];
    if (!clip) return;
    try {
      clip.stop(() => clip.play());
    } catch {
      // ignore
    }
  }

  playClick(): void {
    this.playSfx('click');
  }

  /** Request looping background music (e.g. when a game is on screen). */
  startMusic(): void {
    this.musicShouldPlay = true;
    if (!Sound || !this.musicEnabled || !this.music || !this.musicReady) return;
    try {
      this.music.play();
    } catch {
      // ignore
    }
  }

  /** Stop wanting music and pause it (e.g. back on the menu). */
  stopMusic(): void {
    this.musicShouldPlay = false;
    this.pauseMusic();
  }

  private pauseMusic(): void {
    if (this.music) {
      try {
        this.music.pause();
      } catch {
        // ignore
      }
    }
  }

  /** Release native resources (call on full teardown). */
  release(): void {
    Object.values(this.sfx).forEach(c => c?.release?.());
    this.music?.release?.();
    this.sfx = {};
    this.music = null;
    this.loaded = false;
    this.musicReady = false;
  }
}

export const SoundService = new SoundManager();
