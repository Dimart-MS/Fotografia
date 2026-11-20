package com.example.fotografia.ui.clients

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.PersonOff
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.fotografia.data.*
import com.example.fotografia.ui.*

@Composable
private fun ActiveBadge(active: Boolean) {
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
fun ClientList(state: StudioState, create: () -> Unit, detail: (Long) -> Unit) {
    var search by rememberSaveable { mutableStateOf("") }
    var showInactive by rememberSaveable { mutableStateOf(true) }
    val activeCount = state.clients.count { it.isActive }
    val inactiveCount = state.clients.size - activeCount
    val filtered = state.clients.filter {
        (showInactive || it.isActive) && "${it.name} ${it.email} ${it.phone} ${it.address}".contains(search.trim(), true)
    }
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SectionHeading(
                "DIRECTORIO DEL ESTUDIO",
                "Personas e historias",
                "Datos de contacto, domicilio de entrega y reservas de quienes confían en tu mirada."
            )
        }
        if (state.clients.isNotEmpty()) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("TOTAL", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                            Text("${state.clients.size}", style = MaterialTheme.typography.titleLarge)
                        }
                    }
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("ACTIVOS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                            Text("$activeCount", style = MaterialTheme.typography.titleLarge)
                        }
                    }
                    if (inactiveCount > 0) {
                        Surface(
                            onClick = { showInactive = !showInactive },
                            color = if (showInactive) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerLow,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text("INACTIVOS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                                Text("$inactiveCount", style = MaterialTheme.typography.titleLarge)
                            }
                        }
                    }
                }
            }
        }
        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                label = { Text("Buscar por nombre, correo, teléfono o dirección") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )
        }
        item {
            Button(
                onClick = create,
                enabled = state.loaded,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Registrar cliente")
            }
        }
        if (state.loaded && filtered.isEmpty()) {
            item { EmptyContent("Sin coincidencias", "Registra un cliente o ajusta tu búsqueda.") }
        }
        items(filtered, key = { it.id }) { client ->
            OutlinedCard(
                onClick = { detail(client.id) },
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(client.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                        ActiveBadge(client.isActive)
                    }
                    Text(client.phone, style = MaterialTheme.typography.bodyMedium)
                    Text(client.email, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                    if (client.address.isNotBlank()) {
                        Text(client.address, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall, maxLines = 2)
                    }
                }
            }
        }
    }
}

@Composable
fun ClientForm(
    state: StudioState,
    initialClient: Client? = null,
    save: (ClientRequest) -> Unit
) {
    val isEditing = initialClient != null
    var name by rememberSaveable(initialClient?.id) { mutableStateOf(initialClient?.name.orEmpty()) }
    var phone by rememberSaveable(initialClient?.id) { mutableStateOf(initialClient?.phone.orEmpty()) }
    var email by rememberSaveable(initialClient?.id) { mutableStateOf(initialClient?.email.orEmpty()) }
    val addressSaver = listSaver<DeliveryAddress, String>(
        save = { listOf(it.street, it.neighborhood, it.cityRegion, it.postalCode) },
        restore = { DeliveryAddress(it[0], it[1], it[2], it[3]) }
    )
    var address by rememberSaveable(initialClient?.id, stateSaver = addressSaver) {
        mutableStateOf(
            if (initialClient != null) DeliveryAddress.fromFormatted(initialClient.address)
            else DeliveryAddress()
        )
    }
    var submitted by rememberSaveable(initialClient?.id) { mutableStateOf(false) }
    val body = ClientRequest(name.trim(), phone.trim(), email.trim().lowercase(), address.formatted)
    val error = if (submitted) Rules.clientError(body) else null
    Column(
        Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        SectionHeading(
            "DIRECTORIO DEL ESTUDIO",
            if (isEditing) "Editar cliente" else "Un nuevo cliente",
            if (isEditing) "Actualiza los datos de contacto o corrige el domicilio de entrega."
            else "Datos de contacto y domicilio para la entrega."
        )
        OutlinedTextField(
            name, { name = it },
            label = { Text("Nombre completo") },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            enabled = !state.writing
        )
        OutlinedTextField(
            phone, { phone = it.filter(Char::isDigit).take(10) },
            label = { Text("Teléfono (10 dígitos)") },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            enabled = !state.writing
        )
        OutlinedTextField(
            email, { email = it },
            label = { Text("Correo electrónico") },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            enabled = !state.writing
        )
        DeliveryAddressField(address, { address = it }, enabled = !state.writing, showErrors = submitted)
        if (error != null) Text(error, color = MaterialTheme.colorScheme.error)
        Button(
            onClick = {
                submitted = true
                if (Rules.clientError(body) == null && address.error == null) save(body)
            },
            enabled = !state.writing && !state.loading && !state.uncertainWrite,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                when {
                    state.writing -> "Guardando…"
                    isEditing -> "Guardar cambios"
                    else -> "Guardar cliente"
                }
            )
        }
    }
}

