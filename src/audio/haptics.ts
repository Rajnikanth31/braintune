import { Vibration } from 'react-native';

/**
 * Lightweight haptic feedback using the built-in Vibration API (no extra
 * native dependency, fully offline). Patterns are intentionally short and
 * gentle for young children.
 */
export type HapticType = 'tap' | 'success' | 'error';

const PATTERNS: Record<HapticType, number | number[]> = {
  tap: 12, // quick light tick on any interaction
  success: [0, 25, 45, 35], // cheerful double-buzz
  error: [0, 45], // single soft buzz (never harsh — no fail states)
};

/**
 * Fire a haptic. Gated by `enabled` so it respects the user's sound/feedback
 * preference. Safely no-ops on platforms/devices without a vibrator.
 */
export function haptic(type: HapticType, enabled: boolean = true): void {
  if (!enabled) return;
  try {
    Vibration.vibrate(PATTERNS[type]);
  } catch {
    // Vibration unsupported (e.g. simulator) — ignore.
  }
}
