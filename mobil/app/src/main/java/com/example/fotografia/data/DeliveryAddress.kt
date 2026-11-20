package com.example.fotografia.data

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/** Captura de interfaz: la API continúa recibiendo únicamente address como texto. */
data class DeliveryAddress(
    val street: String = "", val neighborhood: String = "",
    val cityRegion: String = "", val postalCode: String = ""
) {
    private fun clean(part: String) = part.trim().replace(Regex("\\s+"), " ").trim(',', ';', '.')
    val formatted: String get() = listOf(
        clean(street),
        clean(neighborhood),
        clean(cityRegion),
        postalCode.trim().let { if (it.isEmpty()) "" else "C.P. $it" }
    ).filter { it.isNotBlank() }.joinToString(", ")

    val error: String? get() {
        val cleanStreet = clean(street)
        val cleanCity = clean(cityRegion)
        return when {
            cleanStreet.length < 3 || !cleanStreet.any(Char::isLetterOrDigit) ->
                "Escribe la calle y el número, o una referencia de acceso si no tiene número."
            cleanCity.length < 3 || !cleanCity.any(Char::isLetter) ->
                "Indica la ciudad o municipio y el estado."
            postalCode.isNotBlank() && !postalCode.trim().matches(Regex("[0-9]{5}")) ->
                "El código postal debe tener cinco dígitos."
            formatted.length > 250 ->
                "Reduce el domicilio a un máximo de 250 caracteres."
            else -> null
        }
    }

    companion object {
        fun fromFormatted(raw: String): DeliveryAddress {
            val cleanRaw = raw.trim()
            if (cleanRaw.isEmpty()) return DeliveryAddress()
            val cpMatch = Regex("(?i)(?:,\\s*)?C\\.?P\\.?\\s*([0-9]{5})\\s*$").find(cleanRaw)
            val postal = cpMatch?.groupValues?.getOrNull(1).orEmpty()
            val withoutCp = if (cpMatch != null) cleanRaw.removeRange(cpMatch.range).trim().trimEnd(',') else cleanRaw
            val parts = withoutCp.split(',').map { it.trim() }.filter { it.isNotBlank() }
            return when {
                parts.isEmpty() -> DeliveryAddress(postalCode = postal)
                parts.size == 1 -> DeliveryAddress(street = parts[0], cityRegion = "León, Guanajuato", postalCode = postal)
                parts.size == 2 -> DeliveryAddress(street = parts[0], cityRegion = parts[1], postalCode = postal)
                parts.size == 3 -> DeliveryAddress(street = parts[0], neighborhood = parts[1], cityRegion = parts[2], postalCode = postal)
                else -> DeliveryAddress(
                    street = parts.first(),
                    neighborhood = parts[1],
                    cityRegion = parts.drop(2).joinToString(", "),
                    postalCode = postal
                )
            }
        }
    }
}

/** Datos temporales de sugerencia de lugar; no se envían ni almacenan en el backend. */
data class PlaceSuggestion(
    val placeId: String,
    val title: String,
    val subtitle: String = "",
    val fullText: String = listOf(title.trim(), subtitle.trim()).filter { it.isNotBlank() }.joinToString(", ")
)

/** Dirección sugerida para revisión y ajuste manual antes de aplicarla al formulario. */
data class PlaceDraft(
    val label: String,
    val address: DeliveryAddress,
    val missingStreetNumber: Boolean = false
) {
    fun toAddress(exteriorNumber: String = "", interiorOrNote: String = ""): DeliveryAddress {
        val baseStreet = address.street.trim()
        val ext = exteriorNumber.trim().trim(',', '#')
        val interior = interiorOrNote.trim().trim(',')
        val withExt = when {
            ext.isBlank() -> baseStreet
            baseStreet.isBlank() -> ext
            baseStreet.contains(ext, ignoreCase = true) -> baseStreet
            else -> "$baseStreet $ext"
        }
        val fullStreet = when {
            interior.isBlank() -> withExt
            withExt.isBlank() -> interior
            else -> "$withExt, $interior"
        }
        return address.copy(
            street = fullStreet.trim(),
            neighborhood = address.neighborhood.trim(),
            cityRegion = address.cityRegion.trim(),
            postalCode = address.postalCode.filter(Char::isDigit).take(5)
        )
    }
}

