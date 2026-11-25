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
        private const val CHANNEL_ID = "hourglass_fgs_channel"
        private const val CHANNEL_NAME = "Hourglass Background Monitor"
        private const val WARNING_CHANNEL_ID = "hourglass_heads_up_v2"
        private const val WARNING_CHANNEL_NAME = "Hourglass Time Warnings"
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
    private var lastLockedPackage: String? = null
    private var isScreenOn = true
    private var screenReceiver: BroadcastReceiver? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "BlockerForegroundService onCreate")
        createNotificationChannel()
        startForegroundWithCompat("Protecting your focus limits")
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
                        isScreenOn = false
                        stopMonitoringLoop()
                        dismissWarningNotification()
                        BlockerOverlayManager.hideOverlay(this@BlockerForegroundService)
                    }
                    Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> {
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
                description = "Monitors active app timers in the background"
                setShowBadge(false)
            }
            manager.createNotificationChannel(channel)

            val warningChannel = NotificationChannel(
                WARNING_CHANNEL_ID,
                WARNING_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Sticky heads-up alerts at 2 minutes and 1 minute remaining"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 220, 120, 220)
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(warningChannel)
        }
    }

    private fun dismissWarningNotification() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        nm?.cancel(WARNING_NOTIFICATION_ID)
    }

    private fun buildGraceActionPendingIntent(
        targetPackage: String,
        minutes: Int,
        requestCode: Int
    ): PendingIntent {
        val actionIntent = Intent(this, GraceExtensionReceiver::class.java).apply {
            action = GraceExtensionReceiver.ACTION_EXTEND_GRACE
            putExtra(GraceExtensionReceiver.EXTRA_PACKAGE_NAME, targetPackage)
            putExtra(GraceExtensionReceiver.EXTRA_NOTIFICATION_ID, WARNING_NOTIFICATION_ID)
            putExtra(GraceExtensionReceiver.EXTRA_MINUTES, minutes)
        }
        return PendingIntent.getBroadcast(
            this,
            requestCode,
            actionIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun sendWarningNotification(targetPackage: String, minsLeft: Int) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val appName = AppNameResolver.getAppName(this, targetPackage)
        val canExtend = BlockerStorage.canClaimGrace(this, targetPackage)
        val allow2 = BlockerStorage.isExtra2MinEnabled(this)
        val allow5 = BlockerStorage.isExtra5MinEnabled(this)

        val defaultExtraMins = if (allow2) 2 else if (allow5) 5 else 2

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(GraceExtensionReceiver.EXTRA_OPEN_FRICTION, canExtend)
            putExtra(GraceExtensionReceiver.EXTRA_PACKAGE_NAME, targetPackage)
            putExtra(GraceExtensionReceiver.EXTRA_MINUTES, defaultExtraMins)
        }
        val contentPendingIntent = PendingIntent.getActivity(
            this,
            1001,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (minsLeft == 1) {
            "$appName • 1 minute remaining"
        } else {
            "$appName • 2 minutes remaining"
        }

        val body = if (!canExtend) {
            if (minsLeft == 1) {
                "Final minute before $appName pauses."
            } else {
                "2 minutes left on $appName. Extra time was already used this cycle."
            }
        } else if (allow2 && allow5) {
            if (minsLeft == 1) {
                "1 minute left before $appName pauses. Add time without leaving:"
            } else {
                "2 minutes left on your timer. Need +2 or +5 extra minutes?"
            }
        } else {
            "Need $defaultExtraMins more minutes on $appName? Tap below:"
        }

        val builder = NotificationCompat.Builder(this, WARNING_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setOngoing(true) // Sticky at the top while user stays inside the app
            .setOnlyAlertOnce(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(contentPendingIntent)

        if (canExtend) {
            if (allow2) {
                builder.addAction(
                    android.R.drawable.ic_input_add,
                    "+2 Min",
                    buildGraceActionPendingIntent(targetPackage, 2, 1002)
                )
            }
            if (allow5) {
                builder.addAction(
                    android.R.drawable.ic_input_add,
                    "+5 Min",
                    buildGraceActionPendingIntent(targetPackage, 5, 1005)
                )
            }
        }

        // Play soft warning chime alongside heads-up popup
        SoundFeedbackManager.play(this, "warning")

        nm.notify(WARNING_NOTIFICATION_ID, builder.build())
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
            .setContentTitle("Hourglass")
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
            dismissWarningNotification()
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
                    dismissWarningNotification()
                    BlockerOverlayManager.hideOverlay(this)
                    goToHomeScreen()
                    return
                }
            }

            val isGuarded = BlockerStorage.isPackageGuarded(this, currentPackage)

            if (isGuarded) {
                val appLabel = AppNameResolver.getAppName(this, currentPackage)
                BlockerStorage.recordUsage(this, 1000L, currentPackage)
                val remainingSeconds = BlockerStorage.getRemainingSeconds(this, currentPackage)
                val trackingMode = BlockerStorage.getTrackingMode(this)
                val modeLabel = if (trackingMode == BlockerStorage.MODE_PER_APP) "Per-App" else "Shared"

                if (remainingSeconds <= 0) {
                    dismissWarningNotification()
                    if (lastLockedPackage != currentPackage) {
                        lastLockedPackage = currentPackage
                        SoundFeedbackManager.play(this, "lock")
                    }

                    BlockerOverlayManager.showOverlay(this, currentPackage)
                    val windowRemainingSecs = BlockerStorage.getWindowRemainingSeconds(this, currentPackage)
                    val wHours = windowRemainingSecs / 3600
                    val wMins = (windowRemainingSecs % 3600) / 60
                    val wSecs = windowRemainingSecs % 60
                    val countdownStr = if (wHours > 0) "${wHours}h ${wMins}m" else "${wMins}m ${wSecs}s"
                    updateNotification("$appLabel paused • Reopens in $countdownStr ($modeLabel)")
                } else {
                    lastLockedPackage = null

                    if (BlockerStorage.shouldShowBreathe(this, currentPackage)) {
                        BlockerOverlayManager.showBreatheOverlay(this, currentPackage)
                    } else {
                        BlockerOverlayManager.hideOverlay(this)
                    }

                    // Sticky heads-up warning triggered twice: at 2 mins remaining AND 1 min remaining
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
                    } else {
                        dismissWarningNotification()
                    }

                    val mins = remainingSeconds / 60
                    val secs = remainingSeconds % 60
                    updateNotification("$appLabel: ${mins}m ${secs}s left ($modeLabel)")
                }
            } else {
                lastLockedPackage = null
                dismissWarningNotification()
                BlockerOverlayManager.hideOverlay(this)
                updateNotification("Protecting your focus limits")
            }
        } else {
            lastLockedPackage = null
            dismissWarningNotification()
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
        screenReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {}
            screenReceiver = null
        }
        stopMonitoringLoop()
        dismissWarningNotification()
        BlockerOverlayManager.hideOverlay(this)
        isRunning = false
    }
}
