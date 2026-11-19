import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { BlockerEngine } from '@/services/blockerEngine';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FrictionChallengeModal({ visible, onClose, onSuccess }: Props) {
  const [challengeType, setChallengeType] = useState<'math' | 'pledge'>('math');
  const [mathAnswer, setMathAnswer] = useState('');
  const [pledgeText, setPledgeText] = useState('');

  // Math challenge: (23 * 3) + 14 = 83
  const targetAnswer = '83';
  const targetPledge = 'I will close this app in 2 minutes and focus.';

  const handleVerify = () => {
    if (challengeType === 'math') {
      if (mathAnswer.trim() === targetAnswer) {
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
        Alert.alert('Incorrect Answer', 'Solve the equation accurately to prove deliberate focus.');
      }
    } else {
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
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.badge}>ANTI-IMPULSE FRICTION GATE</Text>
          <Text style={styles.title}>2-Minute Grace Extension</Text>
          <Text style={styles.subtitle}>
            You may claim exactly ONE 2-minute cooldown per 60-minute window. Complete the cognitive challenge below to proceed.
          </Text>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, challengeType === 'math' && styles.activeTab]}
              onPress={() => setChallengeType('math')}>
              <Text style={[styles.tabText, challengeType === 'math' && styles.activeTabText]}>
                Math Challenge
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, challengeType === 'pledge' && styles.activeTab]}
              onPress={() => setChallengeType('pledge')}>
              <Text style={[styles.tabText, challengeType === 'pledge' && styles.activeTabText]}>
                Mindful Pledge
              </Text>
            </TouchableOpacity>
          </View>

          {challengeType === 'math' ? (
            <View style={styles.challengeBox}>
              <Text style={styles.equationLabel}>Calculate this deliberate sum:</Text>
              <Text style={styles.equation}>(23 × 3) + 14 = ?</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter result..."
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={mathAnswer}
                onChangeText={setMathAnswer}
              />
            </View>
          ) : (
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
              />
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
  badge: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
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
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  challengeBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  equationLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  equation: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#38BDF8',
    textAlign: 'center',
    marginVertical: 8,
  },
  pledgePrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FCD34D',
    fontStyle: 'italic',
    marginVertical: 6,
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
});
