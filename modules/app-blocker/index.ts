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
  getStrictnessLevel(): string;
  setStrictnessLevel(level: string): boolean;
  isBreatheEnabled(): boolean;
  setBreatheEnabled(enabled: boolean): boolean;
  getPositiveRedirectPackage(): string;
  getPositiveRedirectName(): string;
  setPositiveRedirect(packageName: string, appName: string): boolean;
  setActiveProfile(profileId: string | null, profileName: string | null): boolean;
  getActiveProfileId(): string | null;
  getActiveProfileName(): string | null;
  isAccessibilityServiceActive(): boolean;
  openAccessibilitySettings(): boolean;
  isDeviceAdminActive(): boolean;
  requestDeviceAdminActivation(): boolean;
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

  getStrictnessLevel(): string {
    return NativeAppBlocker?.getStrictnessLevel() ?? 'mindful';
  },

  setStrictnessLevel(level: string): boolean {
    return NativeAppBlocker?.setStrictnessLevel(level) ?? false;
  },

  isBreatheEnabled(): boolean {
    return NativeAppBlocker?.isBreatheEnabled() ?? true;
  },

  setBreatheEnabled(enabled: boolean): boolean {
    return NativeAppBlocker?.setBreatheEnabled(enabled) ?? false;
  },

  getPositiveRedirectPackage(): string {
    return NativeAppBlocker?.getPositiveRedirectPackage() ?? 'com.amazon.kindle';
  },

  getPositiveRedirectName(): string {
    return NativeAppBlocker?.getPositiveRedirectName() ?? 'Kindle';
  },

  setPositiveRedirect(packageName: string, appName: string): boolean {
    return NativeAppBlocker?.setPositiveRedirect(packageName, appName) ?? false;
  },

  setActiveProfile(profileId: string | null, profileName: string | null): boolean {
    return NativeAppBlocker?.setActiveProfile(profileId, profileName) ?? false;
  },

  getActiveProfileId(): string | null {
    return NativeAppBlocker?.getActiveProfileId() ?? null;
  },

  getActiveProfileName(): string | null {
    return NativeAppBlocker?.getActiveProfileName() ?? null;
  },

  isAccessibilityServiceActive(): boolean {
    return NativeAppBlocker?.isAccessibilityServiceActive() ?? false;
  },

  openAccessibilitySettings(): boolean {
    return NativeAppBlocker?.openAccessibilitySettings() ?? false;
  },

  isDeviceAdminActive(): boolean {
    return NativeAppBlocker?.isDeviceAdminActive() ?? false;
  },

  requestDeviceAdminActivation(): boolean {
    return NativeAppBlocker?.requestDeviceAdminActivation() ?? false;
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