class PlaceLookupException(message: String, val missingConfig: Boolean = false) : Exception(message)

interface PlaceSearchProvider {
    val isConfigured: Boolean
    suspend fun search(query: String): List<PlaceSuggestion>
    suspend fun resolve(suggestion: PlaceSuggestion): PlaceDraft
}

/**
 * Proveedor híbrido de lugares:
 * - Si se configuró `studioPlacesApiKey`, consulta Google Places API (New) v1.
 * - Si no hay clave configurada, consulta el servicio público de búsqueda geográfica (OpenStreetMap Nominatim MX)
 *   para entregar sugerencias reales sin exponer mensajes técnicos ni requerir permisos de ubicación.
 */
class GooglePlacesProvider(
    private val apiKeyProvider: () -> String = { ConnectionConfig.placesApiKey },
    baseUrl: String = "https://places.googleapis.com/",
    private val fallbackToOpenSearch: Boolean = false,
    private val nominateBaseUrl: String = "https://nominatim.openstreetmap.org/",
    private val androidPackage: String? = null,
    private val androidCertSha1: String? = null,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .callTimeout(20, TimeUnit.SECONDS)
        .retryOnConnectionFailure(false)
        .build()
) : PlaceSearchProvider {
    private val rootUrl = (baseUrl.trim().toHttpUrlOrNull()
        ?: throw IllegalArgumentException("URL de Google Places inválida.")).toString().trimEnd('/')
    private val openRootUrl = (nominateBaseUrl.trim().toHttpUrlOrNull()
        ?: throw IllegalArgumentException("URL de búsqueda geográfica inválida.")).toString().trimEnd('/')
    private val cachedDrafts = mutableMapOf<String, PlaceDraft>()

    override val isConfigured: Boolean
        get() = apiKeyProvider().trim().isNotBlank() || fallbackToOpenSearch

    override suspend fun search(query: String): List<PlaceSuggestion> = withContext(Dispatchers.IO) {
        val cleanQuery = query.trim().replace(Regex("\\s+"), " ")
        if (cleanQuery.length < 3) return@withContext emptyList()
        val key = apiKeyProvider().trim()
        if (key.isBlank() && fallbackToOpenSearch) {
            return@withContext searchOpenPlaces(cleanQuery)
        }
        val validKey = requireKey()
        val payload = JsonObject().apply {
            addProperty("input", cleanQuery)
            addProperty("languageCode", "es")
            addProperty("regionCode", "MX")
        }.toString()
        val request = Request.Builder()
            .url("$rootUrl/v1/places:autocomplete")
            .header("X-Goog-Api-Key", validKey)
            .header("X-Goog-FieldMask", "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text")
            .applyAndroidHeaders()
            .post(payload.toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()
        val root = executeJson(request)
        val items = root.getAsJsonArray("suggestions") ?: return@withContext emptyList()
        items.mapNotNull { element ->
            val pred = element.asObj()?.getAsJsonObject("placePrediction") ?: return@mapNotNull null
            val id = pred.string("placeId")
            val structured = pred.getAsJsonObject("structuredFormat")
            val main = structured?.getAsJsonObject("mainText")?.string("text").orEmpty()
            val secondary = structured?.getAsJsonObject("secondaryText")?.string("text").orEmpty()
            val fallback = pred.getAsJsonObject("text")?.string("text").orEmpty()
            val title = main.ifBlank { fallback.substringBefore(',').trim() }
            val subtitle = secondary.ifBlank { fallback.substringAfter(',', "").trim() }
            if (id.isBlank() || title.isBlank()) null
            else PlaceSuggestion(placeId = id, title = title, subtitle = subtitle, fullText = fallback.ifBlank {
                listOf(title, subtitle).filter { it.isNotBlank() }.joinToString(", ")
            })
        }
    }

    override suspend fun resolve(suggestion: PlaceSuggestion): PlaceDraft = withContext(Dispatchers.IO) {
        cachedDrafts[suggestion.placeId]?.let { return@withContext it }
        val key = requireKey()
        val encodedId = URLEncoder.encode(suggestion.placeId.trim(), "UTF-8")
        val url = "$rootUrl/v1/places/$encodedId?languageCode=es&regionCode=MX"
        val request = Request.Builder()
            .url(url)
            .header("X-Goog-Api-Key", key)
            .header("X-Goog-FieldMask", "id,displayName,formattedAddress,addressComponents")
            .applyAndroidHeaders()
            .get()
            .build()
        val root = executeJson(request)
        parsePlaceDetails(root, suggestion)
    }

    private fun searchOpenPlaces(cleanQuery: String): List<PlaceSuggestion> {
        val encoded = URLEncoder.encode(cleanQuery, "UTF-8")
        val url = "$openRootUrl/search?format=jsonv2&addressdetails=1&limit=6&accept-language=es&countrycodes=mx&q=$encoded"
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "LuzYMemoriaStudioApp/1.0 (Android)")
            .header("Accept-Language", "es-MX,es;q=0.9")
            .get()
            .build()
        try {
            client.newCall(request).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    throw PlaceLookupException("El servicio de búsqueda de lugares no está disponible en este momento. Puedes escribir el domicilio manualmente.")
                }
                val array = runCatching { JsonParser.parseString(raw).asJsonArray }
                    .getOrElse { throw PlaceLookupException("No se pudo interpretar la respuesta del buscador de lugares.") }
                cachedDrafts.clear()
                return array.mapNotNull { el ->
                    val obj = el.asObj() ?: return@mapNotNull null
                    val id = "osm-" + obj.string("place_id").ifBlank { obj.string("osm_id") }
                    val displayName = obj.string("display_name")
                    val name = obj.string("name")
                    val addr = obj.getAsJsonObject("address")
                    val road = addr?.string("road")
                        ?.ifBlank { addr.string("pedestrian") }
                        ?.ifBlank { addr.string("footway") }
                        ?.ifBlank { addr.string("highway") }
                        .orEmpty()
                    val houseNumber = addr?.string("house_number").orEmpty()
                    val neighborhood = addr?.string("suburb")
                        ?.ifBlank { addr.string("neighbourhood") }
                        ?.ifBlank { addr.string("quarter") }
                        ?.ifBlank { addr.string("residential") }
                        ?.ifBlank { addr.string("village") }
                        .orEmpty()
                    val city = addr?.string("city")
                        ?.ifBlank { addr.string("town") }
                        ?.ifBlank { addr.string("municipality") }
                        ?.ifBlank { addr.string("county") }
                        .orEmpty()
                    val state = addr?.string("state").orEmpty()
                    val country = addr?.string("country").orEmpty()
                    val postcode = addr?.string("postcode").orEmpty().filter(Char::isDigit).take(5)

                    val baseStreet = when {
                        road.isNotBlank() && houseNumber.isNotBlank() -> "$road $houseNumber"
                        road.isNotBlank() && name.isNotBlank() && !road.equals(name, ignoreCase = true) -> "$name, $road"
                        road.isNotBlank() -> road
                        name.isNotBlank() -> name
                        else -> displayName.substringBefore(',').trim()
                    }
                    val cityRegion = listOf(city, state, country).filter { it.isNotBlank() }.distinct().joinToString(", ")
                        .ifBlank { displayName.split(',').map { it.trim() }.drop(1).take(3).joinToString(", ") }

                    val title = when {
                        name.isNotBlank() && road.isNotBlank() && !name.equals(road, ignoreCase = true) ->
                            "$name · ${listOf(road, houseNumber).filter { it.isNotBlank() }.joinToString(" ")}"
                        baseStreet.isNotBlank() -> baseStreet
                        else -> displayName.substringBefore(',').trim()
                    }
                    val subtitle = listOf(neighborhood, city, state).filter { it.isNotBlank() }.distinct().joinToString(", ")
                        .ifBlank { displayName.substringAfter(',', "").trim() }

                    if (title.isBlank()) return@mapNotNull null
                    val suggestion = PlaceSuggestion(
                        placeId = id,
                        title = title,
                        subtitle = subtitle,
                        fullText = displayName.ifBlank { listOf(title, subtitle).filter { it.isNotBlank() }.joinToString(", ") }
                    )
                    cachedDrafts[id] = PlaceDraft(
                        label = displayName.ifBlank { suggestion.fullText },
                        address = DeliveryAddress(
                            street = baseStreet,
                            neighborhood = neighborhood,
                            cityRegion = cityRegion,
                            postalCode = postcode
                        ),
                        missingStreetNumber = houseNumber.isBlank()
                    )
                    suggestion
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: PlaceLookupException) {
            throw e
        } catch (_: IOException) {
            throw PlaceLookupException("Sin conexión a internet para buscar sugerencias. Puedes escribir el domicilio manualmente.")
        }
    }

    private fun requireKey(): String {
        val key = apiKeyProvider().trim()
        if (key.isBlank()) {
            throw PlaceLookupException(
                "El servicio de sugerencias requiere configuración adicional (studioPlacesApiKey). Puedes escribir el domicilio manualmente.",
                missingConfig = true
            )
        }
        return key
    }

    private fun Request.Builder.applyAndroidHeaders(): Request.Builder = apply {
        if (!androidPackage.isNullOrBlank()) header("X-Android-Package", androidPackage)
        if (!androidCertSha1.isNullOrBlank()) header("X-Android-Cert", androidCertSha1)
    }

    private fun executeJson(request: Request): JsonObject {
        try {
            client.newCall(request).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val apiMessage = runCatching {
                        JsonParser.parseString(raw).asObj()?.getAsJsonObject("error")?.string("message").orEmpty()
                    }.getOrDefault("")
                    val message = when (response.code) {
                        400 -> "La búsqueda no pudo procesarse. Revisa el texto o captura el domicilio manualmente."
                        401, 403 -> "Google Places rechazó la clave o el servicio Places API (New) no está habilitado. Captura el domicilio manualmente."
                        429 -> "Se alcanzó el límite de consultas del proveedor. Intenta en unos momentos o captura el domicilio manualmente."
                        else -> "El proveedor de lugares no está disponible (${response.code}). Captura el domicilio manualmente."
                    }
                    throw PlaceLookupException(if (apiMessage.isNotBlank() && response.code in listOf(401, 403)) message else message)
                }
                return runCatching { JsonParser.parseString(raw).asJsonObject }
                    .getOrElse { throw PlaceLookupException("No se pudo interpretar la respuesta del proveedor de lugares.") }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: PlaceLookupException) {
            throw e
        } catch (_: IOException) {
            throw PlaceLookupException("Sin conexión con el servicio de lugares. Puedes escribir el domicilio manualmente.")
        }
    }

    companion object {
        fun parsePlaceDetails(root: JsonObject, fallbackSuggestion: PlaceSuggestion? = null): PlaceDraft {
            data class Comp(val longText: String, val shortText: String, val types: Set<String>)
            val components = root.getAsJsonArray("addressComponents")?.mapNotNull { el ->
                val obj = el.asObj() ?: return@mapNotNull null
                val longText = obj.string("longText").ifBlank { obj.string("long_name") }
                val shortText = obj.string("shortText").ifBlank { obj.string("short_name") }
                val types = obj.getAsJsonArray("types")?.mapNotNull { it.asString?.trim() }?.toSet().orEmpty()
                if (longText.isBlank() && shortText.isBlank()) null else Comp(longText.ifBlank { shortText }, shortText.ifBlank { longText }, types)
            }.orEmpty()

            fun firstText(vararg keys: String): String =
                keys.firstNotNullOfOrNull { key -> components.firstOrNull { key in it.types }?.longText?.trim() }.orEmpty()

            val route = firstText("route")
            val streetNumber = firstText("street_number")
            val subpremise = firstText("subpremise")
            val premise = firstText("premise", "point_of_interest", "establishment")
            val neighborhood = firstText(
                "sublocality_level_1", "sublocality", "neighborhood",
                "colonia", "residential", "sublocality_level_2"
            )
            val locality = firstText("locality", "postal_town", "administrative_area_level_2", "administrative_area_level_3")
            val municipality = firstText("administrative_area_level_2")
            val state = firstText("administrative_area_level_1")
            val country = firstText("country")
            val postalCode = firstText("postal_code").filter(Char::isDigit).take(5)

            val displayName = root.getAsJsonObject("displayName")?.string("text").orEmpty()
                .ifBlank { fallbackSuggestion?.title.orEmpty() }
            val formattedAddress = root.string("formattedAddress")
                .ifBlank { fallbackSuggestion?.fullText.orEmpty() }

            val baseStreet = when {
                route.isNotBlank() && streetNumber.isNotBlank() -> "$route $streetNumber"
                route.isNotBlank() -> route
                premise.isNotBlank() && streetNumber.isNotBlank() -> "$premise $streetNumber"
                premise.isNotBlank() -> premise
                displayName.isNotBlank() -> displayName
                else -> formattedAddress.substringBefore(',').trim()
            }.let { if (subpremise.isNotBlank() && !it.contains(subpremise)) "$it Int. $subpremise" else it }

            val cityParts = buildList {
                if (locality.isNotBlank()) add(locality)
                else if (municipality.isNotBlank()) add(municipality)
                if (state.isNotBlank() && !equalsIgnoreCase(lastOrNull(), state)) add(state)
                if (country.isNotBlank() && !equalsIgnoreCase(lastOrNull(), country)) add(country)
            }
            val fallbackCity = if (cityParts.isNotEmpty()) {
                cityParts.joinToString(", ")
            } else {
                val segments = formattedAddress.split(',').map { it.trim() }.filter { it.isNotBlank() }
                when {
                    segments.size >= 3 -> segments.drop(1).filterNot { it.matches(Regex("(?i)(c\\.?p\\.?\\s*)?[0-9]{5}")) }.joinToString(", ")
                    segments.size == 2 -> segments.last()
                    else -> fallbackSuggestion?.subtitle.orEmpty()
                }
            }

            return PlaceDraft(
                label = formattedAddress.ifBlank { listOf(displayName, fallbackCity).filter { it.isNotBlank() }.joinToString(", ") },
                address = DeliveryAddress(
                    street = baseStreet.trim(),
                    neighborhood = neighborhood.trim(),
                    cityRegion = fallbackCity.trim(),
                    postalCode = postalCode
                ),
                missingStreetNumber = streetNumber.isBlank()
            )
        }

        private fun equalsIgnoreCase(a: String?, b: String): Boolean =
            a != null && a.equals(b, ignoreCase = true)
    }
}

private fun JsonElement?.asObj(): JsonObject? = if (this != null && isJsonObject) asJsonObject else null
private fun JsonObject.string(name: String): String =
    get(name)?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()

object DeliveryMaps {
    private fun encoded(address: String): String {
        require(address.isNotBlank()) { "El domicilio está vacío." }
        return URLEncoder.encode(address.trim(), "UTF-8")
    }
    fun searchUrl(address: String) = "https://www.google.com/maps/search/?api=1&query=${encoded(address)}"
    fun directionsUrl(address: String) = "https://www.google.com/maps/dir/?api=1&destination=${encoded(address)}"
}
