package expo.modules.appblocker

import android.content.Context
import android.content.SharedPreferences
import android.os.SystemClock

object BlockerStorage {
    private const val PREFS_NAME = "super_admin_blocker_prefs"

    private const val KEY_WINDOW_MINS = "window_minutes"
    private const val KEY_ALLOWANCE_MINS = "allowance_minutes"
    private const val KEY_BLOCKED_PKGS = "blocked_packages"
    private const val KEY_BLOCK_START_REALTIME = "block_start_realtime"
    private const val KEY_CONSUMED_MILLIS = "consumed_millis"
    private const val KEY_GRACE_CLAIMED = "grace_claimed"
    private const val KEY_GRACE_MILLIS = "grace_millis"
    private const val KEY_IS_ENABLED = "is_shield_enabled"
    private const val KEY_TRACKING_MODE = "tracking_mode"

    const val MODE_CUMULATIVE = "cumulative"
    const val MODE_PER_APP = "per_app"

    private val DEFAULT_BLOCKED_PACKAGES = setOf(
        "com.instagram.android",
        "com.zhiliaoapp.musically",
        "com.google.android.youtube",
        "com.reddit.frontpage",
        "com.twitter.android",
        "com.facebook.katana",
        "com.snapchat.android"
    )

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    @Synchronized
    fun getTrackingMode(context: Context): String {
        return getPrefs(context).getString(KEY_TRACKING_MODE, MODE_CUMULATIVE) ?: MODE_CUMULATIVE
    }

    @Synchronized
    fun setTrackingMode(context: Context, mode: String) {
        val targetMode = if (mode == MODE_PER_APP) MODE_PER_APP else MODE_CUMULATIVE
        getPrefs(context).edit().putString(KEY_TRACKING_MODE, targetMode).apply()
    }

    private fun getBlockStartKey(context: Context, packageName: String?): String {
        return if (packageName != null && getTrackingMode(context) == MODE_PER_APP) {
            "${KEY_BLOCK_START_REALTIME}_$packageName"
        } else {
            KEY_BLOCK_START_REALTIME
        }
    }

    private fun getConsumedMillisKey(context: Context, packageName: String?): String {
        return if (packageName != null && getTrackingMode(context) == MODE_PER_APP) {
            "${KEY_CONSUMED_MILLIS}_$packageName"
        } else {
            KEY_CONSUMED_MILLIS
        }
    }

    private fun getGraceClaimedKey(context: Context, packageName: String?): String {
        return if (packageName != null && getTrackingMode(context) == MODE_PER_APP) {
            "${KEY_GRACE_CLAIMED}_$packageName"
        } else {
            KEY_GRACE_CLAIMED
        }
    }

    private fun getGraceMillisKey(context: Context, packageName: String?): String {
        return if (packageName != null && getTrackingMode(context) == MODE_PER_APP) {
            "${KEY_GRACE_MILLIS}_$packageName"
        } else {
            KEY_GRACE_MILLIS
        }
    }

