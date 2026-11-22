package com.example.fotografia

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.StateRestorationTester
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.example.fotografia.data.*
import com.example.fotografia.ui.clients.DeliveryAddressField
import com.example.fotografia.ui.theme.FotografiaTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ExampleInstrumentedTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun useAppContext() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.example.fotografia", appContext.packageName)
    }

    @Test
    fun placePickerSelectsConfirmsEditsAndPreservesOnCancel() {
        val fakeProvider = object : PlaceSearchProvider {
            override val isConfigured: Boolean = true
            override suspend fun search(query: String): List<PlaceSuggestion> = listOf(
                PlaceSuggestion(
                    placeId = "place-utl",
                    title = "Universidad Tecnológica de León",
                    subtitle = "San Carlos, León, Guanajuato"
                )
            )
            override suspend fun resolve(suggestion: PlaceSuggestion): PlaceDraft = PlaceDraft(
                label = "Blvd. Universidad Tecnológica, San Carlos, León, Gto., México",
                address = DeliveryAddress(
                    street = "Blvd. Universidad Tecnológica",
                    neighborhood = "San Carlos",
                    cityRegion = "León, Guanajuato, México",
                    postalCode = ""
                ),
                missingStreetNumber = true
            )
        }

        var currentAddress = DeliveryAddress("Calle Inicial 10", "Centro", "León, Guanajuato", "37000")
        composeRule.setContent {
            var state by mutableStateOf(currentAddress)
            FotografiaTheme {
                DeliveryAddressField(
                    value = state,
                    onChange = {
                        state = it
                        currentAddress = it
                    },
                    enabled = true,
                    showErrors = true,
                    placeProvider = fakeProvider
                )
            }
        }

        // 1. Abrir el selector y cancelar: debe conservar exactamente la dirección inicial
        composeRule.onNodeWithText("Buscar y seleccionar lugar").performClick()
        composeRule.onNodeWithText("Cancelar").performClick()
        assertEquals("Calle Inicial 10, Centro, León, Guanajuato, C.P. 37000", currentAddress.formatted)

        // 2. Abrir el selector, buscar, elegir resultado sin número ni C.P., agregar exterior/interior y confirmar
        composeRule.onNodeWithText("Buscar y seleccionar lugar").performClick()
        composeRule.onNodeWithText("Buscar").performClick()
        composeRule.waitUntil(5_000) {
            composeRule.onAllNodesWithText("Universidad Tecnológica de León").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Universidad Tecnológica de León").performClick()

        composeRule.waitUntil(5_000) {
            composeRule.onAllNodesWithText("Usar dirección").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Núm. exterior").performTextInput("225")
        composeRule.onNodeWithText("Interior / ref.").performTextInput("Edificio B")
        composeRule.onNodeWithText("Usar dirección").performClick()

        assertEquals(
            "Blvd. Universidad Tecnológica 225, Edificio B, San Carlos, León, Guanajuato, México",
            currentAddress.formatted
        )
        assertNull(currentAddress.error)
    }

    @Test
    fun addressDraftSurvivesConfigurationChange() {
        val restorationTester = StateRestorationTester(composeRule)
        restorationTester.setContent {
            var street by rememberSaveable { mutableStateOf("Av. Panorama 415") }
            var city by rememberSaveable { mutableStateOf("León, Guanajuato") }
            FotografiaTheme {
                DeliveryAddressField(
                    value = DeliveryAddress(street = street, cityRegion = city),
                    onChange = {
                        street = it.street
                        city = it.cityRegion
                    },
                    enabled = true,
                    showErrors = false
                )
            }
        }
        composeRule.onNodeWithText("Av. Panorama 415").assertIsDisplayed()
        restorationTester.emulateSavedInstanceStateRestore()
        composeRule.onNodeWithText("Av. Panorama 415").assertIsDisplayed()
        composeRule.onNodeWithText("León, Guanajuato").assertIsDisplayed()
    }
}