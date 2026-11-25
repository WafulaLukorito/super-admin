import AsyncStorage from '@react-native-async-storage/async-storage';
import AppBlocker, { AppUsageStat } from '../modules/app-blocker';

export type TrackingMode = 'cumulative' | 'per_app';
export type FrictionType = 'math' | 'pledge' | 'memory';
export type MathDifficulty = 'easy' | 'medium' | 'hard';
export type StrictnessLevel = 'mindful' | 'disciplined' | 'fortress';

export interface TimeProfile {
  id: 'work' | 'evening' | 'bedtime' | string;
  name: string;
  tag: string;
  icon: string;
  enabled: boolean;
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number; // 0-23
  endMinute: number; // 0-59
  windowMinutes: number; // 60 or 120
  allowanceMinutes: number; // e.g. 5m, 15m, 0m (Hard Lock)
  strictnessOverride: StrictnessLevel;
}

export function isTimeInProfile(profile: TimeProfile, date = new Date()): boolean {
  if (!profile.enabled) return false;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = profile.startHour * 60 + profile.startMinute;
  const endMinutes = profile.endHour * 60 + profile.endMinute;

  if (startMinutes === endMinutes) return false;

  if (startMinutes < endMinutes) {
    // Normal same-day window (e.g. 9:00 AM to 5:00 PM: 540 to 1020)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight window (e.g. 11:00 PM to 6:00 AM: 1380 to 360)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

export function formatProfileTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const minStr = minute < 10 ? `0${minute}` : `${minute}`;
  return `${h12}:${minStr} ${period}`;
}

export const DEFAULT_PROFILES: TimeProfile[] = [
  {
    id: 'work',
    name: 'Work Hours',
    tag: 'Stay focused during work. 5 min per hour.',
    icon: 'business-center',
    enabled: true,
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    windowMinutes: 60,
    allowanceMinutes: 5,
    strictnessOverride: 'disciplined',
  },
  {
    id: 'evening',
    name: 'Evening Wind-Down',
    tag: 'Relaxed browsing time. 15 min per 2 hours.',
    icon: 'wb-twilight',
    enabled: true,
    startHour: 19,
    startMinute: 0,
    endHour: 22,
    endMinute: 0,
    windowMinutes: 120,
    allowanceMinutes: 15,
    strictnessOverride: 'mindful',
  },
  {
    id: 'bedtime',
    name: 'Bedtime Lockdown',
    tag: 'Protected sleep hours. Apps stay locked until morning.',
    icon: 'nights-stay',
    enabled: true,
    startHour: 23,
    startMinute: 0,
    endHour: 6,
    endMinute: 0,
    windowMinutes: 60,
    allowanceMinutes: 0,
    strictnessOverride: 'fortress',
  },
];

export interface MonitoredApp {
  id: string;
  name: string;
  packageName: string;
  category: 'poison' | 'distraction' | 'work' | 'game' | 'utility' | 'custom';
  blocked: boolean;
  dailyUsageMinutes: number;
  icon?: string;
  remainingSeconds?: number;
  windowRemainingSeconds?: number;
  isLocked?: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: 'lock' | 'extension' | 'reset' | 'tamper_check';
  title: string;
  detail: string;
}

export interface UrgeStats {
  morning: number;   // 6 AM - 12 PM
  midday: number;    // 12 PM - 5 PM
  evening: number;   // 5 PM - 10 PM
  lateNight: number; // 10 PM - 6 AM
}

export interface BlockerState {
  isShieldActive: boolean;
  trackingMode: TrackingMode;
  windowMinutes: number;
  allowanceMinutes: number;
  currentBlockElapsedSeconds: number;
  usedSecondsInBlock: number;
  graceClaimedInCurrentBlock: boolean;
  graceSecondsRemaining: number;
  frictionEnabled: boolean;
  frictionType: FrictionType;
  mathDifficulty: MathDifficulty;
  strictnessLevel: StrictnessLevel;
  breatheEnabled: boolean;
  positiveRedirectPackage: string;
  positiveRedirectAppName: string;
  windowRemainingSeconds: number;
  monitoredApps: MonitoredApp[];
  deviceApps: MonitoredApp[];
  auditLogs: AuditEvent[];
  urgeStats: UrgeStats;
  lastUptimeAnchor: number;

  // Milestone 5: Smart Context & Time-of-Day Profiles
  profilesEnabled: boolean;
  timeProfiles: TimeProfile[];
  activeProfileId: string | null;
  baselineWindowMinutes: number;
  baselineAllowanceMinutes: number;
  baselineStrictnessLevel: StrictnessLevel;
}

const STORAGE_KEY = '@hourglass_blocker_state_v4';

const DEFAULT_APPS: MonitoredApp[] = [
  { id: '1', name: 'Instagram', packageName: 'com.instagram.android', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '2', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '3', name: 'YouTube', packageName: 'com.google.android.youtube', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '4', name: 'X / Twitter', packageName: 'com.twitter.android', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '5', name: 'Reddit', packageName: 'com.reddit.frontpage', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '6', name: 'Facebook', packageName: 'com.facebook.katana', category: 'distraction', blocked: true, dailyUsageMinutes: 0 },
];

const INITIAL_STATE: BlockerState = {
  isShieldActive: true,
  trackingMode: 'cumulative',
  windowMinutes: 60,
  allowanceMinutes: 7,
  currentBlockElapsedSeconds: 0,
  usedSecondsInBlock: 0,
  graceClaimedInCurrentBlock: false,
  graceSecondsRemaining: 0,
  frictionEnabled: true,
  frictionType: 'math',
  mathDifficulty: 'medium',
  strictnessLevel: 'mindful',
  breatheEnabled: true,
  positiveRedirectPackage: 'com.amazon.kindle',
  positiveRedirectAppName: 'Kindle',
  windowRemainingSeconds: 3600,
  monitoredApps: DEFAULT_APPS,
  deviceApps: DEFAULT_APPS,
  auditLogs: [
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'reset',
      title: 'Hourglass Ready',
      detail: 'Protecting your focus across 6 starter apps.',
    },
  ],
  urgeStats: {
    morning: 0,
    midday: 0,
    evening: 0,
    lateNight: 0,
  },
  lastUptimeAnchor: Date.now(),
  profilesEnabled: true,
  timeProfiles: DEFAULT_PROFILES,
  activeProfileId: null,
  baselineWindowMinutes: 60,
  baselineAllowanceMinutes: 7,
  baselineStrictnessLevel: 'mindful',
};

