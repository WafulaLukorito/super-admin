package expo.modules.appblocker

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast

class BlockerDeviceAdminReceiver : DeviceAdminReceiver() {
    companion object {
        private const val TAG = "SuperAdminDeviceAdmin"
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device Administrator enabled for Hourglass")
        Toast.makeText(context, "Hourglass Fortress: Device Administrator Active", Toast.LENGTH_SHORT).show()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.i(TAG, "Device Administrator disabled for Hourglass")
        Toast.makeText(context, "Device Administrator Deactivated", Toast.LENGTH_SHORT).show()
    }
}
