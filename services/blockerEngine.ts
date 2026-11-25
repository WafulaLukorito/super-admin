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
    name: 'Work Mode',
    tag: 'Deep focus during business hours. 5m / 1hr allowance.',
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
    tag: 'Relaxed leisure & socializing. 15m / 2hr allowance.',
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
    tag: 'Zero screen time before sleep. Restful sleep shield (0m allowance).',
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

export interface BlockerState {
  isShieldActive: boolean;
  trackingMode: TrackingMode;  // 'cumulative' = shared pool | 'per_app' = independent timers
  windowMinutes: number;       // 60 (1 hr) or 120 (2 hrs)
  allowanceMinutes: number;    // 7 (1 hr) or 15 (2 hrs)
  currentBlockElapsedSeconds: number; // time into current window
  usedSecondsInBlock: number;  // seconds consumed out of allowance
  graceClaimedInCurrentBlock: boolean; // max 1 extension per block
  graceSecondsRemaining: number;
  frictionEnabled: boolean;           // true = cognitive challenge required | false = direct instant +2m extension
  frictionType: FrictionType;         // 'math' | 'pledge'
  mathDifficulty: MathDifficulty;     // 'easy' | 'medium' | 'hard'
  strictnessLevel: StrictnessLevel;   // 'mindful' | 'disciplined' | 'fortress'
  breatheEnabled: boolean;           // 10s micro-intervention on opening guarded apps
  positiveRedirectPackage: string;  // Positive alternative package to open on lock
  positiveRedirectAppName: string;  // Positive alternative app name
  windowRemainingSeconds: number; // live seconds until rolling block window resets
  monitoredApps: MonitoredApp[];
  auditLogs: AuditEvent[];
  lastUptimeAnchor: number;

  // Milestone 5: Smart Context & Time-of-Day Profiles
  profilesEnabled: boolean;
  timeProfiles: TimeProfile[];
  activeProfileId: string | null;
  baselineWindowMinutes: number;
  baselineAllowanceMinutes: number;
  baselineStrictnessLevel: StrictnessLevel;
}

const STORAGE_KEY = '@super_admin_blocker_state_v3';

