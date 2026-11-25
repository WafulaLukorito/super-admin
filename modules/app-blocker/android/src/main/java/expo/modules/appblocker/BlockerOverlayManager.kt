package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

object BlockerOverlayManager {
    private const val TAG = "BlockerOverlayManager"
    private var overlayView: View? = null
    @Volatile
    private var isShowing = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private var countdownRunnable: Runnable? = null

    fun showOverlay(context: Context, blockedPackageName: String) {
        if (isShowing) return
        isShowing = true

        mainHandler.post {
            if (overlayView != null) return@post

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                Log.w(TAG, "SYSTEM_ALERT_WINDOW not granted, redirecting to home screen")
                isShowing = false
                goToHomeScreen(context)
                return@post
            }

            try {
                val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

                val layoutParams = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    else
                        WindowManager.LayoutParams.TYPE_PHONE,
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                            WindowManager.LayoutParams.FLAG_FULLSCREEN,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.CENTER
                }

                val layout = LinearLayout(context).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER
                    setBackgroundColor(Color.parseColor("#0B0F19"))
                    setPadding(50, 50, 50, 50)
                }

                val trackingMode = BlockerStorage.getTrackingMode(context)
                val isPerApp = trackingMode == BlockerStorage.MODE_PER_APP

                val badge = TextView(context).apply {
                    text = if (isPerApp) "SUPER ADMIN SHIELD • ISOLATED APP LOCK" else "SUPER ADMIN SHIELD • SHARED POOL"
                    setTextColor(Color.parseColor("#EF4444"))
                    textSize = 11f
                    typeface = Typeface.DEFAULT_BOLD
                    letterSpacing = 0.12f
                    gravity = Gravity.CENTER
                }
                layout.addView(badge)

                val title = TextView(context).apply {
                    text = "TIME LIMIT EXPIRED"
                    setTextColor(Color.WHITE)
                    textSize = 22f
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    setPadding(0, 16, 0, 12)
                }
                layout.addView(title)

                val appFriendlyName = try {
                    val pm = context.packageManager
                    val appInfo = pm.getApplicationInfo(blockedPackageName, 0)
                    pm.getApplicationLabel(appInfo).toString()
                } catch (e: Exception) {
                    blockedPackageName
                }

                val message = TextView(context).apply {
                    text = if (isPerApp) {
                        "$appFriendlyName has reached its individual window limit.\nOther apps remain accessible under their own allowances."
                    } else {
                        "$appFriendlyName and all guarded apps are locked under your shared window allowance."
                    }
                    setTextColor(Color.parseColor("#94A3B8"))
                    textSize = 14f
                    gravity = Gravity.CENTER
                    setPadding(0, 0, 0, 24)
                }
                layout.addView(message)

