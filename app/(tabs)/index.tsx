import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  Linking,
  Modal,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlockerEngine, BlockerState, TrackingMode } from '@/services/blockerEngine';
import { FrictionChallengeModal } from '@/components/FrictionChallengeModal';
import { AddAppModal } from '@/components/AddAppModal';
import AppBlocker from '@/modules/app-blocker';
import { APP_BRAND_COLORS, resolveAppName } from '@/constants/appCatalog';

export default function DashboardScreen() {
  const router = useRouter();
  const [state, setState] = useState<BlockerState>(BlockerEngine.getState());
  const [modalVisible, setModalVisible] = useState(false);
  const [frictionTargetPkg, setFrictionTargetPkg] = useState<string | undefined>(undefined);
  const [frictionInitialMinutes, setFrictionInitialMinutes] = useState<number>(2);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [modeModalVisible, setModeModalVisible] = useState(false);

  const checkPendingGrace = useCallback(() => {
    try {
      const pending = AppBlocker.consumePendingGraceRequest();
      if (pending && pending.minutes > 0) {
        setFrictionTargetPkg(pending.packageName ?? undefined);
        setFrictionInitialMinutes(pending.minutes);
        setModalVisible(true);
      }
    } catch (_e) {}
  }, []);

  useEffect(() => {
    BlockerEngine.init().then((s) => {
      setState({ ...s });
      checkPendingGrace();
    });
    const unsubscribe = BlockerEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    const interval = setInterval(() => {
      BlockerEngine.syncFromNative();
      checkPendingGrace();
    }, 2000);
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        BlockerEngine.syncFromNative();
        checkPendingGrace();
      }
    });
    return () => {
      unsubscribe();
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [checkPendingGrace]);

  const totalAllowanceSeconds = state.allowanceMinutes * 60;
  const remainingAllowanceSeconds = Math.max(
    0,
    totalAllowanceSeconds - state.usedSecondsInBlock + state.graceSecondsRemaining
  );
  const remainingMinutes = Math.floor(remainingAllowanceSeconds / 60);
  const remainingSecs = remainingAllowanceSeconds % 60;

  const windowRemainingSecs =
    state.windowRemainingSeconds ||
    Math.max(0, state.windowMinutes * 60 - state.currentBlockElapsedSeconds);
  const windowRemainingMinutes = Math.floor(windowRemainingSecs / 60);
  const windowRemainingSecsRemainder = windowRemainingSecs % 60;

  const timedApps = state.monitoredApps.filter((a) => a.blocked);
  const timedAppsCount = timedApps.length;
  const lockedApps = timedApps.filter((a) => a.isLocked);
  const lockedAppsCount = lockedApps.length;

  const isCumulative = state.trackingMode === 'cumulative';
  const isLocked = isCumulative
    ? remainingAllowanceSeconds === 0 && state.isShieldActive
    : lockedAppsCount > 0 && state.isShieldActive;

  const activeProfile =
    state.profilesEnabled && state.activeProfileId
      ? state.timeProfiles.find((p) => p.id === state.activeProfileId)
      : null;
  const isBedtime = activeProfile?.id === 'bedtime' || state.allowanceMinutes === 0;

  const activeAlt = (state.positiveAlternatives || []).find(
    (alt) => alt.packageName === state.positiveRedirectPackage
  );

  const handleToggleShield = () => {
    const res = BlockerEngine.toggleShield();
    if (res.error) {
      Alert.alert('Limits Locked', res.error);
      return;
    }
    Alert.alert(
      res.active ? 'Limits Active' : 'Limits Paused',
      res.active
        ? 'Hourglass is actively watching your guarded apps.'
        : 'Time limits are paused for now.'
    );
  };

  const handleToggleApp = (id: string) => {
    BlockerEngine.toggleAppBlock(id);
  };

  const handleRemoveApp = (id: string, name: string) => {
    Alert.alert(
      `Remove ${name}?`,
      `${name} will no longer be timed. You can add it back anytime with "+ Add App".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => BlockerEngine.removeAppFromMonitored(id),
        },
      ]
    );
  };

  const handleSelectMode = (mode: TrackingMode) => {
    BlockerEngine.setTrackingMode(mode);
    setModeModalVisible(false);
  };

  const handleClaimExtraTime = (packageName?: string, minutes = 2) => {
    if (isBedtime) {
      Alert.alert('Sleep Hours Active', 'Extra time is unavailable during Bedtime Lockdown.');
      return;
    }
    if (!state.frictionEnabled) {
      const result = BlockerEngine.claimFrictionGrace(packageName, minutes);
      if (result.success) {
        Alert.alert('Extra Time Added', result.message);
      } else {
        Alert.alert('Not Available', result.message);
      }
    } else {
      setFrictionTargetPkg(packageName);
      setFrictionInitialMinutes(minutes);
      setModalVisible(true);
    }
  };

  const handleOpenAlternative = () => {
    const pkg = state.positiveRedirectPackage;
    Linking.openURL(`market://details?id=${pkg}`).catch(() => {
      Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`).catch(() => {});
    });
  };

  const hasExtraOptions = state.extraTime2MinEnabled || state.extraTime5MinEnabled;
  const extraMinutesChoices = [
    ...(state.extraTime2MinEnabled ? [2] : []),
    ...(state.extraTime5MinEnabled ? [5] : []),
  ];

  // In cumulative mode, one shared grace flag applies.
  // In per-app mode, find any paused (or eligible) app that has NOT yet claimed extra time.
  const eligiblePerAppTarget = !isCumulative
    ? lockedApps.find((a) => !a.graceClaimed) || timedApps.find((a) => !a.graceClaimed)
    : undefined;

  const canOfferCumulativeGrace = isCumulative && !state.graceClaimedInCurrentBlock && !isBedtime && hasExtraOptions;
  const canOfferPerAppGrace = !isCumulative && !!eligiblePerAppTarget && !isBedtime && hasExtraOptions;
  const anyGraceAvailable = canOfferCumulativeGrace || canOfferPerAppGrace;

  const cycleLabel = state.windowMinutes === 120 ? '2-HOUR CYCLE' : '1-HOUR CYCLE';
  const strictnessLabel =
    state.strictnessLevel === 'fortress'
      ? 'Fortress'
      : state.strictnessLevel === 'disciplined'
      ? 'Disciplined'
      : 'Mindful';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconWrap}>
              <Image
                source={require('@/assets/images/hourglass_mint_icon_only_transparent.png')}
                style={styles.brandIcon}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.appTitle}>HOURGLASS</Text>
              <Text style={styles.appSubtitle}>Mindful limits for distracting apps</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.shieldStatusBadge, state.isShieldActive ? styles.shieldActive : styles.shieldPaused]}
            onPress={handleToggleShield}>
            <View style={[styles.liveDot, { backgroundColor: state.isShieldActive ? '#84E150' : '#F59E0B' }]} />
            <Text style={[styles.shieldStatusText, { color: state.isShieldActive ? '#2ED3A3' : '#F59E0B' }]}>
              {state.isShieldActive ? 'ACTIVE' : 'PAUSED'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Quick-Status Pills */}
        <View style={styles.summaryBar}>
          <TouchableOpacity
            style={styles.summaryPill}
            onPress={() => setModeModalVisible(true)}
            activeOpacity={0.75}>
            <MaterialIcons
              name={isCumulative ? 'layers' : 'splitscreen'}
              size={14}
              color={isCumulative ? '#2ED3A3' : '#84E150'}
            />
            <Text style={[styles.summaryPillText, { color: isCumulative ? '#2ED3A3' : '#84E150' }]}>
              {isCumulative ? 'Shared Pool' : 'Per-App'}
            </Text>
            <MaterialIcons name="expand-more" size={14} color="#6E7A75" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.summaryPill,
              {
                borderColor: activeProfile
                  ? activeProfile.id === 'bedtime'
                    ? '#3730A3'
                    : activeProfile.id === 'work'
                    ? '#1F5E4C'
                    : '#3C6E23'
                  : '#2C2C2C',
                backgroundColor: activeProfile
                  ? activeProfile.id === 'bedtime'
                    ? '#181730'
                    : activeProfile.id === 'work'
                    ? '#102822'
                    : '#1B2B14'
                  : '#1E1E1E',
              },
            ]}
            onPress={() => router.push('/(tabs)/rules')}
            activeOpacity={0.75}>
            <MaterialIcons
              name={
                activeProfile
                  ? activeProfile.id === 'bedtime'
                    ? 'nights-stay'
                    : activeProfile.id === 'work'
                    ? 'business-center'
                    : 'wb-twilight'
                  : 'schedule'
              }
              size={13}
              color={
                activeProfile
                  ? activeProfile.id === 'bedtime'
                    ? '#818CF8'
                    : activeProfile.id === 'work'
                    ? '#2ED3A3'
                    : '#84E150'
                  : '#A8B5B0'
              }
            />
            <Text
              style={[
                styles.summaryPillText,
                {
                  color: activeProfile
                    ? activeProfile.id === 'bedtime'
                      ? '#818CF8'
                      : activeProfile.id === 'work'
                      ? '#2ED3A3'
                      : '#84E150'
                    : '#A8B5B0',
                },
              ]}>
              {activeProfile ? activeProfile.name : 'Standard'}
            </Text>
            <MaterialIcons name="chevron-right" size={14} color="#6E7A75" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.summaryPill,
              {
                borderColor:
                  state.strictnessLevel === 'fortress'
                    ? '#F43F5E'
                    : state.strictnessLevel === 'disciplined'
                    ? '#3C6E23'
                    : '#1F5E4C',
              },
            ]}
            onPress={() => router.push('/(tabs)/rules')}
            activeOpacity={0.75}>
            <MaterialIcons
              name={
                state.strictnessLevel === 'fortress'
                  ? 'shield'
                  : state.strictnessLevel === 'disciplined'
                  ? 'security'
                  : 'self-improvement'
              }
              size={13}
              color={
                state.strictnessLevel === 'fortress'
                  ? '#F43F5E'
                  : state.strictnessLevel === 'disciplined'
                  ? '#84E150'
                  : '#2ED3A3'
              }
            />
            <Text
              style={[
                styles.summaryPillText,
                {
                  color:
                    state.strictnessLevel === 'fortress'
                      ? '#F43F5E'
                      : state.strictnessLevel === 'disciplined'
                      ? '#84E150'
                      : '#2ED3A3',
                },
              ]}>
              {strictnessLabel}
            </Text>
            <MaterialIcons name="chevron-right" size={14} color="#6E7A75" />
          </TouchableOpacity>
        </View>

        {/* Bedtime Lockdown Banner */}
        {activeProfile?.id === 'bedtime' && (
          <View style={styles.bedtimeBanner}>
            <MaterialIcons name="nights-stay" size={20} color="#818CF8" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bedtimeBannerTitle}>Bedtime Lockdown Active</Text>
              <Text style={styles.bedtimeBannerDesc}>
                Protected sleep hours are active. Your guarded apps stay paused until morning.
              </Text>
            </View>
          </View>
        )}

        {/* Main Gauge Card */}
        <View style={[styles.card, isLocked ? styles.cardLocked : null]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {isCumulative ? cycleLabel : `PER-APP TIMERS (${timedAppsCount} ACTIVE)`}
            </Text>
            <Text style={styles.cardHeaderExtra}>
              {isCumulative
                ? isLocked
                  ? `Unlocks in ${windowRemainingMinutes}m ${windowRemainingSecsRemainder}s`
                  : `Resets in ${windowRemainingMinutes} min`
                : `${lockedAppsCount} of ${timedAppsCount} paused`}
            </Text>
          </View>

          {isCumulative ? (
            <>
              <View style={styles.timerCircle}>
                <Text style={[styles.timerValue, isLocked ? styles.timerLockedValue : null]}>
                  {isLocked
                    ? `${String(windowRemainingMinutes).padStart(2, '0')}:${String(windowRemainingSecsRemainder).padStart(2, '0')}`
                    : `${String(remainingMinutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`}
                </Text>
                <Text style={styles.timerLabel}>
                  {isLocked ? 'UNLOCKS IN' : 'TIME LEFT'}
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(
                        100,
                        totalAllowanceSeconds > 0
                          ? (remainingAllowanceSeconds / totalAllowanceSeconds) * 100
                          : 0
                      )}%`,
                      backgroundColor: isLocked ? '#F43F5E' : '#84E150',
                    },
                  ]}
                />
              </View>

              <View style={styles.statRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{state.allowanceMinutes}m</Text>
                  <Text style={styles.statLabel}>Limit</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{Math.floor(state.usedSecondsInBlock / 60)}m</Text>
                  <Text style={styles.statLabel}>Used</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>
                    {state.graceClaimedInCurrentBlock ? 'Used' : 'Available'}
                  </Text>
                  <Text style={styles.statLabel}>Extra Time</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.timerCircle}>
                <Text style={[styles.timerValue, lockedAppsCount > 0 ? styles.timerPerAppAlert : null]}>
                  {lockedAppsCount > 0 ? `${lockedAppsCount} PAUSED` : `${state.allowanceMinutes} MIN EACH`}
                </Text>
                <Text style={styles.timerLabel}>
                  {state.windowMinutes === 120 ? 'PER 2-HOUR CYCLE' : 'PER 1-HOUR CYCLE'}
                </Text>
              </View>

              <Text style={styles.perAppSubtitle}>
                Each app gets its own {state.allowanceMinutes}-minute timer every{' '}
                {state.windowMinutes === 120 ? '2 hours' : 'hour'}.
              </Text>

              <View style={styles.statRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{state.allowanceMinutes}m</Text>
                  <Text style={styles.statLabel}>Per App</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{state.windowMinutes === 120 ? '2h' : '1h'}</Text>
                  <Text style={styles.statLabel}>Cycle</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{timedAppsCount - lockedAppsCount}</Text>
                  <Text style={styles.statLabel}>Open</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Lock Notice + Smart Positive Alternative CTA */}
        {isLocked ? (
          <View style={styles.lockNoticeBox}>
            {activeAlt?.iconUri ? (
              <Image source={{ uri: activeAlt.iconUri }} style={styles.altNoticeIcon} />
            ) : (
              <MaterialIcons name="hourglass-empty" size={24} color="#F43F5E" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.lockNoticeTitle}>
                {isCumulative
                  ? "Time's Up for This Cycle"
                  : `${resolveAppName(lockedApps[0]?.packageName, lockedApps[0]?.name)} Paused`}
              </Text>
              <Text style={styles.lockNoticeBody}>
                {isCumulative
                  ? `Your guarded apps reopen in ${windowRemainingMinutes}m ${windowRemainingSecsRemainder}s.`
                  : 'Try switching to a productive alternative instead.'}
              </Text>
              <TouchableOpacity style={styles.positiveRedirectDashBtn} onPress={handleOpenAlternative}>
                <MaterialIcons name={(activeAlt?.iconName as any) || 'school'} size={15} color="#84E150" />
                <Text style={styles.positiveRedirectDashText}>
                  {activeAlt?.installed === false
                    ? `Get ${state.positiveRedirectAppName} on Play Store`
                    : `Open ${state.positiveRedirectAppName} Instead`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Extra Time CTA — Only shown as actionable when extra time has NOT already been used */}
        {anyGraceAvailable ? (
          <View style={styles.graceRow}>
            {extraMinutesChoices.map((mins) => {
              const targetPkg = eligiblePerAppTarget?.packageName;
              const targetName = targetPkg ? resolveAppName(targetPkg, eligiblePerAppTarget?.name) : null;
              return (
                <TouchableOpacity
                  key={mins}
                  style={styles.graceButton}
                  onPress={() => handleClaimExtraTime(targetPkg, mins)}>
                  <MaterialIcons
                    name={state.frictionEnabled ? 'psychology' : 'bolt'}
                    size={18}
                    color="#101A17"
                  />
                  <Text style={styles.graceButtonText}>
                    {extraMinutesChoices.length > 1
                      ? `+${mins} Min${targetName && lockedAppsCount > 0 ? ` (${targetName})` : ''}`
                      : `Need ${mins} More Minutes?`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.graceUsedBanner}>
            <MaterialIcons
              name={isBedtime ? 'nights-stay' : 'hourglass-disabled'}
              size={16}
              color="#6E7A75"
            />
            <Text style={styles.graceUsedText}>
              {isBedtime
                ? 'Sleep hours active — extra time unavailable until morning'
                : 'Extra time already used for this cycle'}
            </Text>
          </View>
        )}

        {/* Curated Guarded Apps Card */}
        <View style={styles.card}>
          <View style={styles.guardedHeaderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.cardTitle}>GUARDED APPS ({timedAppsCount})</Text>
              <Text style={styles.cardSubtitleText}>
                Only these apps count toward your time limit.
              </Text>
            </View>
            <TouchableOpacity style={styles.addAppBtn} onPress={() => setAddModalVisible(true)}>
              <MaterialIcons name="add" size={16} color="#101A17" />
              <Text style={styles.addAppBtnText}>Add App</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.appList}>
            {state.monitoredApps.map((app) => {
              const isTimed = app.blocked;
              const friendlyName = resolveAppName(app.packageName, app.name);
              const appRem = app.remainingSeconds ?? totalAllowanceSeconds;
              const appRemMins = Math.floor(appRem / 60);
              const appRemSecs = appRem % 60;
              const appWindowRem = app.windowRemainingSeconds ?? 0;
              const appWinMins = Math.floor(appWindowRem / 60);
              const appIsLocked = isTimed && (app.isLocked ?? appRem <= 0);
              const appGraceClaimed = app.graceClaimed ?? false;
              const brandColor = APP_BRAND_COLORS[app.packageName] || '#2ED3A3';
              const showInlineExtraBtns =
                !isCumulative &&
                isTimed &&
                !isBedtime &&
                hasExtraOptions &&
                !appGraceClaimed &&
                (appIsLocked || appRem <= 120);

              const effectiveTotalSecs =
                totalAllowanceSeconds + ((app.graceMinutesGranted || 0) * 60);
              const percentUsed =
                effectiveTotalSecs > 0
                  ? Math.min(100, Math.max(0, ((effectiveTotalSecs - appRem) / effectiveTotalSecs) * 100))
                  : 100;

              return (
                <View key={app.id} style={[styles.appCardRow, !isTimed && styles.appCardRowDisabled]}>
                  <View style={styles.appRowTop}>
                    {app.icon ? (
                      <Image
                        source={{ uri: app.icon }}
                        style={[styles.appIconImage, !isTimed && styles.appIconMuted]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.appIconCircle,
                          { borderColor: `${brandColor}55`, backgroundColor: `${brandColor}18` },
                          !isTimed && styles.appIconCircleMuted,
                        ]}>
                        <Text
                          style={[
                            styles.appIconLetter,
                            { color: brandColor === '#FFFFFF' ? '#2ED3A3' : brandColor },
                            !isTimed && styles.appIconLetterMuted,
                          ]}>
                          {friendlyName[0]}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.appName, !isTimed && styles.appNameMuted]}>
                          {friendlyName}
                        </Text>
                        {isTimed ? (
                          !isCumulative ? (
                            <View
                              style={[
                                styles.appStatusBadge,
                                appIsLocked ? styles.appStatusBadgeLocked : styles.appStatusBadgeOpen,
                              ]}>
                              <Text
                                style={[
                                  styles.appStatusText,
                                  appIsLocked && { color: '#FDA4AF' },
                                ]}>
                                {appIsLocked ? `Paused • ${appWinMins}m` : `${appRemMins}m ${appRemSecs}s left`}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.appStatusBadgeTimed}>
                              <Text style={styles.appStatusTimedText}>Guarded</Text>
                            </View>
                          )
                        ) : (
                          <View style={styles.appStatusBadgeExempt}>
                            <Text style={styles.appStatusExemptText}>Allowed</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Switch
                      value={isTimed}
                      onValueChange={() => handleToggleApp(app.id)}
                      trackColor={{ false: '#2C2C2C', true: '#1F5E4C' }}
                      thumbColor={isTimed ? '#2ED3A3' : '#6E7A75'}
                    />
                    <TouchableOpacity
                      style={styles.removeAppBtn}
                      onPress={() => handleRemoveApp(app.id, friendlyName)}>
                      <MaterialIcons name="close" size={16} color="#6E7A75" />
                    </TouchableOpacity>
                  </View>

                  {!isCumulative && isTimed && (
                    <View style={styles.miniProgressContainer}>
                      <View
                        style={[
                          styles.miniProgressBar,
                          {
                            width: `${100 - percentUsed}%`,
                            backgroundColor: appIsLocked ? '#F43F5E' : '#84E150',
                          },
                        ]}
                      />
                    </View>
                  )}

                  {showInlineExtraBtns && (
                    <View style={styles.inlineExtraRow}>
                      <Text style={styles.inlineExtraLabel}>Extra time:</Text>
                      <View style={styles.inlineExtraBtns}>
                        {extraMinutesChoices.map((mins) => (
                          <TouchableOpacity
                            key={mins}
                            style={styles.inlineExtraBtn}
                            onPress={() => handleClaimExtraTime(app.packageName, mins)}>
                            <Text style={styles.inlineExtraBtnText}>+{mins}m</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {!isCumulative && isTimed && appIsLocked && appGraceClaimed && (
                    <Text style={styles.appGraceUsedLabel}>
                      Extra time already used this cycle
                    </Text>
                  )}
                </View>
              );
            })}

            {state.monitoredApps.length === 0 && (
              <TouchableOpacity style={styles.emptyAddCard} onPress={() => setAddModalVisible(true)}>
                <MaterialIcons name="add-circle-outline" size={24} color="#2ED3A3" />
                <Text style={styles.emptyText}>Tap "+ Add App" to pick apps to guard.</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Extra Time Friction Challenge Modal */}
      <FrictionChallengeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {}}
        targetPackageName={frictionTargetPkg}
        initialMinutes={frictionInitialMinutes}
      />

      {/* Searchable Installed Apps Picker Modal */}
      <AddAppModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        deviceApps={state.deviceApps || []}
        monitoredApps={state.monitoredApps}
      />

      {/* Quick Tracking Mode Switcher Modal */}
      <Modal
        visible={modeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModeModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModeModalVisible(false)}>
          <View style={styles.modeSheet}>
            <Text style={styles.modeSheetTitle}>How Should Time Be Counted?</Text>
            <TouchableOpacity
              style={[styles.modeOption, !isCumulative && styles.modeOptionActive]}
              onPress={() => handleSelectMode('per_app')}>
              <MaterialIcons name="splitscreen" size={20} color="#84E150" />
              <View style={{ flex: 1 }}>
                <Text style={styles.modeOptionTitle}>Separate App Timers (Default)</Text>
                <Text style={styles.modeOptionDesc}>
                  Each app gets its own {state.allowanceMinutes}-minute timer independently.
                </Text>
              </View>
              {!isCumulative && <MaterialIcons name="check-circle" size={20} color="#84E150" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeOption, isCumulative && styles.modeOptionActive]}
              onPress={() => handleSelectMode('cumulative')}>
              <MaterialIcons name="layers" size={20} color="#2ED3A3" />
              <View style={{ flex: 1 }}>
                <Text style={styles.modeOptionTitle}>Shared Pool</Text>
                <Text style={styles.modeOptionDesc}>
                  All guarded apps share one {state.allowanceMinutes}-minute timer.
                </Text>
              </View>
              {isCumulative && <MaterialIcons name="check-circle" size={20} color="#84E150" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
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
    marginBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  brandIcon: {
    width: 30,
    height: 30,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#A8B5B0',
    marginTop: 1,
  },
  shieldStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  shieldActive: {
    backgroundColor: '#102822',
    borderColor: '#2ED3A3',
  },
  shieldPaused: {
    backgroundColor: '#292012',
    borderColor: '#F59E0B',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  shieldStatusText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  summaryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  cardLocked: {
    borderColor: '#F43F5E',
    backgroundColor: '#221518',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  guardedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2ED3A3',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addAppBtnText: {
    color: '#101A17',
    fontSize: 12,
    fontWeight: '800',
  },
  cardTitle: {
    color: '#A8B5B0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardSubtitleText: {
    color: '#A8B5B0',
    fontSize: 11,
    marginTop: 2,
  },
  cardHeaderExtra: {
    color: '#2ED3A3',
    fontSize: 12,
    fontWeight: '600',
  },
  timerCircle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  timerValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#84E150',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  timerLockedValue: {
    color: '#F43F5E',
  },
  timerPerAppAlert: {
    color: '#F59E0B',
    fontSize: 32,
  },
  timerLabel: {
    color: '#A8B5B0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  perAppSubtitle: {
    color: '#A8B5B0',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#141414',
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
    borderTopColor: '#2C2C2C',
    paddingTop: 16,
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#A8B5B0',
    marginTop: 2,
  },
  lockNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#2B1419',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    gap: 12,
    alignItems: 'center',
  },
  altNoticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  lockNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F43F5E',
  },
  lockNoticeBody: {
    fontSize: 12,
    color: '#FDA4AF',
    marginTop: 2,
    lineHeight: 16,
  },
  graceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  graceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2ED3A3',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  graceButtonText: {
    color: '#101A17',
    fontWeight: '800',
    fontSize: 13,
  },
  graceUsedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E1E1E',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  graceUsedText: {
    color: '#6E7A75',
    fontSize: 12,
    fontWeight: '600',
  },
  appList: {
    gap: 10,
  },
  appCardRow: {
    backgroundColor: '#181818',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  appCardRowDisabled: {
    opacity: 0.72,
    backgroundColor: '#141414',
  },
  appRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appIconImage: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  appIconMuted: {
    opacity: 0.5,
  },
  appIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconCircleMuted: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2C',
  },
  appIconLetter: {
    fontWeight: '900',
    fontSize: 16,
  },
  appIconLetterMuted: {
    color: '#6E7A75',
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appNameMuted: {
    color: '#A8B5B0',
  },
  removeAppBtn: {
    padding: 4,
    marginLeft: 2,
  },
  appStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  appStatusBadgeOpen: {
    backgroundColor: '#102822',
    borderWidth: 1,
    borderColor: '#1F5E4C',
  },
  appStatusBadgeLocked: {
    backgroundColor: '#7F1D1D',
  },
  appStatusBadgeTimed: {
    backgroundColor: '#102822',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1F5E4C',
  },
  appStatusBadgeExempt: {
    backgroundColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appStatusText: {
    color: '#2ED3A3',
    fontSize: 10,
    fontWeight: '700',
  },
  appStatusTimedText: {
    color: '#2ED3A3',
    fontSize: 10,
    fontWeight: '700',
  },
  appStatusExemptText: {
    color: '#A8B5B0',
    fontSize: 10,
    fontWeight: '600',
  },
  miniProgressContainer: {
    height: 4,
    backgroundColor: '#141414',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  miniProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  inlineExtraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242424',
  },
  inlineExtraLabel: {
    fontSize: 11,
    color: '#A8B5B0',
    fontWeight: '600',
  },
  inlineExtraBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineExtraBtn: {
    backgroundColor: '#102822',
    borderWidth: 1,
    borderColor: '#2ED3A3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inlineExtraBtnText: {
    color: '#2ED3A3',
    fontSize: 11,
    fontWeight: '800',
  },
  appGraceUsedLabel: {
    fontSize: 11,
    color: '#6E7A75',
    marginTop: 8,
  },
  emptyAddCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    color: '#A8B5B0',
    fontSize: 12,
    textAlign: 'center',
  },
  positiveRedirectDashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#102822',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1F5E4C',
  },
  positiveRedirectDashText: {
    color: '#84E150',
    fontSize: 12,
    fontWeight: '700',
  },
  bedtimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#181730',
    borderWidth: 1,
    borderColor: '#3730A3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bedtimeBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C7D2FE',
  },
  bedtimeBannerDesc: {
    fontSize: 11,
    color: '#818CF8',
    marginTop: 2,
    lineHeight: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 11, 0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modeSheet: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    gap: 10,
  },
  modeSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141414',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  modeOptionActive: {
    borderColor: '#2ED3A3',
    backgroundColor: '#102822',
  },
  modeOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modeOptionDesc: {
    fontSize: 11,
    color: '#A8B5B0',
    marginTop: 2,
    lineHeight: 15,
  },
});
