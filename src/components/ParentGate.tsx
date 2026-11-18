import React, { useState, useEffect } from 'react';

interface ParentGateProps {
  isVisible: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export const ParentGate: React.FC<ParentGateProps> = ({ isVisible, onSuccess, onClose }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operation, setOperation] = useState<'addition' | 'multiplication'>('addition');
  const [userAnswer, setUserAnswer] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const generateProblem = () => {
    const isMul = Math.random() > 0.5;
    if (isMul) {
      setOperation('multiplication');
      setNum1(Math.floor(Math.random() * 6) + 5);
      setNum2(Math.floor(Math.random() * 7) + 3);
    } else {
      setOperation('addition');
      setNum1(Math.floor(Math.random() * 40) + 15);
      setNum2(Math.floor(Math.random() * 40) + 15);
    }
    setUserAnswer('');
    setErrorMsg('');
  };

  useEffect(() => {
    if (isVisible) {
      generateProblem();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctAnswer = operation === 'addition' ? num1 + num2 : num1 * num2;
    const parsed = parseInt(userAnswer.trim(), 10);

    if (parsed === correctAnswer) {
      onSuccess();
    } else {
      setErrorMsg('Incorrect answer. Parents only!');
      setUserAnswer('');
    }
  };

  const problemText =
    operation === 'addition' ? `Solve: ${num1} + ${num2} = ?` : `Solve: ${num1} × ${num2} = ?`;

  return (
    <div className="bt-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bt-modal-card" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <h2 className="bt-modal-title" style={{ marginBottom: 8 }}>
          Parental Lock
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-muted)',
            margin: '0 0 20px',
            lineHeight: 1.45,
          }}
        >
          Please solve this problem to access parent settings and analytics.
        </p>

        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--primary)',
            marginBottom: 16,
          }}
        >
          {problemText}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="bt-text-input"
            style={{ textAlign: 'center', fontSize: 18, marginBottom: 12 }}
            type="number"
            inputMode="numeric"
            placeholder="Your answer"
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            autoFocus
          />

          {errorMsg ? <div className="bt-error-text">{errorMsg}</div> : null}

          <div className="bt-modal-buttons">
            <button type="button" className="bt-modal-btn bt-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="bt-modal-btn bt-modal-save">
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
