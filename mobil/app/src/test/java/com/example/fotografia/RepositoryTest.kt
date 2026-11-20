package com.example.fotografia

import com.example.fotografia.data.*
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import retrofit2.HttpException
import java.util.concurrent.TimeUnit

class RepositoryTest {
    private val clients = MockWebServer()
    private val bookings = MockWebServer()
    private val repository = StudioRepository()
    private val user = """{"id":1,"email":"admin@example.com","role":"Administrador"}"""
    @Before fun setup() { clients.start(); bookings.start(); repository.configure(clients.url("/").toString(), bookings.url("/").toString(), true) }
    @After fun close() { clients.shutdown(); bookings.shutdown() }
    private fun json(value: String, status: Int = 200) = MockResponse().setResponseCode(status).setHeader("Content-Type", "application/json").setBody(value)
    private suspend fun login() {
        clients.enqueue(json("""{"access_token":"test-token","user":$user}""")); clients.enqueue(json(user))
        repository.login(" ADMIN@example.com ", "test-password")
    }
    @Test fun loginNormalizesEmailAndAuthenticatesBothServices() = runTest {
        login()
        val request = clients.takeRequest(2, TimeUnit.SECONDS)!!
        assertEquals("/api/auth/login", request.path)
        assertNull(request.getHeader("Authorization"))
        assertTrue(request.body.readUtf8().contains("admin@example.com"))
        assertEquals("Bearer test-token", clients.takeRequest(2, TimeUnit.SECONDS)!!.getHeader("Authorization"))
        bookings.enqueue(json("[]")); assertTrue(repository.bookings().isEmpty())
        assertEquals("Bearer test-token", bookings.takeRequest(2, TimeUnit.SECONDS)!!.getHeader("Authorization"))
        repository.session.clear(); assertNull(repository.session.token)
    }
    @Test fun confirmSendsDecimalStringAndCorrectRoute() = runTest {
        bookings.enqueue(json("""{"id":42,"status":"Confirmada","payment_cents":175025}"""))
        assertEquals("Confirmada", repository.confirm(42, 175025).status)
        val request = bookings.takeRequest(2, TimeUnit.SECONDS)!!
        assertEquals("POST", request.method)
        assertEquals("/api/reservas/42/confirmar", request.path)
        assertEquals("""{"amount":"1750.25"}""", request.body.readUtf8())
    }
    @Test fun conflictsPreserveServerMessage() = runTest {
        bookings.enqueue(json("""{"detail":"La fecha ya está ocupada"}""", 409))
        try { repository.cancel(42); fail("Expected conflict") } catch (error: HttpException) {
            assertEquals("La fecha ya está ocupada", errorMessage(error, true))
        }
    }
    @Test fun invalidSessionIsCleared() = runTest {
        clients.enqueue(json("""{"access_token":"expired","user":$user}""")); clients.enqueue(json("{}", 401))
        try { repository.login("admin@example.com", "test"); fail("Expected 401") } catch (_: HttpException) { assertNull(repository.session.token) }
    }
    @Test fun customerRoleCannotOpenAdministration() = runTest {
        clients.enqueue(json("""{"access_token":"customer","user":{"id":2,"email":"client@example.com","role":"Cliente"}}"""))
        try { repository.login("client@example.com", "test"); fail("Expected role rejection") } catch (_: IllegalArgumentException) { assertNull(repository.session.token) }
    }
    @Test fun releaseConfigurationRequiresHttps() {
        try { repository.configure("http://example.com/", "https://example.com/", false); fail("Expected HTTPS requirement") } catch (_: IllegalArgumentException) { }
    }
    @Test fun unifiedApiUsesSameHostAndCurrentResponseFields() = runTest {
        repository.configure(clients.url("/").toString(), clients.url("/").toString(), true)
        login()
        clients.takeRequest(); clients.takeRequest()
        clients.enqueue(json("""[{"id":4,"name":"Ana López","email":"ana@example.com","phone":"4771234567","address":"Centro 10, León","active":true}]"""))
        clients.enqueue(json("""[{"id":"foto","name":"Fotografía","description":"Sesión","price_cents":350000}]"""))
        clients.enqueue(json("""[{"id":42,"client_id":4,"client_name":"Ana López","event_date":"2026-12-20","event_type":"Otro","package":"foto","total_cents":350000,"paid_cents":175000,"status":"Realizada"}]"""))
        assertEquals("Ana López", repository.clients().single().name)
        assertEquals(350000L, repository.packages().single().price_cents)
        assertEquals("Realizada", repository.bookings().single().status)
        listOf("/api/clientes", "/api/paquetes", "/api/reservas").forEach { path ->
            val request = clients.takeRequest(2, TimeUnit.SECONDS)!!
            assertEquals(path, request.path)
            assertEquals("Bearer test-token", request.getHeader("Authorization"))
        }
    }
    @Test fun businessValidation400PreservesExplanation() = runTest {
        bookings.enqueue(json("""{"detail":"El anticipo debe estar entre el mínimo requerido y el total."}""", 400))
        try { repository.confirm(42, 100); fail("Expected validation error") } catch (error: HttpException) {
            assertEquals("El anticipo debe estar entre el mínimo requerido y el total.", errorMessage(error, true))
        }
    }
}
