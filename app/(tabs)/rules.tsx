import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlockerEngine, BlockerState } from '@/services/blockerEngine';

export default function RulesScreen() {
  const [state, setState] = useState<BlockerState>(BlockerEngine.getState());
  const [newPkgName, setNewPkgName] = useState('');
  const [newAppName, setNewAppName] = useState('');

  useEffect(() => {
    BlockerEngine.init().then((s) => setState(s));
    const unsubscribe = BlockerEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

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
    // Update local state apps list
    const newApp = {
      id: `app-${Date.now()}`,
      name: newAppName.trim(),
      packageName: newPkgName.trim(),
      category: 'custom' as any,
      blocked: true,
      dailyUsageMinutes: 0,
    };
    state.monitoredApps.push(newApp);
    BlockerEngine.addAuditLog('reset', 'Custom App Added', `Guarding ${newApp.name} (${newApp.packageName})`);
    setNewAppName('');
    setNewPkgName('');
    Alert.alert('App Added', `${newApp.name} is now guarded under your hourly limit rules.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>BLOCK RULES & LIMITS</Text>
          <Text style={styles.subtitle}>Configure rolling time windows and guarded applications</Text>
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

        {/* Monitored App List */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>CATEGORIZED APPLICATIONS</Text>
          <Text style={styles.cardHint}>
            Apps toggled ON will trigger the native overlay shield once the hourly allowance expires.
          </Text>

          <View style={styles.appList}>
            {state.monitoredApps.map((app) => (
              <View key={app.id} style={styles.appRow}>
                <View style={styles.appIconCircle}>
                  <Text style={styles.appIconLetter}>{app.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appPkg}>{app.packageName}</Text>
                </View>
                <Switch
                  value={app.blocked}
                  onValueChange={() => handleToggleApp(app.id)}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor={app.blocked ? '#38BDF8' : '#94A3B8'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Add Custom App Card */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>ADD CUSTOM APPLICATION</Text>
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
    marginBottom: 20,
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
  card: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardSection: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  cardHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 16,
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
    gap: 14,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
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
    fontSize: 14,
  },
});