@Composable
fun ClientDetail(
    id: Long,
    state: StudioState,
    reserve: (Long) -> Unit,
    edit: (Long) -> Unit,
    toggleActive: (Long, Boolean) -> Unit,
    detail: (Long) -> Unit
) {
    val client = state.clients.find { it.id == id }
    var confirmToggle by rememberSaveable(id) { mutableStateOf(false) }
    val enabled = !state.writing && !state.loading && !state.uncertainWrite

    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (client == null) {
            item { EmptyContent("Cliente no disponible", "Actualiza el directorio para consultar este registro.") }
        } else {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(client.name, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.weight(1f))
                    ActiveBadge(client.isActive)
                }
                Spacer(Modifier.height(12.dp))
                Surface(
                    color = MaterialTheme.colorScheme.surfaceContainerLow,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("CONTACTO", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        Text("Teléfono: ${client.phone}", style = MaterialTheme.typography.bodyMedium)
                        Text("Correo: ${client.email}", style = MaterialTheme.typography.bodyMedium)
                        HorizontalDivider(Modifier.padding(vertical = 4.dp))
                        Text("DOMICILIO DE ENTREGA", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        Text(client.address, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(4.dp))
                        DeliveryDirections(client.address)
                    }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = { reserve(client.id) },
                        enabled = enabled && client.isActive,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Crear reserva")
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = { edit(client.id) },
                            enabled = enabled && client.isActive,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Outlined.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Editar cliente", maxLines = 1)
                        }
                        OutlinedButton(
                            onClick = { confirmToggle = true },
                            enabled = enabled,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                if (client.isActive) Icons.Outlined.PersonOff else Icons.Outlined.PersonOutline,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(if (client.isActive) "Inactivar" else "Reactivar", maxLines = 1)
                        }
                    }
                    if (!client.isActive) {
                        Text(
                            "Este cliente está inactivo. Reactívalo si necesitas editar sus datos o registrarle una nueva reserva.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            item { Text("Reservas del cliente", style = MaterialTheme.typography.titleLarge) }
            val bookings = state.bookings.filter { it.client_id == id }.sortedByDescending { it.event_date }
            if (bookings.isEmpty()) item { Text("Todavía no tiene solicitudes registradas.") }
            items(bookings, key = { it.id }) { BookingCard(it) { detail(it.id) } }
        }
    }

    if (client != null && confirmToggle) {
        val nextActive = !client.isActive
        AlertDialog(
            onDismissRequest = { if (!state.writing) confirmToggle = false },
            title = { Text(if (nextActive) "Reactivar cliente" else "Inactivar cliente") },
            text = {
                Text(
                    if (nextActive) "Se reactivará el perfil de ${client.name} para permitir nuevas reservas y ediciones."
                    else "Se inactivará el perfil de ${client.name}. Sus reservas anteriores se conservan en el historial."
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        confirmToggle = false
                        toggleActive(client.id, nextActive)
                    },
                    enabled = enabled,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(if (nextActive) "Reactivar" else "Inactivar")
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmToggle = false }, enabled = !state.writing) {
                    Text("Cancelar")
                }
            }
        )
    }
}
