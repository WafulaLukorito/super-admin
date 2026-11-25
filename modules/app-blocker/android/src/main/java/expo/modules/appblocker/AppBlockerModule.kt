package expo.modules.appblocker

import android.content.Context
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

        Function("claimGraceExtension") { packageName: String? ->
            BlockerStorage.claimGraceExtension(context, packageName)
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

        Function("resetBlock") { packageName: String? ->
            BlockerStorage.resetBlock(context, packageName)
        }

        AsyncFunction("getInstalledApps") {
            InstalledAppsHelper.getInstalledApps(context)
        }
    }
}
