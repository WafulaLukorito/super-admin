import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlockerEngine, FrictionType, MathDifficulty } from '@/services/blockerEngine';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MathProblem {
  question: string;
  answer: string;
}

function generateMathProblem(diff: MathDifficulty): MathProblem {
  if (diff === 'easy') {
    // Easy: simple, single or small double-digit addition / subtraction (5-20)
    const isAddition = Math.random() > 0.4;
    if (isAddition) {
      const a = Math.floor(Math.random() * 10) + 5; // 5 to 14
      const b = Math.floor(Math.random() * 9) + 3;  // 3 to 11
      return {
        question: `${a} + ${b} = ?`,
        answer: (a + b).toString(),
      };
    } else {
      const a = Math.floor(Math.random() * 12) + 12; // 12 to 23
      const b = Math.floor(Math.random() * 8) + 3;   // 3 to 10
      return {
        question: `${a} - ${b} = ?`,
        answer: (a - b).toString(),
      };
    }
  } else if (diff === 'medium') {
    // Medium: times table up to 9x9 or 2-digit sums
    const isMultiplication = Math.random() > 0.5;
    if (isMultiplication) {
      const a = Math.floor(Math.random() * 6) + 4; // 4 to 9
      const b = Math.floor(Math.random() * 6) + 4; // 4 to 9
      return {
        question: `${a} × ${b} = ?`,
        answer: (a * b).toString(),
      };
    } else {
      const a = Math.floor(Math.random() * 30) + 20; // 20 to 49
      const b = Math.floor(Math.random() * 25) + 15; // 15 to 39
      return {
        question: `${a} + ${b} = ?`,
        answer: (a + b).toString(),
      };
    }
  } else {
    // Hard: two-step arithmetic equation
    const a = Math.floor(Math.random() * 10) + 11; // 11 to 20
    const mult = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
    const add = Math.floor(Math.random() * 15) + 10; // 10 to 24
    return {
      question: `(${a} × ${mult}) + ${add} = ?`,
      answer: (a * mult + add).toString(),
    };
  }
}

function generateMemorySequence(): number[] {
  return [
    Math.floor(Math.random() * 9) + 1,
    Math.floor(Math.random() * 9) + 1,
    Math.floor(Math.random() * 9) + 1,
    Math.floor(Math.random() * 9) + 1,
  ];
}

