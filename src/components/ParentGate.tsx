import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';

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

  // Generate a random math problem suitable for adults (e.g., 12 + 18, 7 * 8)
  const generateProblem = () => {
    const isMul = Math.random() > 0.5;
    if (isMul) {
      setOperation('multiplication');
      setNum1(Math.floor(Math.random() * 6) + 5); // 5 to 10
      setNum2(Math.floor(Math.random() * 7) + 3); // 3 to 9
    } else {
      setOperation('addition');
      setNum1(Math.floor(Math.random() * 40) + 15); // 15 to 55
      setNum2(Math.floor(Math.random() * 40) + 15); // 15 to 55
    }
    setUserAnswer('');
    setErrorMsg('');
  };

  useEffect(() => {
    if (isVisible) {
      generateProblem();
    }
  }, [isVisible]);

  const handleSubmit = () => {
    const correctAnswer = operation === 'addition' ? num1 + num2 : num1 * num2;
    const parsed = parseInt(userAnswer.trim(), 10);
    
    if (parsed === correctAnswer) {
      onSuccess();
    } else {
      setErrorMsg('Incorrect answer. Parents only!');
      setUserAnswer('');
    }
  };

  const getProblemText = () => {
    if (operation === 'addition') {
      return `Solve: ${num1} + ${num2} = ?`;
    }
    return `Solve: ${num1} × ${num2} = ?`;
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.header}>Parental Lock</Text>
            <Text style={styles.subHeader}>
              Please solve this problem to access parent settings and analytics.
            </Text>

            <Text style={styles.problemText}>{getProblemText()}</Text>

            <TextInput
              style={styles.input}
              placeholder="Your answer"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              value={userAnswer}
              onChangeText={setUserAnswer}
              onSubmitEditing={handleSubmit}
              autoFocus
            />

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.buttonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit}>
                <Text style={styles.buttonTextSubmit}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  problemText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  buttonTextCancel: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSubmit: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