export class BlockerEngine {
  private static state: BlockerState = INITIAL_STATE;
  private static listeners: Array<(state: BlockerState) => void> = [];
  private static isInitialized = false;

  static async init(): Promise<BlockerState> {
    if (this.isInitialized) return this.state;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = {
          ...INITIAL_STATE,
          ...parsed,
          timeProfiles:
            Array.isArray(parsed.timeProfiles) && parsed.timeProfiles.length > 0
              ? parsed.timeProfiles
              : DEFAULT_PROFILES,
        };
      }
    } catch (err) {
      console.warn('Failed to load blocker state from AsyncStorage:', err);
    }
    this.isInitialized = true;
    this.checkAndApplyActiveProfile();
    this.syncNative();
    this.syncFromNative();
    this.loadInstalledAppsFromDevice().catch(() => {});
    return this.state;
  }

  static syncFromNative(): void {
    try {
      this.checkAndApplyActiveProfile();
      const remainingSecs = AppBlocker.getRemainingSeconds();
      const windowRemainingSecs = AppBlocker.getWindowRemainingSeconds();
      const totalAllowanceSeconds = this.state.allowanceMinutes * 60;
      let stateChanged = false;

      if (typeof remainingSecs === 'number' && remainingSecs >= 0) {
        const computedUsed = Math.max(0, totalAllowanceSeconds - remainingSecs);
        if (computedUsed !== this.state.usedSecondsInBlock) {
          this.state.usedSecondsInBlock = computedUsed;
          stateChanged = true;
        }
      }

      if (typeof windowRemainingSecs === 'number' && windowRemainingSecs >= 0) {
        if (windowRemainingSecs !== this.state.windowRemainingSeconds) {
          this.state.windowRemainingSeconds = windowRemainingSecs;
          this.state.currentBlockElapsedSeconds = Math.max(0, this.state.windowMinutes * 60 - windowRemainingSecs);
          stateChanged = true;
        }
      }

      // Synchronize per-app breakdown
      const allStats = AppBlocker.getAllAppStats();
      if (Array.isArray(allStats) && allStats.length > 0) {
        const statsMap = new Map<string, AppUsageStat>(allStats.map((s) => [s.packageName, s]));
        let anyAppChanged = false;
        const updatedApps = this.state.monitoredApps.map((app) => {
          const stat = statsMap.get(app.packageName);
          if (stat) {
            if (
              app.remainingSeconds !== stat.remainingSeconds ||
              app.windowRemainingSeconds !== stat.windowRemainingSeconds ||
              app.isLocked !== stat.isLocked
            ) {
              anyAppChanged = true;
              return {
                ...app,
                remainingSeconds: stat.remainingSeconds,
                windowRemainingSeconds: stat.windowRemainingSeconds,
                isLocked: stat.isLocked,
              };
            }
          }
          return app;
        });

        if (anyAppChanged) {
          this.state.monitoredApps = updatedApps;
          stateChanged = true;
        }
      }

      if (stateChanged) {
        this.notify();
      }
    } catch (e) {
      console.warn('Sync from native error:', e);
    }
  }

  static async loadInstalledAppsFromDevice(): Promise<MonitoredApp[]> {
    try {
      const installed = await AppBlocker.getInstalledApps();
      if (!installed || installed.length === 0) return this.state.deviceApps;

      const installedMap = new Map(installed.map((item) => [item.packageName, item]));

      // Enrich icons/names of the curated guarded apps without flooding the home screen
      this.state.monitoredApps = this.state.monitoredApps.map((app) => {
        const match = installedMap.get(app.packageName);
        if (match) {
          return {
            ...app,
            name: match.appName,
            category: (match.category as any) || app.category,
            icon: match.icon || app.icon,
          };
        }
        return app;
      });

      this.state.deviceApps = installed.map((item) => ({
        id: `app-${item.packageName}`,
        name: item.appName,
        packageName: item.packageName,
        category: (item.category as any) || 'utility',
        blocked: false,
        dailyUsageMinutes: 0,
        icon: item.icon,
      }));

      this.notify();
      return this.state.deviceApps;
    } catch (e) {
      console.warn('Error loading installed apps:', e);
      return this.state.deviceApps;
    }
  }

  static addAppToMonitored(app: MonitoredApp): void {
    const existing = this.state.monitoredApps.find((a) => a.packageName === app.packageName);
    if (existing) {
      this.state.monitoredApps = this.state.monitoredApps.map((a) =>
        a.packageName === app.packageName ? { ...a, blocked: true } : a
      );
    } else {
      this.state.monitoredApps = [
        { ...app, blocked: true },
        ...this.state.monitoredApps,
      ];
    }
    this.addAuditLog('reset', `Added ${app.name}`, 'Now included in your guarded apps list.');
    this.notify();
  }

  static removeAppFromMonitored(appId: string): void {
    const target = this.state.monitoredApps.find((a) => a.id === appId);
    this.state.monitoredApps = this.state.monitoredApps.filter((a) => a.id !== appId);
    if (target) {
      this.addAuditLog('reset', `Removed ${target.name}`, 'Removed from your guarded apps list.');
    }
    this.notify();
  }

  static getState(): BlockerState {
    return this.state;
  }

  static subscribe(listener: (state: BlockerState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static syncNative() {
    try {
      if (this.state.isShieldActive) {
        AppBlocker.startService();
      } else {
        AppBlocker.stopService();
      }
      const blockedPkgs = this.state.monitoredApps
        .filter((a) => a.blocked)
        .map((a) => a.packageName);
      AppBlocker.updateRules(
        this.state.windowMinutes,
        this.state.allowanceMinutes,
        blockedPkgs,
        this.state.trackingMode
      );
      AppBlocker.setFrictionSettings(
        this.state.frictionEnabled,
        this.state.frictionType,
        this.state.mathDifficulty
      );
      AppBlocker.setStrictnessLevel(this.state.strictnessLevel);
      AppBlocker.setBreatheEnabled(this.state.breatheEnabled);
      AppBlocker.setPositiveRedirect(
        this.state.positiveRedirectPackage,
        this.state.positiveRedirectAppName
      );
      AppBlocker.setActiveProfile(
        this.state.activeProfileId,
        this.state.activeProfileId ? this.getActiveProfile()?.name || null : null
      );
    } catch (e) {
      console.warn('Sync with native daemon error:', e);
    }
  }

  private static notify() {
    this.listeners.forEach((l) => l(this.state));
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)).catch(() => {});
    this.syncNative();
  }

  static toggleShield(): { active: boolean; error?: string } {
    if (this.state.isShieldActive && this.state.strictnessLevel !== 'mindful') {
      const hasLockedApps = this.state.monitoredApps.some((a) => a.isLocked);
      const isPoolLocked = this.state.trackingMode === 'cumulative' && (this.state.allowanceMinutes * 60 <= this.state.usedSecondsInBlock);
      if (hasLockedApps || isPoolLocked) {
        return {
          active: true,
          error: `Your limits are locked right now under ${this.state.strictnessLevel === 'fortress' ? 'Fortress' : 'Disciplined'} mode. They will reopen when the current cycle resets.`,
        };
      }
    }

    this.state.isShieldActive = !this.state.isShieldActive;
    this.addAuditLog(
      'reset',
      this.state.isShieldActive ? 'Limits Active' : 'Limits Paused',
      this.state.isShieldActive ? 'Monitoring your guarded apps.' : 'Time limits temporarily paused.'
    );
    this.notify();
    return { active: this.state.isShieldActive };
  }

  static toggleAppBlock(appId: string): void {
    this.state.monitoredApps = this.state.monitoredApps.map((app) =>
      app.id === appId ? { ...app, blocked: !app.blocked } : app
    );
    this.notify();
  }

  static setPreset(type: '1h' | '2h'): void {
    const win = type === '1h' ? 60 : 120;
    const all = type === '1h' ? 7 : 15;
    this.state.baselineWindowMinutes = win;
    this.state.baselineAllowanceMinutes = all;
    if (!this.state.profilesEnabled || !this.state.activeProfileId) {
      this.setRules(win, all);
    } else {
      this.notify();
    }
  }

  static setTrackingMode(mode: TrackingMode): void {
    this.state.trackingMode = mode;
    this.addAuditLog(
      'reset',
      mode === 'per_app' ? 'Switched to Separate App Timers' : 'Switched to Shared Limit',
      mode === 'per_app'
        ? 'Each guarded app now tracks its own independent time limit.'
        : 'All guarded apps now share one combined timer.'
    );
    this.notify();
  }

  static setRules(windowMinutes: number, allowanceMinutes: number): void {
    this.state.windowMinutes = windowMinutes;
    this.state.allowanceMinutes = allowanceMinutes;
    this.notify();
  }

  private static recordUrge(date = new Date()): void {
    const h = date.getHours();
    const stats = { ...(this.state.urgeStats || INITIAL_STATE.urgeStats) };
    if (h >= 6 && h < 12) stats.morning += 1;
    else if (h >= 12 && h < 17) stats.midday += 1;
    else if (h >= 17 && h < 22) stats.evening += 1;
    else stats.lateNight += 1;
    this.state.urgeStats = stats;
  }

  static claimFrictionGrace(packageName?: string): { success: boolean; message: string } {
    if (this.state.graceClaimedInCurrentBlock) {
      return {
        success: false,
        message: 'You already used your extra 2 minutes for this cycle.',
      };
    }

    try {
      AppBlocker.claimGraceExtension(packageName);
    } catch (e) {}

    this.recordUrge();
    this.state.graceClaimedInCurrentBlock = true;
    this.state.graceSecondsRemaining = 120;
    this.addAuditLog(
      'extension',
      '2 Extra Minutes Added',
      this.state.frictionEnabled
        ? 'Completed the quick check for 2 extra minutes.'
        : 'Added 2 extra minutes to the current cycle.'
    );
    this.notify();
    return {
      success: true,
      message: '2 extra minutes added. Limits resume right after.',
    };
  }

  static setFrictionEnabled(enabled: boolean): void {
    this.state.frictionEnabled = enabled;
    this.notify();
  }

  static setFrictionType(type: FrictionType): void {
    this.state.frictionType = type;
    this.notify();
  }

  static setMathDifficulty(difficulty: MathDifficulty): void {
    this.state.mathDifficulty = difficulty;
    this.notify();
  }

  static setStrictnessLevel(level: StrictnessLevel): void {
    this.state.baselineStrictnessLevel = level;
    this.state.strictnessLevel = level;
    const label = level === 'fortress' ? 'Fortress' : level === 'disciplined' ? 'Disciplined' : 'Mindful';
    this.addAuditLog(
      'reset',
      `Protection set to ${label}`,
      level === 'fortress'
        ? 'Maximum protection active.'
        : level === 'disciplined'
        ? 'Limits stay locked once time runs out.'
        : 'Flexible limits and gentle reminders.'
    );
    this.notify();
  }

  static evaluateActiveProfile(now = new Date()): TimeProfile | null {
    if (!this.state.profilesEnabled) return null;
    for (const p of this.state.timeProfiles) {
      if (isTimeInProfile(p, now)) {
        return p;
      }
    }
    return null;
  }

  static getActiveProfile(): TimeProfile | null {
    if (!this.state.activeProfileId) return null;
    return this.state.timeProfiles.find((p) => p.id === this.state.activeProfileId) || null;
  }

  static checkAndApplyActiveProfile(): boolean {
    if (!this.state.profilesEnabled) {
      if (this.state.activeProfileId !== null) {
        this.state.activeProfileId = null;
        this.state.windowMinutes = this.state.baselineWindowMinutes;
        this.state.allowanceMinutes = this.state.baselineAllowanceMinutes;
        this.state.strictnessLevel = this.state.baselineStrictnessLevel;
        this.notify();
        return true;
      }
      return false;
    }

    const active = this.evaluateActiveProfile();
    const activeId = active ? active.id : null;

    if (activeId !== this.state.activeProfileId) {
      this.state.activeProfileId = activeId;
      if (active) {
        this.state.windowMinutes = active.windowMinutes;
        this.state.allowanceMinutes = active.allowanceMinutes;
        this.state.strictnessLevel = active.strictnessOverride || this.state.strictnessLevel;
        this.addAuditLog(
          'reset',
          `${active.name} Started`,
          active.allowanceMinutes === 0
            ? `Protected sleep hours until ${formatProfileTime(active.endHour, active.endMinute)}.`
            : `${active.allowanceMinutes} min per ${active.windowMinutes === 120 ? '2 hours' : 'hour'} until ${formatProfileTime(active.endHour, active.endMinute)}.`
        );
      } else {
        this.state.windowMinutes = this.state.baselineWindowMinutes;
        this.state.allowanceMinutes = this.state.baselineAllowanceMinutes;
        this.state.strictnessLevel = this.state.baselineStrictnessLevel;
        this.addAuditLog(
          'reset',
          'Standard Schedule Active',
          `${this.state.baselineAllowanceMinutes} min per ${this.state.baselineWindowMinutes === 120 ? '2 hours' : 'hour'}.`
        );
      }
      this.notify();
      return true;
    }
    return false;
  }

  static setProfilesEnabled(enabled: boolean): void {
    this.state.profilesEnabled = enabled;
    this.checkAndApplyActiveProfile();
    this.notify();
  }

  static updateTimeProfile(updated: TimeProfile): void {
    this.state.timeProfiles = this.state.timeProfiles.map((p) =>
      p.id === updated.id ? updated : p
    );
    if (this.state.activeProfileId === updated.id) {
      this.state.windowMinutes = updated.windowMinutes;
      this.state.allowanceMinutes = updated.allowanceMinutes;
      this.state.strictnessLevel = updated.strictnessOverride;
    }
    this.checkAndApplyActiveProfile();
    this.notify();
  }

  static toggleTimeProfile(id: string): void {
    const profile = this.state.timeProfiles.find((p) => p.id === id);
    if (!profile) return;
    this.updateTimeProfile({ ...profile, enabled: !profile.enabled });
  }

  static resetProfilesToDefault(): void {
    this.state.timeProfiles = DEFAULT_PROFILES;
    this.state.profilesEnabled = true;
    this.checkAndApplyActiveProfile();
    this.notify();
  }

  static setBreatheEnabled(enabled: boolean): void {
    this.state.breatheEnabled = enabled;
    this.notify();
  }

  static setPositiveRedirect(packageName: string, appName: string): void {
    this.state.positiveRedirectPackage = packageName;
    this.state.positiveRedirectAppName = appName;
    this.notify();
  }

  static addAuditLog(type: AuditEvent['type'], title: string, detail: string): void {
    const newLog: AuditEvent = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      title,
      detail,
    };
    this.state.auditLogs = [newLog, ...this.state.auditLogs.slice(0, 14)];
  }

  static resetBlock(packageName?: string): void {
    try {
      AppBlocker.resetBlock(packageName);
    } catch (e) {}

    this.state.usedSecondsInBlock = 0;
    this.state.currentBlockElapsedSeconds = 0;
    this.state.graceClaimedInCurrentBlock = false;
    this.state.graceSecondsRemaining = 0;
    this.addAuditLog('reset', 'Timer Reset', 'Fresh cycle started with full time available.');
    this.notify();
  }
}
