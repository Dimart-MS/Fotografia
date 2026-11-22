package com.example.fotografia.data

import android.os.Build
import com.example.fotografia.BuildConfig

/** Configuración de despliegue; no forma parte de las pantallas del producto. */
object ConnectionConfig {
    private val emulator = Build.FINGERPRINT.contains("generic") || Build.MODEL.contains("sdk", true) || Build.MODEL.contains("emulator", true)
    private val host = if (emulator) "10.0.2.2" else "127.0.0.1"
    val clientsUrl: String = BuildConfig.CLIENTS_BASE_URL.ifBlank { if (BuildConfig.DEBUG) "http://$host:8000/" else "" }
    val bookingsUrl: String = BuildConfig.BOOKINGS_BASE_URL.ifBlank { if (BuildConfig.DEBUG) "http://$host:8000/" else "" }
    val placesApiKey: String = BuildConfig.PLACES_API_KEY.trim()
}
