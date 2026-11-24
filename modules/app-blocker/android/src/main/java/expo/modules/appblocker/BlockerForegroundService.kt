package expo.modules.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class BlockerForegroundService : Service() {

    companion object {
        private const val TAG = "SuperAdminBlocker"
        private const val NOTIFICATION_ID = 9182
        private const val CHANNEL_ID = "super_admin_fgs_channel"
        private const val CHANNEL_NAME = "Super Admin Background Monitor"

        var isRunning = false
            private set

        @Volatile
        private var forcedClearedPackage = false

        fun startService(context: Context) {
            val intent = Intent(context, BlockerForegroundService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stopService(context: Context) {
            val intent = Intent(context, BlockerForegroundService::class.java)
            context.stopService(intent)
        }

        fun notifyLeavingBlockedApp() {
            forcedClearedPackage = true
        }
    }

    private var executor: ScheduledExecutorService? = null
    private var lastEventTimestamp: Long = 0L
    private var activeForegroundPackage: String? = null
    private var isScreenOn = true
    private var screenReceiver: BroadcastReceiver? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "BlockerForegroundService onCreate")
        createNotificationChannel()
        startForegroundWithCompat("Super Admin Active: Guarding hourly time limits")
        isRunning = true

        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        isScreenOn = powerManager?.isInteractive ?: true

        registerScreenReceiver()

        if (isScreenOn) {
            startMonitoringLoop()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    private fun registerScreenReceiver() {
        screenReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                when (intent?.action) {
                    Intent.ACTION_SCREEN_OFF -> {
                        Log.d(TAG, "Screen OFF -> pausing monitoring loop")
                        isScreenOn = false
                        stopMonitoringLoop()
                        BlockerOverlayManager.hideOverlay(this@BlockerForegroundService)
                    }
                    Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> {
                        Log.d(TAG, "Screen ON / User Present -> resuming monitoring loop")
                        if (!isScreenOn) {
                            isScreenOn = true
                            startMonitoringLoop()
                        }
                    }
                }
            }
        }
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        registerReceiver(screenReceiver, filter)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors app usage and enforces hourly block allowances"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(contentText: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Super Admin Shield")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun startForegroundWithCompat(contentText: String) {
        val notification = buildNotification(contentText)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateNotification(contentText: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(contentText))
    }

    @Synchronized
    private fun startMonitoringLoop() {
        if (executor != null && !executor!!.isShutdown) return
        executor = Executors.newSingleThreadScheduledExecutor()
        executor?.scheduleWithFixedDelay({
            try {
                if (isScreenOn) {
                    pollForegroundState()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in pollForegroundState", e)
            }
        }, 500, 1000, TimeUnit.MILLISECONDS)
    }

    @Synchronized
    private fun stopMonitoringLoop() {
        executor?.shutdownNow()
        executor = null
    }

    private fun updateActiveForegroundPackage() {
        if (forcedClearedPackage) {
            forcedClearedPackage = false
            activeForegroundPackage = null
        }

        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return
        val now = System.currentTimeMillis()

        try {
            // Cold start or cursor reset: look back up to 10 minutes to locate current foreground activity
            if (lastEventTimestamp == 0L || (now - lastEventTimestamp) > 15 * 60 * 1000L) {
                lastEventTimestamp = now - 10 * 60 * 1000L
            }

            val events = usageStatsManager.queryEvents(lastEventTimestamp, now)
            val event = UsageEvents.Event()
            var maxEventTime = lastEventTimestamp

            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                if (event.timeStamp > maxEventTime) {
                    maxEventTime = event.timeStamp
                }

                if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                    activeForegroundPackage = event.packageName
                    Log.v(TAG, "Event ACTIVITY_RESUMED: ${event.packageName}")
                }
            }

            // Keep cursor near real-time, leaving 1s buffer for slightly delayed events
            lastEventTimestamp = maxOf(maxEventTime, now - 1000L)
        } catch (e: Exception) {
            Log.e(TAG, "Error querying UsageEvents", e)
        }

        // Fallback: If activeForegroundPackage is still null on cold start, check recent usage stats
        if (activeForegroundPackage == null) {
            try {
                val stats = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY,
                    now - 5000L,
                    now
                )
                val recent = stats?.maxByOrNull { it.lastTimeUsed }
                if (recent != null && (now - recent.lastTimeUsed) < 5000L) {
                    activeForegroundPackage = recent.packageName
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error querying UsageStats fallback", e)
            }
        }
    }

    private fun pollForegroundState() {
        if (!isScreenOn) return

        if (!BlockerStorage.isShieldEnabled(this)) {
            BlockerOverlayManager.hideOverlay(this)
            return
        }

        updateActiveForegroundPackage()
        val currentPackage = activeForegroundPackage

        if (currentPackage != null && currentPackage != packageName) {
            val isGuarded = BlockerStorage.isPackageGuarded(this, currentPackage)

            if (isGuarded) {
                // Record 1 second of consumed usage
                BlockerStorage.recordUsage(this, 1000L)
                val remainingSeconds = BlockerStorage.getRemainingSeconds(this)

                Log.d(TAG, "Guarded app active: $currentPackage | Remaining: ${remainingSeconds}s")

                if (remainingSeconds <= 0) {
                    // Allowance exhausted! Trigger overlay blocker immediately
                    BlockerOverlayManager.showOverlay(this, currentPackage)
                    updateNotification("Strict Lockdown: Hourly allowance exhausted ($currentPackage)")
                } else {
                    BlockerOverlayManager.hideOverlay(this)
                    val mins = remainingSeconds / 60
                    val secs = remainingSeconds % 60
                    updateNotification("Allowance: ${mins}m ${secs}s remaining ($currentPackage)")
                }
            } else {
                // Non-guarded app (e.g., Launcher, Phone, Settings)
                BlockerOverlayManager.hideOverlay(this)
            }
        } else {
            // In our own app or launcher/unknown
            BlockerOverlayManager.hideOverlay(this)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "BlockerForegroundService onDestroy")
        screenReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {}
            screenReceiver = null
        }
        stopMonitoringLoop()
        BlockerOverlayManager.hideOverlay(this)
        isRunning = false
    }
}
