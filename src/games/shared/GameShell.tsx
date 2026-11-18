import React, { ReactNode } from 'react';
import { Mascot, MascotExpression } from '../../components/Mascot';
import { Celebration } from '../../components/Celebration';
import { SoundService } from '../../audio/SoundService';
import { GameSession } from './useGameSession';
import { badgeById, levelLabel } from './progression';
import { useApp } from '../../state/AppContext';

const withClick = (fn: () => void) => () => {
  SoundService.playClick();
  fn();
};

interface GameHeaderProps {
  title: string;
  themeColor: string;
  stars: number;
  onBack: () => void;
  onPause?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  title,
  themeColor,
  stars,
  onBack,
  onPause,
}) => (
  <header className="bt-game-header" style={{ backgroundColor: themeColor }}>
    <button
      type="button"
      className="bt-game-back-btn"
      onClick={withClick(onBack)}
      aria-label="Go back"
    >
      ◀ Back
    </button>
    <h1 className="bt-game-title">{title}</h1>
    <div className="bt-game-header-right">
      <div className="bt-star-pill">⭐ {stars}</div>
      {onPause && (
        <button
          type="button"
          className="bt-pause-btn"
          onClick={withClick(onPause)}
          aria-label="Pause Game"
        >
          ⏸️
        </button>
      )}
    </div>
  </header>
);

export const SessionBar: React.FC<{ session: GameSession; themeColor: string }> = ({
  session,
  themeColor,
}) => (
  <div className="bt-session-bar">
    <span className="bt-round-label">
      Round {session.round}/{session.totalRounds}
    </span>
    {session.streak >= 2 ? (
      <span className="bt-streak-label">🔥 {session.streak} in a row!</span>
    ) : (
      <span />
    )}
    <span className="bt-difficulty-label" style={{ color: themeColor }}>
      {levelLabel(session.level)}
    </span>
  </div>
);

interface LevelPickerProps {
  maxLevel: number;
  unlocked: number;
  selected: number;
  themeColor: string;
  onSelect: (level: number) => void;
  onUnlockDifficulty?: (startLevel: number, difficultyName: string) => void;
}

