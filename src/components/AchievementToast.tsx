import React, { useEffect, useState } from 'react';
import { AchievementToastItem } from './achievementToastLogic';
import { SoundService } from '../audio/SoundService';

export const TOAST_DURATION_MS = 4200;
const EXIT_ANIMATION_MS = 220;

interface AchievementToastProps {
  items: AchievementToastItem[];
  reducedMotion?: boolean;
  highContrast?: boolean;
  largeText?: boolean;
  onDismiss: (id: string) => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
  items,
  reducedMotion = false,
  highContrast = false,
  largeText = false,
  onDismiss,
}) => {
  const current = items[0] ?? null;
  const remainingCount = Math.max(0, items.length - 1);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setExiting(false);
    if (!current) return;

    const fadeStartDelay = reducedMotion
      ? TOAST_DURATION_MS
      : Math.max(0, TOAST_DURATION_MS - EXIT_ANIMATION_MS);

    const fadeTimer = setTimeout(() => {
      if (!reducedMotion) {
        setExiting(true);
      }
    }, fadeStartDelay);

    const dismissTimer = setTimeout(() => {
      onDismiss(current.id);
    }, TOAST_DURATION_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [current, reducedMotion, onDismiss]);

  if (!current) return null;

  const handleClose = () => {
    SoundService.playClick();
    if (reducedMotion) {
      onDismiss(current.id);
      return;
    }
    setExiting(true);
    setTimeout(() => {
      onDismiss(current.id);
    }, EXIT_ANIMATION_MS);
  };

  const wrapperClasses = [
    'bt-toast-region',
    reducedMotion ? 'bt-reduced-motion' : '',
    highContrast ? 'high-contrast' : '',
    largeText ? 'large-text' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={wrapperClasses}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        key={current.id}
        data-testid="achievement-toast"
        data-achievement-kind={current.kind}
        className={`bt-achievement-toast ${exiting ? 'exiting' : ''}`}
        style={{
          borderColor: current.accentColor,
          background: `linear-gradient(135deg, ${current.bgTint} 0%, #FFFFFF 62%)`,
        }}
      >
        <div
          className="bt-toast-icon-badge"
          style={{
            backgroundColor: current.bgTint,
            borderColor: current.accentColor,
          }}
          aria-hidden="true"
        >
          <span>{current.emoji}</span>
        </div>

        <div className="bt-toast-body">
          <div className="bt-toast-kicker-row">
            <span
              className="bt-toast-kicker"
              style={{ color: current.accentColor }}
            >
              {current.kicker}
            </span>
            {remainingCount > 0 && (
              <span className="bt-toast-queue-pill">+{remainingCount} more</span>
            )}
          </div>
          <div className="bt-toast-title">{current.title}</div>
          <div className="bt-toast-subtitle">{current.subtitle}</div>
        </div>

        <button
          type="button"
          className="bt-toast-close"
          onClick={handleClose}
          aria-label="Dismiss achievement notification"
        >
          ✕
        </button>

        <div className="bt-toast-progress-track" aria-hidden="true">
          <div
            className="bt-toast-progress-fill"
            style={{
              backgroundColor: current.accentColor,
              animationDuration: `${TOAST_DURATION_MS}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
