import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlockerEngine, BlockerState, AuditEvent } from '@/services/blockerEngine';

export default function InsightsScreen() {
  const [state, setState] = useState<BlockerState>(BlockerEngine.getState());

  useEffect(() => {
    BlockerEngine.init().then((s) => setState({ ...s }));
    const unsubscribe = BlockerEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  const getLogIcon = (type: AuditEvent['type']) => {
    switch (type) {
      case 'lock':
        return { name: 'hourglass-empty', color: '#F43F5E' };
      case 'extension':
        return { name: 'more-time', color: '#84E150' };
      default:
        return { name: 'check-circle-outline', color: '#2ED3A3' };
    }
  };

  const handleManualReset = () => {
    Alert.alert(
      'Reset Current Timer?',
      'This starts a fresh cycle with your full time allowance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            BlockerEngine.resetBlock();
          },
        },
      ]
    );
  };

  const urgeStats = state.urgeStats || { morning: 0, midday: 0, evening: 0, lateNight: 0 };
  const totalUrges = urgeStats.morning + urgeStats.midday + urgeStats.evening + urgeStats.lateNight;
  const maxUrge = Math.max(1, urgeStats.morning, urgeStats.midday, urgeStats.evening, urgeStats.lateNight);
  const barHeight = (val: number) => (val === 0 ? 8 : Math.max(14, Math.round((val / maxUrge) * 76)));

  const guardedCount = state.monitoredApps.filter((a) => a.blocked).length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>INSIGHTS</Text>
          <Text style={styles.subtitle}>Spot your peak scrolling hours and stay intentional</Text>
        </View>

        {/* Quick Overview Card */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{guardedCount}</Text>
            <Text style={styles.statLabel}>Guarded Apps</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: '#84E150' }]}>{state.allowanceMinutes}m</Text>
            <Text style={styles.statLabel}>Current Limit</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{totalUrges}</Text>
            <Text style={styles.statLabel}>Extra Time Uses</Text>
          </View>
        </View>

        {/* Peak Urge Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>PEAK URGE HOURS</Text>
          <View style={styles.urgeRow}>
            <View style={styles.urgeItem}>
              <View style={[styles.urgeBar, { height: barHeight(urgeStats.morning), backgroundColor: '#2ED3A3' }]} />
              <Text style={styles.urgeTime}>Morning</Text>
              <Text style={styles.urgeCount}>{urgeStats.morning}</Text>
            </View>
            <View style={styles.urgeItem}>
              <View style={[styles.urgeBar, { height: barHeight(urgeStats.midday), backgroundColor: '#84E150' }]} />
              <Text style={styles.urgeTime}>Afternoon</Text>
              <Text style={styles.urgeCount}>{urgeStats.midday}</Text>
            </View>
            <View style={styles.urgeItem}>
              <View style={[styles.urgeBar, { height: barHeight(urgeStats.evening), backgroundColor: '#F43F5E' }]} />
              <Text style={styles.urgeTime}>Evening</Text>
              <Text style={styles.urgeCount}>{urgeStats.evening}</Text>
            </View>
            <View style={styles.urgeItem}>
              <View style={[styles.urgeBar, { height: barHeight(urgeStats.lateNight), backgroundColor: '#818CF8' }]} />
              <Text style={styles.urgeTime}>Late Night</Text>
              <Text style={styles.urgeCount}>{urgeStats.lateNight}</Text>
            </View>
          </View>
          <Text style={styles.urgeFooter}>
            {totalUrges === 0
              ? 'No extra time requests yet — patterns will appear here as you use your limits.'
              : 'Shows which times of day you most often reach for extra time.'}
          </Text>
        </View>

        {/* Recent Activity (Concise & Human) */}
        <View style={styles.card}>
          <View style={styles.logHeader}>
            <Text style={styles.cardSection}>RECENT ACTIVITY</Text>
            <TouchableOpacity onPress={handleManualReset}>
              <Text style={styles.resetAction}>Reset Timer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logList}>
            {state.auditLogs.slice(0, 8).map((log) => {
              const icon = getLogIcon(log.type);
              return (
                <View key={log.id} style={styles.logItem}>
                  <View style={[styles.logIconBox, { backgroundColor: `${icon.color}18` }]}>
                    <MaterialIcons name={icon.name as any} size={18} color={icon.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.logItemHeader}>
                      <Text style={styles.logItemTitle}>{log.title}</Text>
                      <Text style={styles.logItemTime}>{log.timestamp}</Text>
                    </View>
                    <Text style={styles.logItemDetail}>{log.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: '#A8B5B0',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  statCol: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2ED3A3',
  },
  statLabel: {
    fontSize: 11,
    color: '#A8B5B0',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2C2C2C',
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  cardSection: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2ED3A3',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  urgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  urgeItem: {
    alignItems: 'center',
    gap: 4,
  },
  urgeBar: {
    width: 24,
    borderRadius: 4,
  },
  urgeTime: {
    fontSize: 11,
    color: '#A8B5B0',
  },
  urgeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  urgeFooter: {
    fontSize: 12,
    color: '#A8B5B0',
    marginTop: 12,
    lineHeight: 16,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resetAction: {
    fontSize: 12,
    color: '#F43F5E',
    fontWeight: '600',
  },
  logList: {
    gap: 14,
  },
  logItem: {
    flexDirection: 'row',
    gap: 12,
  },
  logIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  logItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logItemTime: {
    fontSize: 11,
    color: '#6E7A75',
  },
  logItemDetail: {
    fontSize: 12,
    color: '#A8B5B0',
    lineHeight: 16,
  },
});
