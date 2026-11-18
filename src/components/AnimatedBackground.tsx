import React from 'react';
import { useApp } from '../state/AppContext';

const SHAPES = [
  { color: '#5D9CEC', size: 120, x: '8%', y: '12%', dur: '7s', delay: '0s' },
  { color: '#FC6E51', size: 90, x: '72%', y: '18%', dur: '9s', delay: '0.8s' },
  { color: '#A0D468', size: 150, x: '60%', y: '60%', dur: '8s', delay: '0.4s' },
  { color: '#AC92EC', size: 80, x: '15%', y: '72%', dur: '10s', delay: '1.2s' },
  { color: '#FFCE54', size: 70, x: '85%', y: '82%', dur: '7.5s', delay: '0.6s' },
  { color: '#26C6DA', size: 110, x: '42%', y: '30%', dur: '11s', delay: '0.3s' },
];

export const AnimatedBackground: React.FC = () => {
  const { settings } = useApp();
  const animate = !settings.reducedMotion;

  return (
    <div className="bt-bg-container" aria-hidden="true">
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className="bt-bg-shape"
          style={
            {
              width: s.size,
              height: s.size,
              backgroundColor: s.color,
              left: s.x,
              top: s.y,
              '--dur': s.dur,
              '--delay': s.delay,
              animationName: animate ? 'bt-bg-drift' : 'none',
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
