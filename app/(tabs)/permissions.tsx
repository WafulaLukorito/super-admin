import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PermissionsService } from '@/services/permissionsService';
import AppBlocker from '@/modules/app-blocker';

export default function SetupScreen() {
  const [accessActive, setAccessActive] = useState(false);
  const [adminActive, setAdminActive] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        setAccessActive(AppBlocker.isAccessibilityServiceActive());
        setAdminActive(AppBlocker.isDeviceAdminActive());
      } catch (e) {}
    };
    refresh();
    const timer = setInterval(refresh, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SETUP & PERMISSIONS</Text>
          <Text style={styles.subtitle}>
            Allow Hourglass to track app time and display break screens
          </Text>
        </View>

        {/* Permission 1: Usage Stats */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="insights" size={20} color="#2ED3A3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permName}>1. App Usage Access</Text>
              <Text style={styles.permDesc}>
                Lets Hourglass see which app is open so it can count your active minutes.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={() => PermissionsService.openUsageAccessSettings()}>
            <MaterialIcons name="open-in-new" size={16} color="#2ED3A3" />
            <Text style={styles.actionButtonText}>Open Usage Settings</Text>
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
                Lets Hourglass show the break screen when your time limit is reached.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={() => PermissionsService.openOverlaySettings()}>
            <MaterialIcons name="open-in-new" size={16} color="#2ED3A3" />
            <Text style={styles.actionButtonText}>Open Overlay Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Permission 3: Ignore Battery Optimizations */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="battery-alert" size={20} color="#84E150" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permName}>3. Unrestricted Battery</Text>
              <Text style={styles.permDesc}>
                Keeps your timer running reliably in the background without Android pausing it.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={() => PermissionsService.openBatteryOptimizationSettings()}>
            <MaterialIcons name="open-in-new" size={16} color="#2ED3A3" />
            <Text style={styles.actionButtonText}>Allow Background Activity</Text>
          </TouchableOpacity>
        </View>

        {/* Permission 4: Notifications */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="notifications" size={20} color="#818CF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permName}>4. Notifications</Text>
              <Text style={styles.permDesc}>
                Sends 2-minute and 1-minute heads-up alerts with an option for extra time.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={() => PermissionsService.openNotificationSettings()}>
            <MaterialIcons name="open-in-new" size={16} color="#2ED3A3" />
            <Text style={styles.actionButtonText}>Configure Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Permission 5: Instant Lock Service */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconCircle, { backgroundColor: '#2B1419' }]}>
              <MaterialIcons name="bolt" size={20} color="#F43F5E" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.permTitleRow}>
                <Text style={styles.permName}>5. Instant Lock (Fortress)</Text>
                {accessActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.permDesc}>
                Catches blocked app opens right away with no delay when Fortress mode is on.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E11D48', borderColor: '#F43F5E' }]}
            onPress={() => AppBlocker.openAccessibilitySettings()}>
            <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Open Accessibility Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Permission 6: Uninstall Protection */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconCircle, { backgroundColor: '#2B1419' }]}>
              <MaterialIcons name="admin-panel-settings" size={20} color="#F43F5E" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.permTitleRow}>
                <Text style={styles.permName}>6. Uninstall Protection (Fortress)</Text>
                {adminActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.permDesc}>
                Prevents removing or stopping Hourglass while an active lock is in place.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#BE123C', borderColor: '#F43F5E' }]}
            onPress={() => AppBlocker.requestDeviceAdminActivation()}>
            <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Enable Uninstall Protection</Text>
          </TouchableOpacity>
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
  permTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  permName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activeBadge: {
    backgroundColor: '#84E150',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#101A17',
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
});
