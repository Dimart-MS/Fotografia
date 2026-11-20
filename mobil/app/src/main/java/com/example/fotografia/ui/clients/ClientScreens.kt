package com.example.fotografia.ui.clients

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.fotografia.data.*
import com.example.fotografia.ui.*

@Composable
fun ClientList(state: StudioState, create: () -> Unit, detail: (Long) -> Unit) {
    var search by rememberSaveable { mutableStateOf("") }
    val filtered = state.clients.filter { "${it.name} ${it.email} ${it.phone}".contains(search.trim(), true) }
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { SectionHeading("DIRECTORIO DEL ESTUDIO", "Personas e historias", "Datos de contacto y reservas de quienes confían en tu mirada.") }
        item { OutlinedTextField(search, { search = it }, label = { Text("Buscar cliente") }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
        item { Button(onClick = create, enabled = state.loaded) { Text("Registrar cliente") } }
        if (state.loaded && filtered.isEmpty()) item { EmptyContent("Sin coincidencias", "Registra un cliente o ajusta tu búsqueda.") }
        items(filtered, key = { it.id }) { client ->
            OutlinedCard(onClick = { detail(client.id) }, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(client.name, style = MaterialTheme.typography.titleMedium)
                    Text(client.phone)
                    Text(client.email, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
fun ClientForm(state: StudioState, save: (ClientRequest) -> Unit) {
    var name by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    val addressSaver = listSaver<DeliveryAddress, String>(save = { listOf(it.street, it.neighborhood, it.cityRegion, it.postalCode) }, restore = { DeliveryAddress(it[0], it[1], it[2], it[3]) })
    var address by rememberSaveable(stateSaver = addressSaver) { mutableStateOf(DeliveryAddress()) }
    var submitted by rememberSaveable { mutableStateOf(false) }
    val body = ClientRequest(name.trim(), phone.trim(), email.trim().lowercase(), address.formatted)
    val error = if (submitted) Rules.clientError(body) else null
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionHeading("DIRECTORIO DEL ESTUDIO", "Un nuevo cliente", "Datos de contacto y domicilio para la entrega.")
        OutlinedTextField(name, { name = it }, label = { Text("Nombre completo") }, modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = !state.writing)
        OutlinedTextField(phone, { phone = it }, label = { Text("Teléfono") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), enabled = !state.writing)
        OutlinedTextField(email, { email = it }, label = { Text("Correo electrónico") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), enabled = !state.writing)
        DeliveryAddressField(address, { address = it }, enabled = !state.writing, showErrors = submitted)
        if (error != null) Text(error, color = MaterialTheme.colorScheme.error)
        Button(onClick = { submitted = true; if (Rules.clientError(body) == null && address.error == null) save(body) },
            enabled = !state.writing && !state.loading && !state.uncertainWrite, modifier = Modifier.fillMaxWidth()) {
            Text(if (state.writing) "Guardando…" else "Guardar cliente")
        }
    }
}

@Composable
fun ClientDetail(id: Long, state: StudioState, reserve: (Long) -> Unit, detail: (Long) -> Unit) {
    val client = state.clients.find { it.id == id }
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (client == null) item { EmptyContent("Cliente no disponible", "Actualiza el directorio para consultar este registro.") }
        else {
            item {
                Text(client.name, style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.height(16.dp))
                Text(client.phone); Text(client.email)
                Spacer(Modifier.height(12.dp))
                Text("Domicilio de entrega", style = MaterialTheme.typography.labelLarge)
                Text(client.address)
                Spacer(Modifier.height(12.dp))
                DeliveryDirections(client.address)
            }
            item { Button(onClick = { reserve(client.id) }) { Text("Crear reserva") } }
            item { Text("Reservas del cliente", style = MaterialTheme.typography.titleLarge) }
            val bookings = state.bookings.filter { it.client_id == id }.sortedByDescending { it.event_date }
            if (bookings.isEmpty()) item { Text("Todavía no tiene solicitudes registradas.") }
            items(bookings, key = { it.id }) { BookingCard(it) { detail(it.id) } }
        }
    }
}
