import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MonitoredApp {
  id: string;
  name: string;
  packageName: string;
  category: 'poison' | 'distraction' | 'work';
  blocked: boolean;
  dailyUsageMinutes: number;
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
  windowMinutes: number;       // default: 60
  allowanceMinutes: number;    // default: 10
  currentBlockElapsedSeconds: number; // time into current 60m block
  usedSecondsInBlock: number;  // seconds consumed out of allowance
  graceClaimedInCurrentBlock: boolean; // max 1 extension per block
  graceSecondsRemaining: number;
  monitoredApps: MonitoredApp[];
  auditLogs: AuditEvent[];
  lastUptimeAnchor: number;
}

const STORAGE_KEY = '@super_admin_blocker_state_v2';

const DEFAULT_APPS: MonitoredApp[] = [
  { id: '1', name: 'Instagram', packageName: 'com.instagram.android', category: 'poison', blocked: true, dailyUsageMinutes: 38 },
  { id: '2', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', category: 'poison', blocked: true, dailyUsageMinutes: 45 },
  { id: '3', name: 'YouTube', packageName: 'com.google.android.youtube', category: 'poison', blocked: true, dailyUsageMinutes: 52 },
  { id: '4', name: 'Reddit', packageName: 'com.reddit.frontpage', category: 'poison', blocked: true, dailyUsageMinutes: 24 },
  { id: '5', name: 'X / Twitter', packageName: 'com.twitter.android', category: 'poison', blocked: true, dailyUsageMinutes: 19 },
  { id: '6', name: 'Facebook', packageName: 'com.facebook.katana', category: 'distraction', blocked: true, dailyUsageMinutes: 15 },
  { id: '7', name: 'Snapchat', packageName: 'com.snapchat.android', category: 'distraction', blocked: false, dailyUsageMinutes: 8 },
  { id: '8', name: 'Chrome Browser', packageName: 'com.android.chrome', category: 'work', blocked: false, dailyUsageMinutes: 30 },
];

const INITIAL_STATE: BlockerState = {
  isShieldActive: true,
  windowMinutes: 60,
  allowanceMinutes: 10,
  currentBlockElapsedSeconds: 2640, // 44 mins into current hour
  usedSecondsInBlock: 570,          // 9m 30s used of 10m allowance
  graceClaimedInCurrentBlock: false,
  graceSecondsRemaining: 0,
  monitoredApps: DEFAULT_APPS,
  auditLogs: [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'lock',
      title: 'Allowance Nearing Zero (30s left)',
      detail: 'Instagram & TikTok will lock in 30 seconds for the rest of this 60m window.',
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'reset',
      title: '60-Minute Block Window Started',
      detail: '10-minute high-dopamine allowance credited.',
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 105).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'extension',
      title: 'Friction Extension Resolved',
      detail: '+2m grace period granted after mindful arithmetic verification.',
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    return this.state;
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

  private static notify() {
    this.listeners.forEach((l) => l(this.state));
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)).catch(() => {});
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

  static setRules(windowMinutes: number, allowanceMinutes: number): void {
    this.state.windowMinutes = windowMinutes;
    this.state.allowanceMinutes = allowanceMinutes;
    this.addAuditLog(
      'reset',
      'Rule Configuration Updated',
      `Set to ${allowanceMinutes}m allowance per ${windowMinutes}m rolling block window.`
    );
    this.notify();
  }

  static claimFrictionGrace(): { success: boolean; message: string } {
    if (this.state.graceClaimedInCurrentBlock) {
      return {
        success: false,
        message: 'Strict Anti-Tamper: Only 1 friction extension is permitted per hourly block window.',
      };
    }

    this.state.graceClaimedInCurrentBlock = true;
    this.state.graceSecondsRemaining = 120; // 2 minutes
    this.addAuditLog(
      'extension',
      '2-Minute Friction Grace Granted',
      'User passed cognitive challenge. Hard lockdown postponed by 120 seconds.'
    );
    this.notify();
    return {
      success: true,
      message: '2-minute grace period active. Strict lockdown engages immediately after.',
    };
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

  static resetBlock(): void {
    this.state.usedSecondsInBlock = 0;
    this.state.currentBlockElapsedSeconds = 0;
    this.state.graceClaimedInCurrentBlock = false;
    this.state.graceSecondsRemaining = 0;
    this.addAuditLog('reset', 'Manual Block Reset', 'New hourly interval started.');
    this.notify();
  }
}
