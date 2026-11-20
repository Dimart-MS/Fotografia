package com.example.fotografia.ui.bookings

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Check
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.fotografia.data.*
import com.example.fotografia.ui.*
import java.time.LocalDate
import java.time.Instant
import java.time.ZoneOffset
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Choice(label: String, selected: String, options: List<Pair<String, String>>, enabled: Boolean = true, choose: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    LaunchedEffect(enabled) { if (!enabled) expanded = false }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { if (enabled && options.isNotEmpty()) expanded = !expanded }) {
        OutlinedTextField(value = options.find { it.first == selected }?.second.orEmpty(), onValueChange = {}, readOnly = true,
            enabled = enabled && options.isNotEmpty(), label = { Text(label) }, placeholder = { Text("Seleccionar") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            shape = RoundedCornerShape(12.dp), modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable, enabled = enabled && options.isNotEmpty()).fillMaxWidth(),
            supportingText = if (options.isEmpty()) ({ Text("Sin opciones disponibles") }) else null)
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }, modifier = Modifier.heightIn(max = 320.dp)) {
            options.forEach { (id, text) ->
                DropdownMenuItem(text = { Text(text) }, onClick = { choose(id); expanded = false },
                    trailingIcon = { if (id == selected) Icon(Icons.Outlined.Check, "Seleccionado", tint = MaterialTheme.colorScheme.primary) },
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EventDateDialog(current: String, occupied: Set<String>, dismiss: () -> Unit, choose: (String) -> Unit) {
    val today = Rules.today()
    val allowed = remember(today, occupied) {
        object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long): Boolean {
                val day = Instant.ofEpochMilli(utcTimeMillis).atZone(ZoneOffset.UTC).toLocalDate()
                return !day.isBefore(today) && day.toString() !in occupied
            }
            override fun isSelectableYear(year: Int) = year >= today.year
        }
    }
    val initial = LocalDate.parse(current).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    val picker = rememberDatePickerState(initialSelectedDateMillis = initial, selectableDates = allowed)
    val valid = picker.selectedDateMillis?.let { allowed.isSelectableDate(it) } == true
    DatePickerDialog(onDismissRequest = dismiss, colors = DatePickerDefaults.colors(containerColor = MaterialTheme.colorScheme.surface),
        confirmButton = { TextButton(enabled = valid, onClick = {
            choose(Instant.ofEpochMilli(picker.selectedDateMillis!!).atZone(ZoneOffset.UTC).toLocalDate().toString())
        }) { Text("Elegir fecha") } },
        dismissButton = { TextButton(onClick = dismiss) { Text("Cancelar") } }) {
        Column {
        DatePicker(state = picker,
            title = { Text("FECHA DEL EVENTO", modifier = Modifier.padding(start = 24.dp, top = 20.dp), style = MaterialTheme.typography.labelLarge) },
            colors = DatePickerDefaults.colors(containerColor = MaterialTheme.colorScheme.surface))
        Text("Las fechas pasadas y las que ya tienen un evento confirmado no están disponibles.",
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun AgendaScreen(state: StudioState, create: (String) -> Unit, detail: (Long) -> Unit) {
    var monthText by rememberSaveable { mutableStateOf(YearMonth.from(Rules.today()).toString()) }
    var selected by rememberSaveable { mutableStateOf("") }
    var status by rememberSaveable { mutableStateOf("") }
    val month = YearMonth.parse(monthText)
    val filtered = state.bookings.filter { it.event_date.startsWith(monthText) && (selected.isEmpty() || it.event_date == selected) && (status.isEmpty() || it.status == status) }.sortedBy { it.event_date }
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { SectionHeading("CONTROL DE COBERTURAS", "Agenda de momentos", "Organiza fechas, solicitudes y próximos encuentros.") }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = { monthText = month.minusMonths(1).toString(); selected = "" }) { Text("Anterior") }
                Text(month.format(DateTimeFormatter.ofPattern("MMM yyyy", Locale("es", "MX"))), modifier = Modifier.padding(top = 12.dp))
                TextButton(onClick = { monthText = month.plusMonths(1).toString(); selected = "" }) { Text("Siguiente") }
            }
            Row { listOf("L", "M", "M", "J", "V", "S", "D").forEach { Text(it, Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center) } }
            val offset = month.atDay(1).dayOfWeek.value - 1
            val cells = (List(offset) { 0 } + (1..month.lengthOfMonth()).toList()).toMutableList()
            while (cells.size % 7 != 0) cells.add(0)
            cells.chunked(7).forEach { week ->
                Row {
                    week.forEach { day ->
                        if (day == 0) Spacer(Modifier.weight(1f).height(48.dp)) else {
                            val date = month.atDay(day).toString()
                            val occupied = state.bookings.any { it.event_date == date && Rules.occupiesDate(it.status) }
                            TextButton(onClick = { selected = if (selected == date) "" else date }, modifier = Modifier.weight(1f).heightIn(min = 48.dp), contentPadding = PaddingValues(0.dp),
                                colors = ButtonDefaults.textButtonColors(containerColor = if (selected == date) MaterialTheme.colorScheme.primaryContainer else androidx.compose.ui.graphics.Color.Transparent)) {
                                Text("$day${if (occupied) "•" else ""}")
                            }
                        }
                    }
                }
            }
            Text("• Fecha con evento confirmado. Toca un día para filtrar.", style = MaterialTheme.typography.bodySmall)
            if (selected.isNotEmpty()) TextButton(onClick = { selected = "" }) { Text("Ver todo el mes") }
        }
        item { Choice("Estado", status, (listOf("" to "Todos") + Rules.bookingStatuses.map { it to it })) { status = it } }
        item { Button(onClick = { create(selected) }, enabled = state.loaded && state.clients.isNotEmpty()) { Text("Nueva reserva") } }
        if (state.loaded && filtered.isEmpty()) item { EmptyContent("Sin reservas en esta vista", "Prueba otra fecha o estado.") }
        items(filtered, key = { it.id }) { BookingCard(it) { detail(it.id) } }
    }
}

@Composable
fun BookingForm(state: StudioState, clientId: Long, initialDate: String, save: (BookingRequest) -> Unit) {
    var client by rememberSaveable { mutableStateOf(if (clientId > 0) clientId.toString() else "") }
    var date by rememberSaveable { mutableStateOf(initialDate.ifBlank { Rules.today().toString() }) }
    var event by rememberSaveable { mutableStateOf("Boda") }
    var pack by rememberSaveable { mutableStateOf("") }
    var dateDialog by rememberSaveable { mutableStateOf(false) }
    val enabled = !state.writing && !state.loading && !state.uncertainWrite
    val selectedPackage = state.packages.find { it.id == pack }
    val occupied = state.bookings.any { it.event_date == date && Rules.occupiesDate(it.status) }
    val past = LocalDate.parse(date).isBefore(Rules.today())
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionHeading("RESERVACIONES", "Una nueva historia", "Elige los detalles de la cobertura y registra la solicitud.")
        Choice("Cliente", client, state.clients.map { it.id.toString() to "${it.name} · ${it.phone}" }, enabled) { client = it }
        Surface(onClick = { dateDialog = true }, enabled = enabled, shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline), modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Icon(Icons.Outlined.CalendarMonth, null, tint = MaterialTheme.colorScheme.primary)
                Column(Modifier.weight(1f)) {
                    Text("Fecha del evento", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(Rules.date(date), style = MaterialTheme.typography.bodyLarge)
                }
                Text("Elegir", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            }
        }
        Choice("Tipo de evento", event, Rules.eventTypes.map { it to it }, enabled) { event = it }
        Choice("Paquete", pack, state.packages.map { it.id to "${it.name} · ${Rules.money(it.price_cents)}" }, enabled) { pack = it }
        if (selectedPackage != null) {
            Text("Total: ${Rules.money(selectedPackage.price_cents)}", style = MaterialTheme.typography.titleLarge)
            Text("Anticipo mínimo: ${Rules.money((selectedPackage.price_cents + 1) / 2)}")
        }
        Text("La solicitud queda pendiente de anticipo. La fecha se aparta al confirmar el pago y está sujeta a disponibilidad hasta ese momento.", style = MaterialTheme.typography.bodyMedium)
        if (past || occupied) Text(if (past) "Selecciona una fecha vigente." else "Esta fecha ya tiene un evento confirmado.", color = MaterialTheme.colorScheme.error)
        if (state.clients.isEmpty()) Text("Primero registra un cliente en el directorio.")
        Button(onClick = { save(BookingRequest(client.toLong(), date, event, pack)) }, enabled = enabled && !past && !occupied && state.clients.any { it.id.toString() == client } && selectedPackage != null, modifier = Modifier.fillMaxWidth()) {
            Text(if (state.writing) "Guardando…" else "Registrar solicitud")
        }
    }
    if (dateDialog) EventDateDialog(date, state.bookings.filter { Rules.occupiesDate(it.status) }.map { it.event_date }.toSet(),
        dismiss = { dateDialog = false }, choose = { date = it; dateDialog = false })
}

