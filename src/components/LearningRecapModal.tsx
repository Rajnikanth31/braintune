import React from 'react';
import { LearningGameId, LearningRecapData } from './learningRecapLogic';

interface LearningRecapModalProps {
  recap: LearningRecapData | null;
  onClose: () => void;
  onPlaySuggested: (gameId: LearningGameId, targetLevel: number) => void;
}

export const LearningRecapModal: React.FC<LearningRecapModalProps> = ({
  recap,
  onClose,
  onPlaySuggested,
}) => {
  if (!recap) return null;

  return (
    <div
      className="bt-modal-overlay bt-recap-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bt-recap-title"
      data-testid="learning-recap-modal"
      onClick={onClose}
    >
      <div className="bt-modal-card bt-recap-card" onClick={e => e.stopPropagation()}>
        <div className="bt-recap-header">
          <div className="bt-recap-title-row">
            <span className="bt-recap-badge-icon" aria-hidden="true">
              🎓
            </span>
            <div>
              <h2 id="bt-recap-title" className="bt-recap-title">
                Learning Recap
              </h2>
              <p className="bt-recap-sub">
                {recap.playerName} · {recap.completedGameName} ({recap.sessionAccuracy}% accuracy · +
                {recap.starsEarned} ⭐)
              </p>
            </div>
          </div>
          <button
            type="button"
            className="bt-rpg-close-x"
            onClick={onClose}
            aria-label="Close Learning Recap"
          >
            ✕
          </button>
        </div>

        {/* Highlighted Most Improved Skill */}
        <div
          className="bt-recap-section bt-recap-improved"
          style={{ borderColor: recap.mostImproved.accentColor }}
          data-testid="recap-most-improved"
        >
          <div className="bt-recap-kicker-row">
            <span className="bt-recap-kicker">📈 Most Improved Skill</span>
            <span
              className="bt-recap-pill"
              style={{
                backgroundColor: `${recap.mostImproved.accentColor}1E`,
                color: '#0F172A',
              }}
            >
              {recap.mostImproved.metricBadge}
            </span>
          </div>
          <div className="bt-recap-feature-row">
            <span
              className="bt-recap-emblem"
              style={{ backgroundColor: `${recap.mostImproved.accentColor}22` }}
              aria-hidden="true"
            >
              {recap.mostImproved.emoji}
            </span>
            <div>
              <div className="bt-recap-feature-title">{recap.mostImproved.skillName}</div>
              <div className="bt-recap-feature-desc">{recap.mostImproved.reason}</div>
            </div>
          </div>
        </div>

        {/* Personalized Suggested Next Game Mode */}
        <div
          className="bt-recap-section bt-recap-suggested"
          data-testid="recap-suggested-next"
        >
          <div className="bt-recap-kicker-row">
            <span className="bt-recap-kicker" style={{ color: '#4338CA' }}>
              🎯 Suggested Next Session
            </span>
            <span className="bt-recap-mode-pill">{recap.suggestedNext.modeLabel}</span>
          </div>
          <div className="bt-recap-feature-row">
            <span
              className="bt-recap-emblem"
              style={{ backgroundColor: `${recap.suggestedNext.accentColor}22` }}
              aria-hidden="true"
            >
              {recap.suggestedNext.emoji}
            </span>
            <div>
              <div className="bt-recap-feature-title">{recap.suggestedNext.gameName}</div>
              <div className="bt-recap-feature-desc">{recap.suggestedNext.reason}</div>
            </div>
          </div>
        </div>

        {/* 5-Skill Snapshot */}
        <div className="bt-recap-skills-grid" aria-label="Skill Snapshot">
          {recap.skillBars.map(bar => (
            <div
              key={bar.gameId}
              className={`bt-recap-skill-chip ${bar.isImproved ? 'improved' : ''}`}
            >
              <div className="bt-recap-skill-top">
                <span aria-hidden="true">{bar.emoji}</span>
                <span>{bar.label}</span>
              </div>
              <div className="bt-recap-skill-val">
                {bar.sessionsPlayed > 0 ? `${bar.accuracy}%` : 'New'}
              </div>
              <div className="bt-recap-skill-track">
                <div
                  className="bt-recap-skill-fill"
                  style={{
                    width: `${bar.sessionsPlayed > 0 ? bar.accuracy : 12}%`,
                    backgroundColor: bar.accentColor,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bt-recap-actions">
          <button
            type="button"
            className="bt-recap-play-btn"
            style={{ backgroundColor: recap.suggestedNext.accentColor }}
            data-testid="recap-play-suggested-btn"
            onClick={() =>
              onPlaySuggested(recap.suggestedNext.gameId, recap.suggestedNext.targetLevel)
            }
          >
            <span>Play {recap.suggestedNext.gameName}</span>
            <span aria-hidden="true">▶</span>
          </button>
          <button
            type="button"
            className="bt-recap-close-btn"
            data-testid="recap-close-btn"
            onClick={onClose}
          >
            View Session Summary
          </button>
        </div>
      </div>
    </div>
  );
};
