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

        Function("updateRules") { windowMinutes: Int, allowanceMinutes: Int, blockedPackages: List<String> ->
            BlockerStorage.updateRules(context, windowMinutes, allowanceMinutes, blockedPackages)
        }

        Function("getRemainingSeconds") {
            BlockerStorage.getRemainingSeconds(context)
        }

        Function("getWindowRemainingSeconds") {
            BlockerStorage.getWindowRemainingSeconds(context)
        }

        Function("claimGraceExtension") {
            BlockerStorage.claimGraceExtension(context)
        }

        Function("resetBlock") {
            BlockerStorage.resetBlock(context)
        }

        AsyncFunction("getInstalledApps") {
            InstalledAppsHelper.getInstalledApps(context)
        }
    }
}
