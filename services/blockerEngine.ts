import AsyncStorage from '@react-native-async-storage/async-storage';
import AppBlocker, { AppUsageStat } from '../modules/app-blocker';
import {
  POSITIVE_ALTERNATIVES,
  PositiveAlternative,
  pickBestPositiveAlternative,
  resolveAppName,
} from '../constants/appCatalog';

export type TrackingMode = 'cumulative' | 'per_app';
export type FrictionType = 'math' | 'pledge' | 'memory';
export type MathDifficulty = 'easy' | 'medium' | 'hard';
export type StrictnessLevel = 'mindful' | 'disciplined' | 'fortress';
export type PositiveRedirectMode = 'auto' | 'manual';

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
  allowanceMinutes: number; // e.g. 10m, 15m, 30m, 0m (Hard Lock)
  strictnessOverride: StrictnessLevel;
}

export function isTimeInProfile(profile: TimeProfile, date = new Date()): boolean {
  if (!profile.enabled) return false;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = profile.startHour * 60 + profile.startMinute;
  const endMinutes = profile.endHour * 60 + profile.endMinute;

  if (startMinutes === endMinutes) return false;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
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
    tag: 'Stay focused during work. 10 min per hour.',
    icon: 'business-center',
    enabled: true,
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    windowMinutes: 60,
    allowanceMinutes: 10,
    strictnessOverride: 'disciplined',
  },
  {
    id: 'evening',
    name: 'Evening Wind-Down',
    tag: 'Relaxed browsing time. 30 min per 2 hours.',
    icon: 'wb-twilight',
    enabled: true,
    startHour: 19,
    startMinute: 0,
    endHour: 22,
    endMinute: 0,
    windowMinutes: 120,
    allowanceMinutes: 30,
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
  graceClaimed?: boolean;
  graceMinutesGranted?: number;
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
  oneHourAllowanceMinutes: number;
  twoHourAllowanceMinutes: number;
  currentBlockElapsedSeconds: number;
  usedSecondsInBlock: number;
  graceClaimedInCurrentBlock: boolean;
  graceSecondsRemaining: number;
  extraTime2MinEnabled: boolean;
  extraTime5MinEnabled: boolean;
  soundEnabled: boolean;
  frictionEnabled: boolean;
  frictionType: FrictionType;
  mathDifficulty: MathDifficulty;
  strictnessLevel: StrictnessLevel;
  breatheEnabled: boolean;
  positiveRedirectMode: PositiveRedirectMode;
  positiveRedirectPackage: string;
  positiveRedirectAppName: string;
  positiveAlternatives: PositiveAlternative[];
  windowRemainingSeconds: number;
  monitoredApps: MonitoredApp[];
  deviceApps: MonitoredApp[];
  auditLogs: AuditEvent[];
  urgeStats: UrgeStats;
  lastUptimeAnchor: number;

  // Smart Context & Time-of-Day Profiles
  profilesEnabled: boolean;
  timeProfiles: TimeProfile[];
  activeProfileId: string | null;
  baselineWindowMinutes: number;
  baselineAllowanceMinutes: number;
  baselineStrictnessLevel: StrictnessLevel;
}

const STORAGE_KEY = '@hourglass_blocker_state_v5';

const DEFAULT_APPS: MonitoredApp[] = [
  { id: '1', name: 'Instagram', packageName: 'com.instagram.android', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '2', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '3', name: 'YouTube', packageName: 'com.google.android.youtube', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '4', name: 'X', packageName: 'com.twitter.android', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '5', name: 'Reddit', packageName: 'com.reddit.frontpage', category: 'poison', blocked: true, dailyUsageMinutes: 0 },
  { id: '6', name: 'Facebook', packageName: 'com.facebook.katana', category: 'distraction', blocked: true, dailyUsageMinutes: 0 },
];

