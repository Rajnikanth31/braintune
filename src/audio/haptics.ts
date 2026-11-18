/**
 * Lightweight haptic feedback using the browser Vibration API when supported.
 */
export type HapticType = 'tap' | 'success' | 'error';

const PATTERNS: Record<HapticType, number | number[]> = {
  tap: 12,
  success: [25, 45, 35],
  error: [45],
};

export function haptic(type: HapticType, enabled: boolean = true): void {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[type]);
    }
  } catch {
    // Vibration unsupported — ignore.
  }
}
