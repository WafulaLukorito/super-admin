package expo.modules.appblocker

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.widget.Toast

class GraceExtensionReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_EXTEND_GRACE = "expo.modules.appblocker.ACTION_EXTEND_GRACE"
        const val EXTRA_PACKAGE_NAME = "EXTRA_PACKAGE_NAME"
        const val EXTRA_NOTIFICATION_ID = "EXTRA_NOTIFICATION_ID"
        const val EXTRA_OPEN_FRICTION = "EXTRA_OPEN_FRICTION"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val packageName = intent.getStringExtra(EXTRA_PACKAGE_NAME)
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 9183)

        // Cancel the warning heads-up notification
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        nm?.cancel(notificationId)

        val frictionEnabled = BlockerStorage.isFrictionEnabled(context)

        if (!frictionEnabled) {
            // Direct extension: no cognitive challenge required
            val success = BlockerStorage.claimGraceExtension(context, packageName)
            val appLabel = if (packageName != null) {
                try {
                    val pm = context.packageManager
                    val info = pm.getApplicationInfo(packageName, 0)
                    pm.getApplicationLabel(info).toString()
                } catch (e: Exception) {
                    packageName.substringAfterLast('.').replaceFirstChar { it.uppercase() }
                }
            } else "Guarded App"

            Handler(Looper.getMainLooper()).post {
                if (success) {
                    Toast.makeText(context, "+2m Grace Extension Added for $appLabel!", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(context, "Grace extension already claimed for this window.", Toast.LENGTH_LONG).show()
                }
            }
            if (success) {
                BlockerOverlayManager.hideOverlay(context)
            }
        } else {
            // Friction challenge required: launch Hourglass app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(EXTRA_OPEN_FRICTION, true)
                putExtra(EXTRA_PACKAGE_NAME, packageName)
            }
            if (launchIntent != null) {
                context.startActivity(launchIntent)
            }
        }
    }
}
