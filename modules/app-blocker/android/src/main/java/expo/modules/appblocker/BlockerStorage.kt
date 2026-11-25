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
    private const val KEY_FRICTION_ENABLED = "friction_enabled"
    private const val KEY_FRICTION_TYPE = "friction_type"
    private const val KEY_MATH_DIFFICULTY = "math_difficulty"
    private const val KEY_WARNING_2MIN = "warning_2min_shown"
    private const val KEY_WARNING_1MIN = "warning_1min_shown"
    private const val KEY_STRICTNESS_LEVEL = "strictness_level"
    private const val KEY_BREATHE_ENABLED = "breathe_enabled"
    private const val KEY_POSITIVE_REDIRECT_PKG = "positive_redirect_pkg"
    private const val KEY_POSITIVE_REDIRECT_NAME = "positive_redirect_name"
    private const val KEY_LAST_BREATHE_PREFIX = "last_breathe_ts"

    const val MODE_CUMULATIVE = "cumulative"
    const val MODE_PER_APP = "per_app"

    const val STRICTNESS_MINDFUL = "mindful"
    const val STRICTNESS_DISCIPLINED = "disciplined"
    const val STRICTNESS_FORTRESS = "fortress"

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

    private fun getWarning2MinKey(context: Context, packageName: String?): String {
        return if (packageName != null && getTrackingMode(context) == MODE_PER_APP) {
            "${KEY_WARNING_2MIN}_$packageName"
        } else {
            KEY_WARNING_2MIN
        }
    }

    private fun getWarning1MinKey(context: Context, packageName: String?): String {
        return if (packageName != null && getTrackingMode(context) == MODE_PER_APP) {
            "${KEY_WARNING_1MIN}_$packageName"
        } else {
            KEY_WARNING_1MIN
        }
    }

    @Synchronized
    fun isFrictionEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_FRICTION_ENABLED, true)
    }

    @Synchronized
    fun setFrictionEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_FRICTION_ENABLED, enabled).apply()
    }

    @Synchronized
    fun getFrictionType(context: Context): String {
        return getPrefs(context).getString(KEY_FRICTION_TYPE, "math") ?: "math"
    }

    @Synchronized
    fun setFrictionType(context: Context, type: String) {
        getPrefs(context).edit().putString(KEY_FRICTION_TYPE, type).apply()
    }

    @Synchronized
    fun getMathDifficulty(context: Context): String {
        return getPrefs(context).getString(KEY_MATH_DIFFICULTY, "easy") ?: "easy"
    }

    @Synchronized
    fun setMathDifficulty(context: Context, difficulty: String) {
        getPrefs(context).edit().putString(KEY_MATH_DIFFICULTY, difficulty).apply()
    }

    @Synchronized
    fun setFrictionSettings(context: Context, enabled: Boolean, type: String, difficulty: String) {
        getPrefs(context).edit()
            .putBoolean(KEY_FRICTION_ENABLED, enabled)
            .putString(KEY_FRICTION_TYPE, type)
            .putString(KEY_MATH_DIFFICULTY, difficulty)
            .apply()
    }

    @Synchronized
    fun shouldShow2MinWarning(context: Context, packageName: String?): Boolean {
        val key = getWarning2MinKey(context, packageName)
        return !getPrefs(context).getBoolean(key, false)
    }

    @Synchronized
    fun mark2MinWarningShown(context: Context, packageName: String?) {
        val key = getWarning2MinKey(context, packageName)
        getPrefs(context).edit().putBoolean(key, true).apply()
    }

    @Synchronized
    fun shouldShow1MinWarning(context: Context, packageName: String?): Boolean {
        val key = getWarning1MinKey(context, packageName)
        return !getPrefs(context).getBoolean(key, false)
    }

    @Synchronized
    fun mark1MinWarningShown(context: Context, packageName: String?) {
        val key = getWarning1MinKey(context, packageName)
        getPrefs(context).edit().putBoolean(key, true).apply()
    }

    @Synchronized
    fun getStrictnessLevel(context: Context): String {
        return getPrefs(context).getString(KEY_STRICTNESS_LEVEL, STRICTNESS_MINDFUL) ?: STRICTNESS_MINDFUL
    }

    @Synchronized
    fun setStrictnessLevel(context: Context, level: String) {
        val target = when (level) {
            STRICTNESS_FORTRESS -> STRICTNESS_FORTRESS
            STRICTNESS_DISCIPLINED -> STRICTNESS_DISCIPLINED
            else -> STRICTNESS_MINDFUL
        }
        getPrefs(context).edit().putString(KEY_STRICTNESS_LEVEL, target).apply()
    }

    @Synchronized
    fun isAnyAppLocked(context: Context): Boolean {
        val guarded = getBlockedPackages(context)
        if (getTrackingMode(context) == MODE_CUMULATIVE) {
            return getRemainingSeconds(context) <= 0
        }
        for (pkg in guarded) {
            if (getRemainingSeconds(context, pkg) <= 0) {
                return true
            }
        }
        return false
    }

    @Synchronized
    fun isBreatheEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_BREATHE_ENABLED, true)
    }

    @Synchronized
    fun setBreatheEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_BREATHE_ENABLED, enabled).apply()
    }

    @Synchronized
    fun getPositiveRedirectPackage(context: Context): String {
        return getPrefs(context).getString(KEY_POSITIVE_REDIRECT_PKG, "com.amazon.kindle") ?: "com.amazon.kindle"
    }

    @Synchronized
    fun getPositiveRedirectName(context: Context): String {
        return getPrefs(context).getString(KEY_POSITIVE_REDIRECT_NAME, "Kindle") ?: "Kindle"
    }

    @Synchronized
    fun setPositiveRedirect(context: Context, packageName: String, appName: String) {
        getPrefs(context).edit()
            .putString(KEY_POSITIVE_REDIRECT_PKG, packageName)
            .putString(KEY_POSITIVE_REDIRECT_NAME, appName)
            .apply()
    }

    @Synchronized
    fun shouldShowBreathe(context: Context, packageName: String): Boolean {
        if (!isBreatheEnabled(context)) return false
        val prefs = getPrefs(context)
        val key = "${KEY_LAST_BREATHE_PREFIX}_$packageName"
        val lastTs = prefs.getLong(key, 0L)
        val now = SystemClock.elapsedRealtime()
        return (now - lastTs) > 10 * 60 * 1000L
    }

    @Synchronized
    fun markBreatheCompleted(context: Context, packageName: String) {
        val prefs = getPrefs(context)
        val key = "${KEY_LAST_BREATHE_PREFIX}_$packageName"
        prefs.edit().putLong(key, SystemClock.elapsedRealtime()).apply()
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
                .putBoolean(getWarning2MinKey(context, packageName), false)
                .putBoolean(getWarning1MinKey(context, packageName), false)
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
            .putBoolean(getWarning2MinKey(context, packageName), false)
            .putBoolean(getWarning1MinKey(context, packageName), false)
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
