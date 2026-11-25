import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  BlockerEngine,
  BlockerState,
  MonitoredApp,
  TrackingMode,
  FrictionType,
  MathDifficulty,
  StrictnessLevel,
  TimeProfile,
  formatProfileTime,
} from '@/services/blockerEngine';
import { BreatheModal } from '@/components/BreatheModal';
import AppBlocker from '@/modules/app-blocker';

export default function RulesScreen() {
  const [state, setState] = useState<BlockerState>(BlockerEngine.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'guarded' | 'poison' | 'game'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [breatheModalVisible, setBreatheModalVisible] = useState(false);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  const handleToggleProfilesEnabled = (val: boolean) => {
    BlockerEngine.setProfilesEnabled(val);
    Alert.alert(
      val ? 'Scheduled Profiles Enabled' : 'Scheduled Profiles Disabled',
      val
        ? 'Work Mode, Evening Wind-Down & Bedtime Lockdown dynamically govern windows based on current time of day.'
        : 'Rules have reverted to your manual baseline window configuration.'
    );
  };

  const handleResetProfiles = () => {
    Alert.alert(
      'Reset Profiles',
      'Restore Work Mode (9 AM – 5 PM), Evening Wind-Down (7 PM – 10 PM), and Bedtime Lockdown (11 PM – 6 AM) defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Defaults',
          style: 'destructive',
          onPress: () => {
            BlockerEngine.resetProfilesToDefault();
            Alert.alert('Profiles Reset', 'Smart context profiles restored to blanket defaults.');
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

  useEffect(() => {
    BlockerEngine.init().then((s) => setState(s));
    const unsubscribe = BlockerEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  const handleScanApps = async () => {
    setIsScanning(true);
    try {
      const updated = await BlockerEngine.loadInstalledAppsFromDevice();
      Alert.alert(
        'App Scan Complete',
        `Discovered ${updated.length} launchable apps on your device.`
      );
    } catch (e) {
      Alert.alert('Scan Failed', 'Could not query installed applications.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPreset = (type: '1h' | '2h') => {
    BlockerEngine.setPreset(type);
    const win = type === '1h' ? 60 : 120;
    const all = type === '1h' ? 7 : 15;
    Alert.alert(
      'Window Preset Activated',
      `${type === '1h' ? '1 Hour' : '2 Hours'} Window: ${all}m allowance per ${win}m rolling block.`
    );
  };

  const handleSelectMode = (mode: TrackingMode) => {
    BlockerEngine.setTrackingMode(mode);
    Alert.alert(
      'Enforcement Mode Updated',
      mode === 'per_app'
        ? 'Per-App Isolated Mode: Each app has its own separate timer and window. Using Twitter will not count against Instagram.'
        : 'Cumulative Shared Pool: All guarded apps share a combined allowance pool. Reaching limit locks all guarded apps.'
    );
  };

  const handleToggleFriction = (enabled: boolean) => {
    BlockerEngine.setFrictionEnabled(enabled);
    Alert.alert(
      enabled ? 'Cognitive Friction Gate Enabled' : 'Direct Extension Mode Activated',
      enabled
        ? `Grace extensions require completing a ${state.frictionType} challenge.`
        : 'Tapping "+2m Extension" (in top pop-up notification or in the app) immediately extends your time by 2 minutes without asking you to do anything.'
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
        'Fortress Mode Activated',
        `Maximum Hardcore Anti-Tamper Safeguards Active:\n\n• 0ms Zero-Flicker Intercept\n• Android Settings Protected during lockdowns\n• Device Administrator Mode Enabled\n\n${
          !isAccessActive || !isAdminActive
            ? 'Note: Visit System Permissions to verify Accessibility & Device Admin activation.'
            : 'All hardcore protections are active.'
        }`
      );
    } else if (level === 'disciplined') {
      Alert.alert(
        'Disciplined Mode Activated',
        'Shield cannot be suspended during active locks, and Android Settings access is restricted during active lockdown to prevent impulsive bypass.'
      );
    } else {
      Alert.alert(
        'Mindful Mode Activated',
        'Standard mindful usage tracking with flexible controls and gentle pause reminders.'
      );
    }
  };

  const handleToggleBreathe = (enabled: boolean) => {
    BlockerEngine.setBreatheEnabled(enabled);
  };

  const handleSelectPositiveRedirect = (pkg: string, name: string) => {
    BlockerEngine.setPositiveRedirect(pkg, name);
    Alert.alert('Positive Alternative Configured', `Lock overlay will now offer a 1-tap shortcut to ${name}.`);
  };

  const handleToggleApp = (id: string) => {
    const app = state.monitoredApps.find((a) => a.id === id);
    BlockerEngine.toggleAppBlock(id);
    if (app) {
      const willBeTimed = !app.blocked;
      Alert.alert(
        willBeTimed ? 'Timing Enabled' : 'Timing Disabled',
        willBeTimed
          ? `${app.name} is now included in your ${state.allowanceMinutes}m timer.`
          : `Timing disabled for ${app.name}. It will not be timed or locked.`
      );
    }
  };

  const handleAddCustomApp = () => {
    if (!newAppName.trim() || !newPkgName.trim()) {
      Alert.alert('Incomplete Form', 'Please enter both the application name and Android package identifier.');
      return;
    }
    const newApp: MonitoredApp = {
      id: `app-${newPkgName.trim()}`,
      name: newAppName.trim(),
      packageName: newPkgName.trim(),
      category: 'custom',
      blocked: true,
      dailyUsageMinutes: 0,
    };
    state.monitoredApps.push(newApp);
    BlockerEngine.addAuditLog('reset', 'Custom App Added', `Guarding ${newApp.name} (${newApp.packageName})`);
    setNewAppName('');
    setNewPkgName('');
    Alert.alert('App Added', `${newApp.name} is now guarded under your rules.`);
  };

  // Filter apps
  const filteredApps = state.monitoredApps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'guarded') return app.blocked;
    if (selectedFilter === 'poison') return app.category === 'poison';
    if (selectedFilter === 'game') return app.category === 'game';
    return true;
  });

  const guardedCount = state.monitoredApps.filter((a) => a.blocked).length;
  const is1hPreset = state.windowMinutes === 60 && state.allowanceMinutes === 7;
  const is2hPreset = state.windowMinutes === 120 && state.allowanceMinutes === 15;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>BLOCK RULES & LIMITS</Text>
          <Text style={styles.subtitle}>Configure rolling windows, modes & guarded apps</Text>
        </View>

        {/* Battery Sleep Status Card */}
        <View style={styles.batteryCard}>
          <MaterialIcons name="battery-charging-full" size={20} color="#84E150" />
          <View style={{ flex: 1 }}>
            <Text style={styles.batteryTitle}>Battery Sleep Engine Active</Text>
            <Text style={styles.batterySubtitle}>
              Polling loop shuts down when the phone screen is off. 0% idle drain.
            </Text>
          </View>
        </View>

        {/* Smart Context & Time-of-Day Profiles */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.cardSection}>SMART CONTEXT & TIME-OF-DAY</Text>
              <Text style={styles.profileMasterSub}>
                Work, Evening & Bedtime rules based on clock schedule
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

          <Text style={styles.cardExplainer}>
            Automatically switch allowances and strictness to match your day:
          </Text>

          {/* Profile Cards */}
          <View style={{ gap: 12, marginTop: 4 }}>
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
                  {/* Card Header */}
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

                  {/* Summary Bar */}
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
                        {profile.allowanceMinutes === 0 ? '0m Hard Lock' : `${profile.allowanceMinutes}m / ${profile.windowMinutes}m`}
                      </Text>
                    </View>
                    <View style={styles.profileSummaryItem}>
                      <MaterialIcons name="security" size={13} color="#A8B5B0" />
                      <Text style={styles.profileSummaryText}>
                        {profile.strictnessOverride.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Expand / Customize Toggle */}
                  <TouchableOpacity
                    style={styles.customizeToggleBtn}
                    onPress={() => setExpandedProfileId(isExpanded ? null : profile.id)}>
                    <Text style={styles.customizeToggleBtnText}>
                      {isExpanded ? 'Hide Schedule Controls' : 'Adjust Schedule & Limits'}
                    </Text>
                    <MaterialIcons
                      name={isExpanded ? 'expand-less' : 'expand-more'}
                      size={18}
                      color="#2ED3A3"
                    />
                  </TouchableOpacity>

                  {/* Expandable Controls Area */}
                  {isExpanded && (
                    <View style={styles.profileEditArea}>
                      {/* Hours Stepper Row */}
                      <Text style={styles.editSectionTitle}>ACTIVE TIME WINDOW</Text>
                      <View style={styles.timeStepperRow}>
                        {/* Start Hour */}
                        <View style={styles.stepperBox}>
                          <Text style={styles.stepperLabel}>START TIME</Text>
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

                        {/* End Hour */}
                        <View style={styles.stepperBox}>
                          <Text style={styles.stepperLabel}>END TIME</Text>
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

                      {/* Allowance Selector */}
                      <Text style={styles.editSectionTitle}>ALLOWANCE PER WINDOW</Text>
                      <View style={styles.chipsRow}>
                        {[
                          { label: '0m (Lock)', val: 0 },
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

                      {/* Rolling Window Selector */}
                      <Text style={styles.editSectionTitle}>ROLLING BLOCK INTERVAL</Text>
                      <View style={styles.chipsRow}>
                        {[
                          { label: '1 Hour (60m)', val: 60 },
                          { label: '2 Hours (120m)', val: 120 },
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

                      {/* Strictness Level Selector */}
                      <Text style={styles.editSectionTitle}>STRICTNESS LEVEL OVERRIDE</Text>
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

        {/* Window Presets Toggle */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>MANUAL BASELINE WINDOW</Text>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                {state.allowanceMinutes}m / {state.windowMinutes}m
              </Text>
            </View>
          </View>
          {state.profilesEnabled && state.activeProfileId && (
            <View style={styles.activeProfileNotice}>
              <MaterialIcons name="auto-awesome" size={14} color="#84E150" />
              <Text style={styles.activeProfileNoticeText}>
                Smart Profile active ({state.timeProfiles.find((p) => p.id === state.activeProfileId)?.name || 'Profile'}). Below settings apply during Off-Peak baseline hours.
              </Text>
            </View>
          )}
          <Text style={styles.cardExplainer}>
            Toggle between standard 1-hour focus and extended 2-hour cycles:
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
                    7 MINS / HR
                  </Text>
                </View>
              </View>
              <Text style={styles.presetName}>1 Hour Window</Text>
              <Text style={styles.presetDetail}>
                7 minutes allowed within every rolling 60-minute interval.
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
                    15 MINS / 2 HRS
                  </Text>
                </View>
              </View>
              <Text style={styles.presetName}>2 Hours Window</Text>
              <Text style={styles.presetDetail}>
                15 minutes allowed within every rolling 120-minute interval.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tracking Mode Selector */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>ENFORCEMENT MODE</Text>
            <View style={[styles.currentBadge, state.trackingMode === 'per_app' ? styles.modeBadgePerApp : styles.modeBadgeCumul]}>
              <Text style={[styles.currentBadgeText, state.trackingMode === 'per_app' && { color: '#84E150' }]}>
                {state.trackingMode === 'per_app' ? 'PER-APP ISOLATED' : 'CUMULATIVE POOL'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            Choose whether all guarded apps share one pool or count time independently:
          </Text>

          {/* Cumulative Tile */}
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
                <Text style={styles.modeCardTitle}>Cumulative Shared Pool</Text>
              </View>
              <View style={[styles.radioCircle, state.trackingMode === 'cumulative' && styles.radioCircleActive]}>
                {state.trackingMode === 'cumulative' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              All guarded apps share the same {state.allowanceMinutes}m limit. Using Twitter, Instagram, or TikTok adds to one shared meter. Reaching zero locks all apps together.
            </Text>
          </TouchableOpacity>

          {/* Per-App Tile */}
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
                <Text style={styles.modeCardTitle}>Per-App Separate Timers</Text>
              </View>
              <View style={[styles.radioCircle, state.trackingMode === 'per_app' && styles.radioCircleActive]}>
                {state.trackingMode === 'per_app' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Each app gets its own separate {state.allowanceMinutes}m limit and {state.windowMinutes}m rolling window. Using Twitter for {state.allowanceMinutes}m locks Twitter, but Instagram retains its own full allowance.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Strictness Level & Anti-Tamper Protections */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>STRICTNESS & ANTI-TAMPER TIER</Text>
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
                {state.strictnessLevel === 'fortress'
                  ? 'FORTRESS (LVL 3)'
                  : state.strictnessLevel === 'disciplined'
                  ? 'DISCIPLINED (LVL 2)'
                  : 'MINDFUL (LVL 1)'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            Control the rigor of enforcement and anti-tamper barriers against impulse bypasses:
          </Text>

          {/* Level 1: Mindful */}
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
                <Text style={styles.modeCardTitle}>Level 1: Mindful (Standard)</Text>
              </View>
              <View style={[styles.radioCircle, state.strictnessLevel === 'mindful' && styles.radioCircleActive]}>
                {state.strictnessLevel === 'mindful' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Flexible awareness, gentle reminders. Settings and uninstallation remain open. Shield can be paused anytime. Best for light habit building.
            </Text>
          </TouchableOpacity>

          {/* Level 2: Disciplined */}
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
                <Text style={styles.modeCardTitle}>Level 2: Disciplined (Enforced)</Text>
              </View>
              <View style={[styles.radioCircle, state.strictnessLevel === 'disciplined' && styles.radioCircleActive]}>
                {state.strictnessLevel === 'disciplined' && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Shield cannot be paused while a lockdown is in effect. System Settings (com.android.settings) is guarded during lockdown to stop impulsive bypasses.
            </Text>
          </TouchableOpacity>

          {/* Level 3: Fortress */}
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
                  Level 3: Fortress (Hardcore Hourglass)
                </Text>
              </View>
              <View style={[styles.radioCircle, state.strictnessLevel === 'fortress' && styles.radioCircleActiveFortress]}>
                {state.strictnessLevel === 'fortress' && <View style={[styles.radioDot, { backgroundColor: '#F43F5E' }]} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Maximum Hardcore Mode: 0ms Instant Interception (Accessibility Service) + Device Administrator Mode (prevents uninstall/force-stop) + complete Settings lockdown.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Grace Extension & Cognitive Friction Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>GRACE EXTENSION & FRICTION</Text>
            <View style={[styles.currentBadge, state.frictionEnabled ? styles.modeBadgeCumul : styles.currentBadgeDirect]}>
              <Text style={styles.currentBadgeText}>
                {state.frictionEnabled ? 'FRICTION GATE' : 'DIRECT (+2M)'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            At 2m and 1m remaining, you get a top pop-up notification with a +2m extension button. Configure how extensions unlock:
          </Text>

          {/* Option 1: Direct Instant Extension */}
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
                <Text style={styles.modeCardTitle}>Instant Extension (No Friction)</Text>
              </View>
              <View style={[styles.radioCircle, !state.frictionEnabled && styles.radioCircleActive]}>
                {!state.frictionEnabled && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Pressing '+2m Extension' in the top notification banner or in the app immediately adds 2 minutes with zero challenge required.
            </Text>
          </TouchableOpacity>

          {/* Option 2: Cognitive Challenge Required */}
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
                <Text style={styles.modeCardTitle}>Cognitive Friction Gate</Text>
              </View>
              <View style={[styles.radioCircle, state.frictionEnabled && styles.radioCircleActive]}>
                {state.frictionEnabled && <View style={styles.radioDot} />}
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Requires completing a cognitive challenge before the 2-minute extension is granted, breaking compulsive reflex loops.
            </Text>
          </TouchableOpacity>

          {/* Friction Customizer Sub-Card */}
          {state.frictionEnabled && (
            <View style={styles.frictionSubCard}>
              <Text style={styles.frictionSubSection}>SELECT CHALLENGE TYPE</Text>
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
                    Math Problem
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
                    Mindful Pledge
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
                    Reverse Recall
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Math Difficulty Selector */}
              {state.frictionType === 'math' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.frictionSubSection}>MATH DIFFICULTY LEVEL</Text>
                  <View style={styles.difficultyCardsRow}>
                    {(['easy', 'medium', 'hard'] as MathDifficulty[]).map((d) => {
                      const isActive = state.mathDifficulty === d;
                      const subtitle =
                        d === 'easy'
                          ? 'Simple 1-digit sums (e.g. 8 + 7)'
                          : d === 'medium'
                          ? 'Multiplication & sums (e.g. 7 × 8)'
                          : 'Two-step equations (e.g. (14 × 3) + 15)';

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

        {/* Behavioral Psychology & Positive Redirect */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>BEHAVIORAL INTERVENTIONS</Text>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>PSYCHOLOGY</Text>
            </View>
          </View>
          <Text style={styles.cardExplainer}>
            Science-backed cognitive friction and positive redirection tools to interrupt dopamine autopilot loops:
          </Text>

          {/* Breathe Before Scroll Switch Tile */}
          <View style={styles.behavioralRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <MaterialIcons name="air" size={18} color="#2ED3A3" />
                <Text style={styles.behavioralTitle}>Breathe Before Scroll</Text>
              </View>
              <Text style={styles.behavioralDesc}>
                Displays a gentle 10-second breathwork circle whenever opening a guarded app with remaining allowance.
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
              <Text style={styles.previewBreatheText}>Preview 10s Breathwork Circle</Text>
            </TouchableOpacity>
          )}

          {/* Positive Replacement Target */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.frictionSubSection}>PRODUCTIVE REPLACEMENT REDIRECT</Text>
            <Text style={styles.behavioralDesc}>
              When an addictive app locks, the overlay offers a one-tap shortcut to open a designated positive alternative:
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

        {/* Installed Apps Manager */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardSection}>INSTALLED DEVICE APPS</Text>
              <Text style={styles.cardCounter}>Guarding {guardedCount} of {state.monitoredApps.length} apps</Text>
            </View>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanApps}
              disabled={isScanning}>
              {isScanning ? (
                <ActivityIndicator size="small" color="#2ED3A3" />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={16} color="#2ED3A3" />
                  <Text style={styles.scanButtonText}>Scan Apps</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={18} color="#6E7A75" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps by name or package..."
              placeholderTextColor="#6E7A75"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterPill, selectedFilter === 'all' && styles.filterPillActive]}
              onPress={() => setSelectedFilter('all')}>
              <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
                All ({state.monitoredApps.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, selectedFilter === 'guarded' && styles.filterPillActive]}
              onPress={() => setSelectedFilter('guarded')}>
              <Text style={[styles.filterText, selectedFilter === 'guarded' && styles.filterTextActive]}>
                Guarded ({guardedCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, selectedFilter === 'poison' && styles.filterPillActive]}
              onPress={() => setSelectedFilter('poison')}>
              <Text style={[styles.filterText, selectedFilter === 'poison' && styles.filterTextActive]}>
                Social
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, selectedFilter === 'game' && styles.filterPillActive]}
              onPress={() => setSelectedFilter('game')}>
              <Text style={[styles.filterText, selectedFilter === 'game' && styles.filterTextActive]}>
                Games
              </Text>
            </TouchableOpacity>
          </View>

          {/* App List */}
          <View style={styles.appList}>
            {filteredApps.slice(0, 40).map((app) => (
              <View key={app.id} style={styles.appRow}>
                {app.icon ? (
                  <Image source={{ uri: app.icon }} style={styles.appIconImage} />
                ) : (
                  <View style={styles.appIconCircle}>
                    <Text style={styles.appIconLetter}>{app.name[0] || '?'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                    {app.blocked ? (
                      state.trackingMode === 'per_app' ? (
                        <View style={[styles.perAppBadge, app.isLocked ? styles.perAppBadgeLocked : styles.perAppBadgeActive]}>
                          <Text style={styles.perAppBadgeText}>
                            {app.isLocked ? 'LOCKED' : `${Math.floor((app.remainingSeconds ?? (state.allowanceMinutes * 60)) / 60)}m left`}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.appStatusBadgeTimed}>
                          <Text style={styles.appStatusTimedText}>TIMED</Text>
                        </View>
                      )
                    ) : (
                      <View style={styles.appStatusBadgeExempt}>
                        <Text style={styles.appStatusExemptText}>TIMING OFF</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.appPkg} numberOfLines={1}>{app.packageName}</Text>
                </View>
                <Switch
                  value={app.blocked}
                  onValueChange={() => handleToggleApp(app.id)}
                  trackColor={{ false: '#2C2C2C', true: '#1F5E4C' }}
                  thumbColor={app.blocked ? '#2ED3A3' : '#6E7A75'}
                />
              </View>
            ))}

            {filteredApps.length === 0 && (
              <Text style={styles.emptyText}>No applications found matching search.</Text>
            )}
          </View>
        </View>

        {/* Custom Application Input */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>GUARD CUSTOM PACKAGE</Text>
          <Text style={styles.cardExplainer}>
            Enter an Android package name directly to enforce restrictions:
          </Text>
          <TextInput
            style={styles.input}
            placeholder="App Name (e.g. Threads)"
            placeholderTextColor="#6E7A75"
            value={newAppName}
            onChangeText={setNewAppName}
          />
          <TextInput
            style={styles.input}
            placeholder="Package Identifier (e.g. com.instagram.barcelona)"
            placeholderTextColor="#6E7A75"
            value={newPkgName}
            onChangeText={setNewPkgName}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddCustomApp}>
            <MaterialIcons name="add" size={18} color="#101A17" />
            <Text style={styles.addButtonText}>Add Guarded Package</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Breathe Before Scroll Practice / Preview Modal */}
      <BreatheModal
        visible={breatheModalVisible}
        onClose={() => setBreatheModalVisible(false)}
        appName="Twitter / Instagram"
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
  batteryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#102822',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F5E4C',
  },
  batteryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2ED3A3',
  },
  batterySubtitle: {
    fontSize: 11,
    color: '#A8B5B0',
    marginTop: 2,
    lineHeight: 15,
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
  },
  modeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontSize: 11,
    color: '#84E150',
    marginTop: 2,
    fontWeight: '600',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#141414',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1F5E4C',
  },
  scanButtonText: {
    color: '#2ED3A3',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  filterPillActive: {
    backgroundColor: '#2ED3A3',
    borderColor: '#2ED3A3',
  },
  filterText: {
    fontSize: 11,
    color: '#A8B5B0',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#101A17',
    fontWeight: '800',
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
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconLetter: {
    color: '#2ED3A3',
    fontWeight: '800',
    fontSize: 15,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appPkg: {
    fontSize: 11,
    color: '#6E7A75',
  },
  perAppBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  perAppBadgeLocked: {
    backgroundColor: '#7F1D1D',
  },
  perAppBadgeActive: {
    backgroundColor: '#102822',
    borderWidth: 1,
    borderColor: '#1F5E4C',
  },
  perAppBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appStatusBadgeTimed: {
    backgroundColor: '#102822',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1F5E4C',
  },
  appStatusTimedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2ED3A3',
  },
  appStatusBadgeExempt: {
    backgroundColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appStatusExemptText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A8B5B0',
  },
  emptyText: {
    color: '#6E7A75',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 12,
  },
  input: {
    backgroundColor: '#141414',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    marginBottom: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2ED3A3',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  addButtonText: {
    color: '#101A17',
    fontWeight: '800',
    fontSize: 13,
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
