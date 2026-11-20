package expo.modules.appblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (Intent.ACTION_BOOT_COMPLETED == action || Intent.ACTION_MY_PACKAGE_REPLACED == action) {
            if (BlockerStorage.isShieldEnabled(context)) {
                try {
                    BlockerForegroundService.startService(context)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
}
