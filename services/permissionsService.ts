import { Platform, Linking, PermissionsAndroid } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

const PACKAGE_NAME = 'com.jowaljones.superadmin';

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
          'android.settings.action.MANAGE_OVERLAY_PERMISSION',
          {
            data: `package:${PACKAGE_NAME}`,
          }
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
          'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
          {
            data: `package:${PACKAGE_NAME}`,
          }
        );
      } catch (e) {
        try {
          await IntentLauncher.startActivityAsync(
            'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'
          );
        } catch {
          Linking.openSettings();
        }
      }
    } else {
      Linking.openSettings();
    }
  }

  static async openNotificationSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        // On Android 13+ (API 33+), prompt the standard runtime dialog first
        if (Number(Platform.Version) >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (result === PermissionsAndroid.RESULTS.GRANTED) {
            return;
          }
        }

        // Open App Notification Settings with required package extra
        await IntentLauncher.startActivityAsync(
          'android.settings.APP_NOTIFICATION_SETTINGS',
          {
            extra: {
              'android.provider.extra.APP_PACKAGE': PACKAGE_NAME,
            },
          }
        );
      } catch (e) {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  }

  static async openAppInfoSettings(): Promise<void> {
    Linking.openSettings();
  }
}
