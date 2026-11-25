import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  BlockerEngine,
  BlockerState,
  TrackingMode,
  FrictionType,
  MathDifficulty,
  StrictnessLevel,
  TimeProfile,
  formatProfileTime,
} from '@/services/blockerEngine';
import { BreatheModal } from '@/components/BreatheModal';
import { AddAppModal } from '@/components/AddAppModal';
import AppBlocker from '@/modules/app-blocker';

export default function RulesScreen() {
  const [state, setState] = useState<BlockerState>(BlockerEngine.getState());
  const [breatheModalVisible, setBreatheModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  useEffect(() => {
    BlockerEngine.init().then((s) => setState({ ...s }));
    const unsubscribe = BlockerEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  const handleToggleProfilesEnabled = (val: boolean) => {
    BlockerEngine.setProfilesEnabled(val);
    Alert.alert(
      val ? 'Daily Schedules On' : 'Daily Schedules Off',
      val
        ? 'Work Hours, Evening Wind-Down, and Bedtime Lockdown will adjust your limits automatically.'
        : 'Hourglass will use your default cycle limit all day.'
    );
  };

  const handleResetProfiles = () => {
    Alert.alert(
      'Reset Schedules?',
      'Restore Work Hours (9 AM – 5 PM), Evening Wind-Down (7 PM – 10 PM), and Bedtime Lockdown (11 PM – 6 AM)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            BlockerEngine.resetProfilesToDefault();
          },
        },
      ]
    );
  };

  const handleToggleProfile = (id: string) => {
    BlockerEngine.toggleTimeProfile(id);
  };

  const handleAdjustProfileHour = (profile: TimeProfile, type: 'start' | 'end', delta: number) => {
    if (type === 'start') {
      const nextHour = (profile.startHour + delta + 24) % 24;
      BlockerEngine.updateTimeProfile({ ...profile, startHour: nextHour });
    } else {
      const nextHour = (profile.endHour + delta + 24) % 24;
      BlockerEngine.updateTimeProfile({ ...profile, endHour: nextHour });
    }
  };

  const handleSetProfileAllowance = (profile: TimeProfile, mins: number) => {
    BlockerEngine.updateTimeProfile({ ...profile, allowanceMinutes: mins });
  };

  const handleSetProfileWindow = (profile: TimeProfile, win: number) => {
    BlockerEngine.updateTimeProfile({ ...profile, windowMinutes: win });
  };

  const handleSetProfileStrictness = (profile: TimeProfile, level: StrictnessLevel) => {
    BlockerEngine.updateTimeProfile({ ...profile, strictnessOverride: level });
  };

  const handleSelectPreset = (type: '1h' | '2h') => {
    BlockerEngine.setPreset(type);
    Alert.alert(
      'Default Limit Updated',
      type === '1h'
        ? '1-Hour Cycle: 7 minutes allowed per hour.'
        : '2-Hour Cycle: 15 minutes allowed every 2 hours.'
    );
  };

  const handleSelectMode = (mode: TrackingMode) => {
    BlockerEngine.setTrackingMode(mode);
    Alert.alert(
      'Timer Mode Updated',
      mode === 'per_app'
        ? 'Separate App Timers: Each app has its own timer. Reaching the limit in X will not affect Instagram.'
        : 'Shared Pool: All guarded apps share one combined timer.'
    );
  };

  const handleToggleFriction = (enabled: boolean) => {
    BlockerEngine.setFrictionEnabled(enabled);
    Alert.alert(
      enabled ? 'Quick Challenge On' : 'Instant Extra Time On',
      enabled
        ? 'Getting 2 extra minutes will require completing a quick check first.'
        : 'Tapping "+2 Min" adds extra time right away with no challenge.'
    );
  };

  const handleSelectFrictionType = (type: FrictionType) => {
    BlockerEngine.setFrictionType(type);
  };

  const handleSelectMathDifficulty = (diff: MathDifficulty) => {
    BlockerEngine.setMathDifficulty(diff);
  };

  const handleSelectStrictness = (level: StrictnessLevel) => {
    BlockerEngine.setStrictnessLevel(level);
    if (level === 'fortress') {
      const isAccessActive = AppBlocker.isAccessibilityServiceActive();
      const isAdminActive = AppBlocker.isDeviceAdminActive();
      Alert.alert(
        'Fortress Mode Active',
        `Maximum protection is on:\n\n• Instant app lockouts\n• Blocks Settings during lockouts\n• Uninstall protection${
          !isAccessActive || !isAdminActive
            ? '\n\nVisit the Setup tab to make sure Instant Lock and Uninstall Protection are turned on.'
            : ''
        }`
      );
    } else if (level === 'disciplined') {
      Alert.alert(
        'Disciplined Mode Active',
        'Limits stay locked once time runs out, and Android Settings is blocked during lockouts.'
      );
    } else {
      Alert.alert(
        'Mindful Mode Active',
        'Gentle limits with full flexibility to pause or adjust rules anytime.'
      );
    }
  };

  const handleToggleBreathe = (enabled: boolean) => {
    BlockerEngine.setBreatheEnabled(enabled);
  };

  const handleSelectPositiveRedirect = (pkg: string, name: string) => {
    BlockerEngine.setPositiveRedirect(pkg, name);
    Alert.alert('Healthy Alternative Saved', `When a guarded app locks, you can jump straight to ${name}.`);
  };

  const guardedCount = state.monitoredApps.filter((a) => a.blocked).length;
  const is1hPreset = state.baselineWindowMinutes === 60 && state.baselineAllowanceMinutes === 7;
  const is2hPreset = state.baselineWindowMinutes === 120 && state.baselineAllowanceMinutes === 15;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RULES & SCHEDULES</Text>
          <Text style={styles.subtitle}>Customize your daily routines and time limits</Text>
        </View>

        {/* Daily Schedules */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.cardSection}>DAILY SCHEDULES</Text>
              <Text style={styles.profileMasterSub}>
                Automatically adjust limits throughout your day
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={styles.resetProfilesBtn}
                onPress={handleResetProfiles}>
                <MaterialIcons name="restore" size={14} color="#A8B5B0" />
                <Text style={styles.resetProfilesBtnText}>Defaults</Text>
              </TouchableOpacity>
              <Switch
                value={state.profilesEnabled}
                onValueChange={handleToggleProfilesEnabled}
                trackColor={{ false: '#2C2C2C', true: '#1F5E4C' }}
                thumbColor={state.profilesEnabled ? '#2ED3A3' : '#6E7A75'}
              />
            </View>
          </View>

          <View style={{ gap: 12, marginTop: 10 }}>
            {state.timeProfiles.map((profile) => {
              const isActiveNow = state.profilesEnabled && state.activeProfileId === profile.id;
              const isExpanded = expandedProfileId === profile.id;
              const isBedtime = profile.id === 'bedtime';

              return (
                <View
                  key={profile.id}
                  style={[
                    styles.profileCard,
                    isActiveNow && (isBedtime ? styles.profileCardActiveBedtime : styles.profileCardActive),
                    !profile.enabled && styles.profileCardDisabled,
                  ]}>
                  <View style={styles.profileCardHeader}>
                    <View style={styles.profileCardTitleRow}>
                      <View
                        style={[
                          styles.profileIconWrap,
                          isActiveNow && (isBedtime ? styles.profileIconWrapBedtime : styles.profileIconWrapActive),
                        ]}>
                        <MaterialIcons
                          name={profile.icon as any}
                          size={20}
                          color={
                            isActiveNow
                              ? (isBedtime ? '#C7D2FE' : '#101A17')
                              : (profile.enabled ? '#2ED3A3' : '#6E7A75')
                          }
                        />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.profileName, !profile.enabled && styles.profileNameDisabled]}>
                            {profile.name}
                          </Text>
                          {isActiveNow && (
                            <View style={[styles.activePill, isBedtime && styles.activePillBedtime]}>
                              <Text style={[styles.activePillText, isBedtime && styles.activePillTextBedtime]}>
                                ACTIVE NOW
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.profileTagText}>{profile.tag}</Text>
                      </View>
                    </View>
                    <Switch
                      value={profile.enabled}
                      onValueChange={() => handleToggleProfile(profile.id)}
                      trackColor={{ false: '#2C2C2C', true: isBedtime ? '#4338CA' : '#1F5E4C' }}
                      thumbColor={profile.enabled ? (isBedtime ? '#818CF8' : '#2ED3A3') : '#6E7A75'}
                    />
                  </View>

                  <View style={styles.profileSummaryRow}>
                    <View style={styles.profileSummaryItem}>
                      <MaterialIcons name="schedule" size={13} color="#A8B5B0" />
                      <Text style={styles.profileSummaryText}>
                        {formatProfileTime(profile.startHour, profile.startMinute)} – {formatProfileTime(profile.endHour, profile.endMinute)}
                      </Text>
                    </View>
                    <View style={styles.profileSummaryItem}>
                      <MaterialIcons name="timelapse" size={13} color="#A8B5B0" />
                      <Text style={styles.profileSummaryText}>
                        {profile.allowanceMinutes === 0 ? 'Locked' : `${profile.allowanceMinutes}m / ${profile.windowMinutes}m`}
                      </Text>
                    </View>
                    <View style={styles.profileSummaryItem}>
                      <MaterialIcons name="security" size={13} color="#A8B5B0" />
                      <Text style={styles.profileSummaryText}>
                        {profile.strictnessOverride.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.customizeToggleBtn}
                    onPress={() => setExpandedProfileId(isExpanded ? null : profile.id)}>
                    <Text style={styles.customizeToggleBtnText}>
                      {isExpanded ? 'Hide Schedule Controls' : 'Edit Schedule'}
                    </Text>
                    <MaterialIcons
                      name={isExpanded ? 'expand-less' : 'expand-more'}
                      size={18}
                      color="#2ED3A3"
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.profileEditArea}>
                      <Text style={styles.editSectionTitle}>ACTIVE HOURS</Text>
                      <View style={styles.timeStepperRow}>
                        <View style={styles.stepperBox}>
                          <Text style={styles.stepperLabel}>START</Text>
                          <View style={styles.stepperControls}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleAdjustProfileHour(profile, 'start', -1)}>
                              <MaterialIcons name="remove" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Text style={styles.stepperValue}>
                              {formatProfileTime(profile.startHour, profile.startMinute)}
                            </Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleAdjustProfileHour(profile, 'start', 1)}>
                              <MaterialIcons name="add" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.stepperBox}>
                          <Text style={styles.stepperLabel}>END</Text>
                          <View style={styles.stepperControls}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleAdjustProfileHour(profile, 'end', -1)}>
                              <MaterialIcons name="remove" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Text style={styles.stepperValue}>
                              {formatProfileTime(profile.endHour, profile.endMinute)}
                            </Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleAdjustProfileHour(profile, 'end', 1)}>
                              <MaterialIcons name="add" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      <Text style={styles.editSectionTitle}>TIME ALLOWED</Text>
                      <View style={styles.chipsRow}>
                        {[
                          { label: '0m (Locked)', val: 0 },
                          { label: '3m', val: 3 },
                          { label: '5m', val: 5 },
                          { label: '7m', val: 7 },
                          { label: '10m', val: 10 },
                          { label: '15m', val: 15 },
                          { label: '20m', val: 20 },
                        ].map((opt) => {
                          const isSel = profile.allowanceMinutes === opt.val;
                          return (
                            <TouchableOpacity
                              key={opt.val}
                              style={[styles.chip, isSel && styles.chipActive]}
                              onPress={() => handleSetProfileAllowance(profile, opt.val)}>
                              <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={styles.editSectionTitle}>CYCLE LENGTH</Text>
                      <View style={styles.chipsRow}>
                        {[
                          { label: '1 Hour', val: 60 },
                          { label: '2 Hours', val: 120 },
                        ].map((opt) => {
                          const isSel = profile.windowMinutes === opt.val;
                          return (
                            <TouchableOpacity
                              key={opt.val}
                              style={[styles.chip, isSel && styles.chipActive]}
                              onPress={() => handleSetProfileWindow(profile, opt.val)}>
                              <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={styles.editSectionTitle}>PROTECTION STRENGTH</Text>
                      <View style={styles.chipsRow}>
                        {(['mindful', 'disciplined', 'fortress'] as StrictnessLevel[]).map((lvl) => {
                          const isSel = profile.strictnessOverride === lvl;
                          return (
                            <TouchableOpacity
                              key={lvl}
                              style={[
                                styles.chip,
                                isSel && (lvl === 'fortress' ? styles.chipActiveFortress : styles.chipActive),
                              ]}
                              onPress={() => handleSetProfileStrictness(profile, lvl)}>
                              <Text
                                style={[
                                  styles.chipText,
                                  isSel && (lvl === 'fortress' ? styles.chipTextActiveFortress : styles.chipTextActive),
                                ]}>
                                {lvl.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Default Cycle Limit */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>DEFAULT CYCLE LIMIT</Text>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                {state.baselineAllowanceMinutes}m / {state.baselineWindowMinutes}m
              </Text>
            </View>
          </View>
          {state.profilesEnabled && state.activeProfileId && (
            <View style={styles.activeProfileNotice}>
              <MaterialIcons name="auto-awesome" size={14} color="#84E150" />
              <Text style={styles.activeProfileNoticeText}>
                {state.timeProfiles.find((p) => p.id === state.activeProfileId)?.name || 'Schedule'} is active now. This default applies between scheduled hours.
              </Text>
            </View>
          )}
          <Text style={styles.cardExplainer}>
            Choose your standard time budget between scheduled routines:
          </Text>

          <View style={styles.presetToggleRow}>
            <TouchableOpacity
              style={[styles.presetCard, is1hPreset && styles.presetCardActive]}
              onPress={() => handleSelectPreset('1h')}>
              <View style={styles.presetTop}>
                <MaterialIcons
                  name="schedule"
                  size={20}
                  color={is1hPreset ? '#2ED3A3' : '#6E7A75'}
                />
                <View style={[styles.presetTag, is1hPreset && styles.presetTagActive]}>
                  <Text style={[styles.presetTagText, is1hPreset && styles.presetTagTextActive]}>
                    7 MIN / HR
                  </Text>
                </View>
              </View>
              <Text style={styles.presetName}>1-Hour Cycle</Text>
              <Text style={styles.presetDetail}>
                7 minutes allowed every hour.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetCard, is2hPreset && styles.presetCardActive]}
              onPress={() => handleSelectPreset('2h')}>
              <View style={styles.presetTop}>
                <MaterialIcons
                  name="hourglass-bottom"
                  size={20}
                  color={is2hPreset ? '#2ED3A3' : '#6E7A75'}
                />
                <View style={[styles.presetTag, is2hPreset && styles.presetTagActive]}>
                  <Text style={[styles.presetTagText, is2hPreset && styles.presetTagTextActive]}>
                    15 MIN / 2 HR
                  </Text>
                </View>
              </View>
              <Text style={styles.presetName}>2-Hour Cycle</Text>
              <Text style={styles.presetDetail}>
                15 minutes allowed every 2 hours.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How Time Is Counted */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>HOW TIME IS COUNTED</Text>
            <View style={[styles.currentBadge, state.trackingMode === 'per_app' ? styles.modeBadgePerApp : styles.modeBadgeCumul]}>
              <Text style={[styles.currentBadgeText, state.trackingMode === 'per_app' && { color: '#84E150' }]}>
                {state.trackingMode === 'per_app' ? 'PER-APP' : 'SHARED POOL'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            Decide whether guarded apps share one timer or run separately:
          </Text>

          <TouchableOpacity
            style={[
              styles.modeCard,
              state.trackingMode === 'cumulative' && styles.modeCardActive,
            ]}
            onPress={() => handleSelectMode('cumulative')}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons
                  name="layers"
                  size={20}
                  color={state.trackingMode === 'cumulative' ? '#2ED3A3' : '#A8B5B0'}
                />
                <Text style={styles.modeCardTitle}>Shared Pool</Text>
              </View>
              <View style={[styles.radioCircle, state.trackingMode === 'cumulative' && styles.radioCircleActive]}>
                {state.trackingMode === 'cumulative' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              All guarded apps share one {state.allowanceMinutes}-minute timer. When time runs out, they pause together.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              state.trackingMode === 'per_app' && styles.modeCardActive,
            ]}
            onPress={() => handleSelectMode('per_app')}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons
                  name="splitscreen"
                  size={20}
                  color={state.trackingMode === 'per_app' ? '#2ED3A3' : '#A8B5B0'}
                />
                <Text style={styles.modeCardTitle}>Separate App Timers</Text>
              </View>
              <View style={[styles.radioCircle, state.trackingMode === 'per_app' && styles.radioCircleActive]}>
                {state.trackingMode === 'per_app' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Each app gets its own {state.allowanceMinutes}-minute limit. Finishing X will not reduce your time in Instagram.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Protection Strength */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>PROTECTION STRENGTH</Text>
            <View
              style={[
                styles.currentBadge,
                state.strictnessLevel === 'fortress'
                  ? styles.modeBadgeFortress
                  : state.strictnessLevel === 'disciplined'
                  ? styles.modeBadgeDisciplined
                  : styles.modeBadgeCumul,
              ]}>
              <Text
                style={[
                  styles.currentBadgeText,
                  state.strictnessLevel === 'fortress'
                    ? { color: '#F43F5E' }
                    : state.strictnessLevel === 'disciplined'
                    ? { color: '#84E150' }
                    : null,
                ]}>
                {state.strictnessLevel.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            Choose how firmly Hourglass holds your limits when urges hit:
          </Text>

          <TouchableOpacity
            style={[
              styles.modeCard,
              state.strictnessLevel === 'mindful' && styles.modeCardActive,
            ]}
            onPress={() => handleSelectStrictness('mindful')}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons
                  name="self-improvement"
                  size={20}
                  color={state.strictnessLevel === 'mindful' ? '#2ED3A3' : '#A8B5B0'}
                />
                <Text style={styles.modeCardTitle}>Mindful</Text>
              </View>
              <View style={[styles.radioCircle, state.strictnessLevel === 'mindful' && styles.radioCircleActive]}>
                {state.strictnessLevel === 'mindful' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Gentle awareness. You can pause limits or adjust settings anytime.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              state.strictnessLevel === 'disciplined' && styles.modeCardActive,
            ]}
            onPress={() => handleSelectStrictness('disciplined')}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons
                  name="security"
                  size={20}
                  color={state.strictnessLevel === 'disciplined' ? '#2ED3A3' : '#A8B5B0'}
                />
                <Text style={styles.modeCardTitle}>Disciplined</Text>
              </View>
              <View style={[styles.radioCircle, state.strictnessLevel === 'disciplined' && styles.radioCircleActive]}>
                {state.strictnessLevel === 'disciplined' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Keeps limits locked once time runs out and blocks Android Settings during lockouts.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              state.strictnessLevel === 'fortress' && styles.modeCardActiveFortress,
            ]}
            onPress={() => handleSelectStrictness('fortress')}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons
                  name="shield"
                  size={20}
                  color={state.strictnessLevel === 'fortress' ? '#F43F5E' : '#A8B5B0'}
                />
                <Text style={[styles.modeCardTitle, state.strictnessLevel === 'fortress' && { color: '#F43F5E' }]}>
                  Fortress
                </Text>
              </View>
              <View style={[styles.radioCircle, state.strictnessLevel === 'fortress' && styles.radioCircleActiveFortress]}>
                {state.strictnessLevel === 'fortress' && <View style={[styles.radioDot, { backgroundColor: '#F43F5E' }]} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Maximum protection: instant lockouts, blocks Settings, and prevents uninstalling while active.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Extra Time (+2 Min) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>EXTRA TIME (+2 MIN)</Text>
            <View style={[styles.currentBadge, state.frictionEnabled ? styles.modeBadgeCumul : styles.currentBadgeDirect]}>
              <Text style={styles.currentBadgeText}>
                {state.frictionEnabled ? 'CHALLENGE' : 'INSTANT'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            When you have 2 minutes or 1 minute left, a notification offers 2 extra minutes. Choose how it unlocks:
          </Text>

          <TouchableOpacity
            style={[
              styles.modeCard,
              !state.frictionEnabled && styles.modeCardActive,
            ]}
            onPress={() => handleToggleFriction(false)}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons
                  name="bolt"
                  size={20}
                  color={!state.frictionEnabled ? '#2ED3A3' : '#A8B5B0'}
                />
                <Text style={styles.modeCardTitle}>Instant (+2 Min)</Text>
              </View>
              <View style={[styles.radioCircle, !state.frictionEnabled && styles.radioCircleActive]}>
                {!state.frictionEnabled && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              One tap adds 2 minutes right away with no puzzle or delay.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              state.frictionEnabled && styles.modeCardActive,
            ]}
            onPress={() => handleToggleFriction(true)}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons
                  name="psychology"
                  size={20}
                  color={state.frictionEnabled ? '#2ED3A3' : '#A8B5B0'}
                />
                <Text style={styles.modeCardTitle}>Quick Challenge</Text>
              </View>
              <View style={[styles.radioCircle, state.frictionEnabled && styles.radioCircleActive]}>
                {state.frictionEnabled && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Complete a brief puzzle or reflection first to make sure you really want extra time.
            </Text>
          </TouchableOpacity>

          {state.frictionEnabled && (
            <View style={styles.frictionSubCard}>
              <Text style={styles.frictionSubSection}>CHALLENGE TYPE</Text>
              <View style={styles.challengeTypeRow}>
                <TouchableOpacity
                  style={[styles.challengeTypeBtn, state.frictionType === 'math' && styles.challengeTypeBtnActive]}
                  onPress={() => handleSelectFrictionType('math')}>
                  <MaterialIcons
                    name="calculate"
                    size={16}
                    color={state.frictionType === 'math' ? '#101A17' : '#A8B5B0'}
                  />
                  <Text style={[styles.challengeTypeBtnText, state.frictionType === 'math' && styles.challengeTypeBtnTextActive]}>
                    Math
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.challengeTypeBtn, state.frictionType === 'pledge' && styles.challengeTypeBtnActive]}
                  onPress={() => handleSelectFrictionType('pledge')}>
                  <MaterialIcons
                    name="edit-note"
                    size={16}
                    color={state.frictionType === 'pledge' ? '#101A17' : '#A8B5B0'}
                  />
                  <Text style={[styles.challengeTypeBtnText, state.frictionType === 'pledge' && styles.challengeTypeBtnTextActive]}>
                    Pledge
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.challengeTypeBtn, state.frictionType === 'memory' && styles.challengeTypeBtnActive]}
                  onPress={() => handleSelectFrictionType('memory')}>
                  <MaterialIcons
                    name="psychology"
                    size={16}
                    color={state.frictionType === 'memory' ? '#101A17' : '#A8B5B0'}
                  />
                  <Text style={[styles.challengeTypeBtnText, state.frictionType === 'memory' && styles.challengeTypeBtnTextActive]}>
                    Recall
                  </Text>
                </TouchableOpacity>
              </View>

              {state.frictionType === 'math' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.frictionSubSection}>MATH DIFFICULTY</Text>
                  <View style={styles.difficultyCardsRow}>
                    {(['easy', 'medium', 'hard'] as MathDifficulty[]).map((d) => {
                      const isActive = state.mathDifficulty === d;
                      const subtitle =
                        d === 'easy'
                          ? 'Quick addition & subtraction (e.g. 8 + 7)'
                          : d === 'medium'
                          ? 'Multiplication & sums (e.g. 7 × 8)'
                          : 'Two-step math (e.g. (14 × 3) + 15)';

                      return (
                        <TouchableOpacity
                          key={d}
                          style={[styles.difficultyOptionCard, isActive && styles.difficultyOptionCardActive]}
                          onPress={() => handleSelectMathDifficulty(d)}>
                          <View style={styles.difficultyOptionTop}>
                            <Text style={[styles.difficultyOptionTitle, isActive && styles.difficultyOptionTitleActive]}>
                              {d.toUpperCase()}
                            </Text>
                            {isActive && <MaterialIcons name="check" size={14} color="#2ED3A3" />}
                          </View>
                          <Text style={styles.difficultyOptionDesc}>{subtitle}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Mindful Habits */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>MINDFUL HABITS</Text>
          </View>
          <Text style={styles.cardExplainer}>
            Small nudges that help break automatic scrolling:
          </Text>

          <View style={styles.behavioralRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <MaterialIcons name="air" size={18} color="#2ED3A3" />
                <Text style={styles.behavioralTitle}>Breathe Before Opening</Text>
              </View>
              <Text style={styles.behavioralDesc}>
                Shows a calm 10-second breathing pause when you open a guarded app.
              </Text>
            </View>
            <Switch
              value={state.breatheEnabled}
              onValueChange={handleToggleBreathe}
              trackColor={{ false: '#2C2C2C', true: '#1F5E4C' }}
              thumbColor={state.breatheEnabled ? '#2ED3A3' : '#6E7A75'}
            />
          </View>

          {state.breatheEnabled && (
            <TouchableOpacity
              style={styles.previewBreatheBtn}
              onPress={() => setBreatheModalVisible(true)}>
              <MaterialIcons name="play-circle-filled" size={16} color="#84E150" />
              <Text style={styles.previewBreatheText}>Preview Breathing Pause</Text>
            </TouchableOpacity>
          )}

          <View style={{ marginTop: 16 }}>
            <Text style={styles.frictionSubSection}>HEALTHY ALTERNATIVE</Text>
            <Text style={styles.behavioralDesc}>
              When a guarded app locks, show a 1-tap shortcut to open:
            </Text>

            <View style={styles.replacementGrid}>
              {[
                { name: 'Amazon Kindle', pkg: 'com.amazon.kindle', icon: 'menu-book' },
                { name: 'Google Keep Notes', pkg: 'com.google.android.keep', icon: 'edit-note' },
                { name: 'Duolingo', pkg: 'com.duolingo', icon: 'school' },
                { name: 'Hourglass Timer', pkg: 'com.jowaljones.superadmin', icon: 'hourglass-bottom' },
              ].map((item) => {
                const isSelected = state.positiveRedirectPackage === item.pkg;
                return (
                  <TouchableOpacity
                    key={item.pkg}
                    style={[styles.replacementTile, isSelected && styles.replacementTileActive]}
                    onPress={() => handleSelectPositiveRedirect(item.pkg, item.name)}>
                    <MaterialIcons
                      name={item.icon as any}
                      size={18}
                      color={isSelected ? '#2ED3A3' : '#A8B5B0'}
                    />
                    <Text style={[styles.replacementTileText, isSelected && styles.replacementTileTextActive]}>
                      {item.name}
                    </Text>
                    {isSelected && <MaterialIcons name="check" size={14} color="#84E150" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Manage Guarded Apps */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.cardSection}>GUARDED APPS</Text>
              <Text style={styles.cardCounter}>Currently guarding {guardedCount} apps</Text>
            </View>
            <TouchableOpacity
              style={styles.manageAppsBtn}
              onPress={() => setAddModalVisible(true)}>
              <MaterialIcons name="add" size={16} color="#101A17" />
              <Text style={styles.manageAppsBtnText}>Add / Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BreatheModal
        visible={breatheModalVisible}
        onClose={() => setBreatheModalVisible(false)}
        appName="Instagram"
      />

      <AddAppModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        deviceApps={state.deviceApps || []}
        monitoredApps={state.monitoredApps}
      />
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
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#A8B5B0',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardSection: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2ED3A3',
    letterSpacing: 1,
  },
  cardExplainer: {
    fontSize: 12,
    color: '#A8B5B0',
    marginBottom: 14,
    lineHeight: 17,
  },
  currentBadge: {
    backgroundColor: '#141414',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1F5E4C',
  },
  modeBadgePerApp: {
    borderColor: '#3C6E23',
  },
  modeBadgeCumul: {
    borderColor: '#2ED3A3',
  },
  currentBadgeText: {
    color: '#2ED3A3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  presetToggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  presetCard: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  presetCardActive: {
    borderColor: '#2ED3A3',
    backgroundColor: '#102822',
  },
  presetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetTag: {
    backgroundColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  presetTagActive: {
    backgroundColor: '#84E150',
  },
  presetTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A8B5B0',
  },
  presetTagTextActive: {
    color: '#101A17',
  },
  presetName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  presetDetail: {
    fontSize: 11,
    color: '#A8B5B0',
    lineHeight: 15,
  },
  modeCard: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    marginBottom: 10,
  },
  modeCardActive: {
    borderColor: '#2ED3A3',
    backgroundColor: '#102822',
  },
  modeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  modeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  modeCardDesc: {
    fontSize: 11,
    color: '#A8B5B0',
    lineHeight: 16,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#6E7A75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#2ED3A3',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#84E150',
  },
  cardCounter: {
    fontSize: 12,
    color: '#A8B5B0',
    marginTop: 2,
  },
  manageAppsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2ED3A3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageAppsBtnText: {
    color: '#101A17',
    fontSize: 12,
    fontWeight: '800',
  },
  currentBadgeDirect: {
    borderColor: '#84E150',
  },
  frictionSubCard: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    marginTop: 6,
  },
  frictionSubSection: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2ED3A3',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  challengeTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  challengeTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#262626',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  challengeTypeBtnActive: {
    backgroundColor: '#2ED3A3',
    borderColor: '#2ED3A3',
  },
  challengeTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A8B5B0',
  },
  challengeTypeBtnTextActive: {
    color: '#101A17',
    fontWeight: '800',
  },
  difficultyCardsRow: {
    flexDirection: 'column',
    gap: 6,
  },
  difficultyOptionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  difficultyOptionCardActive: {
    borderColor: '#2ED3A3',
    backgroundColor: '#102822',
  },
  difficultyOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  difficultyOptionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A8B5B0',
    letterSpacing: 0.5,
  },
  difficultyOptionTitleActive: {
    color: '#2ED3A3',
  },
  difficultyOptionDesc: {
    fontSize: 11,
    color: '#A8B5B0',
  },
  modeBadgeFortress: {
    borderColor: '#F43F5E',
  },
  modeBadgeDisciplined: {
    borderColor: '#84E150',
  },
  modeCardActiveFortress: {
    borderColor: '#F43F5E',
    backgroundColor: '#2B1419',
  },
  radioCircleActiveFortress: {
    borderColor: '#F43F5E',
  },
  behavioralRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  behavioralTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  behavioralDesc: {
    fontSize: 11,
    color: '#A8B5B0',
    lineHeight: 16,
    marginTop: 2,
  },
  previewBreatheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#102822',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F5E4C',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  previewBreatheText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#84E150',
  },
  replacementGrid: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 10,
  },
  replacementTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  replacementTileActive: {
    borderColor: '#2ED3A3',
    backgroundColor: '#102822',
  },
  replacementTileText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#A8B5B0',
    marginLeft: 10,
  },
  replacementTileTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  profileMasterSub: {
    fontSize: 11,
    color: '#A8B5B0',
    marginTop: 2,
  },
  resetProfilesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#262626',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  resetProfilesBtnText: {
    fontSize: 11,
    color: '#A8B5B0',
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  profileCardActive: {
    borderColor: '#2ED3A3',
    backgroundColor: '#102822',
  },
  profileCardActiveBedtime: {
    borderColor: '#818CF8',
    backgroundColor: '#181730',
  },
  profileCardDisabled: {
    opacity: 0.5,
  },
  profileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  profileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  profileIconWrapActive: {
    backgroundColor: '#2ED3A3',
  },
  profileIconWrapBedtime: {
    backgroundColor: '#4338CA',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileNameDisabled: {
    color: '#6E7A75',
  },
  profileTagText: {
    fontSize: 11,
    color: '#A8B5B0',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#84E150',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillBedtime: {
    backgroundColor: '#3730A3',
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#101A17',
    letterSpacing: 0.5,
  },
  activePillTextBedtime: {
    color: '#C7D2FE',
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  profileSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileSummaryText: {
    fontSize: 11,
    color: '#C8D3CF',
    fontWeight: '600',
  },
  customizeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 6,
  },
  customizeToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2ED3A3',
  },
  profileEditArea: {
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    paddingTop: 10,
    marginTop: 4,
    gap: 8,
  },
  editSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A8B5B0',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  timeStepperRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepperBox: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 8,
  },
  stepperLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A8B5B0',
    marginBottom: 4,
    textAlign: 'center',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#262626',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  chipActive: {
    borderColor: '#2ED3A3',
    backgroundColor: '#2ED3A3',
  },
  chipActiveFortress: {
    borderColor: '#F43F5E',
    backgroundColor: '#881337',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A8B5B0',
  },
  chipTextActive: {
    color: '#101A17',
    fontWeight: '800',
  },
  chipTextActiveFortress: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeProfileNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B2B14',
    borderWidth: 1,
    borderColor: '#3C6E23',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  activeProfileNoticeText: {
    fontSize: 11,
    color: '#84E150',
    fontWeight: '600',
    flex: 1,
  },
});
