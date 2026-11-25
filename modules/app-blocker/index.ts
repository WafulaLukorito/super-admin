import { requireNativeModule } from 'expo-modules-core';

export interface InstalledApp {
  packageName: string;
  appName: string;
  isSystemApp: boolean;
  category: 'poison' | 'game' | 'utility';
  icon?: string;
}

export interface AppUsageStat {
  packageName: string;
  remainingSeconds: number;
  windowRemainingSeconds: number;
  consumedSeconds: number;
  isLocked: boolean;
}

interface AppBlockerNativeModule {
  isServiceRunning(): boolean;
  startService(): boolean;
  stopService(): boolean;
  updateRules(windowMinutes: number, allowanceMinutes: number, blockedPackages: string[], trackingMode?: string): boolean;
  getRemainingSeconds(packageName?: string): number;
  getWindowRemainingSeconds(packageName?: string): number;
  getTrackingMode(): string;
  setTrackingMode(mode: string): boolean;
  getAllAppStats(): AppUsageStat[];
  claimGraceExtension(packageName?: string): boolean;
  setFrictionSettings(enabled: boolean, type: string, mathDifficulty: string): boolean;
  isFrictionEnabled(): boolean;
  getFrictionType(): string;
  getMathDifficulty(): string;
  resetBlock(packageName?: string): boolean;
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

  updateRules(windowMinutes: number, allowanceMinutes: number, blockedPackages: string[], trackingMode?: string): boolean {
    return NativeAppBlocker?.updateRules(windowMinutes, allowanceMinutes, blockedPackages, trackingMode) ?? false;
  },

  getRemainingSeconds(packageName?: string): number {
    return NativeAppBlocker?.getRemainingSeconds(packageName) ?? 0;
  },

  getWindowRemainingSeconds(packageName?: string): number {
    return NativeAppBlocker?.getWindowRemainingSeconds(packageName) ?? 0;
  },

  getTrackingMode(): string {
    return NativeAppBlocker?.getTrackingMode() ?? 'cumulative';
  },

  setTrackingMode(mode: string): boolean {
    return NativeAppBlocker?.setTrackingMode(mode) ?? false;
  },

  getAllAppStats(): AppUsageStat[] {
    return NativeAppBlocker?.getAllAppStats() ?? [];
  },

  claimGraceExtension(packageName?: string): boolean {
    return NativeAppBlocker?.claimGraceExtension(packageName) ?? false;
  },

  setFrictionSettings(enabled: boolean, type: string, mathDifficulty: string): boolean {
    return NativeAppBlocker?.setFrictionSettings(enabled, type, mathDifficulty) ?? false;
  },

  isFrictionEnabled(): boolean {
    return NativeAppBlocker?.isFrictionEnabled() ?? true;
  },

  getFrictionType(): string {
    return NativeAppBlocker?.getFrictionType() ?? 'math';
  },

  getMathDifficulty(): string {
    return NativeAppBlocker?.getMathDifficulty() ?? 'easy';
  },

  resetBlock(packageName?: string): boolean {
    return NativeAppBlocker?.resetBlock(packageName) ?? false;
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
