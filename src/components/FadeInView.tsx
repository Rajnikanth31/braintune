import React from 'react';
import { useApp } from '../state/AppContext';

interface FadeInViewProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const FadeInView: React.FC<FadeInViewProps> = ({ children, className = '', style }) => {
  const { settings } = useApp();
  const reduce = settings.reducedMotion;

  return (
    <div
      className={`${reduce ? '' : 'bt-fade-in'} ${className}`.trim()}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', ...style }}
    >
      {children}
    </div>
  );
};
