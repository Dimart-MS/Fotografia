package com.example.fotografia.ui.packages

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.ToggleOff
import androidx.compose.material.icons.outlined.ToggleOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.fotografia.data.*
import com.example.fotografia.ui.*

private data class OfficialPreset(val clave: String, val nombre: String, val precio: String, val descripcion: String)

private val studioPresets = listOf(
    OfficialPreset(
        "paquete-2",
        "Paquete 2",
        "6500.00",
        "Pre-sesión · 100 fotografías 5x7 · 1 fotografía 16x20 con marco de madera y cristal antireflejante · Cubre misa y fiesta en video · Resumen gratis · Caja de madera personalizada"
    ),
    OfficialPreset(
        "paquete-3",
        "Paquete 3",
        "10000.00",
        "Pre-sesión · 110 fotografías 5x7 · 1 fotografía 16x20 con marco de madera y cristal antireflejante · Cubre misa y fiesta · Caja personalizada para entrega de fotos · 1 hora de video"
    ),
    OfficialPreset(
        "paquete-4",
        "Paquete 4",
        "13000.00",
        "Pre-sesión · 130 fotografías 5x7 · 1 fotografía 20x24 con marco de madera y cristal antireflejante · Cubre misa y fiesta · Remembranza · Video 1.5 h · Dron"
    ),
    OfficialPreset(
        "paquete-5",
        "Paquete 5",
        "15000.00",
        "160 fotografías 5x7 · 1 fotografía 20x24 con marco de madera y cristal antireflejante · Video 1.5 h · Pre-sesión · Remembranza · Dron · Caja personalizada"
    )
)

