package com.example.fotografia.ui.clients

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Directions
import androidx.compose.material.icons.outlined.EditLocationAlt
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.fotografia.data.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private fun openMap(context: Context, url: String): Boolean = try {
    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    true
} catch (_: ActivityNotFoundException) { false } catch (_: SecurityException) { false }

private val draftAddressSaver = listSaver<DeliveryAddress, String>(
    save = { listOf(it.street, it.neighborhood, it.cityRegion, it.postalCode) },
    restore = { DeliveryAddress(it[0], it[1], it[2], it[3]) }
)

@Composable
fun DeliveryAddressField(
    value: DeliveryAddress,
    onChange: (DeliveryAddress) -> Unit,
    enabled: Boolean,
    showErrors: Boolean,
    placeProvider: PlaceSearchProvider = remember { GooglePlacesProvider(fallbackToOpenSearch = true) }
) {
    val context = LocalContext.current
    var mapError by rememberSaveable { mutableStateOf(false) }
    var pickerOpen by rememberSaveable { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        HorizontalDivider()
        Text("Domicilio de entrega", style = MaterialTheme.typography.titleLarge)
        Text(
            "Busca y selecciona un lugar para rellenar los campos, o escríbelos manualmente. Puedes ajustar cualquier dato antes de guardar el cliente.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Button(
            onClick = { pickerOpen = true },
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Outlined.Search, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Buscar y seleccionar lugar")
        }
        OutlinedTextField(
            value = value.street,
            onValueChange = { onChange(value.copy(street = it)) },
            label = { Text("Calle y número") },
            placeholder = { Text("Ej. Av. Universidad Tecnológica 225, Int. 4") },
            enabled = enabled,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = value.neighborhood,
            onValueChange = { onChange(value.copy(neighborhood = it)) },
            label = { Text("Colonia o localidad (opcional)") },
            enabled = enabled,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = value.cityRegion,
            onValueChange = { onChange(value.copy(cityRegion = it)) },
            label = { Text("Ciudad o municipio y estado") },
            placeholder = { Text("Ej. León, Guanajuato, México") },
            enabled = enabled,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = value.postalCode,
            onValueChange = { onChange(value.copy(postalCode = it.filter(Char::isDigit).take(5))) },
            label = { Text("Código postal (opcional)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            enabled = enabled,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        )
        if (value.formatted.isNotBlank()) {
            Surface(color = MaterialTheme.colorScheme.surfaceContainerLow, shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("DIRECCIÓN PARA LA ENTREGA", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                    Text(value.formatted, style = MaterialTheme.typography.bodyMedium)
                    val overLimit = value.formatted.length > 250
                    Text(
                        "${value.formatted.length}/250 caracteres",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (overLimit) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
        if ((showErrors || value.formatted.length > 250) && value.error != null) {
            Text(value.error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        OutlinedButton(
            onClick = { mapError = !openMap(context, DeliveryMaps.searchUrl(value.formatted)) },
            enabled = enabled && value.error == null,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.AutoMirrored.Outlined.OpenInNew, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Ver en Google Maps")
        }
        Text(
            "Para elegir un lugar y traer sus datos al formulario usa «Buscar y seleccionar lugar». «Ver en Google Maps» solo abre una vista externa de consulta.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        if (mapError) {
            Text("No se pudo abrir el mapa. Comprueba que haya un navegador disponible.", color = MaterialTheme.colorScheme.error)
        }
    }

    if (pickerOpen) {
        PlacePickerDialog(
            initialAddress = value,
            provider = placeProvider,
            onDismiss = { pickerOpen = false },
            onConfirm = { confirmed ->
                onChange(confirmed)
                pickerOpen = false
            }
        )
    }
}

@Composable
fun PlacePickerDialog(
    initialAddress: DeliveryAddress,
    provider: PlaceSearchProvider,
    onDismiss: () -> Unit,
    onConfirm: (DeliveryAddress) -> Unit
) {
    val scope = rememberCoroutineScope()
    var query by rememberSaveable { mutableStateOf(initialAddress.formatted) }
    var stage by rememberSaveable { mutableStateOf("search") }
    var selectedLabel by rememberSaveable { mutableStateOf("") }
    var missingStreetNumber by rememberSaveable { mutableStateOf(false) }
    var draftAddress by rememberSaveable(stateSaver = draftAddressSaver) { mutableStateOf(initialAddress) }
    var exteriorNumber by rememberSaveable { mutableStateOf("") }
    var interiorNote by rememberSaveable { mutableStateOf("") }
    var showValidation by rememberSaveable { mutableStateOf(false) }

    var suggestions by remember { mutableStateOf<List<PlaceSuggestion>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var resolvingId by remember { mutableStateOf<String?>(null) }
    var lookupError by rememberSaveable { mutableStateOf<String?>(null) }
    var searchedOnce by rememberSaveable { mutableStateOf(false) }

    suspend fun runSearch(rawQuery: String) {
        val trimmed = rawQuery.trim()
        if (trimmed.length < 3) {
            suggestions = emptyList()
            lookupError = "Escribe al menos 3 caracteres para buscar sugerencias."
            searchedOnce = false
            return
        }
        loading = true
        lookupError = null
        try {
            suggestions = provider.search(trimmed)
            searchedOnce = true
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            suggestions = emptyList()
            searchedOnce = true
            lookupError = e.message ?: "No se pudieron obtener sugerencias. Puedes capturar el domicilio manualmente."
        } finally {
            loading = false
        }
    }

    LaunchedEffect(query, stage) {
        if (stage != "search") return@LaunchedEffect
        val trimmed = query.trim()
        if (trimmed.length < 3) {
            suggestions = emptyList()
            lookupError = null
            searchedOnce = false
            return@LaunchedEffect
        }
        if (!provider.isConfigured) {
            suggestions = emptyList()
            searchedOnce = true
            lookupError = "El buscador automático no está disponible en este momento. Puedes usar «Editar manual» para escribir el domicilio."
            return@LaunchedEffect
        }
        delay(350)
        runSearch(trimmed)
    }

    fun selectSuggestion(item: PlaceSuggestion) {
        if (resolvingId != null) return
        resolvingId = item.placeId
        lookupError = null
        scope.launch {
            try {
                val resolved = provider.resolve(item)
                selectedLabel = resolved.label.ifBlank { item.fullText }
                draftAddress = resolved.address
                missingStreetNumber = resolved.missingStreetNumber
                exteriorNumber = ""
                interiorNote = ""
                showValidation = false
                stage = "confirm"
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                lookupError = e.message ?: "No se pudo obtener el detalle del lugar. Intenta otro resultado o edita manualmente."
            } finally {
                resolvingId = null
            }
        }
    }

    Dialog(
        onDismissRequest = { if (resolvingId == null) onDismiss() },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 24.dp),
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 3.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 620.dp)
                    .imePadding()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            text = if (stage == "search") "SELECTOR DE DOMICILIO" else "CONFIRMAR DIRECCIÓN",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        Text(
                            text = if (stage == "search") "Buscar lugar de entrega" else "Revisa y corrige los datos",
                            style = MaterialTheme.typography.titleLarge
                        )
                    }
                    IconButton(onClick = onDismiss, enabled = resolvingId == null) {
                        Icon(Icons.Outlined.Close, contentDescription = "Cancelar")
                    }
                }

                if (stage == "search") {
                    Column(
                        modifier = Modifier
                            .weight(1f, fill = false)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            "Escribe calle, colonia, comercio o punto de referencia. No se solicita tu ubicación actual ni se guarda el cliente automáticamente.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedTextField(
                            value = query,
                            onValueChange = { query = it },
                            label = { Text("Buscar dirección o lugar") },
                            placeholder = { Text("Ej. Av. Universidad Tecnológica 225, León") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(onSearch = { scope.launch { runSearch(query) } }),
                            trailingIcon = {
                                if (query.isNotEmpty()) {
                                    IconButton(onClick = { query = "" }) {
                                        Icon(Icons.Outlined.Close, contentDescription = "Limpiar búsqueda")
                                    }
                                }
                            }
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = { scope.launch { runSearch(query) } },
                                enabled = !loading && resolvingId == null && query.trim().length >= 3,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp)
                            ) {
                                Icon(Icons.Outlined.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Buscar", maxLines = 1)
                            }
                            OutlinedButton(
                                onClick = {
                                    selectedLabel = "Captura o ajuste manual"
                                    draftAddress = if (initialAddress.formatted.isNotBlank()) initialAddress else DeliveryAddress(street = query.trim())
                                    missingStreetNumber = false
                                    exteriorNumber = ""
                                    interiorNote = ""
                                    showValidation = false
                                    stage = "confirm"
                                },
                                enabled = resolvingId == null,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp)
                            ) {
                                Icon(Icons.Outlined.EditLocationAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Editar manual", maxLines = 1)
                            }
                        }

                        if (loading || resolvingId != null) {
                            LinearProgressIndicator(Modifier.fillMaxWidth())
                        }

                        if (lookupError != null) {
                            Surface(
                                color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.45f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(
                                        lookupError!!,
                                        color = MaterialTheme.colorScheme.error,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                    Text(
                                        "Puedes tocar «Editar manual» o «Cancelar» para continuar escribiendo en el formulario sin perder los datos del cliente.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        if (!loading && lookupError == null && searchedOnce && suggestions.isEmpty()) {
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceContainerLow,
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text("Sin coincidencias para esta búsqueda", style = MaterialTheme.typography.titleSmall)
                                    Text(
                                        "Prueba con otra calle, municipio o referencia, o usa «Editar manual» para escribir el domicilio directamente.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        if (suggestions.isNotEmpty()) {
                            Text(
                                "SUGERENCIAS ENCONTRADAS",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.secondary
                            )
                            suggestions.forEach { item ->
                                OutlinedCard(
                                    onClick = { selectSuggestion(item) },
                                    enabled = resolvingId == null,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            Icons.Outlined.Place,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary
                                        )
                                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                            Text(item.title, style = MaterialTheme.typography.titleSmall)
                                            if (item.subtitle.isNotBlank()) {
                                                Text(
                                                    item.subtitle,
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }
                                        Text(
                                            text = if (resolvingId == item.placeId) "Cargando…" else "Elegir",
                                            style = MaterialTheme.typography.labelLarge,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = onDismiss, enabled = resolvingId == null) {
                            Text("Cancelar")
                        }
                    }
                } else {
                    val previewAddress = PlaceDraft(
                        label = selectedLabel,
                        address = draftAddress,
                        missingStreetNumber = missingStreetNumber
                    ).toAddress(exteriorNumber = exteriorNumber, interiorOrNote = interiorNote)

                    Column(
                        modifier = Modifier
                            .weight(1f, fill = false)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        if (selectedLabel.isNotBlank()) {
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceContainerLow,
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text("LUGAR SELECCIONADO", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                                    Text(selectedLabel, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }

                        if (missingStreetNumber) {
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    "El proveedor no entregó número exterior para este lugar. Agrégalo o indica una referencia (ej. S/N, local, interior) si aplica.",
                                    modifier = Modifier.padding(12.dp),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }

                        OutlinedTextField(
                            value = draftAddress.street,
                            onValueChange = { draftAddress = draftAddress.copy(street = it) },
                            label = { Text("Calle y número base") },
                            placeholder = { Text("Ej. Av. Universidad Tecnológica 225") },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OutlinedTextField(
                                value = exteriorNumber,
                                onValueChange = { exteriorNumber = it },
                                label = { Text("Núm. exterior", maxLines = 1) },
                                placeholder = { Text("Ej. 225 o S/N", maxLines = 1) },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = interiorNote,
                                onValueChange = { interiorNote = it },
                                label = { Text("Interior / ref.", maxLines = 1) },
                                placeholder = { Text("Ej. Int. 4B", maxLines = 1) },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }
                        OutlinedTextField(
                            value = draftAddress.neighborhood,
                            onValueChange = { draftAddress = draftAddress.copy(neighborhood = it) },
                            label = { Text("Colonia o localidad (opcional)") },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = draftAddress.cityRegion,
                            onValueChange = { draftAddress = draftAddress.copy(cityRegion = it) },
                            label = { Text("Ciudad o municipio y estado") },
                            placeholder = { Text("Ej. León, Guanajuato, México") },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = draftAddress.postalCode,
                            onValueChange = { draftAddress = draftAddress.copy(postalCode = it.filter(Char::isDigit).take(5)) },
                            label = { Text("Código postal (opcional)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Surface(
                            color = MaterialTheme.colorScheme.surfaceContainerLow,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("VISTA PREVIA A APLICAR EN EL FORMULARIO", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                                Text(
                                    previewAddress.formatted.ifBlank { "Completa los campos requeridos para previsualizar el domicilio." },
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                val overLimit = previewAddress.formatted.length > 250
                                Text(
                                    "${previewAddress.formatted.length}/250 caracteres",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (overLimit) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    if ((showValidation || previewAddress.formatted.length > 250) && previewAddress.error != null) {
                        Text(
                            previewAddress.error!!,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                showValidation = true
                                if (previewAddress.error == null) {
                                    onConfirm(previewAddress)
                                }
                            },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Outlined.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Usar dirección", maxLines = 1)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = { stage = "search" }) {
                                Text("Otra búsqueda", maxLines = 1)
                            }
                            TextButton(onClick = onDismiss) {
                                Text("Cancelar", maxLines = 1)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DeliveryDirections(address: String) {
    val context = LocalContext.current
    var failed by remember { mutableStateOf(false) }
    OutlinedButton(onClick = { failed = !openMap(context, DeliveryMaps.directionsUrl(address)) }, enabled = address.isNotBlank(), shape = RoundedCornerShape(12.dp)) {
        Icon(Icons.Outlined.Directions, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text("Cómo llegar")
    }
    if (failed) Text("No se pudo abrir el mapa. Comprueba que haya un navegador disponible.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
}