export function FrictionChallengeModal({ visible, onClose, onSuccess }: Props) {
  const engineState = BlockerEngine.getState();
  const [challengeType, setChallengeType] = useState<FrictionType>(engineState.frictionType || 'math');
  const [difficulty, setDifficulty] = useState<MathDifficulty>(engineState.mathDifficulty || 'easy');
  const [currentProblem, setCurrentProblem] = useState<MathProblem>({ question: '8 + 7 = ?', answer: '15' });
  const [mathAnswer, setMathAnswer] = useState('');
  const [pledgeText, setPledgeText] = useState('');

  // Reverse digit memory puzzle
  const [memorySequence, setMemorySequence] = useState<number[]>([7, 3, 9, 4]);
  const [memoryVisible, setMemoryVisible] = useState(true);
  const [memoryAnswer, setMemoryAnswer] = useState('');
  const [memoryTimer, setMemoryTimer] = useState(3);

  const targetPledge = 'I will close this app in 2 minutes and focus.';

  // Regenerate math problem when modal becomes visible or difficulty changes
  useEffect(() => {
    if (visible) {
      const latest = BlockerEngine.getState();
      setChallengeType(latest.frictionType || 'math');
      setDifficulty(latest.mathDifficulty || 'easy');
      setCurrentProblem(generateMathProblem(latest.mathDifficulty || 'easy'));
      setMathAnswer('');
      setPledgeText('');
    }
  }, [visible]);

  const handleDifficultyChange = (newDiff: MathDifficulty) => {
    setDifficulty(newDiff);
    BlockerEngine.setMathDifficulty(newDiff);
    setCurrentProblem(generateMathProblem(newDiff));
    setMathAnswer('');
  };

  const handleRefreshProblem = () => {
    setCurrentProblem(generateMathProblem(difficulty));
    setMathAnswer('');
  };

  const handleResetMemory = () => {
    const seq = generateMemorySequence();
    setMemorySequence(seq);
    setMemoryVisible(true);
    setMemoryAnswer('');
    setMemoryTimer(3);
  };

  useEffect(() => {
    if (!visible || challengeType !== 'memory' || !memoryVisible) return;
    const interval = setInterval(() => {
      setMemoryTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setMemoryVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, challengeType, memoryVisible]);

  const handleVerify = () => {
    if (challengeType === 'math') {
      if (mathAnswer.trim() === currentProblem.answer) {
        const result = BlockerEngine.claimFrictionGrace();
        if (result.success) {
          Alert.alert('Grace Period Granted', result.message);
          setMathAnswer('');
          onSuccess();
          onClose();
        } else {
          Alert.alert('Extension Denied', result.message);
        }
      } else {
        Alert.alert(
          'Incorrect Answer',
          `"${mathAnswer.trim()}" is not correct. Solve ${currentProblem.question} to prove deliberate attention.`
        );
      }
    } else if (challengeType === 'pledge') {
      if (pledgeText.trim().toLowerCase() === targetPledge.toLowerCase()) {
        const result = BlockerEngine.claimFrictionGrace();
        if (result.success) {
          Alert.alert('Grace Period Granted', result.message);
          setPledgeText('');
          onSuccess();
          onClose();
        } else {
          Alert.alert('Extension Denied', result.message);
        }
      } else {
        Alert.alert('Declaration Mismatch', 'Type the exact reflection prompt to unlock 2 minutes.');
      }
    } else {
      const targetReversed = [...memorySequence].reverse().join('');
      const cleanInput = memoryAnswer.replace(/[^0-9]/g, '');
      if (cleanInput === targetReversed) {
        const result = BlockerEngine.claimFrictionGrace();
        if (result.success) {
          Alert.alert('Grace Period Granted', result.message);
          setMemoryAnswer('');
          onSuccess();
          onClose();
        } else {
          Alert.alert('Extension Denied', result.message);
        }
      } else {
        Alert.alert('Sequence Mismatch', `The reverse sequence was ${targetReversed}. Try again with a new sequence.`);
        handleResetMemory();
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.badge}>ANTI-IMPULSE FRICTION GATE</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
              <MaterialIcons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>2-Minute Grace Extension</Text>
          <Text style={styles.subtitle}>
            You may claim exactly ONE 2-minute extension per window. Complete the friction challenge to proceed.
          </Text>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, challengeType === 'math' && styles.activeTab]}
              onPress={() => {
                setChallengeType('math');
                BlockerEngine.setFrictionType('math');
              }}>
              <MaterialIcons
                name="calculate"
                size={16}
                color={challengeType === 'math' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.tabText, challengeType === 'math' && styles.activeTabText]}>
                Math Challenge
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, challengeType === 'pledge' && styles.activeTab]}
              onPress={() => {
                setChallengeType('pledge');
                BlockerEngine.setFrictionType('pledge');
              }}>
              <MaterialIcons
                name="edit-note"
                size={16}
                color={challengeType === 'pledge' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.tabText, challengeType === 'pledge' && styles.activeTabText]}>
                Mindful Pledge
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, challengeType === 'memory' && styles.activeTab]}
              onPress={() => {
                setChallengeType('memory');
                BlockerEngine.setFrictionType('memory');
                handleResetMemory();
              }}>
              <MaterialIcons
                name="psychology"
                size={16}
                color={challengeType === 'memory' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.tabText, challengeType === 'memory' && styles.activeTabText]}>
                Reverse Recall
              </Text>
            </TouchableOpacity>
          </View>

          {challengeType === 'math' ? (
            <View style={styles.challengeBox}>
              {/* Difficulty Selector Row */}
              <View style={styles.difficultyRow}>
                <Text style={styles.difficultyLabel}>Difficulty:</Text>
                <View style={styles.diffPills}>
                  {(['easy', 'medium', 'hard'] as MathDifficulty[]).map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.diffPill, difficulty === d && styles.diffPillActive]}
                      onPress={() => handleDifficultyChange(d)}>
                      <Text style={[styles.diffPillText, difficulty === d && styles.diffPillTextActive]}>
                        {d.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={handleRefreshProblem}>
                  <MaterialIcons name="refresh" size={16} color="#38BDF8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.equationLabel}>Solve this equation:</Text>
              <Text style={styles.equation}>{currentProblem.question}</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter answer..."
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={mathAnswer}
                onChangeText={setMathAnswer}
                autoFocus
              />
            </View>
          ) : challengeType === 'pledge' ? (
            <View style={styles.challengeBox}>
              <Text style={styles.equationLabel}>Type this exact affirmation:</Text>
              <Text style={styles.pledgePrompt}>"{targetPledge}"</Text>
              <TextInput
                style={styles.input}
                placeholder="Type the exact phrase..."
                placeholderTextColor="#64748B"
                value={pledgeText}
                onChangeText={setPledgeText}
                autoCapitalize="none"
                autoFocus
              />
            </View>
          ) : (
            <View style={styles.challengeBox}>
              <View style={styles.difficultyRow}>
                <Text style={styles.difficultyLabel}>Reverse Digit Memory Challenge</Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={handleResetMemory}>
                  <MaterialIcons name="refresh" size={16} color="#38BDF8" />
                </TouchableOpacity>
              </View>

              {memoryVisible ? (
                <View style={{ alignItems: 'center', marginVertical: 14 }}>
                  <Text style={styles.equationLabel}>Memorize this 4-digit sequence:</Text>
                  <Text style={styles.memoryDigits}>{memorySequence.join('   ')}</Text>
                  <Text style={styles.memoryCountdownText}>Hiding in {memoryTimer}s...</Text>
                </View>
              ) : (
                <View style={{ marginVertical: 8 }}>
                  <Text style={styles.equationLabel}>Type the 4 digits in REVERSE order:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter reversed digits (e.g. 4937)..."
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={memoryAnswer}
                    onChangeText={setMemoryAnswer}
                    autoFocus
                  />
                </View>
              )}
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleVerify}>
              <Text style={styles.submitText}>Claim +2m Grace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  closeIconBtn: {
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#0284C7',
  },
  tabText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  challengeBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  difficultyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  diffPills: {
    flexDirection: 'row',
    gap: 4,
  },
  diffPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  diffPillActive: {
    backgroundColor: '#38BDF8',
  },
  diffPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  diffPillTextActive: {
    color: '#0F172A',
  },
  refreshBtn: {
    padding: 4,
  },
  equationLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  equation: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#38BDF8',
    textAlign: 'center',
    marginVertical: 10,
    letterSpacing: 1,
  },
  pledgePrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FCD34D',
    fontStyle: 'italic',
    marginVertical: 6,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  memoryDigits: {
    fontSize: 32,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 6,
    marginVertical: 12,
  },
  memoryCountdownText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '700',
  },
});
