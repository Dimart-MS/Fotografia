package com.example.fotografia.data

import java.math.BigDecimal
import java.text.NumberFormat
import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale

data class StudioUser(val id: Long, val email: String, val role: String)
data class LoginRequest(val email: String, val password: String)
data class LoginResponse(val access_token: String, val user: StudioUser)
data class Client(
    val id: Long, val name: String, val phone: String,
    val email: String, val address: String, val active: Boolean? = true
) {
    val isActive: Boolean get() = active != false
}
data class ClientRequest(val name: String, val phone: String, val email: String, val address: String)
data class StatusChange(val message: String = "", val active: Boolean = true)
data class PackageOption(
    val id: String, val name: String, val price_cents: Long,
    val description: String? = null, val active: Boolean? = true
) {
    val isActive: Boolean get() = active != false
}
data class PackageCreateRequest(
    val clave: String, val nombre: String,
    val descripcion: String?, val precio_centavos: Long
)
data class PackageUpdateRequest(
    val nombre: String, val descripcion: String?, val precio_centavos: Long
)
data class Booking(
    val id: Long, val client_id: Long, val client_name: String, val event_date: String,
    val event_type: String, val `package`: String, val total_cents: Long,
    val paid_cents: Long, val status: String
)
data class BookingRequest(val client_id: Long, val event_date: String, val event_type: String, val `package`: String)
data class PaymentRequest(val amount: String)
data class BookingChange(val status: String, val paid_cents: Long? = null)

object Rules {
    const val PENDING = "Pendiente de anticipo"
    const val RECEIPT_SENT = "Comprobante enviado"
    const val CONFIRMED = "Confirmada"
    const val COMPLETED = "Realizada"
    const val DELIVERED = "Entregada"
    const val CANCELLED = "Cancelada"
    val bookingStatuses = listOf(PENDING, RECEIPT_SENT, CONFIRMED, COMPLETED, DELIVERED, CANCELLED)
    fun occupiesDate(status: String): Boolean = status in setOf(CONFIRMED, COMPLETED, DELIVERED)
    val eventTypes = listOf("Boda", "XV años", "Bautizo", "Fiesta", "Otro")
    fun today(): LocalDate = LocalDate.now(ZoneId.of("America/Mexico_City"))
    fun clientError(value: ClientRequest): String? = when {
        value.name.trim().length !in 3..100 -> "Escribe un nombre de entre 3 y 100 caracteres."
        !value.phone.matches(Regex("[0-9]{10}")) -> "El teléfono debe contener 10 dígitos."
        value.email.length > 160 || !value.email.matches(Regex("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) -> "Revisa el correo electrónico."
        value.address.trim().length !in 5..250 -> "Escribe un domicilio de entre 5 y 250 caracteres."
        else -> null
    }
    fun packageError(clave: String, nombre: String, descripcion: String, priceInput: String, isNew: Boolean = true): String? {
        val cleanKey = clave.trim().lowercase()
        val cents = cents(priceInput)
        return when {
            isNew && (cleanKey.length !in 2..40 || !cleanKey.matches(Regex("[a-z0-9]+(-[a-z0-9]+)*"))) ->
                "La clave debe tener entre 2 y 40 caracteres en minúsculas, números o guiones (ej. paquete-2)."
            nombre.trim().length !in 3..120 -> "El nombre del paquete debe tener entre 3 y 120 caracteres."
            descripcion.trim().length > 500 -> "La descripción no puede exceder 500 caracteres."
            cents == null || cents <= 0L -> "Indica un precio válido mayor a $0.00 MXN."
            else -> null
        }
    }
    fun cents(input: String): Long? {
        val normalized = input.trim().replace(',', '.')
        if (!normalized.matches(Regex("[0-9]+(\\.[0-9]{1,2})?"))) return null
        return try { BigDecimal(normalized).movePointRight(2).longValueExact() } catch (_: ArithmeticException) { null }
    }
    fun validPayment(input: String, total: Long): Boolean = cents(input)?.let { it >= total / 2 + total % 2 && it <= total && it > 0 } ?: false
    fun amount(cents: Long): String = BigDecimal.valueOf(cents, 2).toPlainString()
    fun money(cents: Long): String = NumberFormat.getCurrencyInstance(Locale("es", "MX")).format(BigDecimal.valueOf(cents, 2))
    fun date(value: String): String = runCatching {
        LocalDate.parse(value).format(java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy", Locale("es", "MX")))
    }.getOrDefault(value)
}
