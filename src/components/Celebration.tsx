import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';

const CONFETTI_COLORS = [
  '#FC6E51',
  '#FFCE54',
  '#A0D468',
  '#5D9CEC',
  '#AC92EC',
  '#EC407A',
  '#4FC3F7',
];
const STAR_EMOJIS = ['⭐', '🌟', '✨'];

type Intensity = 'small' | 'big';

interface CelebrationProps {
  trigger: number;
  intensity?: Intensity;
}

interface PieceSpec {
  key: string;
  startX: number;
  drift: number;
  rise: number;
  delay: number;
  duration: number;
  rotate: number;
  isStar: boolean;
  color: string;
  emoji: string;
  size: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function buildBatch(batchId: number, intensity: Intensity): PieceSpec[] {
  const count = intensity === 'big' ? 26 : 12;
  return Array.from({ length: count }, (_, i) => {
    const isStar = intensity === 'big' ? i % 4 === 0 : i % 3 === 0;
    return {
      key: `${batchId}_${i}`,
      startX: rand(20, 80),
      drift: rand(-70, 70),
      rise: intensity === 'big' ? rand(240, 380) : rand(140, 240),
      delay: intensity === 'big' ? rand(0, 250) : rand(0, 90),
      duration: rand(900, 1500),
      rotate: rand(-220, 220),
      isStar,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      emoji: STAR_EMOJIS[i % STAR_EMOJIS.length],
      size: isStar ? rand(20, 30) : rand(9, 15),
    };
  });
}

export const Celebration: React.FC<CelebrationProps> = ({
  trigger,
  intensity = 'small',
}) => {
  const { settings } = useApp();
  const [pieces, setPieces] = useState<PieceSpec[]>([]);

  useEffect(() => {
    if (trigger <= 0 || settings.reducedMotion) return;
    const batch = buildBatch(trigger, intensity);
    setPieces(batch);
    const timer = setTimeout(() => setPieces([]), 1700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <div className="bt-celebration-overlay" aria-hidden="true">
      {pieces.map(spec => (
        <div
          key={spec.key}
          className="bt-celebration-piece"
          style={
            {
              left: `${spec.startX}%`,
              '--drift': `${spec.drift}px`,
              '--rise': `${spec.rise}px`,
              '--rot': `${spec.rotate}deg`,
              '--dur': `${spec.duration}ms`,
              '--delay': `${spec.delay}ms`,
            } as React.CSSProperties
          }
        >
          {spec.isStar ? (
            <span style={{ fontSize: spec.size }}>{spec.emoji}</span>
          ) : (
            <div
              style={{
                width: spec.size,
                height: spec.size * 1.4,
                borderRadius: 2,
                backgroundColor: spec.color,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