export const LevelPicker: React.FC<LevelPickerProps> = ({
  unlocked,
  selected,
  themeColor,
  onSelect,
  onUnlockDifficulty,
}) => {
  const difficulties = [
    { name: 'Basic', range: 'Lvl 1–5', startLevel: 1, icon: '🟢' },
    { name: 'Normal', range: 'Lvl 6–10', startLevel: 6, icon: '🟡' },
    { name: 'Hard', range: 'Lvl 11–15', startLevel: 11, icon: '🔵' },
    { name: 'Very Hard', range: 'Lvl 16–20', startLevel: 16, icon: '🔴' },
  ];

  return (
    <div className="bt-difficulty-wrap">
      <div className="bt-difficulty-title">Choose Difficulty Level:</div>
      <div className="bt-difficulty-grid">
        {difficulties.map(diff => {
          const isUnlocked = unlocked >= diff.startLevel - 1 || diff.startLevel === 1;
          const isActive = selected >= diff.startLevel && selected < diff.startLevel + 5;
          return (
            <button
              type="button"
              key={diff.name}
              onClick={withClick(() => {
                if (isUnlocked) {
                  onSelect(diff.startLevel);
                } else if (onUnlockDifficulty) {
                  onUnlockDifficulty(diff.startLevel, diff.name);
                }
              })}
              aria-pressed={isActive}
              aria-label={`${diff.name} difficulty, ${diff.range}${isUnlocked ? '' : ', locked'}`}
              className={`bt-difficulty-card ${!isUnlocked ? 'locked' : ''}`}
              style={
                isActive
                  ? {
                      borderColor: themeColor,
                      borderWidth: 3,
                      backgroundColor: `${themeColor}18`,
                    }
                  : undefined
              }
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>
                {isUnlocked ? diff.icon : '🔒'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                {diff.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {diff.range}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface PauseMenuProps {
  visible: boolean;
  themeColor: string;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  visible,
  themeColor,
  onResume,
  onRestart,
  onExit,
}) => {
  const { settings, updateSettings } = useApp();

  if (!visible) return null;

  return (
    <div className="bt-modal-overlay" role="dialog" aria-modal="true" onClick={onResume}>
      <div
        className="bt-modal-card"
        style={{ textAlign: 'center', maxWidth: 360 }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 24, fontWeight: 800, color: themeColor, margin: '0 0 8px' }}>
          Game Paused ⏸️
        </h2>
        <Mascot expression="neutral" message="Take a quick break, then let's play!" size={90} />

        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg)',
            borderRadius: 16,
            padding: 14,
            margin: '14px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>🎵 Music</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.musicEnabled}
              className={`bt-toggle-btn ${settings.musicEnabled ? 'bt-toggle-on' : 'bt-toggle-off'}`}
              style={settings.musicEnabled ? { backgroundColor: themeColor } : undefined}
              onClick={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
            >
              {settings.musicEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>🔊 Sound Effects</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.soundEffectsEnabled}
              className={`bt-toggle-btn ${settings.soundEffectsEnabled ? 'bt-toggle-on' : 'bt-toggle-off'}`}
              style={settings.soundEffectsEnabled ? { backgroundColor: themeColor } : undefined}
              onClick={() =>
                updateSettings({ soundEffectsEnabled: !settings.soundEffectsEnabled })
              }
            >
              {settings.soundEffectsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <button
            type="button"
            style={{
              backgroundColor: themeColor,
              color: '#FFF',
              padding: 14,
              borderRadius: 18,
              fontSize: 16,
              fontWeight: 700,
              boxShadow: 'var(--shadow-sm)',
            }}
            onClick={withClick(onResume)}
          >
            Resume Game ▶️
          </button>
          <button
            type="button"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: 12,
              borderRadius: 18,
              fontSize: 15,
              fontWeight: 700,
            }}
            onClick={withClick(onRestart)}
          >
            Restart Round 🔁
          </button>
          <button
            type="button"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              padding: 12,
              borderRadius: 18,
              fontSize: 15,
              fontWeight: 700,
            }}
            onClick={withClick(onExit)}
          >
            Back to Hub 🏠
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameSuccessProps {
  session: GameSession;
  themeColor: string;
  onRestart: () => void;
  onBack: () => void;
  onPlayNextMode?: (nextLevel: number) => void;
}

export const GameSuccess: React.FC<GameSuccessProps> = ({
  session,
  themeColor,
  onRestart,
  onBack,
  onPlayNextMode,
}) => {
  const passed = session.accuracy >= 60;
  let currentDifficulty = 'Basic';
  let nextDifficultyName = '';
  let nextDifficultyStart = 1;
  let nextDifficultyIcon = '';

  if (session.level <= 5) {
    currentDifficulty = 'Basic';
    nextDifficultyName = passed ? 'Normal' : 'Basic';
    nextDifficultyStart = passed ? 6 : 1;
    nextDifficultyIcon = passed ? '🟡' : '🟢';
  } else if (session.level <= 10) {
    currentDifficulty = 'Normal';
    nextDifficultyName = passed ? 'Hard' : 'Normal';
    nextDifficultyStart = passed ? 11 : 6;
    nextDifficultyIcon = passed ? '🔵' : '🟡';
  } else if (session.level <= 15) {
    currentDifficulty = 'Hard';
    nextDifficultyName = passed ? 'Very Hard' : 'Hard';
    nextDifficultyStart = passed ? 16 : 11;
    nextDifficultyIcon = passed ? '🔴' : '🔵';
  } else {
    currentDifficulty = 'Very Hard';
    nextDifficultyName = passed ? 'Legend Completed' : 'Very Hard';
    nextDifficultyStart = 16;
    nextDifficultyIcon = passed ? '🏆' : '🔴';
  }

  const showNextButton = passed && onPlayNextMode && session.level < 16;

  return (
    <div className="bt-center-wrap" style={{ flexDirection: 'column' }}>
      <Celebration trigger={1} intensity="big" />
      <Mascot
        expression="cheering"
        message={passed ? 'You did it! 🎉' : 'Good try! Keep practicing! 💪'}
        size={130}
      />

      <div className="bt-success-card">
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
          {passed ? 'Session Complete!' : 'Try Again!'}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-muted)',
            textAlign: 'center',
            margin: '0 0 18px',
          }}
        >
          {passed
            ? 'Look how much you learned:'
            : "You're getting better! Let's check your stats:"}
        </p>

        <div className="bt-success-stats-row">
          <Stat value={`⭐ ${session.stars}`} label="Stars" />
          <Stat value={`🪙 ${session.coins}`} label="Coins" />
          <Stat value={`${session.accuracy}%`} label="Accuracy" />
        </div>

        <div
          style={{
            width: '100%',
            backgroundColor: '#F8FAFC',
            borderRadius: 14,
            border: '1px solid var(--border)',
            padding: 12,
            margin: '10px 0 16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Current Difficulty: {currentDifficulty}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
            {passed
              ? session.level >= 16
                ? '🏆 You mastered all difficulties!'
                : `🔓 Next Mode Unlocked: ${nextDifficultyIcon} ${nextDifficultyName}`
              : '🔄 Try again to unlock the next difficulty!'}
          </div>
        </div>

        {session.newBadges.length > 0 && (
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              marginBottom: 16,
              backgroundColor: '#FFF8E1',
              borderRadius: 16,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              New badge unlocked!
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {session.newBadges.map(id => {
                const b = badgeById(id);
                if (!b) return null;
                return (
                  <div key={id} style={{ width: 80, textAlign: 'center' }}>
                    <div style={{ fontSize: 28 }}>{b.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {b.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {showNextButton && (
            <button
              type="button"
              style={{
                backgroundColor: themeColor,
                color: '#FFF',
                padding: 14,
                borderRadius: 18,
                fontSize: 16,
                fontWeight: 700,
                boxShadow: 'var(--shadow-sm)',
              }}
              onClick={withClick(() => onPlayNextMode!(nextDifficultyStart))}
            >
              Play {nextDifficultyName} Mode! ➔
            </button>
          )}

          <button
            type="button"
            style={
              showNextButton
                ? {
                    backgroundColor: 'var(--card)',
                    border: `2px solid ${themeColor}`,
                    color: themeColor,
                    padding: 14,
                    borderRadius: 18,
                    fontSize: 16,
                    fontWeight: 700,
                  }
                : {
                    backgroundColor: themeColor,
                    color: '#FFF',
                    padding: 14,
                    borderRadius: 18,
                    fontSize: 16,
                    fontWeight: 700,
                    boxShadow: 'var(--shadow-sm)',
                  }
            }
            onClick={withClick(onRestart)}
          >
            {passed ? 'Replay Mode 🔁' : 'Try Again! 🔁'}
          </button>

          <button
            type="button"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              padding: 14,
              borderRadius: 18,
              fontSize: 16,
              fontWeight: 700,
            }}
            onClick={withClick(onBack)}
          >
            Back to Hub 🏠
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="bt-success-stat-item">
    <div className="bt-success-stat-val">{value}</div>
    <div className="bt-success-stat-lbl">{label}</div>
  </div>
);

interface TutorialProps {
  title: string;
  body: string;
  themeColor: string;
  onStart: () => void;
}

export const TutorialCard: React.FC<TutorialProps> = ({
  title,
  body,
  themeColor,
  onStart,
}) => (
  <div className="bt-center-wrap">
    <div className="bt-tutorial-card">
      <Mascot expression="happy" message={title} size={110} />
      <p className="bt-tutorial-body">{body}</p>
      <button
        type="button"
        className="bt-start-btn"
        style={{ backgroundColor: themeColor }}
        onClick={withClick(onStart)}
        aria-label="Start playing"
      >
        Let&apos;s Go! ▶
      </button>
    </div>
  </div>
);

export const GameBody: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="bt-board-wrapper">{children}</div>
);

export type { MascotExpression };
