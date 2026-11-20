package expo.modules.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class BlockerForegroundService : Service() {

    companion object {
        private const val NOTIFICATION_ID = 9182
        private const val CHANNEL_ID = "super_admin_fgs_channel"
        private const val CHANNEL_NAME = "Super Admin Background Monitor"

        var isRunning = false
            private set

        fun startService(context: Context) {
            val intent = Intent(context, BlockerForegroundService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stopService(context: Context) {
            val intent = Intent(context, BlockerForegroundService::class.java)
            context.stopService(intent)
        }
    }

    private var executor: ScheduledExecutorService? = null
    private var lastForegroundPackage: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForegroundWithCompat("Super Admin Active: Guarding hourly time limits")
        isRunning = true
        startMonitoringLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
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

    private fun startMonitoringLoop() {
        executor = Executors.newSingleThreadScheduledExecutor()
        executor?.scheduleWithFixedDelay({
            try {
                pollForegroundState()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }, 1000, 1000, TimeUnit.MILLISECONDS)
    }

    private fun pollForegroundState() {
        if (!BlockerStorage.isShieldEnabled(this)) {
            BlockerOverlayManager.hideOverlay(this)
            return
        }

        val currentPackage = getActiveForegroundPackage()
        lastForegroundPackage = currentPackage

        if (currentPackage != null && currentPackage != packageName) {
            val isGuarded = BlockerStorage.isPackageGuarded(this, currentPackage)

            if (isGuarded) {
                // Record 1 second of consumed usage
                BlockerStorage.recordUsage(this, 1000L)
                val remainingSeconds = BlockerStorage.getRemainingSeconds(this)

                if (remainingSeconds <= 0) {
                    // Allowance exhausted! Trigger overlay blocker immediately
                    BlockerOverlayManager.showOverlay(this, currentPackage)
                    updateNotification("Strict Lockdown: Hourly allowance exhausted")
                } else {
                    val mins = remainingSeconds / 60
                    val secs = remainingSeconds % 60
                    updateNotification("Allowance: ${mins}m ${secs}s remaining in this block")
                }
            } else {
                // User is not in a guarded app; hide overlay if it was shown
                BlockerOverlayManager.hideOverlay(this)
            }
        } else {
            // In our own app or launcher
            BlockerOverlayManager.hideOverlay(this)
        }
    }

    private fun getActiveForegroundPackage(): String? {
        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return null

        val endTime = System.currentTimeMillis()
        val beginTime = endTime - 4000L // Query last 4 seconds
        val events = usageStatsManager.queryEvents(beginTime, endTime)
        val event = UsageEvents.Event()

        var latestResumedPackage: String? = null
        var latestTimestamp = 0L

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED && event.timeStamp > latestTimestamp) {
                latestResumedPackage = event.packageName
                latestTimestamp = event.timeStamp
            }
        }

        if (latestResumedPackage != null) {
            return latestResumedPackage
        }

        // Fallback query if events were empty
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            beginTime,
            endTime
        )
        return stats?.maxByOrNull { it.lastTimeUsed }?.packageName
    }

    override fun onDestroy() {
        super.onDestroy()
        executor?.shutdownNow()
        BlockerOverlayManager.hideOverlay(this)
        isRunning = false
    }
}
