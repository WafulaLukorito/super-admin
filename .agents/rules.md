# Project Workspace Rules: Super Admin App Blocker

## Core Architecture
- **Target Platform:** Android-only (`minSdkVersion 26`). Do not generate iOS Swift/Objective-C boilerplate unless required by Expo config compilation.
- **Expo Workflow:** Expo Development Builds (`npx expo run:android`). Never assume Expo Go compatibility.
- **State & Storage:** Use `expo-sqlite` (or native Android Room/SharedPreferences shared via Expo Modules) so the Kotlin Foreground Service can read and write timer state even when the React Native JS thread is suspended or killed.

## Domain Logic (Hourly Interval Engine)
- Time is evaluated in rolling or fixed 60-minute/120-minute blocks (configurable per app/category).
- Default rule example: 10 minutes allowed per 60-minute window.
- When allowance hits `0`, trigger the native full-screen blocking overlay immediately.
- Users may claim **one** friction-gated 2-minute grace extension per block. Once exhausted, the app remains hard-locked until the next block window opens.

## Anti-Tamper Constraints
- **Clock Tampering:** Do NOT rely solely on `System.currentTimeMillis()` for cooldown timers. Anchor cooldown durations to `SystemClock.elapsedRealtime()` so changing the device date/time in Android Settings does not unlock restricted apps.
- **Persistence:** The monitoring loop must run inside an Android `ForegroundService` (`FOREGROUND_SERVICE_SPECIAL_USE`) with a persistent low-priority notification and `START_STICKY` restart behavior.
