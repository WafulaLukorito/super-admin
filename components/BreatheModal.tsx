import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface Props {
  visible: boolean;
  onClose: () => void;
  appName?: string;
  onProceed?: () => void;
}

export function BreatheModal({ visible, onClose, appName = 'Guarded Apps', onProceed }: Props) {
  const [countdown, setCountdown] = useState(10);
  const [phaseText, setPhaseText] = useState('Inhale slowly...');
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!visible) return;

    setCountdown(10);
    setPhaseText('Inhale slowly...');
    scaleAnim.setValue(1);

    // Breathing loop: 4s expand, 2s hold, 4s contract
    const breathingCycle = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.35,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    breathingCycle.start();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          setPhaseText('Centered & Deliberate');
          return 0;
        }
        if (next >= 7) {
          setPhaseText('Inhale slowly...');
        } else if (next >= 5) {
          setPhaseText('Hold your breath...');
        } else {
          setPhaseText('Exhale gently...');
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      breathingCycle.stop();
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <MaterialIcons name="air" size={14} color="#2ED3A3" />
            <Text style={styles.badgeText}>MINDFUL MICRO-INTERVENTION</Text>
          </View>

          <Text style={styles.title}>Breathe Before Scroll</Text>
          <Text style={styles.subtitle}>
            Are you opening {appName} with intention? Behavioral science shows a 10-second pause breaks up to 80% of compulsive autopilot urges.
          </Text>

          {/* Animated Breathwork Circle */}
          <View style={styles.circleContainer}>
            <Animated.View
              style={[
                styles.breathCircle,
                { transform: [{ scale: scaleAnim }] },
              ]}>
              <Text style={styles.phaseLabel}>{phaseText}</Text>
              <Text style={styles.timerValue}>
                {countdown > 0 ? `${countdown}s` : '✓'}
              </Text>
            </Animated.View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.closeAppButton} onPress={onClose}>
            <MaterialIcons name="check-circle" size={18} color="#101A17" />
            <Text style={styles.closeAppText}>I'll Skip It (Behavioral Win!)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.proceedButton, countdown > 0 && styles.proceedButtonDisabled]}
            disabled={countdown > 0}
            onPress={() => {
              if (onProceed) onProceed();
              onClose();
            }}>
            <Text
              style={[
                styles.proceedText,
                countdown > 0 && styles.proceedTextDisabled,
              ]}>
              {countdown > 0 ? `Opening in ${countdown}s...` : `Continue to ${appName}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 11, 0.94)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: '#2ED3A3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#A8B5B0',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  circleContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  breathCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#102822',
    borderWidth: 3,
    borderColor: '#2ED3A3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  phaseLabel: {
    color: '#A8B5B0',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  timerValue: {
    color: '#84E150',
    fontSize: 28,
    fontWeight: '900',
  },
  closeAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#2ED3A3',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  closeAppText: {
    color: '#101A17',
    fontWeight: '800',
    fontSize: 14,
  },
  proceedButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#262626',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  proceedButtonDisabled: {
    opacity: 0.5,
  },
  proceedText: {
    color: '#2ED3A3',
    fontWeight: '700',
    fontSize: 13,
  },
  proceedTextDisabled: {
    color: '#6E7A75',
  },
});
