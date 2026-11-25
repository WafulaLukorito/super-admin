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

export default function AuditScreen() {
  const [state, setState] = useState<BlockerState>(BlockerEngine.getState());

  useEffect(() => {
    BlockerEngine.init().then((s) => setState(s));
    const unsubscribe = BlockerEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  const getLogIcon = (type: AuditEvent['type']) => {
    switch (type) {
      case 'lock':
        return { name: 'gavel', color: '#F43F5E' };
      case 'extension':
        return { name: 'alarm-add', color: '#84E150' };
      case 'tamper_check':
        return { name: 'verified', color: '#2ED3A3' };
      default:
        return { name: 'cached', color: '#2ED3A3' };
    }
  };

  const handleManualReset = () => {
    Alert.alert(
      'Reset Hourly Interval?',
      'This will reset consumed seconds for the current block window. Anti-tamper logs will record this action.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Block',
          style: 'destructive',
          onPress: () => {
            BlockerEngine.resetBlock();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>BEHAVIORAL AUDIT LOG</Text>
          <Text style={styles.subtitle}>Tamper-evident record of block events, urges, and extensions</Text>
        </View>

        {/* Peak Urge Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>PEAK URGE HOURS (IMPULSE ATTEMPTS)</Text>
          <View style={styles.urgeRow}>
            <View style={styles.urgeItem}>
              <View style={[styles.urgeBar, { height: 28, backgroundColor: '#2ED3A3' }]} />
              <Text style={styles.urgeTime}>Morning</Text>
              <Text style={styles.urgeCount}>2</Text>
            </View>
            <View style={styles.urgeItem}>
              <View style={[styles.urgeBar, { height: 50, backgroundColor: '#84E150' }]} />
              <Text style={styles.urgeTime}>Midday</Text>
              <Text style={styles.urgeCount}>6</Text>
            </View>
            <View style={styles.urgeItem}>
              <View style={[styles.urgeBar, { height: 75, backgroundColor: '#F43F5E' }]} />
              <Text style={styles.urgeTime}>Evening</Text>
              <Text style={styles.urgeCount}>11</Text>
            </View>
            <View style={styles.urgeItem}>
              <View style={[styles.urgeBar, { height: 42, backgroundColor: '#818CF8' }]} />
              <Text style={styles.urgeTime}>Late Night</Text>
              <Text style={styles.urgeCount}>4</Text>
            </View>
          </View>
          <Text style={styles.urgeFooter}>
            Peak friction triggered between 7:00 PM – 10:00 PM (social media scrolling window).
          </Text>
        </View>

        {/* Anti-Tamper Security Banner */}
        <View style={styles.securityCard}>
          <MaterialIcons name="security" size={20} color="#2ED3A3" />
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Monotonic Clock Integrity</Text>
            <Text style={styles.securitySubtitle}>
              Hardware elapsedRealtime anchor: Active. Date & time overrides in Android system settings cannot unlock cooldowns.
            </Text>
          </View>
        </View>

        {/* Audit Log Timeline */}
        <View style={styles.card}>
          <View style={styles.logHeader}>
            <Text style={styles.cardSection}>SESSION TIMELINE</Text>
            <TouchableOpacity onPress={handleManualReset}>
              <Text style={styles.resetAction}>Reset Current Window</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logList}>
            {state.auditLogs.map((log) => {
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
    marginBottom: 20,
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
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
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
    height: 100,
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
  securityCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#102822',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F5E4C',
    marginBottom: 18,
    alignItems: 'center',
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2ED3A3',
    marginBottom: 2,
  },
  securitySubtitle: {
    fontSize: 11,
    color: '#A8B5B0',
    lineHeight: 15,
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
    gap: 16,
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
