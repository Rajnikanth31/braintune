/**
 * Web audio service for Braintune using HTML5 Audio and Web Speech API.
 * Plays the original MP3 assets from /audio/ and degrades gracefully if
 * browser autoplay policies block playback before the first user gesture.
 */

export type SfxKey = 'click' | 'correct' | 'wrong' | 'win';

const SFX_FILES: Record<SfxKey, string> = {
  click: '/audio/click.mp3',
  correct: '/audio/correct.mp3',
  wrong: '/audio/wrong.mp3',
  win: '/audio/win.mp3',
};

const MUSIC_FILE = '/audio/bg_music.mp3';
const MUSIC_VOLUME = 0.35;
const SFX_VOLUME = 0.8;

class SoundManager {
  private sfx: Record<string, HTMLAudioElement> = {};
  private music: HTMLAudioElement | null = null;
  private loaded = false;
  private sfxEnabled = true;
  private musicEnabled = true;
  private voiceEnabled = true;
  private musicShouldPlay = false;

  load(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined' || this.loaded) {
      return;
    }
    this.loaded = true;

    (Object.keys(SFX_FILES) as SfxKey[]).forEach(key => {
      try {
        const audio = new Audio(SFX_FILES[key]);
        audio.volume = SFX_VOLUME;
        audio.preload = 'auto';
        this.sfx[key] = audio;
      } catch {
        // Ignore individual audio load failure
      }
    });

    try {
      const bg = new Audio(MUSIC_FILE);
      bg.loop = true;
      bg.volume = MUSIC_VOLUME;
      bg.preload = 'auto';
      this.music = bg;
      if (this.musicShouldPlay && this.musicEnabled) {
        bg.play().catch(() => {});
      }
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

  setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  playSfx(key: SfxKey): void {
    if (!this.sfxEnabled) return;
    if (!this.loaded) this.load();
    const clip = this.sfx[key];
    if (!clip) return;
    try {
      clip.currentTime = 0;
      clip.play().catch(() => {});
    } catch {
      // ignore autoplay block
    }
    // If music should be playing (e.g. blocked earlier before user gesture), resume it now
    if (this.musicShouldPlay && this.musicEnabled && this.music && this.music.paused) {
      this.music.play().catch(() => {});
    }
  }

  playClick(): void {
    this.playSfx('click');
  }

  speak(text: string): void {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore unsupported speech synthesis
    }
  }

  startMusic(): void {
    this.musicShouldPlay = true;
    if (!this.loaded) this.load();
    if (!this.musicEnabled || !this.music) return;
    try {
      this.music.play().catch(() => {});
    } catch {
      // ignore
    }
  }

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

  release(): void {
    this.pauseMusic();
    this.sfx = {};
    this.music = null;
    this.loaded = false;
  }
}

export const SoundService = new SoundManager();
