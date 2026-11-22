package com.example.fotografia

import com.example.fotografia.data.*
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import java.net.URI
import java.net.URLDecoder
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class DeliveryAddressTest {
    private val placesServer = MockWebServer()

    @Before fun setup() { placesServer.start() }
    @After fun tearDown() { placesServer.shutdown() }

    private fun jsonResponse(body: String, code: Int = 200) = MockResponse()
        .setResponseCode(code)
        .setHeader("Content-Type", "application/json")
        .setBody(body)

    @Test fun addressKeepsExistingTextContract() {
        val address = DeliveryAddress("  Av. Universidad Tecnológica 225  ", "San Carlos", "León, Guanajuato, México", "37670")
        assertNull(address.error)
        assertEquals("Av. Universidad Tecnológica 225, San Carlos, León, Guanajuato, México, C.P. 37670", address.formatted)
        assertNull(Rules.clientError(ClientRequest("Cliente Prueba", "4771234567", "test@example.com", address.formatted)))
    }

    @Test fun incompleteOrOversizeAddressIsRejected() {
        assertNotNull(DeliveryAddress(street = "Calle 1").error)
        assertNotNull(DeliveryAddress("Calle 1", "", "León, Guanajuato", "123").error)
        assertNotNull(DeliveryAddress("x".repeat(245), "", "León, Guanajuato").error)
        assertNull(DeliveryAddress("Camino sin número", "", "León, Guanajuato").error)
        assertNotNull(DeliveryAddress("... , ;", "", "León, Guanajuato").error)
        assertNotNull(DeliveryAddress("Calle Hidalgo 10", "", "12345").error)
    }

    @Test fun mapUrlsEncodeAddressAsOneParameter() {
        val address = "León & Centro #25, México"
        val search = URI(DeliveryMaps.searchUrl(address))
        assertEquals("www.google.com", search.host)
        assertEquals(2, search.rawQuery.split('&').size)
        assertEquals(address, URLDecoder.decode(search.rawQuery.substringAfter("query="), "UTF-8"))
        val route = URI(DeliveryMaps.directionsUrl(address))
        assertEquals(address, URLDecoder.decode(route.rawQuery.substringAfter("destination="), "UTF-8"))
    }

    @Test fun selectingAndConfirmingPlaceFillsDeliveryAddressAndRespectsManualAdjustments() = runTest {
        placesServer.enqueue(jsonResponse("""
            {
              "suggestions": [
                {
                  "placePrediction": {
                    "placeId": "ChIJ_test_123",
                    "text": { "text": "Av. Universidad Tecnológica 225, San Carlos, León, Gto., México" },
                    "structuredFormat": {
                      "mainText": { "text": "Av. Universidad Tecnológica 225" },
                      "secondaryText": { "text": "San Carlos, León, Gto., México" }
                    }
                  }
                }
              ]
            }
        """.trimIndent()))
        placesServer.enqueue(jsonResponse("""
            {
              "id": "ChIJ_test_123",
              "displayName": { "text": "Universidad Tecnológica de León" },
              "formattedAddress": "Av. Universidad Tecnológica 225, San Carlos, 37670 León, Gto., México",
              "addressComponents": [
                { "longText": "225", "shortText": "225", "types": ["street_number"] },
                { "longText": "Avenida Universidad Tecnológica", "shortText": "Av. Universidad Tecnológica", "types": ["route"] },
                { "longText": "San Carlos", "shortText": "San Carlos", "types": ["sublocality_level_1", "sublocality"] },
                { "longText": "León", "shortText": "León", "types": ["locality"] },
                { "longText": "Guanajuato", "shortText": "Gto.", "types": ["administrative_area_level_1"] },
                { "longText": "México", "shortText": "MX", "types": ["country"] },
                { "longText": "37670", "shortText": "37670", "types": ["postal_code"] }
              ]
            }
        """.trimIndent()))

        val provider = GooglePlacesProvider(
            apiKeyProvider = { "test-places-key" },
            baseUrl = placesServer.url("/").toString()
        )
        val suggestions = provider.search("Universidad Tecnológica")
        assertEquals(1, suggestions.size)
        assertEquals("ChIJ_test_123", suggestions.single().placeId)

        val autoReq = placesServer.takeRequest()
        assertEquals("/v1/places:autocomplete", autoReq.path)
        assertEquals("test-places-key", autoReq.getHeader("X-Goog-Api-Key"))
        assertTrue(autoReq.getHeader("X-Goog-FieldMask")!!.contains("placePrediction.placeId"))

        val draft = provider.resolve(suggestions.single())
        assertFalse(draft.missingStreetNumber)
        assertEquals("Avenida Universidad Tecnológica 225", draft.address.street)
        assertEquals("San Carlos", draft.address.neighborhood)
        assertEquals("León, Guanajuato, México", draft.address.cityRegion)
        assertEquals("37670", draft.address.postalCode)

        val confirmed = draft.toAddress(exteriorNumber = "", interiorOrNote = "Edificio B, Int. 4")
        assertNull(confirmed.error)
        assertEquals(
            "Avenida Universidad Tecnológica 225, Edificio B, Int. 4, San Carlos, León, Guanajuato, México, C.P. 37670",
            confirmed.formatted
        )
    }

    @Test fun resultsWithoutStreetNumberNeighborhoodOrPostalCodeDoNotFailAndAllowManualCorrection() = runTest {
        placesServer.enqueue(jsonResponse("""
            {
              "id": "ChIJ_no_number",
              "displayName": { "text": "Parque Metropolitano de León" },
              "formattedAddress": "Prol. Blvd. Adolfo López Mateos Norte, León, Gto., México",
              "addressComponents": [
                { "longText": "Prol. Blvd. Adolfo López Mateos Norte", "shortText": "Blvd. López Mateos", "types": ["route"] },
                { "longText": "León", "shortText": "León", "types": ["locality"] },
                { "longText": "Guanajuato", "shortText": "Gto.", "types": ["administrative_area_level_1"] }
              ]
            }
        """.trimIndent()))

        val provider = GooglePlacesProvider(
            apiKeyProvider = { "test-places-key" },
            baseUrl = placesServer.url("/").toString()
        )
        val draft = provider.resolve(PlaceSuggestion("ChIJ_no_number", "Parque Metropolitano de León", "León, Gto."))
        assertTrue(draft.missingStreetNumber)
        assertEquals("Prol. Blvd. Adolfo López Mateos Norte", draft.address.street)
        assertEquals("", draft.address.neighborhood)
        assertEquals("León, Guanajuato", draft.address.cityRegion)
        assertEquals("", draft.address.postalCode)
        assertNull(draft.address.error)

        val corrected = draft.toAddress(exteriorNumber = "S/N", interiorOrNote = "Acceso Norte")
        assertEquals("Prol. Blvd. Adolfo López Mateos Norte S/N, Acceso Norte, León, Guanajuato", corrected.formatted)
        assertNull(corrected.error)
    }

    @Test fun missingConfigurationOrProviderFailureReportsClearMessageAndKeepsManualAddressAvailable() = runTest {
        val unconfigured = GooglePlacesProvider(apiKeyProvider = { "   " }, baseUrl = placesServer.url("/").toString())
        assertFalse(unconfigured.isConfigured)
        try {
            unconfigured.search("Centro León")
            fail("Debió indicar configuración faltante")
        } catch (e: PlaceLookupException) {
            assertTrue(e.missingConfig)
            assertTrue(e.message!!.contains("studioPlacesApiKey"))
        }

        placesServer.enqueue(jsonResponse("""{"error":{"code":403,"message":"Requests from this Android client application are blocked."}}""", 403))
        val forbiddenProvider = GooglePlacesProvider(apiKeyProvider = { "invalid-key" }, baseUrl = placesServer.url("/").toString())
        try {
            forbiddenProvider.search("Centro León")
            fail("Debió fallar con 403")
        } catch (e: PlaceLookupException) {
            assertFalse(e.missingConfig)
            assertTrue(e.message!!.contains("manualmente"))
        }
    }

    @Test fun cancellingSelectionPreservesPreviousAddressAnd250CharLimitIsEnforced() {
        val original = DeliveryAddress("Calle Madero 110", "Centro", "León, Guanajuato", "37000")
        var currentFormAddress = original

        val noisyDraft = PlaceDraft(
            label = "Lugar muy largo",
            address = DeliveryAddress(
                street = "Avenida " + "MuyLarga ".repeat(25),
                neighborhood = "Colonia Extensa",
                cityRegion = "León, Guanajuato, México",
                postalCode = "37000"
            )
        )
        val candidate = noisyDraft.toAddress(exteriorNumber = "100", interiorOrNote = "Referencia adicional")
        assertTrue(candidate.formatted.length > 250)
        assertNotNull(candidate.error)

        // Si el usuario cancela o el candidato es inválido, currentFormAddress no cambia:
        assertEquals(original, currentFormAddress)
        assertEquals("Calle Madero 110, Centro, León, Guanajuato, C.P. 37000", currentFormAddress.formatted)
    }

    @Test fun formattedAddressRoundTripsWhenEditingExistingClient() {
        val parsed = DeliveryAddress.fromFormatted("Av. Universidad Tecnológica 225, San Carlos, León, Guanajuato, México, C.P. 37670")
        assertEquals("Av. Universidad Tecnológica 225", parsed.street)
        assertEquals("San Carlos", parsed.neighborhood)
        assertEquals("León, Guanajuato, México", parsed.cityRegion)
        assertEquals("37670", parsed.postalCode)
        assertNull(parsed.error)
    }
}
