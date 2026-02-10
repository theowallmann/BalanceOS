package com.theowallmann.balanceos.blocker

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

class BlockerRedirectActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val blockedPkg = intent.getStringExtra("blockedPackage") ?: ""

        // Deep Link in deine MainActivity (du hast scheme balanceos im Manifest)
        // Expo Router Route: app/blocker.tsx
        val uri = Uri.parse("balanceos://blocker?pkg=$blockedPkg")

        val i = Intent(Intent.ACTION_VIEW, uri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        startActivity(i)
        finish()
    }
}
