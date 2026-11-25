package expo.modules.appblocker

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions

class AppBlockerModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

    override fun definition() = ModuleDefinition {
        Name("AppBlocker")

        Function("isServiceRunning") {
            BlockerForegroundService.isRunning
        }

        Function("startService") {
            try {
                BlockerStorage.setShieldEnabled(context, true)
                BlockerForegroundService.startService(context)
                true
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }

        Function("stopService") {
            try {
                BlockerStorage.setShieldEnabled(context, false)
                BlockerForegroundService.stopService(context)
                true
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }

        Function("updateRules") { windowMinutes: Int, allowanceMinutes: Int, blockedPackages: List<String>, trackingMode: String? ->
            BlockerStorage.updateRules(context, windowMinutes, allowanceMinutes, blockedPackages, trackingMode)
        }

        Function("getRemainingSeconds") { packageName: String? ->
            BlockerStorage.getRemainingSeconds(context, packageName)
        }

        Function("getWindowRemainingSeconds") { packageName: String? ->
            BlockerStorage.getWindowRemainingSeconds(context, packageName)
        }

        Function("getTrackingMode") {
            BlockerStorage.getTrackingMode(context)
        }

        Function("setTrackingMode") { mode: String ->
            BlockerStorage.setTrackingMode(context, mode)
            true
        }

        Function("getAllAppStats") {
            BlockerStorage.getAllAppStats(context)
        }

        Function("claimGraceExtension") { packageName: String?, minutes: Int? ->
            BlockerStorage.claimGraceExtension(context, packageName, minutes ?: 2)
        }

        Function("isGraceClaimed") { packageName: String? ->
            BlockerStorage.isGraceClaimed(context, packageName)
        }

        Function("canClaimGrace") { packageName: String? ->
            BlockerStorage.canClaimGrace(context, packageName)
        }

        Function("setExtraTimeOptions") { allow2Min: Boolean, allow5Min: Boolean ->
            BlockerStorage.setExtraTimeOptions(context, allow2Min, allow5Min)
            true
        }

        Function("isExtra2MinEnabled") {
            BlockerStorage.isExtra2MinEnabled(context)
        }

        Function("isExtra5MinEnabled") {
            BlockerStorage.isExtra5MinEnabled(context)
        }

        Function("setSoundEnabled") { enabled: Boolean ->
            BlockerStorage.setSoundEnabled(context, enabled)
            true
        }

        Function("isSoundEnabled") {
            BlockerStorage.isSoundEnabled(context)
        }

        Function("playSound") { type: String ->
            SoundFeedbackManager.play(context, type)
            true
        }

        Function("consumePendingGraceRequest") {
            BlockerStorage.consumePendingGraceRequest(context)
        }

        Function("resolveAppName") { packageName: String ->
            AppNameResolver.getAppName(context, packageName)
        }

        Function("setFrictionSettings") { enabled: Boolean, type: String, mathDifficulty: String ->
            BlockerStorage.setFrictionSettings(context, enabled, type, mathDifficulty)
            true
        }

        Function("isFrictionEnabled") {
            BlockerStorage.isFrictionEnabled(context)
        }

        Function("getFrictionType") {
            BlockerStorage.getFrictionType(context)
        }

        Function("getMathDifficulty") {
            BlockerStorage.getMathDifficulty(context)
        }

        Function("getStrictnessLevel") {
            BlockerStorage.getStrictnessLevel(context)
        }

        Function("setStrictnessLevel") { level: String ->
            BlockerStorage.setStrictnessLevel(context, level)
            true
        }

        Function("isBreatheEnabled") {
            BlockerStorage.isBreatheEnabled(context)
        }

        Function("setBreatheEnabled") { enabled: Boolean ->
            BlockerStorage.setBreatheEnabled(context, enabled)
            true
        }

        Function("getPositiveRedirectPackage") {
            BlockerStorage.getPositiveRedirectPackage(context)
        }

        Function("getPositiveRedirectName") {
            BlockerStorage.getPositiveRedirectName(context)
        }

        Function("setPositiveRedirect") { packageName: String, appName: String ->
            BlockerStorage.setPositiveRedirect(context, packageName, appName)
            true
        }

        Function("setActiveProfile") { profileId: String?, profileName: String? ->
            BlockerStorage.setActiveProfile(context, profileId, profileName)
            true
        }

        Function("getActiveProfileId") {
            BlockerStorage.getActiveProfileId(context)
        }

        Function("getActiveProfileName") {
            BlockerStorage.getActiveProfileName(context)
        }

        Function("isAccessibilityServiceActive") {
            BlockerAccessibilityService.isRunning
        }

        Function("openAccessibilitySettings") {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            true
        }

        Function("isDeviceAdminActive") {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            val comp = ComponentName(context, BlockerDeviceAdminReceiver::class.java)
            dpm?.isAdminActive(comp) ?: false
        }

        Function("requestDeviceAdminActivation") {
            val comp = ComponentName(context, BlockerDeviceAdminReceiver::class.java)
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, comp)
                putExtra(
                    DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "Hourglass Fortress Mode: Prevents impulsive uninstallation or force-stopping during active locks."
                )
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            true
        }

        Function("resetBlock") { packageName: String? ->
            BlockerStorage.resetBlock(context, packageName)
        }

        AsyncFunction("getInstalledApps") {
            InstalledAppsHelper.getInstalledApps(context)
        }
    }
}
