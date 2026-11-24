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
import { BlockerEngine, BlockerState, MonitoredApp } from '@/services/blockerEngine';

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

  const handleSetInterval = (windowMins: number, allowanceMins: number) => {
    BlockerEngine.setRules(windowMins, allowanceMins);
    Alert.alert(
      'Interval Updated',
      `Target limit set to ${allowanceMins} minutes per ${windowMins}-minute window.`
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
    Alert.alert('App Added', `${newApp.name} is now guarded under your hourly limit rules.`);
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>BLOCK RULES & LIMITS</Text>
          <Text style={styles.subtitle}>Configure rolling time windows and guarded applications</Text>
        </View>

        {/* Battery Sleep Status Card */}
        <View style={styles.batteryCard}>
          <MaterialIcons name="battery-charging-full" size={20} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.batteryTitle}>Battery Sleep Engine Active</Text>
            <Text style={styles.batterySubtitle}>
              Polling loop automatically shuts down when the phone screen is off or in your pocket. 0% idle drain.
            </Text>
          </View>
        </View>

        {/* Interval Engine Presets */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>BLOCK WINDOW INTERVAL</Text>
          <View style={styles.presetGrid}>
            <TouchableOpacity
              style={[
                styles.presetButton,
                state.windowMinutes === 60 && state.allowanceMinutes === 10 && styles.presetButtonActive,
              ]}
              onPress={() => handleSetInterval(60, 10)}>
              <Text style={styles.presetTitle}>10m / 1 Hour</Text>
              <Text style={styles.presetDesc}>Default strict balance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetButton,
                state.windowMinutes === 60 && state.allowanceMinutes === 5 && styles.presetButtonActive,
              ]}
              onPress={() => handleSetInterval(60, 5)}>
              <Text style={styles.presetTitle}>5m / 1 Hour</Text>
              <Text style={styles.presetDesc}>Extreme focus mode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetButton,
                state.windowMinutes === 60 && state.allowanceMinutes === 15 && styles.presetButtonActive,
              ]}
              onPress={() => handleSetInterval(60, 15)}>
              <Text style={styles.presetTitle}>15m / 1 Hour</Text>
              <Text style={styles.presetDesc}>Moderate allowance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetButton,
                state.windowMinutes === 120 && state.allowanceMinutes === 15 && styles.presetButtonActive,
              ]}
              onPress={() => handleSetInterval(120, 15)}>
              <Text style={styles.presetTitle}>15m / 2 Hours</Text>
              <Text style={styles.presetDesc}>Extended 120m cycle</Text>
            </TouchableOpacity>
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
                  <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
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
              <Text style={styles.emptyText}>No matching applications found.</Text>
            )}
          </View>
        </View>

        {/* Add Custom App Card */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>ADD CUSTOM PACKAGE IDENTIFIER</Text>
          <TextInput
            style={styles.input}
            placeholder="Display Name (e.g. Candy Crush)"
            placeholderTextColor="#64748B"
            value={newAppName}
            onChangeText={setNewAppName}
          />
          <TextInput
            style={styles.input}
            placeholder="Package (e.g. com.king.candycrushsaga)"
            placeholderTextColor="#64748B"
            value={newPkgName}
            onChangeText={setNewPkgName}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddCustomApp}>
            <MaterialIcons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add to Guard List</Text>
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
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  batteryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#06281E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#065F46',
    marginBottom: 16,
  },
  batteryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 2,
  },
  batterySubtitle: {
    fontSize: 11,
    color: '#A7F3D0',
    lineHeight: 15,
  },
  card: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSection: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
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
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  presetButton: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  presetButtonActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0B233E',
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  presetDesc: {
    fontSize: 11,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  appPkg: {
    fontSize: 11,
    color: '#64748B',
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
