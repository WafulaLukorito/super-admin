import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  Modal,
  TextInput,
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
import { APP_BRAND_COLORS, resolveAppName } from '@/constants/appCatalog';

export default function RulesScreen() {
  const [state, setState] = useState<BlockerState>(BlockerEngine.getState());
  const [breatheModalVisible, setBreatheModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [altModalVisible, setAltModalVisible] = useState(false);
  const [altSearch, setAltSearch] = useState('');
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
          onPress: () => BlockerEngine.resetProfilesToDefault(),
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
  };

  const handleAdjustBaselineAllowance = (delta: number) => {
    const win: 60 | 120 = state.baselineWindowMinutes === 120 ? 120 : 60;
    const current = state.baselineAllowanceMinutes;
    BlockerEngine.setCustomAllowance(win, current + delta);
  };

  const handlePickBaselineAllowance = (mins: number) => {
    const win: 60 | 120 = state.baselineWindowMinutes === 120 ? 120 : 60;
    BlockerEngine.setCustomAllowance(win, mins);
  };

  const handleSelectMode = (mode: TrackingMode) => {
    BlockerEngine.setTrackingMode(mode);
  };

  const handleToggleExtraOption = (which: '2' | '5') => {
    const next2 = which === '2' ? !state.extraTime2MinEnabled : state.extraTime2MinEnabled;
    const next5 = which === '5' ? !state.extraTime5MinEnabled : state.extraTime5MinEnabled;
    if (!next2 && !next5) {
      Alert.alert('Extra Time Disabled', 'Extra time options will be hidden from notifications and lock screens.');
    }
    BlockerEngine.setExtraTimeOptions(next2, next5);
  };

  const handleToggleFriction = (enabled: boolean) => {
    BlockerEngine.setFrictionEnabled(enabled);
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
            ? '\n\nVisit the Setup tab to turn on Instant Lock and Uninstall Protection.'
            : ''
        }`
      );
    }
  };

  const handleToggleBreathe = (enabled: boolean) => {
    BlockerEngine.setBreatheEnabled(enabled);
  };

  const handleToggleSounds = (enabled: boolean) => {
    BlockerEngine.setSoundEnabled(enabled);
  };

  const handleSelectPositiveRedirect = (pkg: string, name: string) => {
    BlockerEngine.setPositiveRedirect(pkg, name);
    setAltModalVisible(false);
  };

  const handleSelectAutoRedirect = () => {
    BlockerEngine.setPositiveRedirectAuto();
    setAltModalVisible(false);
  };

  const guardedApps = state.monitoredApps.filter((a) => a.blocked);
  const is1hCycle = state.baselineWindowMinutes === 60;
  const is2hCycle = state.baselineWindowMinutes === 120;

  const alternatives = state.positiveAlternatives || [];
  const selectedAlt =
    alternatives.find((a) => a.packageName === state.positiveRedirectPackage) || alternatives[0];

  const sortedAlternativesForDisplay = useMemo(() => {
    // Installed alternatives sorted by rank first (Duolingo #1, Substack #2, ...), then uninstalled by rank
    return [...alternatives].sort((a, b) => {
      if (!!a.installed !== !!b.installed) {
        return a.installed ? -1 : 1;
      }
      return a.rank - b.rank;
    });
  }, [alternatives]);

  const filteredModalAlternatives = useMemo(() => {
    const q = altSearch.trim().toLowerCase();
    return sortedAlternativesForDisplay.filter((alt) => {
      if (!q) return true;
      return (
        alt.name.toLowerCase().includes(q) ||
        alt.category.toLowerCase().includes(q) ||
        alt.description.toLowerCase().includes(q)
      );
    });
  }, [sortedAlternativesForDisplay, altSearch]);

  const quickPresets = is2hCycle ? [15, 20, 30, 45, 60] : [5, 10, 15, 20, 30];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RULES & SCHEDULES</Text>
          <Text style={styles.subtitle}>Customize your daily routines and time limits</Text>
        </View>

        {/* Default Cycle Limit (User Adjustable) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>DEFAULT CYCLE LIMIT</Text>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                {state.baselineAllowanceMinutes}m / {state.baselineWindowMinutes === 120 ? '2h' : '1h'}
              </Text>
            </View>
          </View>
          {state.profilesEnabled && state.activeProfileId && (
            <View style={styles.activeProfileNotice}>
              <MaterialIcons name="auto-awesome" size={14} color="#84E150" />
              <Text style={styles.activeProfileNoticeText}>
                {state.timeProfiles.find((p) => p.id === state.activeProfileId)?.name || 'Schedule'} is active now. This default applies outside scheduled hours.
              </Text>
            </View>
          )}
          <Text style={styles.cardExplainer}>
            Pick a cycle length and adjust your time allowance:
          </Text>

          <View style={styles.presetToggleRow}>
            <TouchableOpacity
              style={[styles.presetCard, is1hCycle && styles.presetCardActive]}
              onPress={() => handleSelectPreset('1h')}>
              <View style={styles.presetTop}>
                <MaterialIcons name="schedule" size={20} color={is1hCycle ? '#2ED3A3' : '#6E7A75'} />
                <View style={[styles.presetTag, is1hCycle && styles.presetTagActive]}>
                  <Text style={[styles.presetTagText, is1hCycle && styles.presetTagTextActive]}>
                    {state.oneHourAllowanceMinutes} MIN / HR
                  </Text>
                </View>
              </View>
              <Text style={styles.presetName}>1-Hour Cycle</Text>
              <Text style={styles.presetDetail}>Default: 15 min per hour.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetCard, is2hCycle && styles.presetCardActive]}
              onPress={() => handleSelectPreset('2h')}>
              <View style={styles.presetTop}>
                <MaterialIcons name="hourglass-bottom" size={20} color={is2hCycle ? '#2ED3A3' : '#6E7A75'} />
                <View style={[styles.presetTag, is2hCycle && styles.presetTagActive]}>
                  <Text style={[styles.presetTagText, is2hCycle && styles.presetTagTextActive]}>
                    {state.twoHourAllowanceMinutes} MIN / 2 HR
                  </Text>
                </View>
              </View>
              <Text style={styles.presetName}>2-Hour Cycle</Text>
              <Text style={styles.presetDetail}>Default: 30 min every 2h.</Text>
            </TouchableOpacity>
          </View>

          {/* User-Adjustable Allowance Controls */}
          <View style={styles.adjustLimitBox}>
            <View style={styles.adjustLimitHeader}>
              <Text style={styles.adjustLimitTitle}>
                ADJUST {is2hCycle ? '2-HOUR' : '1-HOUR'} LIMIT
              </Text>
              <View style={styles.adjustStepper}>
                <TouchableOpacity
                  style={styles.adjustStepBtn}
                  onPress={() => handleAdjustBaselineAllowance(-1)}>
                  <MaterialIcons name="remove" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.adjustStepVal}>{state.baselineAllowanceMinutes}m</Text>
                <TouchableOpacity
                  style={styles.adjustStepBtn}
                  onPress={() => handleAdjustBaselineAllowance(1)}>
                  <MaterialIcons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.chipsRow}>
              {quickPresets.map((mins) => {
                const selected = state.baselineAllowanceMinutes === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => handlePickBaselineAllowance(mins)}>
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{mins}m</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* How Time Is Counted */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>HOW TIME IS COUNTED</Text>
            <View
              style={[
                styles.currentBadge,
                state.trackingMode === 'per_app' ? styles.modeBadgePerApp : styles.modeBadgeCumul,
              ]}>
              <Text
                style={[
                  styles.currentBadgeText,
                  state.trackingMode === 'per_app' && { color: '#84E150' },
                ]}>
                {state.trackingMode === 'per_app' ? 'PER-APP' : 'SHARED POOL'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            Choose whether guarded apps track separately or share one combined timer:
          </Text>

          <TouchableOpacity
            style={[styles.modeCard, state.trackingMode === 'per_app' && styles.modeCardActive]}
            onPress={() => handleSelectMode('per_app')}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons
                  name="splitscreen"
                  size={20}
                  color={state.trackingMode === 'per_app' ? '#2ED3A3' : '#A8B5B0'}
                />
                <Text style={styles.modeCardTitle}>Separate App Timers (Default)</Text>
              </View>
              <View style={[styles.radioCircle, state.trackingMode === 'per_app' && styles.radioCircleActive]}>
                {state.trackingMode === 'per_app' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Each app gets its own {state.allowanceMinutes}-minute limit. Finishing X does not reduce your time in Instagram.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, state.trackingMode === 'cumulative' && styles.modeCardActive]}
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
              <View
                style={[styles.radioCircle, state.trackingMode === 'cumulative' && styles.radioCircleActive]}>
                {state.trackingMode === 'cumulative' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              All guarded apps share one {state.allowanceMinutes}-minute timer. When time runs out, they pause together.
            </Text>
          </TouchableOpacity>
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
              <TouchableOpacity style={styles.resetProfilesBtn} onPress={handleResetProfiles}>
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
                              ? isBedtime
                                ? '#C7D2FE'
                                : '#101A17'
                              : profile.enabled
                              ? '#2ED3A3'
                              : '#6E7A75'
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
                      <MaterialIcons name="schedule" size={12} color="#A8B5B0" />
                      <Text style={styles.profileSummaryText}>
                        {formatProfileTime(profile.startHour, profile.startMinute)} – {formatProfileTime(profile.endHour, profile.endMinute)}
                      </Text>
                    </View>
                    <View style={styles.profileSummaryItem}>
                      <MaterialIcons name="timelapse" size={12} color="#A8B5B0" />
                      <Text style={styles.profileSummaryText}>
                        {profile.allowanceMinutes === 0 ? 'Locked' : `${profile.allowanceMinutes}m / ${profile.windowMinutes}m`}
                      </Text>
                    </View>
                    <View style={styles.profileSummaryItem}>
                      <MaterialIcons name="security" size={12} color="#A8B5B0" />
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
                          { label: '5m', val: 5 },
                          { label: '10m', val: 10 },
                          { label: '15m', val: 15 },
                          { label: '20m', val: 20 },
                          { label: '30m', val: 30 },
                          { label: '45m', val: 45 },
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
            style={[styles.modeCard, state.strictnessLevel === 'mindful' && styles.modeCardActive]}
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
            style={[styles.modeCard, state.strictnessLevel === 'disciplined' && styles.modeCardActive]}
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
              <View
                style={[styles.radioCircle, state.strictnessLevel === 'disciplined' && styles.radioCircleActive]}>
                {state.strictnessLevel === 'disciplined' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Keeps limits locked once time runs out and blocks Android Settings during lockouts.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, state.strictnessLevel === 'fortress' && styles.modeCardActiveFortress]}
            onPress={() => handleSelectStrictness('fortress')}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons
                  name="shield"
                  size={20}
                  color={state.strictnessLevel === 'fortress' ? '#F43F5E' : '#A8B5B0'}
                />
                <Text
                  style={[styles.modeCardTitle, state.strictnessLevel === 'fortress' && { color: '#F43F5E' }]}>
                  Fortress
                </Text>
              </View>
              <View
                style={[
                  styles.radioCircle,
                  state.strictnessLevel === 'fortress' && styles.radioCircleActiveFortress,
                ]}>
                {state.strictnessLevel === 'fortress' && (
                  <View style={[styles.radioDot, { backgroundColor: '#F43F5E' }]} />
                )}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Maximum protection: instant lockouts, blocks Settings, and prevents uninstalling while active.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Extra Time & Sticky Notifications */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>EXTRA TIME & NOTIFICATIONS</Text>
            <View
              style={[
                styles.currentBadge,
                state.frictionEnabled ? styles.modeBadgeCumul : styles.currentBadgeDirect,
              ]}>
              <Text style={styles.currentBadgeText}>
                {state.frictionEnabled ? 'CHALLENGE' : 'INSTANT'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            Sticky alerts pop up at the top at 2 min and 1 min left so you can add time without leaving your app:
          </Text>

          <Text style={styles.frictionSubSection}>OFFERED EXTRA TIME OPTIONS</Text>
          <View style={styles.extraOptionsRow}>
            <TouchableOpacity
              style={[styles.extraOptionTile, state.extraTime2MinEnabled && styles.extraOptionTileActive]}
              onPress={() => handleToggleExtraOption('2')}>
              <MaterialIcons
                name={state.extraTime2MinEnabled ? 'check-box' : 'check-box-outline-blank'}
                size={18}
                color={state.extraTime2MinEnabled ? '#2ED3A3' : '#6E7A75'}
              />
              <View>
                <Text style={styles.extraOptionTitle}>+2 Minutes</Text>
                <Text style={styles.extraOptionSub}>Quick wrap-up</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.extraOptionTile, state.extraTime5MinEnabled && styles.extraOptionTileActive]}
              onPress={() => handleToggleExtraOption('5')}>
              <MaterialIcons
                name={state.extraTime5MinEnabled ? 'check-box' : 'check-box-outline-blank'}
                size={18}
                color={state.extraTime5MinEnabled ? '#84E150' : '#6E7A75'}
              />
              <View>
                <Text style={styles.extraOptionTitle}>+5 Minutes</Text>
                <Text style={styles.extraOptionSub}>Longer finish</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.modeCard, !state.frictionEnabled && styles.modeCardActive]}
            onPress={() => handleToggleFriction(false)}>
            <View style={styles.modeCardHeader}>
              <View style={styles.modeIconRow}>
                <MaterialIcons name="bolt" size={20} color={!state.frictionEnabled ? '#2ED3A3' : '#A8B5B0'} />
                <Text style={styles.modeCardTitle}>Instant Tap (No Challenge)</Text>
              </View>
              <View style={[styles.radioCircle, !state.frictionEnabled && styles.radioCircleActive]}>
                {!state.frictionEnabled && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Tapping "+2 Min" or "+5 Min" in the top notification adds extra time right inside the app.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, state.frictionEnabled && styles.modeCardActive]}
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
                  <Text
                    style={[
                      styles.challengeTypeBtnText,
                      state.frictionType === 'math' && styles.challengeTypeBtnTextActive,
                    ]}>
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
                  <Text
                    style={[
                      styles.challengeTypeBtnText,
                      state.frictionType === 'pledge' && styles.challengeTypeBtnTextActive,
                    ]}>
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
                  <Text
                    style={[
                      styles.challengeTypeBtnText,
                      state.frictionType === 'memory' && styles.challengeTypeBtnTextActive,
                    ]}>
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
                            <Text
                              style={[
                                styles.difficultyOptionTitle,
                                isActive && styles.difficultyOptionTitleActive,
                              ]}>
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

        {/* Mindful Habits & Sound Feedback */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>MINDFUL HABITS & SOUNDS</Text>
          </View>
          <Text style={styles.cardExplainer}>
            Calm audio cues and gentle nudges that help break autopilot scrolling:
          </Text>

          {/* Sounds Toggle */}
          <View style={styles.behavioralRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <MaterialIcons name="volume-up" size={18} color="#84E150" />
                <Text style={styles.behavioralTitle}>Audio Chimes</Text>
              </View>
              <Text style={styles.behavioralDesc}>
                Soft chimes for 2m/1m alerts, breathwork cues, pauses, and unlocked extra time.
              </Text>
              {state.soundEnabled && (
                <TouchableOpacity
                  style={styles.testSoundBtn}
                  onPress={() => BlockerEngine.playSound('warning')}>
                  <MaterialIcons name="music-note" size={14} color="#2ED3A3" />
                  <Text style={styles.testSoundText}>Test Chime</Text>
                </TouchableOpacity>
              )}
            </View>
            <Switch
              value={state.soundEnabled}
              onValueChange={handleToggleSounds}
              trackColor={{ false: '#2C2C2C', true: '#1F5E4C' }}
              thumbColor={state.soundEnabled ? '#2ED3A3' : '#6E7A75'}
            />
          </View>

          {/* Breathe Before Opening */}
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

          {/* Healthy Alternative Redirect (Smart Ranked Catalog) */}
          <View style={{ marginTop: 18 }}>
            <View style={styles.altSectionHeader}>
              <Text style={styles.frictionSubSection}>HEALTHY ALTERNATIVE</Text>
              <TouchableOpacity
                style={[
                  styles.autoPickBadge,
                  state.positiveRedirectMode === 'auto' && styles.autoPickBadgeActive,
                ]}
                onPress={handleSelectAutoRedirect}>
                <MaterialIcons
                  name="auto-awesome"
                  size={12}
                  color={state.positiveRedirectMode === 'auto' ? '#101A17' : '#2ED3A3'}
                />
                <Text
                  style={[
                    styles.autoPickText,
                    state.positiveRedirectMode === 'auto' && styles.autoPickTextActive,
                  ]}>
                  {state.positiveRedirectMode === 'auto' ? 'Auto-Prioritized' : 'Use Smart Pick'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.behavioralDesc}>
              Prioritizes Duolingo (#1), Substack (#2), and any alternatives already installed on your phone when a guarded app locks.
            </Text>

            {selectedAlt && (
              <View style={styles.selectedAltCard}>
                {selectedAlt.iconUri ? (
                  <Image source={{ uri: selectedAlt.iconUri }} style={styles.selectedAltIcon} />
                ) : (
                  <View
                    style={[
                      styles.selectedAltIconPlaceholder,
                      { backgroundColor: `${selectedAlt.accentColor}22`, borderColor: `${selectedAlt.accentColor}55` },
                    ]}>
                    <MaterialIcons name={selectedAlt.iconName as any} size={20} color={selectedAlt.accentColor} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.selectedAltTitle}>{selectedAlt.name}</Text>
                    <View
                      style={[
                        styles.installedBadge,
                        !selectedAlt.installed && styles.playStoreBadge,
                      ]}>
                      <Text
                        style={[
                          styles.installedBadgeText,
                          !selectedAlt.installed && styles.playStoreBadgeText,
                        ]}>
                        {selectedAlt.installed ? 'INSTALLED' : 'PLAY STORE'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.selectedAltCategory}>
                    {selectedAlt.category} • {selectedAlt.description}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.replacementGrid}>
              {sortedAlternativesForDisplay.slice(0, 4).map((item) => {
                const isSelected = state.positiveRedirectPackage === item.packageName;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.replacementTile, isSelected && styles.replacementTileActive]}
                    onPress={() => handleSelectPositiveRedirect(item.packageName, item.name)}>
                    {item.iconUri ? (
                      <Image source={{ uri: item.iconUri }} style={styles.replacementImg} />
                    ) : (
                      <MaterialIcons
                        name={item.iconName as any}
                        size={18}
                        color={isSelected ? '#2ED3A3' : item.accentColor}
                      />
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.replacementTileText,
                          isSelected && styles.replacementTileTextActive,
                        ]}>
                        {item.name}
                      </Text>
                      <Text style={styles.replacementMeta}>
                        {item.category} • {item.installed ? 'On phone' : 'Get app'}
                      </Text>
                    </View>
                    {isSelected && <MaterialIcons name="check" size={16} color="#84E150" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.browseAllAltBtn} onPress={() => setAltModalVisible(true)}>
              <MaterialIcons name="apps" size={16} color="#2ED3A3" />
              <Text style={styles.browseAllAltText}>
                Browse All {alternatives.length} Ranked Alternatives
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manage Guarded Apps */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.cardSection}>GUARDED APPS</Text>
              <Text style={styles.cardCounter}>Currently guarding {guardedApps.length} apps</Text>
            </View>
            <TouchableOpacity style={styles.manageAppsBtn} onPress={() => setAddModalVisible(true)}>
              <MaterialIcons name="add" size={16} color="#101A17" />
              <Text style={styles.manageAppsBtnText}>Add / Search</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.guardedIconStrip}>
            {guardedApps.slice(0, 6).map((app) => {
              const name = resolveAppName(app.packageName, app.name);
              const color = APP_BRAND_COLORS[app.packageName] || '#2ED3A3';
              return (
                <View key={app.id} style={styles.miniAppBadge}>
                  {app.icon ? (
                    <Image source={{ uri: app.icon }} style={styles.miniAppImg} />
                  ) : (
                    <View style={[styles.miniAppFallback, { backgroundColor: `${color}22` }]}>
                      <Text style={[styles.miniAppFallbackText, { color: color === '#FFFFFF' ? '#2ED3A3' : color }]}>
                        {name[0]}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.miniAppName} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
              );
            })}
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

      {/* Browse All 17 Ranked Healthy Alternatives Modal */}
      <Modal
        visible={altModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAltModalVisible(false)}>
        <View style={styles.altModalOverlay}>
          <View style={styles.altModalSheet}>
            <View style={styles.altModalHeader}>
              <View>
                <Text style={styles.altModalTitle}>Healthy Alternatives</Text>
                <Text style={styles.altModalSubtitle}>
                  Installed apps & top picks (Duolingo #1, Substack #2)
                </Text>
              </View>
              <TouchableOpacity style={styles.altModalCloseBtn} onPress={() => setAltModalVisible(false)}>
                <MaterialIcons name="close" size={20} color="#A8B5B0" />
              </TouchableOpacity>
            </View>

            <View style={styles.altSearchBox}>
              <MaterialIcons name="search" size={18} color="#6E7A75" />
              <TextInput
                style={styles.altSearchInput}
                placeholder="Search e.g. Substack, Duolingo, notes, books..."
                placeholderTextColor="#6E7A75"
                value={altSearch}
                onChangeText={setAltSearch}
              />
            </View>

            <TouchableOpacity style={styles.autoRowBtn} onPress={handleSelectAutoRedirect}>
              <MaterialIcons name="auto-awesome" size={18} color="#101A17" />
              <Text style={styles.autoRowBtnText}>
                Smart Auto-Pick (Prioritizes Duolingo → Installed → Play Store)
              </Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
              {filteredModalAlternatives.map((item) => {
                const isSelected = state.positiveRedirectPackage === item.packageName;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.altCatalogRow, isSelected && styles.altCatalogRowActive]}
                    onPress={() => handleSelectPositiveRedirect(item.packageName, item.name)}>
                    {item.iconUri ? (
                      <Image source={{ uri: item.iconUri }} style={styles.altCatalogImg} />
                    ) : (
                      <View
                        style={[
                          styles.altCatalogIconFallback,
                          { backgroundColor: `${item.accentColor}22`, borderColor: `${item.accentColor}44` },
                        ]}>
                        <MaterialIcons name={item.iconName as any} size={18} color={item.accentColor} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.altCatalogRank}>#{item.rank}</Text>
                        <Text style={styles.altCatalogName}>{item.name}</Text>
                        {item.installed ? (
                          <View style={styles.installedBadge}>
                            <Text style={styles.installedBadgeText}>INSTALLED</Text>
                          </View>
                        ) : (
                          <View style={styles.playStoreBadge}>
                            <Text style={styles.playStoreBadgeText}>GET APP</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.altCatalogCat}>{item.category}</Text>
                      <Text style={styles.altCatalogDesc}>{item.description}</Text>
                    </View>
                    {isSelected && <MaterialIcons name="check-circle" size={20} color="#84E150" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
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
  adjustLimitBox: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    marginTop: 12,
    gap: 10,
  },
  adjustLimitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustLimitTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A8B5B0',
    letterSpacing: 0.6,
  },
  adjustStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adjustStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  adjustStepVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#84E150',
    minWidth: 36,
    textAlign: 'center',
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
  guardedIconStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  miniAppBadge: {
    alignItems: 'center',
    width: 52,
    gap: 4,
  },
  miniAppImg: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  miniAppFallback: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAppFallbackText: {
    fontSize: 14,
    fontWeight: '800',
  },
  miniAppName: {
    fontSize: 10,
    color: '#A8B5B0',
    textAlign: 'center',
  },
  currentBadgeDirect: {
    borderColor: '#84E150',
  },
  extraOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  extraOptionTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  extraOptionTileActive: {
    borderColor: '#2ED3A3',
    backgroundColor: '#102822',
  },
  extraOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  extraOptionSub: {
    fontSize: 10,
    color: '#A8B5B0',
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
    paddingVertical: 12,
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
  testSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#102822',
    borderWidth: 1,
    borderColor: '#1F5E4C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
  },
  testSoundText: {
    color: '#2ED3A3',
    fontSize: 11,
    fontWeight: '700',
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
  altSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  autoPickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1F5E4C',
  },
  autoPickBadgeActive: {
    backgroundColor: '#84E150',
    borderColor: '#84E150',
  },
  autoPickText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2ED3A3',
  },
  autoPickTextActive: {
    color: '#101A17',
  },
  selectedAltCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#102822',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2ED3A3',
    marginTop: 10,
  },
  selectedAltIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  selectedAltIconPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAltTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectedAltCategory: {
    fontSize: 11,
    color: '#A8B5B0',
    marginTop: 2,
    lineHeight: 15,
  },
  installedBadge: {
    backgroundColor: '#102822',
    borderWidth: 1,
    borderColor: '#2ED3A3',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  installedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#84E150',
  },
  playStoreBadge: {
    backgroundColor: '#262626',
    borderColor: '#3B3B3B',
  },
  playStoreBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A8B5B0',
  },
  replacementGrid: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 10,
  },
  replacementTile: {
    flexDirection: 'row',
    alignItems: 'center',
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
  replacementImg: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  replacementTileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  replacementTileTextActive: {
    color: '#84E150',
  },
  replacementMeta: {
    fontSize: 10,
    color: '#6E7A75',
    marginTop: 1,
  },
  browseAllAltBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  browseAllAltText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2ED3A3',
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
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
    fontSize: 10.5,
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
  altModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 11, 0.85)',
    justifyContent: 'flex-end',
  },
  altModalSheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: '#2C2C2C',
  },
  altModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  altModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  altModalSubtitle: {
    fontSize: 12,
    color: '#A8B5B0',
    marginTop: 2,
  },
  altModalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#262626',
  },
  altSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    marginBottom: 10,
  },
  altSearchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  autoRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#84E150',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  autoRowBtnText: {
    color: '#101A17',
    fontSize: 11,
    fontWeight: '800',
  },
  altCatalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#141414',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  altCatalogRowActive: {
    borderColor: '#2ED3A3',
    backgroundColor: '#102822',
  },
  altCatalogImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  altCatalogIconFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altCatalogRank: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2ED3A3',
  },
  altCatalogName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  altCatalogCat: {
    fontSize: 10,
    color: '#2ED3A3',
    marginTop: 1,
    fontWeight: '600',
  },
  altCatalogDesc: {
    fontSize: 11,
    color: '#A8B5B0',
    marginTop: 2,
    lineHeight: 15,
  },
});
