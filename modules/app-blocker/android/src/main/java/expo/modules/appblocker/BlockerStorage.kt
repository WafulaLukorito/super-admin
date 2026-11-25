package expo.modules.appblocker

import android.content.Context
import android.content.SharedPreferences
import android.os.SystemClock

object BlockerStorage {
    private const val PREFS_NAME = "hourglass_blocker_prefs_v2"

    private const val KEY_WINDOW_MINS = "window_minutes"
    private const val KEY_ALLOWANCE_MINS = "allowance_minutes"
    private const val KEY_BLOCKED_PKGS = "blocked_packages"
    private const val KEY_BLOCK_START_REALTIME = "block_start_realtime"
    private const val KEY_CONSUMED_MILLIS = "consumed_millis"
    private const val KEY_GRACE_CLAIMED = "grace_claimed"
    private const val KEY_GRACE_MILLIS = "grace_millis"
    private const val KEY_GRACE_MINUTES_GRANTED = "grace_minutes_granted"
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
    private const val KEY_ACTIVE_PROFILE_ID = "active_profile_id"
    private const val KEY_ACTIVE_PROFILE_NAME = "active_profile_name"
    private const val KEY_EXTRA_2MIN_ENABLED = "extra_2min_enabled"
    private const val KEY_EXTRA_5MIN_ENABLED = "extra_5min_enabled"
    private const val KEY_SOUND_ENABLED = "sound_enabled"
    private const val KEY_PENDING_GRACE_PKG = "pending_grace_pkg"
    private const val KEY_PENDING_GRACE_MINS = "pending_grace_mins"

    const val MODE_CUMULATIVE = "cumulative"
    const val MODE_PER_APP = "per_app"

    const val STRICTNESS_MINDFUL = "mindful"
    const val STRICTNESS_DISCIPLINED = "disciplined"
    const val STRICTNESS_FORTRESS = "fortress"

    private const val DEFAULT_WINDOW_MINUTES = 60
    private const val DEFAULT_ALLOWANCE_MINUTES = 15

    private val DEFAULT_BLOCKED_PACKAGES = setOf(
        "com.instagram.android",
        "com.zhiliaoapp.musically",
        "com.google.android.youtube",
        "com.twitter.android",
        "com.reddit.frontpage",
        "com.facebook.katana"
    )

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    @Synchronized
    fun getTrackingMode(context: Context): String {
        return getPrefs(context).getString(KEY_TRACKING_MODE, MODE_PER_APP) ?: MODE_PER_APP
    }

