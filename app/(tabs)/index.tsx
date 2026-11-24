import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlockerEngine, BlockerState } from '@/services/blockerEngine';
import { FrictionChallengeModal } from '@/components/FrictionChallengeModal';

export default function DashboardScreen() {
  const [state, setState] = useState<BlockerState>(BlockerEngine.getState());
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    BlockerEngine.init().then((s) => setState(s));
    const unsubscribe = BlockerEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    const interval = setInterval(() => {
      BlockerEngine.syncFromNative();
    }, 2000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const totalAllowanceSeconds = state.allowanceMinutes * 60;
  const remainingAllowanceSeconds = Math.max(
    0,
    totalAllowanceSeconds - state.usedSecondsInBlock + state.graceSecondsRemaining
  );
  const remainingMinutes = Math.floor(remainingAllowanceSeconds / 60);
  const remainingSecs = remainingAllowanceSeconds % 60;

  const windowRemainingSecs = state.windowRemainingSeconds || Math.max(
    0,
    state.windowMinutes * 60 - state.currentBlockElapsedSeconds
  );
  const windowRemainingMinutes = Math.floor(windowRemainingSecs / 60);
  const windowRemainingSecsRemainder = windowRemainingSecs % 60;

  const blockedAppsCount = state.monitoredApps.filter((a) => a.blocked).length;
  const isLocked = remainingAllowanceSeconds === 0 && state.isShieldActive;

  const handleToggleShield = () => {
    const active = BlockerEngine.toggleShield();
    Alert.alert(
      active ? 'Shield Engaged' : 'Shield Suspended',
      active
        ? 'Hourly time-block rules and foreground overlay enforcement are active.'
        : 'App blocking is temporarily paused.'
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>SUPER ADMIN</Text>
            <Text style={styles.appSubtitle}>Hourly Interval App Blocker</Text>
          </View>
          <TouchableOpacity
            style={[styles.shieldStatusBadge, state.isShieldActive ? styles.shieldActive : styles.shieldPaused]}
            onPress={handleToggleShield}>
            <MaterialIcons
              name={state.isShieldActive ? 'shield' : 'pause-circle'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.shieldStatusText}>
              {state.isShieldActive ? 'ENFORCING' : 'PAUSED'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security / Anti-Tamper Status Bar */}
        <View style={styles.tamperBar}>
          <MaterialIcons name="lock" size={14} color="#10B981" />
          <Text style={styles.tamperText}>
            Anti-Tamper: SystemClock.elapsedRealtime() hardware anchored
          </Text>
        </View>

        {/* Main Hour Gauge Card */}
        <View style={[styles.card, isLocked ? styles.cardLocked : null]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>CURRENT {state.windowMinutes}-MINUTE WINDOW</Text>
            <Text style={styles.cardHeaderExtra}>
              {isLocked
                ? `Unlocks in ${windowRemainingMinutes}m ${windowRemainingSecsRemainder}s`
                : `Window resets in ${windowRemainingMinutes}m`}
            </Text>
          </View>

          <View style={styles.timerCircle}>
            <Text style={[styles.timerValue, isLocked ? styles.timerLockedValue : null]}>
              {isLocked
                ? `${String(windowRemainingMinutes).padStart(2, '0')}:${String(windowRemainingSecsRemainder).padStart(2, '0')}`
                : `${String(remainingMinutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`}
            </Text>
            <Text style={styles.timerLabel}>
              {isLocked ? 'UNLOCKS IN' : 'ALLOWANCE REMAINING'}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(
                    100,
                    (remainingAllowanceSeconds / totalAllowanceSeconds) * 100
                  )}%`,
                  backgroundColor: isLocked ? '#EF4444' : '#38BDF8',
                },
              ]}
            />
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{state.allowanceMinutes}m</Text>
              <Text style={styles.statLabel}>Window Limit</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>
                {Math.floor(state.usedSecondsInBlock / 60)}m
              </Text>
              <Text style={styles.statLabel}>Consumed</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>
                {state.graceClaimedInCurrentBlock ? 'Claimed' : '1 Available'}
              </Text>
              <Text style={styles.statLabel}>Friction Grace</Text>
            </View>
          </View>
        </View>

        {/* Lockdown Notice or Friction Grace Action */}
        {isLocked ? (
          <View style={styles.lockNoticeBox}>
            <MaterialIcons name="gavel" size={24} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.lockNoticeTitle}>High-Dopamine Apps Blocked</Text>
              <Text style={styles.lockNoticeBody}>
                You have reached your {state.allowanceMinutes}m allowance for this {state.windowMinutes}m block.
                Apps unlock in {windowRemainingMinutes}m {windowRemainingSecsRemainder}s when the new window starts.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Grace Extension Button */}
        <TouchableOpacity
          style={[
            styles.graceButton,
            state.graceClaimedInCurrentBlock ? styles.graceButtonDisabled : null,
          ]}
          disabled={state.graceClaimedInCurrentBlock}
          onPress={() => setModalVisible(true)}>
          <MaterialIcons
            name="timer"
            size={20}
            color={state.graceClaimedInCurrentBlock ? '#64748B' : '#FFFFFF'}
          />
          <Text
            style={[
              styles.graceButtonText,
              state.graceClaimedInCurrentBlock ? styles.graceButtonDisabledText : null,
            ]}>
            {state.graceClaimedInCurrentBlock
              ? 'Friction Grace Already Claimed This Block'
              : 'Claim +2m Friction Grace (Challenge Required)'}
          </Text>
        </TouchableOpacity>

        {/* Guarded Apps Overview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>GUARDED APPLICATIONS ({blockedAppsCount})</Text>
          </View>
          <View style={styles.appList}>
            {state.monitoredApps
              .filter((a) => a.blocked)
              .slice(0, 5)
              .map((app) => (
                <View key={app.id} style={styles.appRow}>
                  {app.icon ? (
                    <Image source={{ uri: app.icon }} style={styles.appIconImage} />
                  ) : (
                    <View style={styles.appIconCircle}>
                      <Text style={styles.appIconLetter}>{app.name[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.appPkg}>{app.packageName}</Text>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>
                      {app.category.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </View>
      </ScrollView>

      {/* Friction Challenge Modal */}
      <FrictionChallengeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  shieldStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shieldActive: {
    backgroundColor: '#10B981',
  },
  shieldPaused: {
    backgroundColor: '#F59E0B',
  },
  shieldStatusText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  tamperBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 18,
  },
  tamperText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardLocked: {
    borderColor: '#7F1D1D',
    backgroundColor: '#1C1215',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  cardHeaderExtra: {
    fontSize: 11,
    color: '#64748B',
  },
  timerCircle: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#38BDF8',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerLockedValue: {
    color: '#EF4444',
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  lockNoticeBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#380D0D',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    marginBottom: 18,
    alignItems: 'center',
  },
  lockNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FCA5A5',
    marginBottom: 2,
  },
  lockNoticeBody: {
    fontSize: 12,
    color: '#FECACA',
    lineHeight: 16,
  },
  graceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  graceButtonDisabled: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  graceButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  graceButtonDisabledText: {
    color: '#64748B',
  },
  appList: {
    gap: 12,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appIconImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  appIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconLetter: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 15,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  appPkg: {
    fontSize: 11,
    color: '#64748B',
  },
  categoryBadge: {
    backgroundColor: '#371B28',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#831843',
  },
  categoryText: {
    color: '#F472B6',
    fontSize: 10,
    fontWeight: '700',
  },
});