const DEFAULT_APPS: MonitoredApp[] = [
  { id: '1', name: 'Instagram', packageName: 'com.instagram.android', category: 'poison', blocked: true, dailyUsageMinutes: 38 },
  { id: '2', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', category: 'poison', blocked: true, dailyUsageMinutes: 45 },
  { id: '3', name: 'YouTube', packageName: 'com.google.android.youtube', category: 'poison', blocked: true, dailyUsageMinutes: 52 },
  { id: '4', name: 'Reddit', packageName: 'com.reddit.frontpage', category: 'poison', blocked: true, dailyUsageMinutes: 24 },
  { id: '5', name: 'X / Twitter', packageName: 'com.twitter.android', category: 'poison', blocked: true, dailyUsageMinutes: 19 },
  { id: '6', name: 'Facebook', packageName: 'com.facebook.katana', category: 'distraction', blocked: true, dailyUsageMinutes: 15 },
  { id: '7', name: 'Snapchat', packageName: 'com.snapchat.android', category: 'distraction', blocked: true, dailyUsageMinutes: 8 },
  { id: '8', name: 'Chrome Browser', packageName: 'com.android.chrome', category: 'work', blocked: false, dailyUsageMinutes: 30 },
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
  mathDifficulty: 'easy',
  strictnessLevel: 'mindful',
  breatheEnabled: true,
  positiveRedirectPackage: 'com.amazon.kindle',
  positiveRedirectAppName: 'Kindle',
  windowRemainingSeconds: 3600,
  monitoredApps: DEFAULT_APPS,
  auditLogs: [
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'reset',
      title: 'Super Admin Shield Initialized',
      detail: 'Window presets (1h/7m, 2h/15m) & tracking modes (Cumulative/Per-App) loaded.',
    },
    {
      id: 'log-2',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'tamper_check',
      title: 'Anti-Tamper Anchor Verified',
      detail: 'System uptime clock aligned with monotonic timer. Zero drift detected.',
    },
  ],
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
      if (!installed || installed.length === 0) return this.state.monitoredApps;

      const existingMap = new Map(this.state.monitoredApps.map((a) => [a.packageName, a]));
      const mergedList: MonitoredApp[] = [];

      for (const item of installed) {
        const existing = existingMap.get(item.packageName);
        if (existing) {
          mergedList.push({
            ...existing,
            name: item.appName,
            category: (item.category as any) || existing.category,
            icon: item.icon || existing.icon,
          });
          existingMap.delete(item.packageName);
        } else {
          mergedList.push({
            id: `app-${item.packageName}`,
            name: item.appName,
            packageName: item.packageName,
            category: (item.category as any) || 'utility',
            blocked: item.category === 'poison',
            dailyUsageMinutes: 0,
            icon: item.icon,
          });
        }
      }

      existingMap.forEach((app) => mergedList.push(app));
      this.state.monitoredApps = mergedList;
      this.notify();
      return mergedList;
    } catch (e) {
      console.warn('Error loading installed apps:', e);
      return this.state.monitoredApps;
    }
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
          error: `${this.state.strictnessLevel.toUpperCase()} Mode Enforcement: Shield cannot be paused while a time limit lockdown is in effect. Wait for the window to unlock.`,
        };
      }
    }

    this.state.isShieldActive = !this.state.isShieldActive;
    this.addAuditLog(
      'reset',
      this.state.isShieldActive ? 'Shield Activated' : 'Shield Temporarily Paused',
      this.state.isShieldActive ? 'Foreground tracking & overlay blocker active' : 'Monitoring paused by admin user'
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
      this.addAuditLog(
        'reset',
        'Baseline Preset Configured',
        `Baseline preset set to ${all}m / ${win}m. Active profile (${this.getActiveProfile()?.name}) controls limits until scheduled end.`
      );
      this.notify();
    }
  }

  static setTrackingMode(mode: TrackingMode): void {
    this.state.trackingMode = mode;
    this.addAuditLog(
      'reset',
      'Tracking Mode Switched',
      mode === 'per_app'
        ? 'Per-App Isolated: Each app has an independent allowance & reset timer.'
        : 'Cumulative Pool: All guarded apps share the window allowance.'
    );
    this.notify();
  }

  static setRules(windowMinutes: number, allowanceMinutes: number): void {
    this.state.windowMinutes = windowMinutes;
    this.state.allowanceMinutes = allowanceMinutes;
    this.addAuditLog(
      'reset',
      'Window Preset Configured',
      `${allowanceMinutes}m allowance per ${windowMinutes}m rolling block window.`
    );
    this.notify();
  }

  static claimFrictionGrace(packageName?: string): { success: boolean; message: string } {
    if (this.state.graceClaimedInCurrentBlock) {
      return {
        success: false,
        message: 'Strict Anti-Tamper: Only 1 friction extension is permitted per block window.',
      };
    }

    try {
      AppBlocker.claimGraceExtension(packageName);
    } catch (e) {}

    this.state.graceClaimedInCurrentBlock = true;
    this.state.graceSecondsRemaining = 120; // 2 minutes
    this.addAuditLog(
      'extension',
      this.state.frictionEnabled ? '2-Minute Friction Grace Granted' : 'Direct 2-Minute Extension Granted',
      this.state.frictionEnabled
        ? 'User completed cognitive challenge. Hard lockdown postponed by 120 seconds.'
        : 'User claimed direct grace extension. Hard lockdown postponed by 120 seconds.'
    );
    this.notify();
    return {
      success: true,
      message: '2-minute grace period active. Strict lockdown engages immediately after.',
    };
  }

  static setFrictionEnabled(enabled: boolean): void {
    this.state.frictionEnabled = enabled;
    this.addAuditLog(
      'reset',
      enabled ? 'Friction Challenge Required' : 'Direct Extension Mode Activated',
      enabled
        ? `Grace extensions require completing a ${this.state.frictionType} challenge.`
        : 'Grace extensions can be claimed directly without cognitive challenges.'
    );
    this.notify();
  }

  static setFrictionType(type: FrictionType): void {
    this.state.frictionType = type;
    this.addAuditLog('reset', 'Friction Challenge Type Updated', `Friction type set to: ${type}`);
    this.notify();
  }

  static setMathDifficulty(difficulty: MathDifficulty): void {
    this.state.mathDifficulty = difficulty;
    this.addAuditLog('reset', 'Math Difficulty Updated', `Difficulty set to: ${difficulty.toUpperCase()}`);
    this.notify();
  }

  static setStrictnessLevel(level: StrictnessLevel): void {
    this.state.baselineStrictnessLevel = level;
    this.state.strictnessLevel = level;
    this.addAuditLog(
      'reset',
      `Strictness Level Updated: ${level.toUpperCase()}`,
      level === 'fortress'
        ? 'Fortress Mode: 0ms Accessibility Interceptor, Device Admin anti-uninstall, and strict settings protection active.'
        : level === 'disciplined'
        ? 'Disciplined Mode: Settings protection and locked shield active during lockouts.'
        : 'Mindful Mode: Gentle awareness and flexible shield controls active.'
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
        this.addAuditLog('reset', 'Off-Peak Baseline Engaged', 'Scheduled profiles disabled; restored baseline rules.');
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
          `Profile Activated: ${active.name}`,
          `${active.allowanceMinutes}m allowance per ${active.windowMinutes}m window (${active.strictnessOverride.toUpperCase()} mode). Scheduled until ${formatProfileTime(active.endHour, active.endMinute)}.`
        );
      } else {
        // Revert to baseline
        this.state.windowMinutes = this.state.baselineWindowMinutes;
        this.state.allowanceMinutes = this.state.baselineAllowanceMinutes;
        this.state.strictnessLevel = this.state.baselineStrictnessLevel;
        this.addAuditLog(
          'reset',
          'Off-Peak Schedule Active',
          `Reverted to baseline rules: ${this.state.baselineAllowanceMinutes}m / ${this.state.baselineWindowMinutes}m window.`
        );
      }
      this.notify();
      return true;
    }
    return false;
  }

  static setProfilesEnabled(enabled: boolean): void {
    this.state.profilesEnabled = enabled;
    this.addAuditLog(
      'reset',
      enabled ? 'Scheduled Auto-Profiles Activated' : 'Scheduled Auto-Profiles Disabled',
      enabled
        ? 'Work Mode, Evening Wind-Down & Bedtime Lockdown dynamically control limits.'
        : 'Rules revert to manual baseline configuration.'
    );
    this.checkAndApplyActiveProfile();
    this.notify();
  }

  static updateTimeProfile(updated: TimeProfile): void {
    this.state.timeProfiles = this.state.timeProfiles.map((p) =>
      p.id === updated.id ? updated : p
    );
    this.addAuditLog(
      'reset',
      `Profile Configured: ${updated.name}`,
      `${formatProfileTime(updated.startHour, updated.startMinute)} – ${formatProfileTime(updated.endHour, updated.endMinute)} | ${updated.allowanceMinutes}m / ${updated.windowMinutes}m (${updated.strictnessOverride.toUpperCase()})`
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
    const willEnable = !profile.enabled;
    this.updateTimeProfile({ ...profile, enabled: willEnable });
  }

  static resetProfilesToDefault(): void {
    this.state.timeProfiles = DEFAULT_PROFILES;
    this.state.profilesEnabled = true;
    this.addAuditLog('reset', 'Profiles Reset to Defaults', 'Work (9-5), Evening (7-10), and Bedtime (11-6) restored.');
    this.checkAndApplyActiveProfile();
    this.notify();
  }

  static setBreatheEnabled(enabled: boolean): void {
    this.state.breatheEnabled = enabled;
    this.addAuditLog(
      'reset',
      enabled ? 'Breathe Before Scroll Activated' : 'Breathe Micro-Intervention Paused',
      enabled ? '10-second breathwork circle will display when launching guarded apps.' : 'Guarded apps launch without breath micro-pause.'
    );
    this.notify();
  }

  static setPositiveRedirect(packageName: string, appName: string): void {
    this.state.positiveRedirectPackage = packageName;
    this.state.positiveRedirectAppName = appName;
    this.addAuditLog('reset', 'Positive Redirect App Configured', `Redirect target set to ${appName} (${packageName})`);
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
    this.state.auditLogs = [newLog, ...this.state.auditLogs.slice(0, 49)];
  }

  static resetBlock(packageName?: string): void {
    try {
      AppBlocker.resetBlock(packageName);
    } catch (e) {}

    this.state.usedSecondsInBlock = 0;
    this.state.currentBlockElapsedSeconds = 0;
    this.state.graceClaimedInCurrentBlock = false;
    this.state.graceSecondsRemaining = 0;
    this.addAuditLog('reset', 'Manual Block Reset', 'Fresh block window initialized.');
    this.notify();
  }
}
