package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

object BlockerOverlayManager {
    private var overlayView: View? = null
    private var isShowing = false
    private val mainHandler = Handler(Looper.getMainLooper())

    fun showOverlay(context: Context, blockedPackageName: String) {
        mainHandler.post {
            if (isShowing) return@post

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                // If overlay permission not granted, redirect to home screen directly
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
                    setPadding(60, 60, 60, 60)
                }

                val badge = TextView(context).apply {
                    text = "SUPER ADMIN SHIELD"
                    setTextColor(Color.parseColor("#EF4444"))
                    textSize = 12f
                    typeface = Typeface.DEFAULT_BOLD
                    letterSpacing = 0.15f
                    gravity = Gravity.CENTER
                }
                layout.addView(badge)

                val title = TextView(context).apply {
                    text = "HOURLY TIME LIMIT EXPIRED"
                    setTextColor(Color.WHITE)
                    textSize = 22f
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    setPadding(0, 20, 0, 20)
                }
                layout.addView(title)

                val message = TextView(context).apply {
                    text = "Usage limit reached for this hourly block window.\n$blockedPackageName is locked to protect your focus."
                    setTextColor(Color.parseColor("#94A3B8"))
                    textSize = 14f
                    gravity = Gravity.CENTER
                    setPadding(0, 0, 0, 40)
                }
                layout.addView(message)

                val homeButton = Button(context).apply {
                    text = "Return to Home Screen"
                    setBackgroundColor(Color.parseColor("#2563EB"))
                    setTextColor(Color.WHITE)
                    setPadding(30, 20, 30, 20)
                    setOnClickListener {
                        hideOverlay(context)
                        goToHomeScreen(context)
                    }
                }
                layout.addView(homeButton)

                val space = View(context).apply {
                    layoutParams = LinearLayout.LayoutParams(1, 24)
                }
                layout.addView(space)

                val openAppButton = Button(context).apply {
                    text = "Open Super Admin (+2m Grace Challenge)"
                    setBackgroundColor(Color.parseColor("#1E293B"))
                    setTextColor(Color.parseColor("#38BDF8"))
                    setPadding(30, 20, 30, 20)
                    setOnClickListener {
                        hideOverlay(context)
                        openSuperAdminApp(context)
                    }
                }
                layout.addView(openAppButton)

                windowManager.addView(layout, layoutParams)
                overlayView = layout
                isShowing = true
            } catch (e: Exception) {
                e.printStackTrace()
                goToHomeScreen(context)
            }
        }
    }

    fun hideOverlay(context: Context) {
        mainHandler.post {
            if (!isShowing || overlayView == null) return@post
            try {
                val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                windowManager.removeView(overlayView)
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                overlayView = null
                isShowing = false
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
            e.printStackTrace()
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
            e.printStackTrace()
            goToHomeScreen(context)
        }
    }
}
