import React from 'react';
import {
  ActiveQuestInstance,
  MiniQuestDef,
  NpcDef,
  QuestDef,
} from './rpgWorldLogic';

interface NpcApproachDialogProps {
  npc: NpcDef;
  miniQuest: MiniQuestDef | null;
  hasEarnedKey: boolean;
  activeQuest: ActiveQuestInstance | null;
  availableQuest: QuestDef | null;
  onOpenFullDialog: () => void;
  onStartMiniQuest: (npc: NpcDef) => void;
  onDismiss: () => void;
}

/**
 * Compact speech-bubble dialog that automatically appears when the player
 * walks near a villager NPC, offering their mini-quest or chat without
 * blocking walking controls.
 */
export const NpcApproachDialog: React.FC<NpcApproachDialogProps> = ({
  npc,
  miniQuest,
  hasEarnedKey,
  activeQuest,
  availableQuest,
  onOpenFullDialog,
  onStartMiniQuest,
  onDismiss,
}) => {
  const isTurnInReady =
    activeQuest &&
    activeQuest.quest.npcId === npc.id &&
    activeQuest.status === 'ready_to_turn_in';

  let speechText = npc.greeting;
  if (isTurnInReady && activeQuest) {
    speechText = `Awesome walking! Talk to me to claim your reward for "${activeQuest.quest.title}"!`;
  } else if (miniQuest && !hasEarnedKey) {
    speechText = miniQuest.promptLine;
  } else if (availableQuest) {
    speechText = `Want a new walk task? "${availableQuest.title}" is waiting for you!`;
  }

  return (
    <div
      className="bt-rpg-approach-card"
      data-testid="rpg-approach-dialog"
      role="status"
      aria-live="polite"
    >
      <span
        className="bt-rpg-approach-avatar"
        style={{
          backgroundColor: `${npc.accentColor}1E`,
          borderColor: npc.accentColor,
        }}
        aria-hidden="true"
      >
        {npc.emoji}
      </span>

      <div className="bt-rpg-approach-content">
        <div className="bt-rpg-approach-head">
          <span className="bt-rpg-approach-name">{npc.name}</span>
          <span className="bt-rpg-approach-role">· {npc.landmark}</span>
        </div>
        <p className="bt-rpg-approach-text">{speechText}</p>
        <div className="bt-rpg-approach-actions">
          {miniQuest && !hasEarnedKey && !isTurnInReady && (
            <button
              type="button"
              className="bt-rpg-approach-primary"
              data-testid="rpg-approach-miniquest-btn"
              onClick={() => onStartMiniQuest(npc)}
            >
              <span>{miniQuest.keyEmoji}</span>
              <span>Play {miniQuest.gameLabel} ▶</span>
            </button>
          )}
          <button
            type="button"
            className={
              isTurnInReady || !miniQuest || hasEarnedKey
                ? 'bt-rpg-approach-primary'
                : 'bt-rpg-approach-secondary'
            }
            data-testid="rpg-interact-btn"
            onClick={onOpenFullDialog}
          >
            {isTurnInReady ? 'Claim Reward [E]' : 'Talk & Tasks [E]'}
          </button>
        </div>
      </div>

      <button
        type="button"
        className="bt-rpg-approach-close"
        onClick={onDismiss}
        aria-label={`Dismiss ${npc.name} dialog`}
      >
        ✕
      </button>
    </div>
  );
};

interface NpcDialogProps {
  npc: NpcDef;
  miniQuest: MiniQuestDef | null;
  hasEarnedKey: boolean;
  activeQuest: ActiveQuestInstance | null;
  availableQuest: QuestDef | null;
  quizIndex: number;
  quizFeedback: string | null;
  onClose: () => void;
  onStartMiniQuest: (npc: NpcDef) => void;
  onAcceptQuest: (quest: QuestDef) => void;
  onRequestDynamicTask: (npc: NpcDef) => void;
  onClaimQuestReward: () => void;
  onAnswerQuiz: (choice: string) => void;
}

/**
 * Full NPC dialogue modal showing the villager's learning-game mini-quest
 * (with collectible Key reward), active story/walk tasks, quizzes, and
 * repeatable dynamic walk-task requests.
 */