const INITIAL_STATE: BlockerState = {
  isShieldActive: true,
  trackingMode: 'per_app',
  windowMinutes: 60,
  allowanceMinutes: 15,
  oneHourAllowanceMinutes: 15,
  twoHourAllowanceMinutes: 30,
  currentBlockElapsedSeconds: 0,
  usedSecondsInBlock: 0,
  graceClaimedInCurrentBlock: false,
  graceSecondsRemaining: 0,
  extraTime2MinEnabled: true,
  extraTime5MinEnabled: true,
  soundEnabled: true,
  frictionEnabled: true,
  frictionType: 'math',
  mathDifficulty: 'medium',
  strictnessLevel: 'mindful',
  breatheEnabled: true,
  positiveRedirectMode: 'auto',
  positiveRedirectPackage: 'com.duolingo',
  positiveRedirectAppName: 'Duolingo',
  positiveAlternatives: POSITIVE_ALTERNATIVES,
  windowRemainingSeconds: 3600,
  monitoredApps: DEFAULT_APPS,
  deviceApps: DEFAULT_APPS,
  auditLogs: [
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'reset',
      title: 'Hourglass Ready',
      detail: 'Separate 15-min per-hour limits active across 6 starter apps.',
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
  baselineAllowanceMinutes: 15,
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
          positiveAlternatives:
            Array.isArray(parsed.positiveAlternatives) && parsed.positiveAlternatives.length > 0
              ? parsed.positiveAlternatives
              : POSITIVE_ALTERNATIVES,
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
      const nativeGraceClaimed = AppBlocker.isGraceClaimed();
      const totalAllowanceSeconds = this.state.allowanceMinutes * 60;
      let stateChanged = false;

      if (typeof remainingSecs === 'number' && remainingSecs >= 0) {
        const computedUsed = Math.max(0, totalAllowanceSeconds - remainingSecs);
        if (computedUsed !== this.state.usedSecondsInBlock) {
          this.state.usedSecondsInBlock = computedUsed;
          stateChanged = true;
        }
      }

      if (nativeGraceClaimed !== this.state.graceClaimedInCurrentBlock) {
        this.state.graceClaimedInCurrentBlock = nativeGraceClaimed;
        stateChanged = true;
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
            const nextGraceClaimed = stat.graceClaimed ?? false;
            const nextGraceMins = stat.graceMinutesGranted ?? 0;
            const friendlyName = resolveAppName(app.packageName, stat.appName || app.name);
            if (
              app.remainingSeconds !== stat.remainingSeconds ||
              app.windowRemainingSeconds !== stat.windowRemainingSeconds ||
              app.isLocked !== stat.isLocked ||
              app.graceClaimed !== nextGraceClaimed ||
              app.graceMinutesGranted !== nextGraceMins ||
              app.name !== friendlyName
            ) {
              anyAppChanged = true;
              return {
                ...app,
                name: friendlyName,
                remainingSeconds: stat.remainingSeconds,
                windowRemainingSeconds: stat.windowRemainingSeconds,
                isLocked: stat.isLocked,
                graceClaimed: nextGraceClaimed,
                graceMinutesGranted: nextGraceMins,
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
        this.notifyListenersOnly();
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
      const installedPkgSet = new Set(installed.map((item) => item.packageName));
      const iconLookup = new Map(
        installed
          .filter((item) => !!item.icon)
          .map((item) => [item.packageName, item.icon as string])
      );

      // Enrich monitored apps with human names and real launcher icons
      this.state.monitoredApps = this.state.monitoredApps.map((app) => {
        const match = installedMap.get(app.packageName);
        if (match) {
          return {
            ...app,
            name: resolveAppName(app.packageName, match.appName),
            category: (match.category as any) || app.category,
            icon: match.icon || app.icon,
          };
        }
        return {
          ...app,
          name: resolveAppName(app.packageName, app.name),
        };
      });

      this.state.deviceApps = installed.map((item) => ({
        id: `app-${item.packageName}`,
        name: resolveAppName(item.packageName, item.appName),
        packageName: item.packageName,
        category: (item.category as any) || 'utility',
        blocked: false,
        dailyUsageMinutes: 0,
        icon: item.icon,
      }));

      // Enrich ranked positive alternatives catalog with installed status & real icons
      const enrichedAlts = POSITIVE_ALTERNATIVES.map((alt) => ({
        ...alt,
        installed: installedPkgSet.has(alt.packageName),
        iconUri: iconLookup.get(alt.packageName),
      }));
      this.state.positiveAlternatives = enrichedAlts;

      // Apply smart default positive alternative if in 'auto' mode
      if (this.state.positiveRedirectMode === 'auto') {
        const best = pickBestPositiveAlternative(installedPkgSet, iconLookup);
        this.state.positiveRedirectPackage = best.packageName;
        this.state.positiveRedirectAppName = best.name;
      }

      this.notify();
      return this.state.deviceApps;
    } catch (e) {
      console.warn('Error loading installed apps:', e);
      return this.state.deviceApps;
    }
  }

  static addAppToMonitored(app: MonitoredApp): void {
    const cleanName = resolveAppName(app.packageName, app.name);
    const cleanApp = { ...app, name: cleanName, blocked: true };
    const existing = this.state.monitoredApps.find((a) => a.packageName === app.packageName);
    if (existing) {
      this.state.monitoredApps = this.state.monitoredApps.map((a) =>
        a.packageName === app.packageName ? { ...a, ...cleanApp, blocked: true } : a
      );
    } else {
      this.state.monitoredApps = [cleanApp, ...this.state.monitoredApps];
    }
    this.addAuditLog('reset', `Added ${cleanName}`, 'Now included in your guarded apps.');
    this.notify();
  }

  static removeAppFromMonitored(appId: string): void {
    const target = this.state.monitoredApps.find((a) => a.id === appId);
    this.state.monitoredApps = this.state.monitoredApps.filter((a) => a.id !== appId);
    if (target) {
      this.addAuditLog('reset', `Removed ${target.name}`, 'Removed from your guarded apps.');
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
      AppBlocker.setExtraTimeOptions(
        this.state.extraTime2MinEnabled,
        this.state.extraTime5MinEnabled
      );
      AppBlocker.setSoundEnabled(this.state.soundEnabled);
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

  private static notifyListenersOnly() {
    this.listeners.forEach((l) => l(this.state));
  }

  private static notify() {
    this.listeners.forEach((l) => l(this.state));
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)).catch(() => {});
    this.syncNative();
  }

  static toggleShield(): { active: boolean; error?: string } {
    if (this.state.isShieldActive && this.state.strictnessLevel !== 'mindful') {
      const hasLockedApps = this.state.monitoredApps.some((a) => a.blocked && a.isLocked);
      const isPoolLocked =
        this.state.trackingMode === 'cumulative' &&
        this.state.allowanceMinutes * 60 <= this.state.usedSecondsInBlock;
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
    const all =
      type === '1h'
        ? this.state.oneHourAllowanceMinutes || 15
        : this.state.twoHourAllowanceMinutes || 30;
    this.state.baselineWindowMinutes = win;
    this.state.baselineAllowanceMinutes = all;
    if (!this.state.profilesEnabled || !this.state.activeProfileId) {
      this.setRules(win, all);
    } else {
      this.notify();
    }
  }

  static setCustomAllowance(windowMinutes: 60 | 120, allowanceMinutes: number): void {
    const clamped = Math.max(1, Math.min(windowMinutes === 60 ? 55 : 90, allowanceMinutes));
    if (windowMinutes === 60) {
      this.state.oneHourAllowanceMinutes = clamped;
    } else {
      this.state.twoHourAllowanceMinutes = clamped;
    }
    this.state.baselineWindowMinutes = windowMinutes;
    this.state.baselineAllowanceMinutes = clamped;

    if (!this.state.profilesEnabled || !this.state.activeProfileId) {
      this.setRules(windowMinutes, clamped);
    } else {
      this.notify();
    }
  }

  static setTrackingMode(mode: TrackingMode): void {
    this.state.trackingMode = mode;
    this.addAuditLog(
      'reset',
      mode === 'per_app' ? 'Separate App Timers On' : 'Shared Pool On',
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

  static claimFrictionGrace(
    packageName?: string,
    minutes = 2
  ): { success: boolean; message: string } {
    const appLabel = packageName ? resolveAppName(packageName) : 'your apps';
    const isPerApp = this.state.trackingMode === 'per_app';

    if (!isPerApp && this.state.graceClaimedInCurrentBlock) {
      return {
        success: false,
        message: 'You already used your extra time for this cycle.',
      };
    }

    if (isPerApp && packageName) {
      const target = this.state.monitoredApps.find((a) => a.packageName === packageName);
      if (target?.graceClaimed || AppBlocker.isGraceClaimed(packageName)) {
        return {
          success: false,
          message: `You already used your extra time for ${appLabel} this cycle.`,
        };
      }
    }

    let granted = false;
    try {
      granted = AppBlocker.claimGraceExtension(packageName, minutes);
    } catch (e) {}

    if (!granted && AppBlocker.isGraceClaimed(packageName)) {
      return {
        success: false,
        message: isPerApp
          ? `You already used your extra time for ${appLabel} this cycle.`
          : 'You already used your extra time for this cycle.',
      };
    }

    this.recordUrge();
    if (!isPerApp) {
      this.state.graceClaimedInCurrentBlock = true;
      this.state.graceSecondsRemaining = minutes * 60;
    }

    if (packageName) {
      this.state.monitoredApps = this.state.monitoredApps.map((app) =>
        app.packageName === packageName
          ? { ...app, graceClaimed: true, graceMinutesGranted: minutes, isLocked: false }
          : app
      );
    }

    if (this.state.soundEnabled) {
      AppBlocker.playSound('extension');
    }

    this.addAuditLog(
      'extension',
      `+${minutes} Min Added (${appLabel})`,
      this.state.frictionEnabled
        ? `Completed check for ${minutes} extra minutes.`
        : `Added ${minutes} extra minutes.`
    );
    this.notify();
    this.syncFromNative();
    return {
      success: true,
      message: `${minutes} extra minutes added for ${appLabel}. Limits resume right after.`,
    };
  }

  static setExtraTimeOptions(allow2Min: boolean, allow5Min: boolean): void {
    // Keep at least one option selected unless user disables notifications separately
    this.state.extraTime2MinEnabled = allow2Min;
    this.state.extraTime5MinEnabled = allow5Min;
    this.notify();
  }

  static setSoundEnabled(enabled: boolean): void {
    this.state.soundEnabled = enabled;
    this.notify();
    if (enabled) {
      AppBlocker.playSound('chime');
    }
  }

  static playSound(type: 'warning' | 'lock' | 'extension' | 'breathe' | 'success' | 'error' | 'chime'): void {
    if (!this.state.soundEnabled) return;
    AppBlocker.playSound(type);
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
    this.state.positiveRedirectMode = 'manual';
    this.state.positiveRedirectPackage = packageName;
    this.state.positiveRedirectAppName = resolveAppName(packageName, appName);
    this.notify();
  }

  static setPositiveRedirectAuto(): void {
    this.state.positiveRedirectMode = 'auto';
    const installedSet = new Set(this.state.deviceApps.map((a) => a.packageName));
    const iconLookup = new Map(
      this.state.deviceApps
        .filter((a) => !!a.icon)
        .map((a) => [a.packageName, a.icon as string])
    );
    const best = pickBestPositiveAlternative(installedSet, iconLookup);
    this.state.positiveRedirectPackage = best.packageName;
    this.state.positiveRedirectAppName = best.name;
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
    this.state.monitoredApps = this.state.monitoredApps.map((a) =>
      !packageName || a.packageName === packageName
        ? { ...a, isLocked: false, graceClaimed: false, graceMinutesGranted: 0 }
        : a
    );
    this.addAuditLog('reset', 'Timer Reset', 'Fresh cycle started with full time available.');
    this.notify();
    this.syncFromNative();
  }
}
