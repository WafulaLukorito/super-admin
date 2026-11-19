import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export interface PermissionItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  granted: boolean;
  actionKey: 'usage' | 'overlay' | 'battery' | 'notifications';
}

export class PermissionsService {
  static async openUsageAccessSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.USAGE_ACCESS_SETTINGS'
        );
      } catch (e) {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  }

  static async openOverlaySettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.action.MANAGE_OVERLAY_PERMISSION'
        );
      } catch (e) {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  }

  static async openBatteryOptimizationSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'
        );
      } catch (e) {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  }

  static async openNotificationSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.APP_NOTIFICATION_SETTINGS'
        );
      } catch (e) {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  }
}
