package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import java.io.ByteArrayOutputStream

object InstalledAppsHelper {
    fun getInstalledApps(context: Context): List<Map<String, Any>> {
        val pm = context.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
        val resultList = mutableListOf<Map<String, Any>>()
        val seenPackages = mutableSetOf<String>()

        for (info in resolveInfos) {
            val pkg = info.activityInfo.packageName
            if (pkg == context.packageName || seenPackages.contains(pkg)) {
                continue
            }
            seenPackages.add(pkg)

            try {
                val appName = info.loadLabel(pm).toString()
                val appInfo = info.activityInfo.applicationInfo
                val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0

                val iconDrawable = info.loadIcon(pm)
                val iconBase64 = drawableToBase64(iconDrawable)

                val category = guessCategory(appName, pkg)

                val map = mutableMapOf<String, Any>(
                    "packageName" to pkg,
                    "appName" to appName,
                    "isSystemApp" to isSystem,
                    "category" to category,
                    "icon" to iconBase64
                )
                resultList.add(map)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        return resultList.sortedBy { (it["appName"] as String).lowercase() }
    }

    private fun drawableToBase64(drawable: Drawable): String {
        return try {
            val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
                Bitmap.createScaledBitmap(drawable.bitmap, 64, 64, true)
            } else {
                val b = Bitmap.createBitmap(64, 64, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(b)
                drawable.setBounds(0, 0, 64, 64)
                drawable.draw(canvas)
                b
            }
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, stream)
            val byteArray = stream.toByteArray()
            "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            ""
        }
    }

    private fun guessCategory(appName: String, packageName: String): String {
        val lowerPkg = packageName.lowercase()
        val lowerName = appName.lowercase()

        if (lowerPkg.contains("instagram") || lowerPkg.contains("musically") || lowerPkg.contains("tiktok")
            || lowerPkg.contains("twitter") || lowerPkg.contains("facebook") || lowerPkg.contains("reddit")
            || lowerPkg.contains("snapchat") || lowerPkg.contains("youtube") || lowerPkg.contains("threads")
            || lowerPkg.contains("pinterest") || lowerPkg.contains("netflix") || lowerPkg.contains("twitch")) {
            return "poison"
        }

        if (lowerPkg.contains("game") || lowerPkg.contains("play") || lowerName.contains("clash")
            || lowerName.contains("candy") || lowerName.contains("subway") || lowerName.contains("puzzle")) {
            return "game"
        }

        return "utility"
    }
}
