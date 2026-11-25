package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class BlockerAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "SuperAdminAccessibility"
        var isRunning = false
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        Log.i(TAG, "BlockerAccessibilityService connected (0ms zero-flicker intercept enabled)")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val pkgName = event.packageName?.toString() ?: return
        if (pkgName == packageName) return // Ignore Super Admin app itself

        val strictness = BlockerStorage.getStrictnessLevel(this)

        // Settings Protection in Disciplined & Fortress modes
        if (strictness != BlockerStorage.STRICTNESS_MINDFUL &&
            (pkgName == "com.android.settings" || pkgName == "com.google.android.packageinstaller" || pkgName == "com.android.packageinstaller")) {
            if (BlockerStorage.isAnyAppLocked(this)) {
                Log.w(TAG, "Settings access blocked during active lockdown: $pkgName")
                goToHome()
                return
            }
        }

        // 0ms Zero-Flicker Interception for Guarded Apps (Active in Fortress mode)
        if (strictness == BlockerStorage.STRICTNESS_FORTRESS) {
            val isGuarded = BlockerStorage.isPackageGuarded(this, pkgName)
            if (isGuarded) {
                val remainingSeconds = BlockerStorage.getRemainingSeconds(this, pkgName)
                if (remainingSeconds <= 0) {
                    Log.i(TAG, "Instant 0ms overlay trigger for locked app: $pkgName")
                    BlockerOverlayManager.showOverlay(this, pkgName)
                    return
                }
            }
        }
    }

    private fun goToHome() {
        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(homeIntent)
    }

    override fun onInterrupt() {
        Log.w(TAG, "BlockerAccessibilityService onInterrupt")
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        Log.i(TAG, "BlockerAccessibilityService destroyed")
    }
}