    @Synchronized
    fun setTrackingMode(context: Context, mode: String) {
        val targetMode = if (mode == MODE_CUMULATIVE) MODE_CUMULATIVE else MODE_PER_APP
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

    private fun getGraceMinutesGrantedKey(context: Context, packageName: String?): String {
        return if (packageName != null && getTrackingMode(context) == MODE_PER_APP) {
            "${KEY_GRACE_MINUTES_GRANTED}_$packageName"
        } else {
            KEY_GRACE_MINUTES_GRANTED
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
        return getPrefs(context).getString(KEY_MATH_DIFFICULTY, "medium") ?: "medium"
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
    fun setExtraTimeOptions(context: Context, allow2Min: Boolean, allow5Min: Boolean) {
        getPrefs(context).edit()
            .putBoolean(KEY_EXTRA_2MIN_ENABLED, allow2Min)
            .putBoolean(KEY_EXTRA_5MIN_ENABLED, allow5Min)
            .apply()
    }

    @Synchronized
    fun isExtra2MinEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_EXTRA_2MIN_ENABLED, true)
    }

    @Synchronized
    fun isExtra5MinEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_EXTRA_5MIN_ENABLED, true)
    }

    @Synchronized
    fun isSoundEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_SOUND_ENABLED, true)
    }

    @Synchronized
    fun setSoundEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_SOUND_ENABLED, enabled).apply()
    }

    @Synchronized
    fun setPendingGraceRequest(context: Context, packageName: String?, minutes: Int) {
        getPrefs(context).edit()
            .putString(KEY_PENDING_GRACE_PKG, packageName)
            .putInt(KEY_PENDING_GRACE_MINS, minutes)
            .apply()
    }

    @Synchronized
    fun consumePendingGraceRequest(context: Context): Map<String, Any?>? {
        val prefs = getPrefs(context)
        val mins = prefs.getInt(KEY_PENDING_GRACE_MINS, 0)
        if (mins <= 0) return null
        val pkg = prefs.getString(KEY_PENDING_GRACE_PKG, null)
        prefs.edit()
            .remove(KEY_PENDING_GRACE_PKG)
            .remove(KEY_PENDING_GRACE_MINS)
            .apply()
        return mapOf(
            "packageName" to pkg,
            "minutes" to mins
        )
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
        return getPrefs(context).getString(KEY_POSITIVE_REDIRECT_PKG, "com.duolingo") ?: "com.duolingo"
    }

    @Synchronized
    fun getPositiveRedirectName(context: Context): String {
        return getPrefs(context).getString(KEY_POSITIVE_REDIRECT_NAME, "Duolingo") ?: "Duolingo"
    }

    @Synchronized
    fun setPositiveRedirect(context: Context, packageName: String, appName: String) {
        getPrefs(context).edit()
            .putString(KEY_POSITIVE_REDIRECT_PKG, packageName)
            .putString(KEY_POSITIVE_REDIRECT_NAME, appName)
            .apply()
    }

    @Synchronized
    fun getActiveProfileId(context: Context): String? {
        return getPrefs(context).getString(KEY_ACTIVE_PROFILE_ID, null)
    }

    @Synchronized
    fun getActiveProfileName(context: Context): String? {
        return getPrefs(context).getString(KEY_ACTIVE_PROFILE_NAME, null)
    }

    @Synchronized
    fun setActiveProfile(context: Context, profileId: String?, profileName: String?) {
        getPrefs(context).edit()
            .putString(KEY_ACTIVE_PROFILE_ID, profileId)
            .putString(KEY_ACTIVE_PROFILE_NAME, profileName)
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
            val targetMode = if (trackingMode == MODE_CUMULATIVE) MODE_CUMULATIVE else MODE_PER_APP
            editor.putString(KEY_TRACKING_MODE, targetMode)
        }

        editor.apply()
        return true
    }

    @Synchronized
    fun checkAndResetWindowIfNeeded(context: Context, packageName: String? = null) {
        val prefs = getPrefs(context)
        val windowMins = prefs.getInt(KEY_WINDOW_MINS, DEFAULT_WINDOW_MINUTES)
        val windowDurationMillis = windowMins * 60 * 1000L
        val currentRealtime = SystemClock.elapsedRealtime()

        val startKey = getBlockStartKey(context, packageName)
        val consumedKey = getConsumedMillisKey(context, packageName)
        val graceClaimedKey = getGraceClaimedKey(context, packageName)
        val graceMillisKey = getGraceMillisKey(context, packageName)
        val graceMinsKey = getGraceMinutesGrantedKey(context, packageName)

        val blockStart = prefs.getLong(startKey, 0L)
        if (blockStart == 0L || (currentRealtime - blockStart) >= windowDurationMillis) {
            prefs.edit()
                .putLong(startKey, currentRealtime)
                .putLong(consumedKey, 0L)
                .putBoolean(graceClaimedKey, false)
                .putLong(graceMillisKey, 0L)
                .putInt(graceMinsKey, 0)
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
        val allowanceMins = prefs.getInt(KEY_ALLOWANCE_MINS, DEFAULT_ALLOWANCE_MINUTES)
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
        val windowMins = prefs.getInt(KEY_WINDOW_MINS, DEFAULT_WINDOW_MINUTES)
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
        return getPrefs(context).getInt(KEY_ALLOWANCE_MINS, DEFAULT_ALLOWANCE_MINUTES)
    }

    @Synchronized
    fun getWindowMinutes(context: Context): Int {
        return getPrefs(context).getInt(KEY_WINDOW_MINS, DEFAULT_WINDOW_MINUTES)
    }

    @Synchronized
    fun isGraceClaimed(context: Context, packageName: String? = null): Boolean {
        checkAndResetWindowIfNeeded(context, packageName)
        val graceClaimedKey = getGraceClaimedKey(context, packageName)
        return getPrefs(context).getBoolean(graceClaimedKey, false)
    }

    @Synchronized
    fun canClaimGrace(context: Context, packageName: String? = null): Boolean {
        val allowanceMins = getAllowanceMinutes(context)
        if (allowanceMins == 0 || getActiveProfileId(context) == "bedtime") {
            return false
        }
        if (!isExtra2MinEnabled(context) && !isExtra5MinEnabled(context)) {
            return false
        }
        return !isGraceClaimed(context, packageName)
    }

    @Synchronized
    fun claimGraceExtension(context: Context, packageName: String? = null, minutes: Int = 2): Boolean {
        checkAndResetWindowIfNeeded(context, packageName)
        val prefs = getPrefs(context)
        val allowanceMins = prefs.getInt(KEY_ALLOWANCE_MINS, DEFAULT_ALLOWANCE_MINUTES)
        if (allowanceMins == 0 || getActiveProfileId(context) == "bedtime") {
            return false
        }
        val graceClaimedKey = getGraceClaimedKey(context, packageName)
        val graceMillisKey = getGraceMillisKey(context, packageName)
        val graceMinsKey = getGraceMinutesGrantedKey(context, packageName)
        val alreadyClaimed = prefs.getBoolean(graceClaimedKey, false)
        if (alreadyClaimed) {
            return false
        }

        val safeMins = if (minutes == 5) 5 else 2
        prefs.edit()
            .putBoolean(graceClaimedKey, true)
            .putLong(graceMillisKey, safeMins * 60_000L)
            .putInt(graceMinsKey, safeMins)
            .apply()
        return true
    }

    @Synchronized
    fun resetBlock(context: Context, packageName: String? = null): Boolean {
        val prefs = getPrefs(context)
        val currentRealtime = SystemClock.elapsedRealtime()
        val targets = if (packageName == null && getTrackingMode(context) == MODE_PER_APP) {
            getBlockedPackages(context).toList() + listOf<String?>(null)
        } else {
            listOf(packageName)
        }

        val editor = prefs.edit()
        for (target in targets) {
            editor
                .putLong(getBlockStartKey(context, target), currentRealtime)
                .putLong(getConsumedMillisKey(context, target), 0L)
                .putBoolean(getGraceClaimedKey(context, target), false)
                .putLong(getGraceMillisKey(context, target), 0L)
                .putInt(getGraceMinutesGrantedKey(context, target), 0)
                .putBoolean(getWarning2MinKey(context, target), false)
                .putBoolean(getWarning1MinKey(context, target), false)
        }
        editor.apply()
        return true
    }

    @Synchronized
    fun getAllAppStats(context: Context): List<Map<String, Any>> {
        val guarded = getBlockedPackages(context)
        val result = mutableListOf<Map<String, Any>>()
        val allowanceMins = getAllowanceMinutes(context)
        val prefs = getPrefs(context)

        for (pkg in guarded) {
            val remaining = getRemainingSeconds(context, pkg)
            val windowRemaining = getWindowRemainingSeconds(context, pkg)
            val graceMillis = prefs.getLong(getGraceMillisKey(context, pkg), 0L)
            val totalAllowedSecs = (allowanceMins * 60) + (graceMillis / 1000).toInt()
            val consumed = maxOf(0, totalAllowedSecs - remaining)
            val graceClaimed = prefs.getBoolean(getGraceClaimedKey(context, pkg), false)
            val graceMinutesGranted = prefs.getInt(getGraceMinutesGrantedKey(context, pkg), 0)

            result.add(
                mapOf(
                    "packageName" to pkg,
                    "appName" to AppNameResolver.getAppName(context, pkg),
                    "remainingSeconds" to remaining,
                    "windowRemainingSeconds" to windowRemaining,
                    "consumedSeconds" to consumed,
                    "isLocked" to (remaining <= 0),
                    "graceClaimed" to graceClaimed,
                    "graceMinutesGranted" to graceMinutesGranted
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
