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

  const blockedApps = state.monitoredApps.filter((a) => a.blocked);
  const blockedAppsCount = blockedApps.length;
  const lockedAppsCount = blockedApps.filter((a) => a.isLocked).length;

  const isCumulative = state.trackingMode === 'cumulative';
  const isLocked = isCumulative
    ? remainingAllowanceSeconds === 0 && state.isShieldActive
    : lockedAppsCount > 0 && state.isShieldActive;

  const handleToggleShield = () => {
    const active = BlockerEngine.toggleShield();
    Alert.alert(
      active ? 'Shield Engaged' : 'Shield Suspended',
      active
        ? 'Time-block rules and foreground overlay enforcement are active.'
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

        {/* Mode & Window Preset Summary Pill */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryPill}>
            <MaterialIcons
              name={isCumulative ? 'layers' : 'splitscreen'}
              size={14}
              color={isCumulative ? '#38BDF8' : '#A855F7'}
            />
            <Text style={[styles.summaryPillText, { color: isCumulative ? '#38BDF8' : '#A855F7' }]}>
              {isCumulative ? 'CUMULATIVE POOL' : 'PER-APP ISOLATED'}
            </Text>
          </View>
          <View style={styles.summaryPresetPill}>
            <MaterialIcons name="schedule" size={13} color="#94A3B8" />
            <Text style={styles.summaryPresetText}>
              {state.windowMinutes === 60 ? '1h Window (7m Limit)' : '2h Window (15m Limit)'}
            </Text>
          </View>
        </View>

        {/* Main Gauge Card */}
        <View style={[styles.card, (isCumulative && isLocked) ? styles.cardLocked : null]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {isCumulative
                ? `CURRENT ${state.windowMinutes}-MINUTE WINDOW`
                : `PER-APP STATUS (${blockedAppsCount} GUARDED)`}
            </Text>
            <Text style={styles.cardHeaderExtra}>
              {isCumulative
                ? (isLocked ? `Unlocks in ${windowRemainingMinutes}m ${windowRemainingSecsRemainder}s` : `Resets in ${windowRemainingMinutes}m`)
                : `${lockedAppsCount} of ${blockedAppsCount} apps locked`}
            </Text>
          </View>

          {isCumulative ? (
            /* Cumulative Shared Gauge */
            <>
              <View style={styles.timerCircle}>
                <Text style={[styles.timerValue, isLocked ? styles.timerLockedValue : null]}>
                  {isLocked
                    ? `${String(windowRemainingMinutes).padStart(2, '0')}:${String(windowRemainingSecsRemainder).padStart(2, '0')}`
                    : `${String(remainingMinutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`}
                </Text>
                <Text style={styles.timerLabel}>
                  {isLocked ? 'SHARED UNLOCK IN' : 'ALLOWANCE REMAINING'}
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
                  <Text style={styles.statLabel}>Pool Limit</Text>
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
            </>
          ) : (
            /* Per-App Overview Card */
            <>
              <View style={styles.timerCircle}>
                <Text style={[styles.timerValue, lockedAppsCount > 0 ? styles.timerPerAppAlert : null]}>
                  {lockedAppsCount > 0 ? `${lockedAppsCount} LOCKED` : 'ALL OPEN'}
                </Text>
                <Text style={styles.timerLabel}>INDEPENDENT APP TIMERS</Text>
              </View>

              <Text style={styles.perAppSubtitle}>
                Each app runs its own separate {state.allowanceMinutes}m limit and {state.windowMinutes}m rolling window. Using Twitter will not count against Instagram or YouTube.
              </Text>

              <View style={styles.statRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{state.allowanceMinutes}m</Text>
                  <Text style={styles.statLabel}>Per App Limit</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{state.windowMinutes}m</Text>
                  <Text style={styles.statLabel}>Rolling Window</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{blockedAppsCount - lockedAppsCount}</Text>
                  <Text style={styles.statLabel}>Available</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Lockdown Notice for Cumulative Mode */}
        {isCumulative && isLocked ? (
          <View style={styles.lockNoticeBox}>
            <MaterialIcons name="gavel" size={24} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.lockNoticeTitle}>Cumulative Pool Exhausted</Text>
              <Text style={styles.lockNoticeBody}>
                You have reached your {state.allowanceMinutes}m allowance for this {state.windowMinutes}m block.
                All guarded apps unlock in {windowRemainingMinutes}m {windowRemainingSecsRemainder}s.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Grace Extension Button (Cumulative Mode) */}
        {isCumulative && (
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
        )}

        {/* Guarded Apps Overview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              GUARDED APPLICATIONS ({blockedAppsCount})
            </Text>
            {!isCumulative && (
              <Text style={styles.cardHeaderExtra}>Independent Progress</Text>
            )}
          </View>
          <View style={styles.appList}>
            {blockedApps.map((app) => {
              const appRem = app.remainingSeconds ?? totalAllowanceSeconds;
              const appRemMins = Math.floor(appRem / 60);
              const appRemSecs = appRem % 60;
              const appWindowRem = app.windowRemainingSeconds ?? 0;
              const appWinMins = Math.floor(appWindowRem / 60);
              const appIsLocked = app.isLocked ?? (appRem <= 0);

              const percentUsed = Math.min(
                100,
                Math.max(0, ((totalAllowanceSeconds - appRem) / totalAllowanceSeconds) * 100)
              );

              return (
                <View key={app.id} style={styles.appCardRow}>
                  <View style={styles.appRowTop}>
                    {app.icon ? (
                      <Image source={{ uri: app.icon }} style={styles.appIconImage} />
                    ) : (
                      <View style={styles.appIconCircle}>
                        <Text style={styles.appIconLetter}>{app.name[0]}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appName}>{app.name}</Text>
                      <Text style={styles.appPkg} numberOfLines={1}>{app.packageName}</Text>
                    </View>

                    {/* Badge */}
                    {!isCumulative ? (
                      <View style={[styles.appStatusBadge, appIsLocked ? styles.appStatusBadgeLocked : styles.appStatusBadgeOpen]}>
                        <Text style={styles.appStatusText}>
                          {appIsLocked
                            ? `LOCKED • ${appWinMins}m`
                            : `${appRemMins}m ${appRemSecs}s left`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>
                          {app.category.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Per-App Individual Progress Bar */}
                  {!isCumulative && (
                    <View style={styles.miniProgressContainer}>
                      <View
                        style={[
                          styles.miniProgressBar,
                          {
                            width: `${100 - percentUsed}%`,
                            backgroundColor: appIsLocked ? '#EF4444' : '#10B981',
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              );
            })}

            {blockedAppsCount === 0 && (
              <Text style={styles.emptyText}>No applications currently guarded. Go to Rules tab to select apps.</Text>
            )}
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
    backgroundColor: '#047857',
  },
  shieldPaused: {
    backgroundColor: '#B45309',
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
    gap: 6,
    marginBottom: 12,
  },
  tamperText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  summaryBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  summaryPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryPresetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  summaryPresetText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardLocked: {
    borderColor: '#DC2626',
    backgroundColor: '#1C151B',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardHeaderExtra: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  timerCircle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  timerValue: {
    fontSize: 44,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  timerLockedValue: {
    color: '#EF4444',
  },
  timerPerAppAlert: {
    color: '#F59E0B',
    fontSize: 32,
  },
  timerLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  perAppSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#0F172A',
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
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  lockNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#450A0A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    gap: 12,
    alignItems: 'center',
  },
  lockNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  lockNoticeBody: {
    fontSize: 12,
    color: '#FCA5A5',
    marginTop: 2,
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
    marginBottom: 16,
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
  appCardRow: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  appRowTop: {
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
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  appPkg: {
    fontSize: 10,
    color: '#64748B',
  },
  appStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  appStatusBadgeOpen: {
    backgroundColor: '#064E3B',
  },
  appStatusBadgeLocked: {
    backgroundColor: '#7F1D1D',
  },
  appStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  categoryBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  miniProgressContainer: {
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
  },
  miniProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
