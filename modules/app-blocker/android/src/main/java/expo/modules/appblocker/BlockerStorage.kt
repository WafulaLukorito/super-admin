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
        blockedPackages: List<String>
    ): Boolean {
        getPrefs(context).edit()
            .putInt(KEY_WINDOW_MINS, windowMinutes)
            .putInt(KEY_ALLOWANCE_MINS, allowanceMinutes)
            .putStringSet(KEY_BLOCKED_PKGS, blockedPackages.toSet())
            .apply()
        return true
    }

    @Synchronized
    fun checkAndResetWindowIfNeeded(context: Context) {
        val prefs = getPrefs(context)
        val windowMins = prefs.getInt(KEY_WINDOW_MINS, 60)
        val windowDurationMillis = windowMins * 60 * 1000L
        val currentRealtime = SystemClock.elapsedRealtime()

        var blockStart = prefs.getLong(KEY_BLOCK_START_REALTIME, 0L)
        if (blockStart == 0L || (currentRealtime - blockStart) >= windowDurationMillis) {
            // Window expired or not started; start a fresh block window
            prefs.edit()
                .putLong(KEY_BLOCK_START_REALTIME, currentRealtime)
                .putLong(KEY_CONSUMED_MILLIS, 0L)
                .putBoolean(KEY_GRACE_CLAIMED, false)
                .putLong(KEY_GRACE_MILLIS, 0L)
                .apply()
        }
    }

    @Synchronized
    fun recordUsage(context: Context, deltaMillis: Long) {
        checkAndResetWindowIfNeeded(context)
        val prefs = getPrefs(context)
        val currentConsumed = prefs.getLong(KEY_CONSUMED_MILLIS, 0L)
        prefs.edit().putLong(KEY_CONSUMED_MILLIS, currentConsumed + deltaMillis).apply()
    }

    @Synchronized
    fun getRemainingSeconds(context: Context): Int {
        checkAndResetWindowIfNeeded(context)
        val prefs = getPrefs(context)
        val allowanceMins = prefs.getInt(KEY_ALLOWANCE_MINS, 10)
        val graceMillis = prefs.getLong(KEY_GRACE_MILLIS, 0L)
        val totalAllowedMillis = (allowanceMins * 60 * 1000L) + graceMillis
        val consumedMillis = prefs.getLong(KEY_CONSUMED_MILLIS, 0L)

        val remainingMillis = totalAllowedMillis - consumedMillis
        return if (remainingMillis > 0) (remainingMillis / 1000).toInt() else 0
    }

    @Synchronized
    fun getWindowRemainingSeconds(context: Context): Int {
        checkAndResetWindowIfNeeded(context)
        val prefs = getPrefs(context)
        val windowMins = prefs.getInt(KEY_WINDOW_MINS, 60)
        val windowDurationMillis = windowMins * 60 * 1000L
        val currentRealtime = SystemClock.elapsedRealtime()
        val blockStart = prefs.getLong(KEY_BLOCK_START_REALTIME, currentRealtime)
        val elapsed = currentRealtime - blockStart
        val remainingMillis = windowDurationMillis - elapsed
        return if (remainingMillis > 0) (remainingMillis / 1000).toInt() else 0
    }

    @Synchronized
    fun getAllowanceMinutes(context: Context): Int {
        return getPrefs(context).getInt(KEY_ALLOWANCE_MINS, 10)
    }

    @Synchronized
    fun getWindowMinutes(context: Context): Int {
        return getPrefs(context).getInt(KEY_WINDOW_MINS, 60)
    }

    @Synchronized
    fun claimGraceExtension(context: Context): Boolean {
        checkAndResetWindowIfNeeded(context)
        val prefs = getPrefs(context)
        val alreadyClaimed = prefs.getBoolean(KEY_GRACE_CLAIMED, false)
        if (alreadyClaimed) {
            return false // Strict anti-tamper: max 1 grace extension per window
        }

        prefs.edit()
            .putBoolean(KEY_GRACE_CLAIMED, true)
            .putLong(KEY_GRACE_MILLIS, 120_000L) // 2 minutes
            .apply()
        return true
    }

    @Synchronized
    fun resetBlock(context: Context): Boolean {
        val prefs = getPrefs(context)
        prefs.edit()
            .putLong(KEY_BLOCK_START_REALTIME, SystemClock.elapsedRealtime())
            .putLong(KEY_CONSUMED_MILLIS, 0L)
            .putBoolean(KEY_GRACE_CLAIMED, false)
            .putLong(KEY_GRACE_MILLIS, 0L)
            .apply()
        return true
    }

    @Synchronized
    fun isPackageGuarded(context: Context, packageName: String): Boolean {
        val guarded = getBlockedPackages(context)
        return guarded.contains(packageName)
    }
}
