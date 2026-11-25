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
        private const val CHANNEL_NAME = "Hourglass Background Monitor"
        private const val WARNING_CHANNEL_ID = "super_admin_heads_up_channel"
        private const val WARNING_CHANNEL_NAME = "Hourglass Warning Alerts"
        private const val WARNING_NOTIFICATION_ID = 9183

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
        startForegroundWithCompat("Hourglass Active: Guarding time limits")
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
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors app usage and enforces block window allowances"
                setShowBadge(false)
            }
            manager.createNotificationChannel(channel)

            val warningChannel = NotificationChannel(
                WARNING_CHANNEL_ID,
                WARNING_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High-priority heads-up popups when app allowance is running low"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 150, 300)
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(warningChannel)
        }
    }

    private fun getAppName(packageName: String): String {
        return try {
            val pm = packageManager
            val info = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(info).toString()
        } catch (e: Exception) {
            packageName.substringAfterLast('.').replaceFirstChar { it.uppercase() }
        }
    }

    private fun sendWarningNotification(targetPackage: String, minsLeft: Int) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val appName = getAppName(targetPackage)

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(GraceExtensionReceiver.EXTRA_OPEN_FRICTION, true)
            putExtra(GraceExtensionReceiver.EXTRA_PACKAGE_NAME, targetPackage)
        }
        val contentPendingIntent = PendingIntent.getActivity(
            this,
            1001,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val actionIntent = Intent(this, GraceExtensionReceiver::class.java).apply {
            action = GraceExtensionReceiver.ACTION_EXTEND_GRACE
            putExtra(GraceExtensionReceiver.EXTRA_PACKAGE_NAME, targetPackage)
            putExtra(GraceExtensionReceiver.EXTRA_NOTIFICATION_ID, WARNING_NOTIFICATION_ID)
        }
        val actionPendingIntent = PendingIntent.getBroadcast(
            this,
            1002,
            actionIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = "$appName: $minsLeft min remaining!"
        val body = if (minsLeft == 1) {
            "Only 1 minute left before $appName locks. Tap below to claim +2m extension."
        } else {
            "2 minutes left of your allowance. Tap below to claim +2m extension."
        }

        val notification = NotificationCompat.Builder(this, WARNING_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(contentPendingIntent)
            .addAction(
                android.R.drawable.ic_input_add,
                "+2m Extension",
                actionPendingIntent
            )
            .build()

        nm.notify(WARNING_NOTIFICATION_ID, notification)
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
            .setContentTitle("Hourglass Shield")
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

            lastEventTimestamp = maxOf(maxEventTime, now - 1000L)
        } catch (e: Exception) {
            Log.e(TAG, "Error querying UsageEvents", e)
        }

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
            val strictness = BlockerStorage.getStrictnessLevel(this)

            // Settings Protection (Disciplined & Fortress)
            if (strictness != BlockerStorage.STRICTNESS_MINDFUL &&
                (currentPackage == "com.android.settings" ||
                 currentPackage == "com.google.android.packageinstaller" ||
                 currentPackage == "com.android.packageinstaller")) {
                if (BlockerStorage.isAnyAppLocked(this)) {
                    Log.w(TAG, "Settings access blocked during active lockdown: $currentPackage")
                    BlockerOverlayManager.hideOverlay(this)
                    goToHomeScreen()
                    return
                }
            }

            val isGuarded = BlockerStorage.isPackageGuarded(this, currentPackage)

            if (isGuarded) {
                // Record usage for currentPackage (in per_app mode it updates that app's timer; in cumulative mode it updates shared pool)
                BlockerStorage.recordUsage(this, 1000L, currentPackage)
                val remainingSeconds = BlockerStorage.getRemainingSeconds(this, currentPackage)
                val trackingMode = BlockerStorage.getTrackingMode(this)

                Log.d(TAG, "Guarded app active: $currentPackage | Remaining: ${remainingSeconds}s | Mode: $trackingMode")

                if (remainingSeconds <= 0) {
                    // Allowance exhausted! Trigger overlay blocker immediately
                    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                    nm?.cancel(WARNING_NOTIFICATION_ID)

                    BlockerOverlayManager.showOverlay(this, currentPackage)
                    val windowRemainingSecs = BlockerStorage.getWindowRemainingSeconds(this, currentPackage)
                    val wHours = windowRemainingSecs / 3600
                    val wMins = (windowRemainingSecs % 3600) / 60
                    val wSecs = windowRemainingSecs % 60
                    val countdownStr = if (wHours > 0) "${wHours}h ${wMins}m" else "${wMins}m ${wSecs}s"
                    val modeLabel = if (trackingMode == BlockerStorage.MODE_PER_APP) "Isolated" else "Pool"
                    updateNotification("Strict Lockdown: Unlocks in $countdownStr [$modeLabel] ($currentPackage)")
                } else {
                    // Breathe Before Scroll check
                    if (BlockerStorage.shouldShowBreathe(this, currentPackage)) {
                        BlockerOverlayManager.showBreatheOverlay(this, currentPackage)
                    } else {
                        BlockerOverlayManager.hideOverlay(this)
                    }

                    // Heads-up pop-up warning at 2 minutes and 1 minute remaining
                    if (remainingSeconds in 61..120) {
                        if (BlockerStorage.shouldShow2MinWarning(this, currentPackage)) {
                            BlockerStorage.mark2MinWarningShown(this, currentPackage)
                            sendWarningNotification(currentPackage, 2)
                        }
                    } else if (remainingSeconds in 1..60) {
                        if (BlockerStorage.shouldShow1MinWarning(this, currentPackage)) {
                            BlockerStorage.mark1MinWarningShown(this, currentPackage)
                            sendWarningNotification(currentPackage, 1)
                        }
                    }

                    val mins = remainingSeconds / 60
                    val secs = remainingSeconds % 60
                    val modeLabel = if (trackingMode == BlockerStorage.MODE_PER_APP) "Isolated" else "Pool"
                    updateNotification("Allowance: ${mins}m ${secs}s left [$modeLabel] ($currentPackage)")
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

    private fun goToHomeScreen() {
        try {
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(homeIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch home intent", e)
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
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        nm?.cancel(WARNING_NOTIFICATION_ID)
        BlockerOverlayManager.hideOverlay(this)
        isRunning = false
    }
}