                // Countdown Card Container
                val countdownCard = LinearLayout(context).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER
                    val cardBg = GradientDrawable().apply {
                        setColor(Color.parseColor("#111827"))
                        cornerRadius = 24f
                        setStroke(2, Color.parseColor("#1F2937"))
                    }
                    background = cardBg
                    setPadding(36, 28, 36, 28)
                }

                val countdownHeader = TextView(context).apply {
                    text = if (isPerApp) "$appFriendlyName UNLOCKS IN" else "WINDOW UNLOCKS IN"
                    setTextColor(Color.parseColor("#94A3B8"))
                    textSize = 11f
                    typeface = Typeface.DEFAULT_BOLD
                    letterSpacing = 0.12f
                    gravity = Gravity.CENTER
                }
                countdownCard.addView(countdownHeader)

                val countdownTimer = TextView(context).apply {
                    text = "--:--"
                    setTextColor(Color.parseColor("#F43F5E"))
                    textSize = 38f
                    typeface = Typeface.MONOSPACE
                    paint.isFakeBoldText = true
                    gravity = Gravity.CENTER
                    setPadding(0, 8, 0, 8)
                }
                countdownCard.addView(countdownTimer)

                val countdownFooter = TextView(context).apply {
                    val allowanceMins = BlockerStorage.getAllowanceMinutes(context)
                    val windowMins = BlockerStorage.getWindowMinutes(context)
                    text = if (isPerApp) {
                        "Your ${allowanceMins}m limit for this app will replenish when its ${windowMins}m window resets."
                    } else {
                        "Your ${allowanceMins}m shared allowance will replenish when the ${windowMins}m window resets."
                    }
                    setTextColor(Color.parseColor("#64748B"))
                    textSize = 12f
                    gravity = Gravity.CENTER
                }
                countdownCard.addView(countdownFooter)

                val cardParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 32)
                }
                layout.addView(countdownCard, cardParams)

                val homeButton = Button(context).apply {
                    text = "Return to Home Screen"
                    val btnBg = GradientDrawable().apply {
                        setColor(Color.parseColor("#2563EB"))
                        cornerRadius = 16f
                    }
                    background = btnBg
                    setTextColor(Color.WHITE)
                    setPadding(30, 20, 30, 20)
                    setOnClickListener {
                        hideOverlay(context)
                        BlockerForegroundService.notifyLeavingBlockedApp()
                        goToHomeScreen(context)
                    }
                }
                val homeBtnParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 16)
                }
                layout.addView(homeButton, homeBtnParams)

                val openAppButton = Button(context).apply {
                    text = "Open Super Admin (+2m Grace Challenge)"
                    val btnBg = GradientDrawable().apply {
                        setColor(Color.parseColor("#1E293B"))
                        cornerRadius = 16f
                        setStroke(2, Color.parseColor("#334155"))
                    }
                    background = btnBg
                    setTextColor(Color.parseColor("#38BDF8"))
                    setPadding(30, 20, 30, 20)
                    setOnClickListener {
                        hideOverlay(context)
                        BlockerForegroundService.notifyLeavingBlockedApp()
                        openSuperAdminApp(context)
                    }
                }
                val openBtnParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                layout.addView(openAppButton, openBtnParams)

                // Start Live Countdown Loop
                countdownRunnable = object : Runnable {
                    override fun run() {
                        val remainingSecs = BlockerStorage.getWindowRemainingSeconds(context, blockedPackageName)
                        if (remainingSecs <= 0) {
                            Log.i(TAG, "Block window reset expired for $blockedPackageName while overlay was open. Auto-dismissing overlay.")
                            hideOverlay(context)
                            return
                        }

                        val hours = remainingSecs / 3600
                        val mins = (remainingSecs % 3600) / 60
                        val secs = remainingSecs % 60

                        countdownTimer.text = if (hours > 0) {
                            String.format("%02d:%02d:%02d", hours, mins, secs)
                        } else {
                            String.format("%02d:%02d", mins, secs)
                        }

                        mainHandler.postDelayed(this, 1000)
                    }
                }
                countdownRunnable?.run()

                windowManager.addView(layout, layoutParams)
                overlayView = layout
                Log.i(TAG, "Overlay successfully attached to WindowManager for $blockedPackageName with live countdown")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to attach overlay window", e)
                countdownRunnable?.let { mainHandler.removeCallbacks(it) }
                countdownRunnable = null
                overlayView = null
                isShowing = false
                goToHomeScreen(context)
            }
        }
    }

    fun hideOverlay(context: Context) {
        countdownRunnable?.let {
            mainHandler.removeCallbacks(it)
            countdownRunnable = null
        }

        if (!isShowing && overlayView == null) return
        isShowing = false

        mainHandler.post {
            val view = overlayView ?: return@post
            try {
                val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                windowManager.removeView(view)
                Log.i(TAG, "Overlay removed from WindowManager")
            } catch (e: Exception) {
                Log.e(TAG, "Error removing overlay view", e)
            } finally {
                overlayView = null
            }
        }
    }

    private fun goToHomeScreen(context: Context) {
        try {
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(homeIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch home intent", e)
        }
    }

    private fun openSuperAdminApp(context: Context) {
        try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            if (launchIntent != null) {
                context.startActivity(launchIntent)
            } else {
                goToHomeScreen(context)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open Super Admin app", e)
            goToHomeScreen(context)
        }
    }
}
