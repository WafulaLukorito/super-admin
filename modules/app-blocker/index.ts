import { requireNativeModule } from 'expo-modules-core';

export interface InstalledApp {
  packageName: string;
  appName: string;
  isSystemApp: boolean;
  category: 'poison' | 'game' | 'utility';
  icon?: string;
}

interface AppBlockerNativeModule {
  isServiceRunning(): boolean;
  startService(): boolean;
  stopService(): boolean;
  updateRules(windowMinutes: number, allowanceMinutes: number, blockedPackages: string[]): boolean;
  getRemainingSeconds(): number;
  getWindowRemainingSeconds(): number;
  claimGraceExtension(): boolean;
  resetBlock(): boolean;
  getInstalledApps(): Promise<InstalledApp[]>;
}

let NativeAppBlocker: AppBlockerNativeModule | null = null;
try {
  NativeAppBlocker = requireNativeModule<AppBlockerNativeModule>('AppBlocker');
} catch (e) {
  console.warn('Native AppBlocker module not available yet in current JS runtime environment');
}

export const AppBlocker = {
  isServiceRunning(): boolean {
    return NativeAppBlocker?.isServiceRunning() ?? false;
  },

  startService(): boolean {
    return NativeAppBlocker?.startService() ?? false;
  },

  stopService(): boolean {
    return NativeAppBlocker?.stopService() ?? false;
  },

  updateRules(windowMinutes: number, allowanceMinutes: number, blockedPackages: string[]): boolean {
    return NativeAppBlocker?.updateRules(windowMinutes, allowanceMinutes, blockedPackages) ?? false;
  },

  getRemainingSeconds(): number {
    return NativeAppBlocker?.getRemainingSeconds() ?? 0;
  },

  getWindowRemainingSeconds(): number {
    return NativeAppBlocker?.getWindowRemainingSeconds() ?? 0;
  },

  claimGraceExtension(): boolean {
    return NativeAppBlocker?.claimGraceExtension() ?? false;
  },

  resetBlock(): boolean {
    return NativeAppBlocker?.resetBlock() ?? false;
  },

  async getInstalledApps(): Promise<InstalledApp[]> {
    if (!NativeAppBlocker) return [];
    try {
      return await NativeAppBlocker.getInstalledApps();
    } catch (e) {
      console.warn('Failed to get installed apps:', e);
      return [];
    }
  },
};

export default AppBlocker;
