import React from 'react';

export type MascotExpression = 'happy' | 'thinking' | 'neutral' | 'cheering';

interface MascotProps {
  expression?: MascotExpression;
  message?: string;
  size?: number;
}

export const Mascot: React.FC<MascotProps> = ({
  expression = 'neutral',
  message,
  size = 100,
}) => {
  const renderFace = () => {
    switch (expression) {
      case 'happy':
        return (
          <div className="bt-mascot-face">
            <div className="bt-mascot-eyes">
              <div className="bt-eye-happy" />
              <div className="bt-eye-happy" />
            </div>
            <div className="bt-mouth-happy" />
          </div>
        );
      case 'cheering':
        return (
          <div className="bt-mascot-face">
            <div className="bt-mascot-eyes">
              <div className="bt-eye-open">
                <div className="bt-eye-pupil" />
              </div>
              <div className="bt-eye-open">
                <div className="bt-eye-pupil" />
              </div>
            </div>
            <div className="bt-mouth-cheering" />
          </div>
        );
      case 'thinking':
        return (
          <div className="bt-mascot-face">
            <div className="bt-mascot-eyes">
              <div className="bt-eye-thinking" />
              <div className="bt-eye-neutral" />
            </div>
            <div className="bt-mouth-thinking" />
          </div>
        );
      case 'neutral':
      default:
        return (
          <div className="bt-mascot-face">
            <div className="bt-mascot-eyes">
              <div className="bt-eye-neutral">
                <div className="bt-eye-pupil" />
              </div>
              <div className="bt-eye-neutral">
                <div className="bt-eye-pupil" />
              </div>
            </div>
            <div className="bt-mouth-neutral" />
          </div>
        );
    }
  };

  return (
    <div className="bt-mascot">
      {message ? (
        <div className="bt-mascot-bubble bt-mascot-float">
          <div className="bt-mascot-bubble-text">{message}</div>
          <div className="bt-mascot-arrow" />
        </div>
      ) : null}

      <div
        className={`bt-mascot-body bt-mascot-float ${expression === 'cheering' ? 'cheering' : ''}`}
        style={{
          width: size,
          height: size * 0.9,
          borderRadius: size / 2,
        }}
        aria-label="Bino the Brain mascot"
      >
        <div
          className="bt-mascot-lobe left"
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
        <div
          className="bt-mascot-lobe right"
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
        <div className="bt-mascot-core">{renderFace()}</div>
        <div className="bt-mascot-cheeks">
          <div className="bt-blush" />
          <div className="bt-blush" />
        </div>
      </div>
    </div>
  );
};
