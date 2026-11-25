package expo.modules.appblocker

import android.content.Context
import android.graphics.drawable.Drawable

/**
 * Shared native hash map and helpers for resolving package IDs to human-friendly names,
 * icons, and ranked productive alternatives (Duolingo #1, Substack #2, etc.).
 */
object AppNameResolver {
    val KNOWN_APP_NAMES: Map<String, String> = hashMapOf(
        // Common social / video apps
        "com.instagram.android" to "Instagram",
        "com.instagram.barcelona" to "Threads",
        "com.zhiliaoapp.musically" to "TikTok",
        "com.ss.android.ugc.trill" to "TikTok",
        "com.google.android.youtube" to "YouTube",
        "com.twitter.android" to "X",
        "com.reddit.frontpage" to "Reddit",
        "com.facebook.katana" to "Facebook",
        "com.facebook.orca" to "Messenger",
        "com.snapchat.android" to "Snapchat",
        "com.pinterest" to "Pinterest",
        "com.netflix.mediaclient" to "Netflix",
        "tv.twitch.android.app" to "Twitch",
        "com.discord" to "Discord",
        "com.whatsapp" to "WhatsApp",
        "org.telegram.messenger" to "Telegram",
        "com.tumblr" to "Tumblr",
        "com.linkedin.android" to "LinkedIn",
        "com.quora.android" to "Quora",

        // Productive alternatives (ordered priority)
        "com.duolingo" to "Duolingo",
        "com.substack.app" to "Substack",
        "com.blinkslabs.blinkist.android" to "Blinkist",
        "org.brilliant.android" to "Brilliant",
        "com.ichi2.anki" to "AnkiDroid",
        "com.flyersoft.moonreader" to "Moon+ Reader",
        "com.instapaper.android" to "Instapaper",
        "md.obsidian" to "Obsidian",
        "com.getsomeheadspace.android" to "Headspace",
        "com.elevateapp.elevate" to "Elevate",
        "com.getmimo" to "Mimo",
        "com.curiosity.curiositystream" to "CuriosityStream",
        "com.neverland.alreaderext" to "AlReader",
        "wp.wattpad" to "Wattpad",
        "com.spotify.music" to "Spotify",
        "com.medium.reader" to "Medium",
        "com.habitrpg.android.habitica" to "Habitica",
        "com.amazon.kindle" to "Kindle",
        "com.google.android.keep" to "Google Keep",
        "com.jowaljones.superadmin" to "Hourglass"
    )

    val RANKED_ALTERNATIVES: List<Pair<String, String>> = listOf(
        "com.duolingo" to "Duolingo",
        "com.substack.app" to "Substack",
        "com.blinkslabs.blinkist.android" to "Blinkist",
        "org.brilliant.android" to "Brilliant",
        "com.ichi2.anki" to "AnkiDroid",
        "com.flyersoft.moonreader" to "Moon+ Reader",
        "com.instapaper.android" to "Instapaper",
        "md.obsidian" to "Obsidian",
        "com.getsomeheadspace.android" to "Headspace",
        "com.elevateapp.elevate" to "Elevate",
        "com.getmimo" to "Mimo",
        "com.curiosity.curiositystream" to "CuriosityStream",
        "com.neverland.alreaderext" to "AlReader",
        "wp.wattpad" to "Wattpad",
        "com.spotify.music" to "Spotify",
        "com.medium.reader" to "Medium",
        "com.habitrpg.android.habitica" to "Habitica"
    )

    private val IGNORED_SEGMENTS = setOf("com", "org", "net", "io", "app", "android", "mobile", "client")

    fun getAppName(context: Context, packageName: String?): String {
        if (packageName.isNullOrBlank()) return "App"

        KNOWN_APP_NAMES[packageName]?.let { return it }

        try {
            val pm = context.packageManager
            val info = pm.getApplicationInfo(packageName, 0)
            val label = pm.getApplicationLabel(info)?.toString()?.trim()
            if (!label.isNullOrEmpty() && !label.contains('.')) {
                return label
            }
        } catch (_: Exception) {
        }

        val parts = packageName.split('.').filter { it.isNotBlank() }
        val meaningful = parts.filter { !IGNORED_SEGMENTS.contains(it.lowercase()) }
        val raw = meaningful.lastOrNull() ?: parts.lastOrNull() ?: packageName
        return raw.replaceFirstChar { it.uppercase() }
    }

    fun getAppIconDrawable(context: Context, packageName: String?): Drawable? {
        if (packageName.isNullOrBlank()) return null
        return try {
            context.packageManager.getApplicationIcon(packageName)
        } catch (_: Exception) {
            null
        }
    }

    fun isPackageInstalled(context: Context, packageName: String): Boolean {
        return try {
            context.packageManager.getLaunchIntentForPackage(packageName) != null
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Resolves which positive alternative button to display:
     * Returns Triple(packageName, displayName, isInstalled).
     */
    fun resolvePositiveTarget(context: Context): Triple<String, String, Boolean> {
        val preferredPkg = BlockerStorage.getPositiveRedirectPackage(context)
        val preferredName = getAppName(context, preferredPkg)

        if (isPackageInstalled(context, preferredPkg)) {
            return Triple(preferredPkg, preferredName, true)
        }

        // If preferred (or default Duolingo) is not installed, look for highest-ranked installed app
        for ((pkg, name) in RANKED_ALTERNATIVES) {
            if (isPackageInstalled(context, pkg)) {
                // Only auto-override if the stored selection wasn't deliberately unavailable, or
                // keep Duolingo as the download recommendation if none exist.
                if (preferredPkg == "com.duolingo") {
                    return Triple(pkg, name, true)
                }
            }
        }

        return Triple(preferredPkg, preferredName, isPackageInstalled(context, preferredPkg))
    }
}
