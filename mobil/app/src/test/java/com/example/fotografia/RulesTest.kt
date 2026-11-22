package com.example.fotografia

import com.example.fotografia.data.*
import org.junit.Assert.*
import org.junit.Test

class RulesTest {
    @Test fun completedEventsKeepTheirDateOccupied() {
        listOf("Confirmada", "Realizada", "Entregada").forEach { assertTrue(Rules.occupiesDate(it)) }
        listOf("Pendiente de anticipo", "Comprobante enviado", "Cancelada").forEach { assertFalse(Rules.occupiesDate(it)) }
        assertTrue(Rules.eventTypes.contains("Otro"))
    }
    @Test fun paymentUsesExactCents() {
        assertEquals(175025L, Rules.cents("1750,25"))
        assertNull(Rules.cents("1750.255"))
        assertNull(Rules.cents("-1"))
        assertNull(Rules.cents("1e4"))
        assertNull(Rules.cents("9999999999999999999999"))
        assertEquals("1750.25", Rules.amount(175025))
    }
    @Test fun paymentBoundaries() {
        assertTrue(Rules.validPayment("1750.00", 350000))
        assertTrue(Rules.validPayment("3500", 350000))
        assertFalse(Rules.validPayment("1749.99", 350000))
        assertFalse(Rules.validPayment("3500.01", 350000))
        assertFalse(Rules.validPayment("0", 0))
        assertFalse(Rules.validPayment("0.50", 101))
        assertTrue(Rules.validPayment("0.51", 101))
    }
    @Test fun clientValidation() {
        val client = ClientRequest("Ana López", "4771234567", "ana@example.com", "Calle Centro 10")
        assertNull(Rules.clientError(client))
        assertNotNull(Rules.clientError(client.copy(phone = "477")))
        assertNotNull(Rules.clientError(client.copy(email = "ana@")))
        assertNotNull(Rules.clientError(client.copy(name = "A")))
        assertNotNull(Rules.clientError(client.copy(address = "")))
    }
}
