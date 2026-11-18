import React, { useEffect, useState } from 'react';
import {
  PET_CATALOG,
  PetSpeciesId,
  PlayerPetState,
  getPetById,
  getPetDisplayEmoji,
  getPetDisplayName,
  getPetGrowthStage,
  isPetUnlocked,
} from '../games/pets/petLogic';
import { SoundService } from '../audio/SoundService';
import { haptic } from '../audio/haptics';

interface AdoptPetModalProps {
  isOpen: boolean;
  petState: PlayerPetState;
  onClose: () => void;
  onAdopt: (
    petId: PetSpeciesId,
    customName?: string,
  ) => Promise<{ adopted: boolean; reason?: string }>;
  onOpenRpgWorld?: () => void;
}

const GROWTH_STEPS: Array<{ stage: 1 | 2 | 3 | 4; label: string; tasks: number; emoji: string }> = [
  { stage: 1, label: 'Baby', tasks: 1, emoji: '🌱' },
  { stage: 2, label: 'Explorer', tasks: 3, emoji: '⭐' },
  { stage: 3, label: 'Champion', tasks: 6, emoji: '👑' },
  { stage: 4, label: 'Legend', tasks: 10, emoji: '🌟' },
];

export const AdoptPetModal: React.FC<AdoptPetModalProps> = ({
  isOpen,
  petState,
  onClose,
  onAdopt,
  onOpenRpgWorld,
}) => {
  const growth = getPetGrowthStage(petState.tasksCompleted);
  const currentAdopted = getPetById(petState.adoptedPetId);

  const [selectedId, setSelectedId] = useState<PetSpeciesId>(
    petState.adoptedPetId ?? 'pet_sprout_pup',
  );
  const [nickname, setNickname] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const defaultPet =
      getPetById(petState.adoptedPetId) ??
      PET_CATALOG.find(p => isPetUnlocked(p, petState.tasksCompleted)) ??
      PET_CATALOG[0];
    setSelectedId(defaultPet.id);
    setNickname(
      petState.adoptedPetId === defaultPet.id && petState.customName
        ? petState.customName
        : defaultPet.name,
    );
    setFeedback(null);
  }, [isOpen, petState.adoptedPetId, petState.customName, petState.tasksCompleted]);

  if (!isOpen) return null;

  const selectedPet = getPetById(selectedId) ?? PET_CATALOG[0];
  const selectedUnlocked = isPetUnlocked(selectedPet, petState.tasksCompleted);
  const isCurrentActive = petState.adoptedPetId === selectedPet.id;

  const handleSelectCard = (petId: PetSpeciesId) => {
    SoundService.playClick();
    const pet = getPetById(petId);
    if (!pet) return;
    setSelectedId(petId);
    setFeedback(null);
    if (petState.adoptedPetId === petId && petState.customName) {
      setNickname(petState.customName);
    } else {
      setNickname(pet.name);
    }
  };

  const handleAdoptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onAdopt(selectedPet.id, nickname);
    if (!res.adopted) {
      SoundService.playSfx('wrong');
      haptic('error');
      setFeedback(res.reason ?? 'Complete a learning task to unlock this pet!');
      return;
    }
    SoundService.playSfx('win');
    haptic('success');
    const finalName = nickname.trim() || selectedPet.name;
    setFeedback(`${finalName} is now your Quest World companion!`);
  };

  return (
    <div
      className="bt-modal-overlay bt-pet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Adopt a Pet"
      data-testid="adopt-pet-modal"
      onClick={onClose}
    >
      <div className="bt-modal-card bt-pet-modal-card" onClick={e => e.stopPropagation()}>
        <div className="bt-pet-modal-header">
          <div className="bt-pet-title-row">
            <span className="bt-pet-header-badge" aria-hidden="true">
              {currentAdopted ? getPetDisplayEmoji(currentAdopted, growth.stage) : '🐾'}
            </span>
            <div>
              <h2 className="bt-pet-modal-title">Adopt-a-Pet Sanctuary</h2>
              <p className="bt-pet-modal-sub">
                {currentAdopted
                  ? `${getPetDisplayName(petState)} · Stage ${growth.stage}: ${growth.label} (${petState.tasksCompleted} tasks done)`
                  : `Complete learning tasks to unlock & grow your Quest World buddy (${petState.tasksCompleted} done)`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="bt-settings-close-btn"
            onClick={onClose}
            aria-label="Close Adopt a Pet"
          >
            ✕
          </button>
        </div>

        {/* Growth Track Strip */}
        <div className="bt-pet-growth-box" data-testid="pet-growth-tracker">
          <div className="bt-pet-growth-top">
            <span className="bt-pet-growth-kicker">
              {growth.badgeEmoji} Companion Growth · Stage {growth.stage} ({growth.label})
            </span>
            <span className="bt-pet-growth-count">
              {growth.nextTasks !== null
                ? `${petState.tasksCompleted} / ${growth.nextTasks} tasks to next stage`
                : 'Max Legend Stage 🌟'}
            </span>
          </div>
          <div className="bt-xp-track" style={{ height: 8, marginBottom: 10 }}>
            <div
              className="bt-xp-fill"
              style={{
                width: `${Math.round(growth.progress * 100)}%`,
                background: `linear-gradient(90deg, ${growth.ringColor} 0%, #10B981 100%)`,
              }}
            />
          </div>
          <div className="bt-pet-stages-row">
            {GROWTH_STEPS.map(step => {
              const reached = growth.stage >= step.stage && petState.tasksCompleted >= 1;
              return (
                <div
                  key={step.stage}
                  className={`bt-pet-stage-chip ${reached ? 'reached' : ''}`}
                >
                  <span>{step.emoji}</span>
                  <span>{step.label}</span>
                  <span className="bt-pet-stage-req">
                    {step.tasks} {step.tasks === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Companion Grid */}
        <div className="bt-pet-grid">
          {PET_CATALOG.map(pet => {
            const unlocked = isPetUnlocked(pet, petState.tasksCompleted);
            const selected = selectedPet.id === pet.id;
            const active = petState.adoptedPetId === pet.id;
            const displayEmoji = unlocked
              ? getPetDisplayEmoji(pet, growth.stage)
              : pet.eggEmoji;
            const remaining = Math.max(0, pet.unlockTasks - petState.tasksCompleted);

            return (
              <button
                type="button"
                key={pet.id}
                data-testid={`pet-option-${pet.id}`}
                className={`bt-pet-option-card ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}`}
                onClick={() => handleSelectCard(pet.id)}
                aria-pressed={selected}
              >
                <div className="bt-pet-option-top">
                  <span
                    className="bt-pet-option-emoji"
                    style={{ backgroundColor: pet.bgTint, borderColor: pet.accentColor }}
                  >
                    {displayEmoji}
                  </span>
                  <span className={`bt-pet-status-tag ${active ? 'active' : unlocked ? 'unlocked' : ''}`}>
                    {active
                      ? 'Active Buddy'
                      : unlocked
                        ? 'Unlocked'
                        : `🔒 ${remaining} task${remaining === 1 ? '' : 's'}`}
                  </span>
                </div>
                <div className="bt-pet-option-name">
                  {pet.name} · <span>{pet.speciesLabel}</span>
                </div>
                <div className="bt-pet-option-desc">{pet.personality}</div>
              </button>
            );
          })}
        </div>

        {/* Adoption / Naming Form */}
        <form onSubmit={handleAdoptSubmit} className="bt-pet-adopt-form">
          <div className="bt-pet-name-row">
            <label htmlFor="pet-nickname-input" className="bt-pet-name-label">
              Companion Name
            </label>
            <input
              id="pet-nickname-input"
              type="text"
              className="bt-text-input bt-pet-name-input"
              value={nickname}
              maxLength={14}
              placeholder={selectedPet.name}
              disabled={!selectedUnlocked}
              onChange={e => setNickname(e.target.value)}
            />
          </div>

          {feedback && (
            <div
              className={`bt-pet-feedback ${selectedUnlocked ? 'ok' : 'warn'}`}
              role="status"
              data-testid="pet-adopt-feedback"
            >
              {feedback}
            </div>
          )}

          <div className="bt-pet-modal-actions">
            <button
              type="submit"
              className="bt-modal-btn bt-modal-save"
              data-testid="adopt-pet-submit-btn"
              disabled={!selectedUnlocked}
              style={{
                opacity: selectedUnlocked ? 1 : 0.55,
                cursor: selectedUnlocked ? 'pointer' : 'not-allowed',
              }}
            >
              {!selectedUnlocked
                ? `Complete ${selectedPet.unlockTasks - petState.tasksCompleted} More Task${selectedPet.unlockTasks - petState.tasksCompleted === 1 ? '' : 's'} to Unlock`
                : isCurrentActive
                  ? 'Update Companion Name 🐾'
                  : `Adopt ${nickname.trim() || selectedPet.name} 🐾`}
            </button>

            {onOpenRpgWorld && petState.adoptedPetId && (
              <button
                type="button"
                className="bt-pet-rpg-launch-btn"
                data-testid="pet-visit-rpg-btn"
                onClick={() => {
                  SoundService.playClick();
                  onClose();
                  onOpenRpgWorld();
                }}
              >
                Walk Together in Quest World 🗺️
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