export const NpcDialog: React.FC<NpcDialogProps> = ({
  npc,
  miniQuest,
  hasEarnedKey,
  activeQuest,
  availableQuest,
  quizIndex,
  quizFeedback,
  onClose,
  onStartMiniQuest,
  onAcceptQuest,
  onRequestDynamicTask,
  onClaimQuestReward,
  onAnswerQuiz,
}) => {
  const isQuestGiver = Boolean(activeQuest && activeQuest.quest.npcId === npc.id);

  return (
    <div
      className="bt-rpg-modal-overlay"
      role="dialog"
      aria-modal="true"
      data-testid="rpg-npc-dialog"
      onClick={onClose}
    >
      <div className="bt-rpg-dialog-card" onClick={e => e.stopPropagation()}>
        <div className="bt-rpg-npc-header">
          <span
            className="bt-rpg-npc-portrait"
            style={{
              backgroundColor: `${npc.accentColor}1E`,
              borderColor: npc.accentColor,
            }}
          >
            {npc.emoji}
          </span>
          <div>
            <div className="bt-rpg-npc-name">{npc.name}</div>
            <div className="bt-rpg-npc-role">
              {npc.title} · {npc.landmark}
            </div>
          </div>
          <button
            type="button"
            className="bt-rpg-close-x"
            onClick={onClose}
            aria-label="Close dialogue"
          >
            ✕
          </button>
        </div>

        <p className="bt-rpg-dialog-body">{npc.greeting}</p>

        {/* Featured Mini-Quest linking to an existing Learning Game */}
        {miniQuest && (
          <div className="bt-rpg-miniquest-box" data-testid="rpg-miniquest-card">
            <div className="bt-rpg-miniquest-top">
              <span className="bt-rpg-miniquest-badge">
                {miniQuest.keyEmoji} {miniQuest.keyName}
              </span>
              <span
                className={`bt-rpg-miniquest-status ${hasEarnedKey ? 'done' : ''}`}
              >
                {hasEarnedKey ? 'Earned ✅' : 'Mini-Quest'}
              </span>
            </div>
            <div className="bt-rpg-quest-box-title">{miniQuest.title}</div>
            <div className="bt-rpg-quest-box-desc">{miniQuest.promptLine}</div>
            <button
              type="button"
              className="bt-rpg-miniquest-btn"
              data-testid="rpg-launch-miniquest-btn"
              onClick={() => onStartMiniQuest(npc)}
            >
              {hasEarnedKey
                ? `Replay ${miniQuest.gameLabel} 🎮`
                : `Solve ${miniQuest.gameLabel} to Get Key ▶`}
            </button>
          </div>
        )}

        {/* Active in-world quest with this NPC */}
        {isQuestGiver && activeQuest && (
          <div className="bt-rpg-quest-box">
            <div className="bt-rpg-quest-box-title">
              📜 {activeQuest.quest.title}
            </div>
            <div className="bt-rpg-quest-box-desc">{activeQuest.quest.description}</div>

            {activeQuest.status === 'ready_to_turn_in' ? (
              <button
                type="button"
                className="bt-rpg-start-btn"
                style={{ width: '100%', marginTop: 10 }}
                onClick={onClaimQuestReward}
              >
                Claim Reward (+{activeQuest.quest.rewardStars} ⭐, +
                {activeQuest.quest.rewardCoins} 🪙)
              </button>
            ) : activeQuest.quest.kind === 'quiz' && activeQuest.quest.questions ? (
              <div className="bt-rpg-quiz-area">
                <div className="bt-rpg-quiz-q">
                  Question {quizIndex + 1}/{activeQuest.quest.questions.length}:{' '}
                  {activeQuest.quest.questions[quizIndex].prompt}
                </div>
                <div className="bt-rpg-quiz-choices">
                  {activeQuest.quest.questions[quizIndex].choices.map(c => (
                    <button
                      key={c}
                      type="button"
                      className="bt-rpg-quiz-btn"
                      onClick={() => onAnswerQuiz(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {quizFeedback && <div className="bt-rpg-quiz-fb">{quizFeedback}</div>}
              </div>
            ) : (
              <div className="bt-rpg-quest-progress">
                Progress: {activeQuest.collectedIndices.length} /{' '}
                {activeQuest.quest.locations?.length || 3} found — keep walking!
              </div>
            )}
          </div>
        )}

        {/* Story Walk Task or New Dynamic Walk Task */}
        {!isQuestGiver && (
          <div className="bt-rpg-dialog-actions">
            {availableQuest ? (
              <div className="bt-rpg-quest-box">
                <div className="bt-rpg-quest-box-title">
                  ✨ Walk Task: {availableQuest.title}
                </div>
                <div className="bt-rpg-quest-box-desc">
                  {availableQuest.description}
                </div>
                <div className="bt-rpg-quest-reward-line">
                  Reward: +{availableQuest.rewardStars} ⭐ · +
                  {availableQuest.rewardCoins} 🪙
                </div>
                <button
                  type="button"
                  className="bt-rpg-start-btn"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => onAcceptQuest(availableQuest)}
                >
                  Accept Task ▶
                </button>
              </div>
            ) : (
              <div className="bt-rpg-quest-box">
                <div className="bt-rpg-quest-box-title">
                  🌟 Ready for another walk?
                </div>
                <div className="bt-rpg-quest-box-desc">
                  You finished {npc.name}&apos;s story tasks! Ask for a fresh scavenger run anytime.
                </div>
              </div>
            )}

            <div className="bt-rpg-action-row">
              <button
                type="button"
                className="bt-rpg-secondary-btn"
                onClick={() => onRequestDynamicTask(npc)}
              >
                🗺️ Give Me a New Walk Task!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
