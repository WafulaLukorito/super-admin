import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PermissionsService } from '@/services/permissionsService';
import AppBlocker from '@/modules/app-blocker';

export default function PermissionsScreen() {
  const handleOpenUsage = () => {
    PermissionsService.openUsageAccessSettings();
  };

  const handleOpenOverlay = () => {
    PermissionsService.openOverlaySettings();
  };

  const handleOpenBattery = () => {
    PermissionsService.openBatteryOptimizationSettings();
  };

  const handleOpenNotifications = () => {
    PermissionsService.openNotificationSettings();
  };

  const handleOpenAccessibility = () => {
    AppBlocker.openAccessibilitySettings();
  };

  const handleRequestDeviceAdmin = () => {
    AppBlocker.requestDeviceAdminActivation();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SYSTEM PERMISSIONS</Text>
          <Text style={styles.subtitle}>
            Critical Android system privileges required for uninterrupted background enforcement
          </Text>
        </View>

        {/* Permission 1: Usage Stats */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="insights" size={20} color="#2ED3A3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permName}>1. Usage Stats Access</Text>
              <Text style={styles.permDesc}>
                Allows Hourglass to read which app is currently in the foreground and track active minutes without battery drain.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenUsage}>
            <MaterialIcons name="open-in-new" size={16} color="#2ED3A3" />
            <Text style={styles.actionButtonText}>Open Usage Access Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Permission 2: Draw Over Other Apps */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="layers" size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permName}>2. Display Over Other Apps</Text>
              <Text style={styles.permDesc}>
                Required to render the full-screen blocking overlay when high-dopamine app allowances expire.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenOverlay}>
            <MaterialIcons name="open-in-new" size={16} color="#2ED3A3" />
            <Text style={styles.actionButtonText}>Open Overlay Permissions</Text>
          </TouchableOpacity>
        </View>

        {/* Permission 3: Ignore Battery Optimizations */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="battery-alert" size={20} color="#84E150" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permName}>3. Battery Optimization Exemption</Text>
              <Text style={styles.permDesc}>
                Prevents OEM battery killers (MIUI, OneUI, ColorOS) from killing the Foreground Service daemon in deep Doze mode.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenBattery}>
            <MaterialIcons name="open-in-new" size={16} color="#2ED3A3" />
            <Text style={styles.actionButtonText}>Exempt from Battery Optimization</Text>
          </TouchableOpacity>
        </View>

        {/* Permission 4: Notifications */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="notifications" size={20} color="#818CF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permName}>4. Foreground Notifications</Text>
              <Text style={styles.permDesc}>
                Maintains Android persistent low-priority daemon status with START_STICKY crash recovery.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenNotifications}>
            <MaterialIcons name="open-in-new" size={16} color="#2ED3A3" />
            <Text style={styles.actionButtonText}>Configure App Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Permission 5: Accessibility Service (Fortress Tier) */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconCircle, { backgroundColor: '#2B1419' }]}>
              <MaterialIcons name="bolt" size={20} color="#F43F5E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permName}>5. 0ms Accessibility Interceptor (Fortress)</Text>
              <Text style={styles.permDesc}>
                Enables zero-latency instant overlay blocking (catches app launches in 0ms with zero flicker).
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#E11D48', borderColor: '#F43F5E' }]} onPress={handleOpenAccessibility}>
            <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Open Accessibility Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Permission 6: Device Administrator (Fortress Tier) */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconCircle, { backgroundColor: '#2B1419' }]}>
              <MaterialIcons name="admin-panel-settings" size={20} color="#F43F5E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permName}>6. Device Administrator (Fortress)</Text>
              <Text style={styles.permDesc}>
                Prevents uninstalling or force-stopping Hourglass while active block rules or lockdowns are in effect.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#BE123C', borderColor: '#F43F5E' }]} onPress={handleRequestDeviceAdmin}>
            <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Activate Device Administrator</Text>
          </TouchableOpacity>
        </View>

        {/* Anti-Tamper Verification Card */}
        <View style={styles.infoBox}>
          <MaterialIcons name="verified-user" size={22} color="#2ED3A3" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Anti-Tamper Hardware Clock Lock</Text>
            <Text style={styles.infoBody}>
              All interval timers are synchronized against Android kernel uptime (SystemClock.elapsedRealtime()).
              Attempting to bypass block limits by setting the phone clock forward in Android Settings is automatically blocked.
            </Text>
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
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  permDesc: {
    fontSize: 12,
    color: '#A8B5B0',
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#262626',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  actionButtonText: {
    color: '#2ED3A3',
    fontWeight: '700',
    fontSize: 12,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#102822',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F5E4C',
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2ED3A3',
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 12,
    color: '#C8D3CF',
    lineHeight: 16,
  },
});
