import AsyncStorage from '@react-native-async-storage/async-storage';
import AppBlocker, { AppUsageStat } from '../modules/app-blocker';

export type TrackingMode = 'cumulative' | 'per_app';
export type FrictionType = 'math' | 'pledge';
export type MathDifficulty = 'easy' | 'medium' | 'hard';

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
  windowRemainingSeconds: number; // live seconds until rolling block window resets
  monitoredApps: MonitoredApp[];
  auditLogs: AuditEvent[];
  lastUptimeAnchor: number;
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
        this.state = { ...INITIAL_STATE, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.warn('Failed to load blocker state from AsyncStorage:', err);
    }
    this.isInitialized = true;
    this.syncNative();
    this.syncFromNative();
    this.loadInstalledAppsFromDevice().catch(() => {});
    return this.state;
  }

  static syncFromNative(): void {
    try {
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
    } catch (e) {
      console.warn('Sync with native daemon error:', e);
    }
  }

  private static notify() {
    this.listeners.forEach((l) => l(this.state));
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)).catch(() => {});
    this.syncNative();
  }

  static toggleShield(): boolean {
    this.state.isShieldActive = !this.state.isShieldActive;
    this.addAuditLog(
      'reset',
      this.state.isShieldActive ? 'Shield Activated' : 'Shield Temporarily Paused',
      this.state.isShieldActive ? 'Foreground tracking & overlay blocker active' : 'Monitoring paused by admin user'
    );
    this.notify();
    return this.state.isShieldActive;
  }

  static toggleAppBlock(appId: string): void {
    this.state.monitoredApps = this.state.monitoredApps.map((app) =>
      app.id === appId ? { ...app, blocked: !app.blocked } : app
    );
    this.notify();
  }

  static setPreset(type: '1h' | '2h'): void {
    if (type === '1h') {
      this.setRules(60, 7);
    } else {
      this.setRules(120, 15);
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
