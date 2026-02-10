package com.theowallmann.balanceos.blocker

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class AppBlockerAccessibilityService : AccessibilityService() {

    // TODO: später aus SharedPreferences / DB laden
    private val blockedPackages = setOf(
        "com.instagram.android",
        "com.zhiliaoapp.musically" // TikTok
    )

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val pkg = event.packageName?.toString() ?: return

        // Nicht uns selbst blocken
        if (pkg == applicationContext.packageName) return

        if (blockedPackages.contains(pkg)) {
            val i = Intent(this, BlockerRedirectActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("blockedPackage", pkg)
            }
            startActivity(i)
        }
    }

    override fun onInterrupt() {}
}
