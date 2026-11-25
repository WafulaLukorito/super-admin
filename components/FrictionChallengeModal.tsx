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
import { resolveAppName } from '@/constants/appCatalog';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetPackageName?: string;
  initialMinutes?: number;
}

interface MathProblem {
  question: string;
  answer: string;
}

function generateMathProblem(diff: MathDifficulty): MathProblem {
  if (diff === 'easy') {
    const isAddition = Math.random() > 0.4;
    if (isAddition) {
      const a = Math.floor(Math.random() * 10) + 5;
      const b = Math.floor(Math.random() * 9) + 3;
      return {
        question: `${a} + ${b} = ?`,
        answer: (a + b).toString(),
      };
    } else {
      const a = Math.floor(Math.random() * 12) + 12;
      const b = Math.floor(Math.random() * 8) + 3;
      return {
        question: `${a} - ${b} = ?`,
        answer: (a - b).toString(),
      };
    }
  } else if (diff === 'medium') {
    const isMultiplication = Math.random() > 0.5;
    if (isMultiplication) {
      const a = Math.floor(Math.random() * 6) + 4;
      const b = Math.floor(Math.random() * 6) + 4;
      return {
        question: `${a} × ${b} = ?`,
        answer: (a * b).toString(),
      };
    } else {
      const a = Math.floor(Math.random() * 30) + 20;
      const b = Math.floor(Math.random() * 25) + 15;
      return {
        question: `${a} + ${b} = ?`,
        answer: (a + b).toString(),
      };
    }
  } else {
    const a = Math.floor(Math.random() * 10) + 11;
    const mult = Math.floor(Math.random() * 3) + 2;
    const add = Math.floor(Math.random() * 15) + 10;
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

export function FrictionChallengeModal({
  visible,
  onClose,
  onSuccess,
  targetPackageName,
  initialMinutes = 2,
}: Props) {
  const engineState = BlockerEngine.getState();
  const [challengeType, setChallengeType] = useState<FrictionType>(engineState.frictionType || 'math');
  const [difficulty, setDifficulty] = useState<MathDifficulty>(engineState.mathDifficulty || 'medium');
  const [selectedMinutes, setSelectedMinutes] = useState<number>(initialMinutes);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>({ question: '7 × 8 = ?', answer: '56' });
  const [mathAnswer, setMathAnswer] = useState('');
  const [pledgeText, setPledgeText] = useState('');

  // Reverse digit memory puzzle
  const [memorySequence, setMemorySequence] = useState<number[]>([7, 3, 9, 4]);
  const [memoryVisible, setMemoryVisible] = useState(true);
  const [memoryAnswer, setMemoryAnswer] = useState('');
  const [memoryTimer, setMemoryTimer] = useState(3);

  const allow2 = engineState.extraTime2MinEnabled;
  const allow5 = engineState.extraTime5MinEnabled;
  const targetAppLabel = targetPackageName ? resolveAppName(targetPackageName) : null;
  const targetPledge = `I will close ${targetAppLabel || 'this app'} in ${selectedMinutes} minutes and focus.`;

  useEffect(() => {
    if (visible) {
      const latest = BlockerEngine.getState();
      setChallengeType(latest.frictionType || 'math');
      setDifficulty(latest.mathDifficulty || 'medium');
      setCurrentProblem(generateMathProblem(latest.mathDifficulty || 'medium'));
      setMathAnswer('');
      setPledgeText('');
      if (initialMinutes === 5 && latest.extraTime5MinEnabled) {
        setSelectedMinutes(5);
      } else if (initialMinutes === 2 && latest.extraTime2MinEnabled) {
        setSelectedMinutes(2);
      } else if (latest.extraTime2MinEnabled) {
        setSelectedMinutes(2);
      } else if (latest.extraTime5MinEnabled) {
        setSelectedMinutes(5);
      }
    }
  }, [visible, initialMinutes]);

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
        BlockerEngine.playSound('success');
        const result = BlockerEngine.claimFrictionGrace(targetPackageName, selectedMinutes);
        if (result.success) {
          Alert.alert('Extra Time Added', result.message);
          setMathAnswer('');
          onSuccess();
          onClose();
        } else {
          Alert.alert('Not Available', result.message);
          onClose();
        }
      } else {
        BlockerEngine.playSound('error');
        Alert.alert(
          'Not Quite',
          `"${mathAnswer.trim()}" isn't right. Try ${currentProblem.question}`
        );
      }
    } else if (challengeType === 'pledge') {
      if (pledgeText.trim().toLowerCase() === targetPledge.toLowerCase()) {
        BlockerEngine.playSound('success');
        const result = BlockerEngine.claimFrictionGrace(targetPackageName, selectedMinutes);
        if (result.success) {
          Alert.alert('Extra Time Added', result.message);
          setPledgeText('');
          onSuccess();
          onClose();
        } else {
          Alert.alert('Not Available', result.message);
          onClose();
        }
      } else {
        BlockerEngine.playSound('error');
        Alert.alert('Almost There', `Please type the exact sentence above to add ${selectedMinutes} minutes.`);
      }
    } else {
      const targetReversed = [...memorySequence].reverse().join('');
      const cleanInput = memoryAnswer.replace(/[^0-9]/g, '');
      if (cleanInput === targetReversed) {
        BlockerEngine.playSound('success');
        const result = BlockerEngine.claimFrictionGrace(targetPackageName, selectedMinutes);
        if (result.success) {
          Alert.alert('Extra Time Added', result.message);
          setMemoryAnswer('');
          onSuccess();
          onClose();
        } else {
          Alert.alert('Not Available', result.message);
          onClose();
        }
      } else {
        BlockerEngine.playSound('error');
        Alert.alert('Not Quite', `The reverse order was ${targetReversed}. Try a fresh set of digits.`);
        handleResetMemory();
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.badge}>EXTRA TIME CHECK</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
              <MaterialIcons name="close" size={20} color="#A8B5B0" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>
            {selectedMinutes} Extra Minutes{targetAppLabel ? ` for ${targetAppLabel}` : ''}
          </Text>
          <Text style={styles.subtitle}>
            You get one extra-time boost per cycle. Complete a quick check to continue.
          </Text>

          {allow2 && allow5 && (
            <View style={styles.durationRow}>
              <Text style={styles.difficultyLabel}>Duration:</Text>
              <View style={styles.durationPills}>
                {[2, 5].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.durationPill, selectedMinutes === mins && styles.durationPillActive]}
                    onPress={() => setSelectedMinutes(mins)}>
                    <Text
                      style={[
                        styles.durationPillText,
                        selectedMinutes === mins && styles.durationPillTextActive,
                      ]}>
                      +{mins} Min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, challengeType === 'math' && styles.activeTab]}
              onPress={() => {
                setChallengeType('math');
                BlockerEngine.setFrictionType('math');
              }}>
              <MaterialIcons
                name="calculate"
                size={15}
                color={challengeType === 'math' ? '#101A17' : '#A8B5B0'}
              />
              <Text style={[styles.tabText, challengeType === 'math' && styles.activeTabText]}>
                Math
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
                size={15}
                color={challengeType === 'pledge' ? '#101A17' : '#A8B5B0'}
              />
              <Text style={[styles.tabText, challengeType === 'pledge' && styles.activeTabText]}>
                Pledge
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
                size={15}
                color={challengeType === 'memory' ? '#101A17' : '#A8B5B0'}
              />
              <Text style={[styles.tabText, challengeType === 'memory' && styles.activeTabText]}>
                Recall
              </Text>
            </TouchableOpacity>
          </View>

          {challengeType === 'math' ? (
            <View style={styles.challengeBox}>
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
                  <MaterialIcons name="refresh" size={16} color="#2ED3A3" />
                </TouchableOpacity>
              </View>

              <Text style={styles.equationLabel}>Solve this equation:</Text>
              <Text style={styles.equation}>{currentProblem.question}</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter answer..."
                placeholderTextColor="#6E7A75"
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
                placeholderTextColor="#6E7A75"
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
                  <MaterialIcons name="refresh" size={16} color="#2ED3A3" />
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
                    placeholderTextColor="#6E7A75"
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
              <Text style={styles.submitText}>Unlock {selectedMinutes} Minutes</Text>
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
    backgroundColor: 'rgba(10, 12, 11, 0.90)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    color: '#84E150',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  closeIconBtn: {
    padding: 4,
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#A8B5B0',
    lineHeight: 18,
    marginBottom: 14,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  durationPills: {
    flexDirection: 'row',
    gap: 8,
  },
  durationPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  durationPillActive: {
    backgroundColor: '#84E150',
    borderColor: '#84E150',
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A8B5B0',
  },
  durationPillTextActive: {
    color: '#101A17',
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 10,
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
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#2ED3A3',
  },
  tabText: {
    fontSize: 12,
    color: '#A8B5B0',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#101A17',
    fontWeight: '800',
  },
  challengeBox: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  difficultyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A8B5B0',
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
    backgroundColor: '#262626',
  },
  diffPillActive: {
    backgroundColor: '#2ED3A3',
  },
  diffPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A8B5B0',
  },
  diffPillTextActive: {
    color: '#101A17',
  },
  refreshBtn: {
    padding: 4,
  },
  equationLabel: {
    fontSize: 12,
    color: '#A8B5B0',
    marginBottom: 4,
  },
  equation: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#84E150',
    textAlign: 'center',
    marginVertical: 10,
    letterSpacing: 1,
  },
  pledgePrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ED3A3',
    fontStyle: 'italic',
    marginVertical: 6,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333333',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#262626',
    alignItems: 'center',
  },
  cancelText: {
    color: '#A8B5B0',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2ED3A3',
    alignItems: 'center',
  },
  submitText: {
    color: '#101A17',
    fontWeight: '800',
    fontSize: 14,
  },
  memoryDigits: {
    fontSize: 32,
    fontWeight: '900',
    color: '#84E150',
    letterSpacing: 6,
    marginVertical: 12,
  },
  memoryCountdownText: {
    fontSize: 12,
    color: '#2ED3A3',
    fontWeight: '700',
  },
});
