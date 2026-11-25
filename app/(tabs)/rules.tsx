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
import { BlockerEngine, BlockerState, MonitoredApp, TrackingMode } from '@/services/blockerEngine';

export default function RulesScreen() {
  const [state, setState] = useState<BlockerState>(BlockerEngine.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'guarded' | 'poison' | 'game'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newAppName, setNewAppName] = useState('');

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

  const handleToggleApp = (id: string) => {
    BlockerEngine.toggleAppBlock(id);
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
          <MaterialIcons name="battery-charging-full" size={20} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.batteryTitle}>Battery Sleep Engine Active</Text>
            <Text style={styles.batterySubtitle}>
              Polling loop shuts down when the phone screen is off. 0% idle drain.
            </Text>
          </View>
        </View>

        {/* Window Presets Toggle */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSection}>WINDOW INTERVAL & ALLOWANCE</Text>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                {state.allowanceMinutes}m / {state.windowMinutes}m
              </Text>
            </View>
          </View>
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
                  color={is1hPreset ? '#38BDF8' : '#64748B'}
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
                  color={is2hPreset ? '#38BDF8' : '#64748B'}
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
              <Text style={styles.currentBadgeText}>
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
                  color={state.trackingMode === 'cumulative' ? '#38BDF8' : '#94A3B8'}
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
                  color={state.trackingMode === 'per_app' ? '#38BDF8' : '#94A3B8'}
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
                <ActivityIndicator size="small" color="#38BDF8" />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={16} color="#38BDF8" />
                  <Text style={styles.scanButtonText}>Scan Apps</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps by name or package..."
              placeholderTextColor="#64748B"
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
                    {state.trackingMode === 'per_app' && app.blocked && (
                      <View style={[styles.perAppBadge, app.isLocked ? styles.perAppBadgeLocked : styles.perAppBadgeActive]}>
                        <Text style={styles.perAppBadgeText}>
                          {app.isLocked ? 'LOCKED' : `${Math.floor((app.remainingSeconds ?? (state.allowanceMinutes * 60)) / 60)}m left`}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.appPkg} numberOfLines={1}>{app.packageName}</Text>
                </View>
                <Switch
                  value={app.blocked}
                  onValueChange={() => handleToggleApp(app.id)}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor={app.blocked ? '#38BDF8' : '#94A3B8'}
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
            placeholderTextColor="#64748B"
            value={newAppName}
            onChangeText={setNewAppName}
          />
          <TextInput
            style={styles.input}
            placeholder="Package Identifier (e.g. com.instagram.barcelona)"
            placeholderTextColor="#64748B"
            value={newPkgName}
            onChangeText={setNewPkgName}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddCustomApp}>
            <MaterialIcons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Guarded Package</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  batteryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#064E3B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#059669',
  },
  batteryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  batterySubtitle: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 2,
    lineHeight: 15,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#94A3B8',
    letterSpacing: 1,
  },
  cardExplainer: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 17,
  },
  currentBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  modeBadgePerApp: {
    borderColor: '#A855F7',
  },
  modeBadgeCumul: {
    borderColor: '#38BDF8',
  },
  currentBadgeText: {
    color: '#38BDF8',
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
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  presetCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0B233E',
  },
  presetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  presetTagActive: {
    backgroundColor: '#0284C7',
  },
  presetTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
  },
  presetTagTextActive: {
    color: '#FFFFFF',
  },
  presetName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  presetDetail: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  modeCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  modeCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0B233E',
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
    color: '#F8FAFC',
  },
  modeCardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#38BDF8',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  cardCounter: {
    fontSize: 11,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '600',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  scanButtonText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  filterText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  appPkg: {
    fontSize: 11,
    color: '#64748B',
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
    backgroundColor: '#064E3B',
  },
  perAppBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 12,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
