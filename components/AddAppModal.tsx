import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlockerEngine, MonitoredApp } from '@/services/blockerEngine';

interface Props {
  visible: boolean;
  onClose: () => void;
  deviceApps: MonitoredApp[];
  monitoredApps: MonitoredApp[];
}

export function AddAppModal({ visible, onClose, deviceApps, monitoredApps }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'poison' | 'game'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPkg, setCustomPkg] = useState('');

  const monitoredSet = useMemo(
    () => new Set(monitoredApps.filter((a) => a.blocked).map((a) => a.packageName)),
    [monitoredApps]
  );

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deviceApps.filter((app) => {
      if (q && !app.name.toLowerCase().includes(q) && !app.packageName.toLowerCase().includes(q)) {
        return false;
      }
      if (filter === 'poison') return app.category === 'poison';
      if (filter === 'game') return app.category === 'game';
      return true;
    });
  }, [deviceApps, query, filter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await BlockerEngine.loadInstalledAppsFromDevice();
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleDeviceApp = (app: MonitoredApp) => {
    const existing = monitoredApps.find((a) => a.packageName === app.packageName);
    if (existing && existing.blocked) {
      BlockerEngine.removeAppFromMonitored(existing.id);
    } else {
      BlockerEngine.addAppToMonitored(app);
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customPkg.trim()) {
      Alert.alert('Missing Details', 'Enter both an app name and its Android package ID.');
      return;
    }
    BlockerEngine.addAppToMonitored({
      id: `app-${customPkg.trim()}`,
      name: customName.trim(),
      packageName: customPkg.trim(),
      category: 'custom',
      blocked: true,
      dailyUsageMinutes: 0,
    });
    setCustomName('');
    setCustomPkg('');
    setShowCustom(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Add App to Guard</Text>
              <Text style={styles.subtitle}>Pick any installed app to include in your limits</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
                {refreshing ? (
                  <ActivityIndicator size="small" color="#2ED3A3" />
                ) : (
                  <MaterialIcons name="refresh" size={18} color="#2ED3A3" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <MaterialIcons name="close" size={20} color="#A8B5B0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={18} color="#6E7A75" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps on your phone..."
              placeholderTextColor="#6E7A75"
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <MaterialIcons name="cancel" size={16} color="#6E7A75" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {[
              { id: 'all', label: `All (${deviceApps.length})` },
              { id: 'poison', label: 'Social & Video' },
              { id: 'game', label: 'Games' },
            ].map((item) => {
              const active = filter === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilter(item.id as any)}>
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Scrollable App List */}
          <ScrollView style={styles.list} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
            {filteredApps.map((app) => {
              const isAdded = monitoredSet.has(app.packageName);
              return (
                <TouchableOpacity
                  key={app.packageName}
                  style={[styles.appRow, isAdded && styles.appRowAdded]}
                  onPress={() => handleToggleDeviceApp(app)}>
                  {app.icon ? (
                    <Image source={{ uri: app.icon }} style={styles.appIcon} />
                  ) : (
                    <View style={styles.appIconPlaceholder}>
                      <Text style={styles.appIconLetter}>{app.name[0] || '?'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                    <Text style={styles.appPkg} numberOfLines={1}>{app.packageName}</Text>
                  </View>
                  <View style={[styles.addPill, isAdded && styles.addedPill]}>
                    <MaterialIcons
                      name={isAdded ? 'check' : 'add'}
                      size={14}
                      color={isAdded ? '#101A17' : '#2ED3A3'}
                    />
                    <Text style={[styles.addPillText, isAdded && styles.addedPillText]}>
                      {isAdded ? 'Guarded' : 'Add'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {filteredApps.length === 0 && (
              <Text style={styles.emptyText}>No matching apps found.</Text>
            )}

            {/* Custom Package Option */}
            <TouchableOpacity
              style={styles.customToggle}
              onPress={() => setShowCustom(!showCustom)}>
              <Text style={styles.customToggleText}>
                {showCustom ? 'Hide custom package form' : "Can't find an app? Add by package ID"}
              </Text>
              <MaterialIcons
                name={showCustom ? 'expand-less' : 'expand-more'}
                size={18}
                color="#2ED3A3"
              />
            </TouchableOpacity>

            {showCustom && (
              <View style={styles.customBox}>
                <TextInput
                  style={styles.customInput}
                  placeholder="App name (e.g. Threads)"
                  placeholderTextColor="#6E7A75"
                  value={customName}
                  onChangeText={setCustomName}
                />
                <TextInput
                  style={styles.customInput}
                  placeholder="Package ID (e.g. com.instagram.barcelona)"
                  placeholderTextColor="#6E7A75"
                  value={customPkg}
                  onChangeText={setCustomPkg}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.customSubmit} onPress={handleAddCustom}>
                  <Text style={styles.customSubmitText}>Add Custom App</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 11, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '86%',
    borderTopWidth: 1,
    borderColor: '#2C2C2C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#A8B5B0',
    marginTop: 2,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#262626',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#262626',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    marginBottom: 10,
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
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
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
    fontWeight: '600',
    color: '#A8B5B0',
  },
  filterTextActive: {
    color: '#101A17',
    fontWeight: '800',
  },
  list: {
    maxHeight: 380,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#141414',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  appRowAdded: {
    borderColor: '#1F5E4C',
    backgroundColor: '#102822',
  },
  appIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  appIconPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconLetter: {
    color: '#2ED3A3',
    fontWeight: '800',
    fontSize: 14,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appPkg: {
    fontSize: 10,
    color: '#6E7A75',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  addedPill: {
    backgroundColor: '#2ED3A3',
    borderColor: '#2ED3A3',
  },
  addPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2ED3A3',
  },
  addedPillText: {
    color: '#101A17',
    fontWeight: '800',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6E7A75',
    paddingVertical: 20,
    fontSize: 12,
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 6,
  },
  customToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2ED3A3',
  },
  customBox: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    gap: 8,
  },
  customInput: {
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  customSubmit: {
    backgroundColor: '#2ED3A3',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  customSubmitText: {
    color: '#101A17',
    fontWeight: '800',
    fontSize: 13,
  },
  doneBtn: {
    backgroundColor: '#2ED3A3',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  doneBtnText: {
    color: '#101A17',
    fontWeight: '800',
    fontSize: 14,
  },
});
