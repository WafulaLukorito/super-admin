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
                    setBackgroundColor(Color.parseColor("#141414"))
                    setPadding(50, 50, 50, 50)
                }

                val trackingMode = BlockerStorage.getTrackingMode(context)
                val isPerApp = trackingMode == BlockerStorage.MODE_PER_APP
                val activeProfileId = BlockerStorage.getActiveProfileId(context)
                val activeProfileName = BlockerStorage.getActiveProfileName(context)
                val allowanceMins = BlockerStorage.getAllowanceMinutes(context)
                val windowMins = BlockerStorage.getWindowMinutes(context)
                val isBedtime = activeProfileId == "bedtime" || allowanceMins == 0

                val badge = TextView(context).apply {
                    if (isBedtime) {
                        text = "RESTFUL SLEEP SHIELD • BEDTIME LOCKDOWN"
                        setTextColor(Color.parseColor("#818CF8"))
                    } else if (activeProfileName != null) {
                        text = "HOURGLASS SHIELD • ${activeProfileName.uppercase()}"
                        setTextColor(Color.parseColor("#2ED3A3"))
                    } else if (isPerApp) {
                        text = "HOURGLASS SHIELD • ISOLATED APP LOCK"
                        setTextColor(Color.parseColor("#F43F5E"))
                    } else {
                        text = "HOURGLASS SHIELD • SHARED POOL"
                        setTextColor(Color.parseColor("#F43F5E"))
                    }
                    textSize = 11f
                    typeface = Typeface.DEFAULT_BOLD
                    letterSpacing = 0.12f
                    gravity = Gravity.CENTER
                }
                layout.addView(badge)

                val title = TextView(context).apply {
                    text = if (isBedtime) "RESTFUL SLEEP SHIELD" else "TIME LIMIT EXPIRED"
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
                    text = if (isBedtime) {
                        "$appFriendlyName is locked overnight to protect your circadian rhythm and sleep quality.\nRest peacefully—all guarded apps replenish in the morning."
                    } else if (isPerApp) {
                        "$appFriendlyName has reached its individual window limit.\nOther apps remain accessible under their own allowances."
                    } else {
                        "$appFriendlyName and all guarded apps are locked under your shared window allowance."
                    }
                    setTextColor(Color.parseColor("#A8B5B0"))
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
                        setColor(Color.parseColor("#1E1E1E"))
                        cornerRadius = 24f
                        setStroke(2, if (isBedtime) Color.parseColor("#3730A3") else Color.parseColor("#2C2C2C"))
                    }
                    background = cardBg
                    setPadding(36, 28, 36, 28)
                }

                val countdownHeader = TextView(context).apply {
                    text = if (isBedtime) "BEDTIME LOCK RESETS IN" else if (isPerApp) "$appFriendlyName UNLOCKS IN" else "WINDOW UNLOCKS IN"
                    setTextColor(if (isBedtime) Color.parseColor("#818CF8") else Color.parseColor("#A8B5B0"))
                    textSize = 11f
                    typeface = Typeface.DEFAULT_BOLD
                    letterSpacing = 0.12f
                    gravity = Gravity.CENTER
                }
                countdownCard.addView(countdownHeader)

                val countdownTimer = TextView(context).apply {
                    text = "--:--"
                    setTextColor(if (isBedtime) Color.parseColor("#818CF8") else Color.parseColor("#F43F5E"))
                    textSize = 38f
                    typeface = Typeface.MONOSPACE
                    paint.isFakeBoldText = true
                    gravity = Gravity.CENTER
                    setPadding(0, 8, 0, 8)
                }
                countdownCard.addView(countdownTimer)

                val countdownFooter = TextView(context).apply {
                    text = if (isBedtime) {
                        "Zero screen-time lock. Allowance will replenish when bedtime schedule concludes."
                    } else if (isPerApp) {
                        "Your ${allowanceMins}m limit for this app will replenish when its ${windowMins}m window resets."
                    } else {
                        "Your ${allowanceMins}m shared allowance will replenish when the ${windowMins}m window resets."
                    }
                    setTextColor(Color.parseColor("#A8B5B0"))
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
                        setColor(Color.parseColor("#2ED3A3"))
                        cornerRadius = 16f
                    }
                    background = btnBg
                    setTextColor(Color.parseColor("#101A17"))
                    typeface = Typeface.DEFAULT_BOLD
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
                    setMargins(0, 0, 0, 14)
                }
                layout.addView(homeButton, homeBtnParams)

                val positivePkg = BlockerStorage.getPositiveRedirectPackage(context)
                val positiveName = BlockerStorage.getPositiveRedirectName(context)

                val positiveButton = Button(context).apply {
                    text = "🌱 Positive Alternative: Open $positiveName"
                    val btnBg = GradientDrawable().apply {
                        setColor(Color.parseColor("#102822"))
                        cornerRadius = 16f
                        setStroke(2, Color.parseColor("#1F5E4C"))
                    }
                    background = btnBg
                    setTextColor(Color.parseColor("#84E150"))
                    textSize = 13f
                    typeface = Typeface.DEFAULT_BOLD
                    setPadding(30, 20, 30, 20)
                    setOnClickListener {
                        hideOverlay(context)
                        BlockerForegroundService.notifyLeavingBlockedApp()
                        launchPackage(context, positivePkg)
                    }
                }
                val positiveBtnParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 14)
                }
                layout.addView(positiveButton, positiveBtnParams)

                val openAppButton = Button(context).apply {
                    text = if (isBedtime) "🌙 Bedtime Active: Extensions Locked" else "Open Hourglass (+2m Grace Challenge)"
                    val btnBg = GradientDrawable().apply {
                        setColor(if (isBedtime) Color.parseColor("#181730") else Color.parseColor("#262626"))
                        cornerRadius = 16f
                        setStroke(2, if (isBedtime) Color.parseColor("#3730A3") else Color.parseColor("#2C2C2C"))
                    }
                    background = btnBg
                    setTextColor(if (isBedtime) Color.parseColor("#818CF8") else Color.parseColor("#2ED3A3"))
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
            Log.e(TAG, "Failed to open Hourglass app", e)
            goToHomeScreen(context)
        }
    }

    private fun launchPackage(context: Context, targetPackage: String) {
        try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(targetPackage)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            if (launchIntent != null) {
                context.startActivity(launchIntent)
            } else {
                val storeIntent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("market://details?id=$targetPackage")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(storeIntent)
            }
        } catch (e: Exception) {
            goToHomeScreen(context)
        }
    }

    fun showBreatheOverlay(context: Context, guardedPackageName: String) {
        if (isShowing) return
        isShowing = true

        mainHandler.post {
            if (overlayView != null) return@post

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                isShowing = false
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
                    setBackgroundColor(Color.parseColor("#141414"))
                    setPadding(50, 50, 50, 50)
                }

                val badge = TextView(context).apply {
                    text = "MINDFUL PAUSE • BREATHE BEFORE SCROLL"
                    setTextColor(Color.parseColor("#2ED3A3"))
                    textSize = 11f
                    typeface = Typeface.DEFAULT_BOLD
                    letterSpacing = 0.14f
                    gravity = Gravity.CENTER
                }
                layout.addView(badge)

                val appFriendlyName = try {
                    val pm = context.packageManager
                    val appInfo = pm.getApplicationInfo(guardedPackageName, 0)
                    pm.getApplicationLabel(appInfo).toString()
                } catch (e: Exception) {
                    guardedPackageName
                }

                val title = TextView(context).apply {
                    text = "Opening $appFriendlyName?"
                    setTextColor(Color.WHITE)
                    textSize = 22f
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    setPadding(0, 14, 0, 8)
                }
                layout.addView(title)

                val prompt = TextView(context).apply {
                    text = "Take a breath. 80% of app opens are compulsive autopilot reflex.\nAre you opening $appFriendlyName with intention?"
                    setTextColor(Color.parseColor("#A8B5B0"))
                    textSize = 13f
                    gravity = Gravity.CENTER
                    setPadding(0, 0, 0, 24)
                }
                layout.addView(prompt)

                // Breath Circle
                val circle = LinearLayout(context).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER
                    val circleBg = GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(Color.parseColor("#102822"))
                        setStroke(4, Color.parseColor("#2ED3A3"))
                    }
                    background = circleBg
                }
                val circleParams = LinearLayout.LayoutParams(240, 240).apply {
                    setMargins(0, 0, 0, 30)
                }

                val breathPhase = TextView(context).apply {
                    text = "Inhale..."
                    setTextColor(Color.parseColor("#A8B5B0"))
                    textSize = 14f
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                }
                circle.addView(breathPhase)

                val breathCountdown = TextView(context).apply {
                    text = "10"
                    setTextColor(Color.parseColor("#84E150"))
                    textSize = 40f
                    typeface = Typeface.MONOSPACE
                    paint.isFakeBoldText = true
                    gravity = Gravity.CENTER
                }
                circle.addView(breathCountdown)

                layout.addView(circle, circleParams)

                // Close App Button (Behavioral Win)
                val closeAppButton = Button(context).apply {
                    text = "Close $appFriendlyName (Behavioral Win)"
                    val btnBg = GradientDrawable().apply {
                        setColor(Color.parseColor("#2ED3A3"))
                        cornerRadius = 16f
                    }
                    background = btnBg
                    setTextColor(Color.parseColor("#101A17"))
                    textSize = 14f
                    typeface = Typeface.DEFAULT_BOLD
                    setPadding(30, 20, 30, 20)
                    setOnClickListener {
                        hideOverlay(context)
                        BlockerForegroundService.notifyLeavingBlockedApp()
                        goToHomeScreen(context)
                    }
                }
                val closeBtnParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 14)
                }
                layout.addView(closeAppButton, closeBtnParams)

                // Continue Button (Enabled after countdown)
                val proceedButton = Button(context).apply {
                    text = "Pause & Proceed (Wait 10s...)"
                    val btnBg = GradientDrawable().apply {
                        setColor(Color.parseColor("#262626"))
                        cornerRadius = 16f
                        setStroke(2, Color.parseColor("#2C2C2C"))
                    }
                    background = btnBg
                    setTextColor(Color.parseColor("#6E7A75"))
                    isEnabled = false
                    setPadding(30, 20, 30, 20)
                    setOnClickListener {
                        BlockerStorage.markBreatheCompleted(context, guardedPackageName)
                        hideOverlay(context)
                    }
                }
                val proceedParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                layout.addView(proceedButton, proceedParams)

                var secondsLeft = 10
                countdownRunnable = object : Runnable {
                    override fun run() {
                        secondsLeft--
                        if (secondsLeft <= 0) {
                            breathCountdown.text = "✓"
                            breathPhase.text = "Deliberate"
                            proceedButton.isEnabled = true
                            proceedButton.text = "Continue to $appFriendlyName"
                            proceedButton.setTextColor(Color.parseColor("#2ED3A3"))
                            val activeBg = GradientDrawable().apply {
                                setColor(Color.parseColor("#102822"))
                                cornerRadius = 16f
                                setStroke(2, Color.parseColor("#1F5E4C"))
                            }
                            proceedButton.background = activeBg
                            return
                        }

                        breathCountdown.text = secondsLeft.toString()
                        when (secondsLeft) {
                            in 7..10 -> breathPhase.text = "Inhale slowly..."
                            in 5..6 -> breathPhase.text = "Hold breath..."
                            else -> breathPhase.text = "Exhale release..."
                        }

                        mainHandler.postDelayed(this, 1000)
                    }
                }
                mainHandler.postDelayed(countdownRunnable!!, 1000)

                windowManager.addView(layout, layoutParams)
                overlayView = layout
            } catch (e: Exception) {
                Log.e(TAG, "Failed to attach breathe overlay", e)
                hideOverlay(context)
            }
        }
    }
}
