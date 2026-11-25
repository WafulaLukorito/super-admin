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
        const val EXTRA_MINUTES = "EXTRA_MINUTES"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val packageName = intent.getStringExtra(EXTRA_PACKAGE_NAME)
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 9183)
        val minutes = intent.getIntExtra(EXTRA_MINUTES, 2).let { if (it == 5) 5 else 2 }

        // Dismiss the sticky warning notification immediately upon tap
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        nm?.cancel(notificationId)

        val frictionEnabled = BlockerStorage.isFrictionEnabled(context)
        val appLabel = AppNameResolver.getAppName(context, packageName)

        if (!frictionEnabled) {
            // Instant grant in-place without leaving the active app
            val success = BlockerStorage.claimGraceExtension(context, packageName, minutes)
            Handler(Looper.getMainLooper()).post {
                if (success) {
                    SoundFeedbackManager.play(context, "extension")
                    Toast.makeText(
                        context,
                        "+${minutes}m added for $appLabel.",
                        Toast.LENGTH_LONG
                    ).show()
                } else {
                    Toast.makeText(
                        context,
                        "Extra time was already used for $appLabel this cycle.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
            if (success) {
                BlockerOverlayManager.hideOverlay(context)
            }
        } else {
            if (!BlockerStorage.canClaimGrace(context, packageName)) {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(
                        context,
                        "Extra time was already used for $appLabel this cycle.",
                        Toast.LENGTH_LONG
                    ).show()
                }
                return
            }
            // Queue pending request so Hourglass opens directly into FrictionChallengeModal
            BlockerStorage.setPendingGraceRequest(context, packageName, minutes)
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(EXTRA_OPEN_FRICTION, true)
                putExtra(EXTRA_PACKAGE_NAME, packageName)
                putExtra(EXTRA_MINUTES, minutes)
            }
            if (launchIntent != null) {
                context.startActivity(launchIntent)
            }
        }
    }
}