@Composable
fun BookingDetail(id: Long, state: StudioState, confirm: (Booking, String, () -> Unit) -> Unit, cancel: (Booking, () -> Unit) -> Unit) {
    val booking = state.bookings.find { it.id == id }
    var action by rememberSaveable(id) { mutableStateOf("") }
    var amount by rememberSaveable(id) { mutableStateOf("") }
    val enabled = !state.writing && !state.loading && !state.uncertainWrite
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (booking == null) EmptyContent("Reserva no disponible", "Actualiza para consultar el registro.") else {
            Text(booking.client_name, style = MaterialTheme.typography.headlineMedium)
            StatusLabel(booking.status)
            Text("${booking.event_type} · ${Rules.date(booking.event_date)}", style = MaterialTheme.typography.titleLarge)
            Text("Paquete: ${state.packages.find { it.id == booking.`package` }?.name ?: booking.`package`}")
            HorizontalDivider()
            Text("Total: ${Rules.money(booking.total_cents)}")
            Text("Anticipo registrado: ${Rules.money(booking.paid_cents)}")
            Text("Saldo: ${Rules.money(booking.total_cents - booking.paid_cents)}", style = MaterialTheme.typography.titleLarge)
            if (booking.status == Rules.PENDING && booking.event_date >= Rules.today().toString()) Button(onClick = { amount = Rules.amount((booking.total_cents + 1) / 2); action = "confirm" }, enabled = enabled, modifier = Modifier.fillMaxWidth()) { Text("Registrar anticipo") }
            if (booking.status == Rules.PENDING && booking.paid_cents == 0L) OutlinedButton(onClick = { action = "cancel" }, enabled = enabled, modifier = Modifier.fillMaxWidth()) { Text("Cancelar solicitud") }
            Text("Los registros cancelados se conservan en el historial.", style = MaterialTheme.typography.bodySmall)
        }
    }
    if (booking != null && action.isNotEmpty()) AlertDialog(onDismissRequest = { if (!state.writing) action = "" },
        title = { Text(if (action == "confirm") "Confirmar anticipo" else "Cancelar solicitud") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (action == "confirm") {
                Text("Registra únicamente un pago recibido. Entre ${Rules.money((booking.total_cents + 1) / 2)} y ${Rules.money(booking.total_cents)}.")
                OutlinedTextField(amount, { amount = it }, label = { Text("Importe en MXN") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true, enabled = !state.writing)
            } else Text("Se cancelará la solicitud de ${booking.client_name}. Esta acción no elimina el historial.")
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        } },
        confirmButton = { Button(onClick = { if (action == "confirm") confirm(booking, amount) { action = "" } else cancel(booking) { action = "" } }, enabled = enabled && (action != "confirm" || Rules.validPayment(amount, booking.total_cents))) { Text(if (state.writing) "Guardando…" else "Confirmar") } },
        dismissButton = { TextButton(onClick = { action = "" }, enabled = !state.writing) { Text("Volver") } })
}