    @Synchronized
    fun isShieldEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_IS_ENABLED, true)
    }

    @Synchronized
    fun setShieldEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_IS_ENABLED, enabled).apply()
    }

    @Synchronized
    fun getBlockedPackages(context: Context): Set<String> {
        return getPrefs(context).getStringSet(KEY_BLOCKED_PKGS, DEFAULT_BLOCKED_PACKAGES) ?: DEFAULT_BLOCKED_PACKAGES
    }

    @Synchronized
    fun updateRules(
        context: Context,
        windowMinutes: Int,
        allowanceMinutes: Int,
        blockedPackages: List<String>,
        trackingMode: String? = null
    ): Boolean {
        val editor = getPrefs(context).edit()
            .putInt(KEY_WINDOW_MINS, windowMinutes)
            .putInt(KEY_ALLOWANCE_MINS, allowanceMinutes)
            .putStringSet(KEY_BLOCKED_PKGS, blockedPackages.toSet())

        if (trackingMode != null) {
            val targetMode = if (trackingMode == MODE_PER_APP) MODE_PER_APP else MODE_CUMULATIVE
            editor.putString(KEY_TRACKING_MODE, targetMode)
        }

        editor.apply()
        return true
    }

    @Synchronized
    fun checkAndResetWindowIfNeeded(context: Context, packageName: String? = null) {
        val prefs = getPrefs(context)
        val windowMins = prefs.getInt(KEY_WINDOW_MINS, 60)
        val windowDurationMillis = windowMins * 60 * 1000L
        val currentRealtime = SystemClock.elapsedRealtime()

        val startKey = getBlockStartKey(context, packageName)
        val consumedKey = getConsumedMillisKey(context, packageName)
        val graceClaimedKey = getGraceClaimedKey(context, packageName)
        val graceMillisKey = getGraceMillisKey(context, packageName)

        var blockStart = prefs.getLong(startKey, 0L)
        if (blockStart == 0L || (currentRealtime - blockStart) >= windowDurationMillis) {
            // Window expired or not started; start a fresh block window
            prefs.edit()
                .putLong(startKey, currentRealtime)
                .putLong(consumedKey, 0L)
                .putBoolean(graceClaimedKey, false)
                .putLong(graceMillisKey, 0L)
                .apply()
        }
    }

    @Synchronized
    fun recordUsage(context: Context, deltaMillis: Long, packageName: String? = null) {
        checkAndResetWindowIfNeeded(context, packageName)
        val prefs = getPrefs(context)
        val consumedKey = getConsumedMillisKey(context, packageName)
        val currentConsumed = prefs.getLong(consumedKey, 0L)
        prefs.edit().putLong(consumedKey, currentConsumed + deltaMillis).apply()
    }

    @Synchronized
    fun getRemainingSeconds(context: Context, packageName: String? = null): Int {
        checkAndResetWindowIfNeeded(context, packageName)
        val prefs = getPrefs(context)
        val allowanceMins = prefs.getInt(KEY_ALLOWANCE_MINS, 7)
        val graceMillisKey = getGraceMillisKey(context, packageName)
        val consumedKey = getConsumedMillisKey(context, packageName)
        val graceMillis = prefs.getLong(graceMillisKey, 0L)
        val totalAllowedMillis = (allowanceMins * 60 * 1000L) + graceMillis
        val consumedMillis = prefs.getLong(consumedKey, 0L)

        val remainingMillis = totalAllowedMillis - consumedMillis
        return if (remainingMillis > 0) (remainingMillis / 1000).toInt() else 0
    }

    @Synchronized
    fun getWindowRemainingSeconds(context: Context, packageName: String? = null): Int {
        checkAndResetWindowIfNeeded(context, packageName)
        val prefs = getPrefs(context)
        val windowMins = prefs.getInt(KEY_WINDOW_MINS, 60)
        val windowDurationMillis = windowMins * 60 * 1000L
        val currentRealtime = SystemClock.elapsedRealtime()
        val startKey = getBlockStartKey(context, packageName)
        val blockStart = prefs.getLong(startKey, currentRealtime)
        val elapsed = currentRealtime - blockStart
        val remainingMillis = windowDurationMillis - elapsed
        return if (remainingMillis > 0) (remainingMillis / 1000).toInt() else 0
    }

    @Synchronized
    fun getAllowanceMinutes(context: Context): Int {
        return getPrefs(context).getInt(KEY_ALLOWANCE_MINS, 7)
    }

    @Synchronized
    fun getWindowMinutes(context: Context): Int {
        return getPrefs(context).getInt(KEY_WINDOW_MINS, 60)
    }

    @Synchronized
    fun claimGraceExtension(context: Context, packageName: String? = null): Boolean {
        checkAndResetWindowIfNeeded(context, packageName)
        val prefs = getPrefs(context)
        val graceClaimedKey = getGraceClaimedKey(context, packageName)
        val graceMillisKey = getGraceMillisKey(context, packageName)
        val alreadyClaimed = prefs.getBoolean(graceClaimedKey, false)
        if (alreadyClaimed) {
            return false // Strict anti-tamper: max 1 grace extension per window
        }

        prefs.edit()
            .putBoolean(graceClaimedKey, true)
            .putLong(graceMillisKey, 120_000L) // 2 minutes
            .apply()
        return true
    }

    @Synchronized
    fun resetBlock(context: Context, packageName: String? = null): Boolean {
        val prefs = getPrefs(context)
        val currentRealtime = SystemClock.elapsedRealtime()
        val startKey = getBlockStartKey(context, packageName)
        val consumedKey = getConsumedMillisKey(context, packageName)
        val graceClaimedKey = getGraceClaimedKey(context, packageName)
        val graceMillisKey = getGraceMillisKey(context, packageName)

        prefs.edit()
            .putLong(startKey, currentRealtime)
            .putLong(consumedKey, 0L)
            .putBoolean(graceClaimedKey, false)
            .putLong(graceMillisKey, 0L)
            .apply()
        return true
    }

    @Synchronized
    fun getAllAppStats(context: Context): List<Map<String, Any>> {
        val guarded = getBlockedPackages(context)
        val result = mutableListOf<Map<String, Any>>()
        val allowanceMins = getAllowanceMinutes(context)
        val totalAllowedSecs = allowanceMins * 60

        for (pkg in guarded) {
            val remaining = getRemainingSeconds(context, pkg)
            val windowRemaining = getWindowRemainingSeconds(context, pkg)
            val consumed = maxOf(0, totalAllowedSecs - remaining)
            result.add(
                mapOf(
                    "packageName" to pkg,
                    "remainingSeconds" to remaining,
                    "windowRemainingSeconds" to windowRemaining,
                    "consumedSeconds" to consumed,
                    "isLocked" to (remaining <= 0)
                )
            )
        }
        return result
    }

    @Synchronized
    fun isPackageGuarded(context: Context, packageName: String): Boolean {
        val guarded = getBlockedPackages(context)
        return guarded.contains(packageName)
    }
}
