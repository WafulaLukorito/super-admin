package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

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
                    setPadding(52, 52, 52, 52)
                }

                val trackingMode = BlockerStorage.getTrackingMode(context)
                val isPerApp = trackingMode == BlockerStorage.MODE_PER_APP
                val activeProfileId = BlockerStorage.getActiveProfileId(context)
                val activeProfileName = BlockerStorage.getActiveProfileName(context)
                val allowanceMins = BlockerStorage.getAllowanceMinutes(context)
                val windowMins = BlockerStorage.getWindowMinutes(context)
                val isBedtime = activeProfileId == "bedtime" || allowanceMins == 0
                val appFriendlyName = AppNameResolver.getAppName(context, blockedPackageName)

                // Real Android App Icon
                AppNameResolver.getAppIconDrawable(context, blockedPackageName)?.let { drawable ->
                    val iconView = ImageView(context).apply {
                        setImageDrawable(drawable)
                        scaleType = ImageView.ScaleType.FIT_CENTER
                    }
                    val iconParams = LinearLayout.LayoutParams(128, 128).apply {
                        setMargins(0, 0, 0, 20)
                    }
                    layout.addView(iconView, iconParams)
                }

                val badge = TextView(context).apply {
                    if (isBedtime) {
                        text = "BEDTIME LOCKDOWN"
                        setTextColor(Color.parseColor("#818CF8"))
                    } else if (activeProfileName != null) {
                        text = "HOURGLASS • ${activeProfileName.uppercase()}"
                        setTextColor(Color.parseColor("#2ED3A3"))
                    } else if (isPerApp) {
                        text = "HOURGLASS • APP LIMIT"
                        setTextColor(Color.parseColor("#F43F5E"))
                    } else {
                        text = "HOURGLASS • SHARED LIMIT"
                        setTextColor(Color.parseColor("#F43F5E"))
                    }
                    textSize = 11f
                    typeface = Typeface.DEFAULT_BOLD
                    letterSpacing = 0.12f
                    gravity = Gravity.CENTER
                }
                layout.addView(badge)

                val title = TextView(context).apply {
                    text = if (isBedtime) "Time to Rest" else "$appFriendlyName Paused"
                    setTextColor(Color.WHITE)
                    textSize = 24f
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    setPadding(0, 14, 0, 10)
                }
                layout.addView(title)

                val message = TextView(context).apply {
                    text = if (isBedtime) {
                        "$appFriendlyName is paused for the night.\nRest well — your apps unlock in the morning."
                    } else if (isPerApp) {
                        "You've used your $appFriendlyName time for this cycle.\nOther guarded apps remain available."
                    } else {
                        "You've reached your limit for this cycle.\n$appFriendlyName and your other guarded apps are paused."
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
                    setPadding(36, 26, 36, 26)
                }

                val countdownHeader = TextView(context).apply {
                    text = if (isBedtime) "UNLOCKS IN" else if (isPerApp) "$appFriendlyName UNLOCKS IN" else "RESETS IN"
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
                        "Protected sleep hours are active until morning."
                    } else if (isPerApp) {
                        "Your ${allowanceMins}m limit refreshes when this ${windowMins}m cycle ends."
                    } else {
                        "Your ${allowanceMins}m shared limit refreshes when this ${windowMins}m cycle ends."
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
                    setMargins(0, 0, 0, 28)
                }
                layout.addView(countdownCard, cardParams)

                // Return Home CTA
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
                    setMargins(0, 0, 0, 12)
                }
                layout.addView(homeButton, homeBtnParams)

                // Smart Ranked Positive Alternative CTA (with real app icon if installed, or Play Store prompt)
                val (positivePkg, positiveName, positiveInstalled) = AppNameResolver.resolvePositiveTarget(context)
                val positiveRow = LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER
                    val rowBg = GradientDrawable().apply {
                        setColor(Color.parseColor("#102822"))
                        cornerRadius = 16f
                        setStroke(2, Color.parseColor("#1F5E4C"))
                    }
                    background = rowBg
                    setPadding(28, 22, 28, 22)
                    setOnClickListener {
                        hideOverlay(context)
                        BlockerForegroundService.notifyLeavingBlockedApp()
                        launchPackage(context, positivePkg)
                    }
                }
                AppNameResolver.getAppIconDrawable(context, positivePkg)?.let { altDrawable ->
                    val altIcon = ImageView(context).apply {
                        setImageDrawable(altDrawable)
                        scaleType = ImageView.ScaleType.FIT_CENTER
                    }
                    val altIconParams = LinearLayout.LayoutParams(52, 52).apply {
                        setMargins(0, 0, 16, 0)
                    }
                    positiveRow.addView(altIcon, altIconParams)
                }
                val positiveText = TextView(context).apply {
                    text = if (positiveInstalled) {
                        "Open $positiveName Instead"
                    } else {
                        "Get $positiveName on Play Store"
                    }
                    setTextColor(Color.parseColor("#84E150"))
                    textSize = 13f
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                }
                positiveRow.addView(positiveText)

                val positiveBtnParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 12)
                }
                layout.addView(positiveRow, positiveBtnParams)

                // Extra Time Options — ONLY shown when extra time is genuinely available in this cycle!
                val canClaim = BlockerStorage.canClaimGrace(context, blockedPackageName)
                val allow2 = BlockerStorage.isExtra2MinEnabled(context)
                val allow5 = BlockerStorage.isExtra5MinEnabled(context)

                if (canClaim) {
                    val graceRow = LinearLayout(context).apply {
                        orientation = LinearLayout.HORIZONTAL
                        gravity = Gravity.CENTER
                    }
                    val graceOptions = mutableListOf<Int>()
                    if (allow2) graceOptions.add(2)
                    if (allow5) graceOptions.add(5)

                    graceOptions.forEachIndexed { idx, mins ->
                        val extBtn = Button(context).apply {
                            text = if (graceOptions.size == 1) {
                                "Need $mins More Minutes?"
                            } else {
                                "+$mins Min"
                            }
                            val btnBg = GradientDrawable().apply {
                                setColor(Color.parseColor("#262626"))
                                cornerRadius = 16f
                                setStroke(2, Color.parseColor("#2C2C2C"))
                            }
                            background = btnBg
                            setTextColor(Color.parseColor("#2ED3A3"))
                            textSize = 13f
                            typeface = Typeface.DEFAULT_BOLD
                            setPadding(20, 20, 20, 20)
                            setOnClickListener {
                                handleOverlayExtraTimeTap(context, blockedPackageName, appFriendlyName, mins)
                            }
                        }
                        val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                            if (idx == 0 && graceOptions.size > 1) {
                                setMargins(0, 0, 10, 0)
                            }
                        }
                        graceRow.addView(extBtn, lp)
                    }

                    val graceRowParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    layout.addView(graceRow, graceRowParams)
                } else {
                    // Honest non-actionable notice when grace has already been claimed or bedtime is active
                    val usedNotice = TextView(context).apply {
                        text = if (isBedtime) {
                            "Sleep hours active — extra time unavailable until morning"
                        } else {
                            "Extra time already used this cycle"
                        }
                        setTextColor(if (isBedtime) Color.parseColor("#818CF8") else Color.parseColor("#6E7A75"))
                        textSize = 12f
                        gravity = Gravity.CENTER
                        setPadding(16, 16, 16, 12)
                    }
                    layout.addView(usedNotice)
                }

                // Start Live Countdown Loop
                countdownRunnable = object : Runnable {
                    override fun run() {
                        val remainingSecs = BlockerStorage.getWindowRemainingSeconds(context, blockedPackageName)
                        if (remainingSecs <= 0) {
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
                Log.i(TAG, "Overlay attached for $appFriendlyName ($blockedPackageName)")
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

    private fun handleOverlayExtraTimeTap(
        context: Context,
        blockedPackageName: String,
        appFriendlyName: String,
        minutes: Int
    ) {
        if (!BlockerStorage.isFrictionEnabled(context)) {
            val ok = BlockerStorage.claimGraceExtension(context, blockedPackageName, minutes)
            if (ok) {
                SoundFeedbackManager.play(context, "extension")
                hideOverlay(context)
                Toast.makeText(
                    context,
                    "Added $minutes extra minutes for $appFriendlyName.",
                    Toast.LENGTH_SHORT
                ).show()
            } else {
                hideOverlay(context)
                showOverlay(context, blockedPackageName)
            }
        } else {
            BlockerStorage.setPendingGraceRequest(context, blockedPackageName, minutes)
            hideOverlay(context)
            BlockerForegroundService.notifyLeavingBlockedApp()
            openSuperAdminApp(context, blockedPackageName, minutes)
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

    private fun openSuperAdminApp(context: Context, packageName: String? = null, minutes: Int = 2) {
        try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
                if (packageName != null) {
                    putExtra(GraceExtensionReceiver.EXTRA_OPEN_FRICTION, true)
                    putExtra(GraceExtensionReceiver.EXTRA_PACKAGE_NAME, packageName)
                    putExtra(GraceExtensionReceiver.EXTRA_MINUTES, minutes)
                }
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
                val storeIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$targetPackage")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(storeIntent)
            }
        } catch (e: Exception) {
            try {
                val webIntent = Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=$targetPackage")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(webIntent)
            } catch (_: Exception) {
                goToHomeScreen(context)
            }
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

                val appFriendlyName = AppNameResolver.getAppName(context, guardedPackageName)

                AppNameResolver.getAppIconDrawable(context, guardedPackageName)?.let { drawable ->
                    val iconView = ImageView(context).apply {
                        setImageDrawable(drawable)
                        scaleType = ImageView.ScaleType.FIT_CENTER
                    }
                    val iconParams = LinearLayout.LayoutParams(108, 108).apply {
                        setMargins(0, 0, 0, 16)
                    }
                    layout.addView(iconView, iconParams)
                }

                val badge = TextView(context).apply {
                    text = "MINDFUL PAUSE"
                    setTextColor(Color.parseColor("#2ED3A3"))
                    textSize = 11f
                    typeface = Typeface.DEFAULT_BOLD
                    letterSpacing = 0.14f
                    gravity = Gravity.CENTER
                }
                layout.addView(badge)

                val title = TextView(context).apply {
                    text = "Opening $appFriendlyName?"
                    setTextColor(Color.WHITE)
                    textSize = 22f
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    setPadding(0, 12, 0, 8)
                }
                layout.addView(title)

                val prompt = TextView(context).apply {
                    text = "Take a slow breath.\nDo you want to open $appFriendlyName right now?"
                    setTextColor(Color.parseColor("#A8B5B0"))
                    textSize = 13f
                    gravity = Gravity.CENTER
                    setPadding(0, 0, 0, 24)
                }
                layout.addView(prompt)

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

                // Soft calming tone as breathe begins
                SoundFeedbackManager.play(context, "breathe")

                val closeAppButton = Button(context).apply {
                    text = "Skip Opening $appFriendlyName"
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

                val proceedButton = Button(context).apply {
                    text = "Wait 10s to Continue..."
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
                            SoundFeedbackManager.play(context, "success")
                            breathCountdown.text = "✓"
                            breathPhase.text = "Centered"
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
                            4 -> {
                                breathPhase.text = "Exhale gently..."
                                SoundFeedbackManager.play(context, "breathe")
                            }
                            else -> breathPhase.text = "Exhale gently..."
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