@Composable
private fun PackageStatusBadge(active: Boolean) {
    val color = if (active) Color(0xFF254C41) else Color(0xFF805321)
    Surface(color = color.copy(alpha = 0.10f), shape = RoundedCornerShape(8.dp)) {
        Text(
            text = if (active) "Activo" else "Inactivo",
            color = color,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

@Composable
fun PackagesScreen(
    state: StudioState,
    onCreate: (PackageCreateRequest, () -> Unit) -> Unit,
    onUpdate: (String, PackageUpdateRequest, () -> Unit) -> Unit,
    onToggleActive: (String, Boolean) -> Unit
) {
    var search by rememberSaveable { mutableStateOf("") }
    var dialogOpen by rememberSaveable { mutableStateOf(false) }
    var editingId by rememberSaveable { mutableStateOf<String?>(null) }

    val enabled = !state.writing && !state.loading && !state.uncertainWrite
    val activeCount = state.packages.count { it.isActive }
    val filtered = state.packages.filter {
        "${it.id} ${it.name} ${it.description.orEmpty()}".contains(search.trim(), ignoreCase = true)
    }

    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionHeading(
                "CATÁLOGO DEL ESTUDIO",
                "Paquetes y coberturas",
                "Administra precios, contenido incluido y disponibilidad para nuevas contrataciones."
            )
        }
        if (state.packages.isNotEmpty()) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("TOTAL", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                            Text("${state.packages.size}", style = MaterialTheme.typography.titleLarge)
                        }
                    }
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("DISPONIBLES", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                            Text("$activeCount", style = MaterialTheme.typography.titleLarge)
                        }
                    }
                }
            }
        }
        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                label = { Text("Buscar por clave, nombre o contenido") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )
        }
        item {
            Button(
                onClick = {
                    editingId = null
                    dialogOpen = true
                },
                enabled = state.loaded && enabled,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Registrar paquete")
            }
        }
        if (state.loaded && filtered.isEmpty()) {
            item {
                EmptyContent(
                    "Sin paquetes en esta vista",
                    "Registra un paquete nuevo o ajusta los términos de búsqueda."
                )
            }
        }
        items(filtered, key = { it.id }) { pkg ->
            OutlinedCard(
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                text = pkg.id.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.secondary
                            )
                            Text(pkg.name, style = MaterialTheme.typography.titleLarge)
                        }
                        PackageStatusBadge(pkg.isActive)
                    }
                    if (!pkg.description.isNullOrBlank()) {
                        Text(
                            pkg.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("PRECIO TOTAL", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                                Text(Rules.money(pkg.price_cents), style = MaterialTheme.typography.titleMedium)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("ANTICIPO 50 %", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                                Text(Rules.money((pkg.price_cents + 1) / 2), style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                editingId = pkg.id
                                dialogOpen = true
                            },
                            enabled = enabled && pkg.isActive,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Outlined.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Editar", maxLines = 1)
                        }
                        OutlinedButton(
                            onClick = { onToggleActive(pkg.id, !pkg.isActive) },
                            enabled = enabled,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                if (pkg.isActive) Icons.Outlined.ToggleOff else Icons.Outlined.ToggleOn,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(if (pkg.isActive) "Inactivar" else "Reactivar", maxLines = 1)
                        }
                    }
                }
            }
        }
    }

    if (dialogOpen) {
        val editingPkg = editingId?.let { id -> state.packages.find { it.id == id } }
        PackageEditorDialog(
            editing = editingPkg,
            existingPackages = state.packages,
            writing = state.writing,
            onDismiss = { if (!state.writing) dialogOpen = false },
            onSaveNew = { req -> onCreate(req) { dialogOpen = false } },
            onSaveUpdate = { clave, req -> onUpdate(clave, req) { dialogOpen = false } }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PackageEditorDialog(
    editing: PackageOption?,
    existingPackages: List<PackageOption>,
    writing: Boolean,
    onDismiss: () -> Unit,
    onSaveNew: (PackageCreateRequest) -> Unit,
    onSaveUpdate: (String, PackageUpdateRequest) -> Unit
) {
    val isNew = editing == null
    var clave by rememberSaveable(editing?.id) { mutableStateOf(editing?.id.orEmpty()) }
    var nombre by rememberSaveable(editing?.id) { mutableStateOf(editing?.name.orEmpty()) }
    var descripcion by rememberSaveable(editing?.id) { mutableStateOf(editing?.description.orEmpty()) }
    var precio by rememberSaveable(editing?.id) {
        mutableStateOf(if (editing != null) Rules.amount(editing.price_cents) else "")
    }
    var showErrors by rememberSaveable(editing?.id) { mutableStateOf(false) }

    val validationError = Rules.packageError(
        clave = clave,
        nombre = nombre,
        descripcion = descripcion,
        priceInput = precio,
        isNew = isNew
    )

    Dialog(
        onDismissRequest = onDismiss,
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
                            text = if (isNew) "NUEVO PAQUETE" else "EDITAR PAQUETE",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        Text(
                            text = if (isNew) "Configurar cobertura" else editing!!.name,
                            style = MaterialTheme.typography.titleLarge
                        )
                    }
                    IconButton(onClick = onDismiss, enabled = !writing) {
                        Icon(Icons.Outlined.Close, contentDescription = "Cerrar")
                    }
                }

                Column(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (isNew) {
                        val existingIds = remember(existingPackages) {
                            existingPackages.map { it.id.lowercase() }.toSet()
                        }
                        val availablePresets = remember(existingIds) {
                            studioPresets.filter { it.clave.lowercase() !in existingIds }
                                .ifEmpty { studioPresets }
                        }
                        Text(
                            "PLANTILLAS RÁPIDAS DEL ESTUDIO",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            availablePresets.forEach { preset ->
                                OutlinedButton(
                                    onClick = {
                                        clave = preset.clave
                                        nombre = preset.nombre
                                        precio = preset.precio
                                        descripcion = preset.descripcion
                                    },
                                    enabled = !writing,
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                                ) {
                                    Text(preset.nombre, maxLines = 1)
                                }
                            }
                        }
                    }

                    OutlinedTextField(
                        value = clave,
                        onValueChange = { if (isNew) clave = it.lowercase().replace(' ', '-') },
                        label = { Text("Clave única (ej. paquete-2)") },
                        enabled = isNew && !writing,
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = nombre,
                        onValueChange = { nombre = it },
                        label = { Text("Nombre del paquete") },
                        placeholder = { Text("Ej. Paquete 2 · Cobertura completa") },
                        enabled = !writing,
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = precio,
                        onValueChange = { precio = it },
                        label = { Text("Precio en MXN") },
                        placeholder = { Text("Ej. 6500.00") },
                        enabled = !writing,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = descripcion,
                        onValueChange = { descripcion = it },
                        label = { Text("Contenido del paquete (opcional)") },
                        placeholder = { Text("Ej. Pre-sesión, 100 fotos 5x7, 1 foto 16x20 con marco, video...") },
                        enabled = !writing,
                        minLines = 3,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                if (showErrors && validationError != null) {
                    Text(
                        validationError,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Button(
                    onClick = {
                        showErrors = true
                        if (validationError == null) {
                            val cents = Rules.cents(precio)!!
                            val cleanDesc = descripcion.trim().ifBlank { null }
                            if (isNew) {
                                onSaveNew(
                                    PackageCreateRequest(
                                        clave = clave.trim().lowercase(),
                                        nombre = nombre.trim(),
                                        descripcion = cleanDesc,
                                        precio_centavos = cents
                                    )
                                )
                            } else {
                                onSaveUpdate(
                                    editing!!.id,
                                    PackageUpdateRequest(
                                        nombre = nombre.trim(),
                                        descripcion = cleanDesc,
                                        precio_centavos = cents
                                    )
                                )
                            }
                        }
                    },
                    enabled = !writing,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Outlined.Inventory2, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(if (writing) "Guardando…" else if (isNew) "Crear paquete" else "Guardar cambios", maxLines = 1)
                }
            }
        }
    }
}
