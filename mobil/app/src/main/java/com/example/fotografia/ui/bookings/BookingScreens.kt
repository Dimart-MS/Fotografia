package com.example.fotografia.ui.bookings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.CloudUpload
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.fotografia.data.*
import com.example.fotografia.ui.*
import com.example.fotografia.ui.clients.DeliveryDirections
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
    val activeClients = remember(state.clients) { state.clients.filter { it.isActive } }
    val activePackages = remember(state.packages) { state.packages.filter { it.isActive } }
    var client by rememberSaveable { mutableStateOf(if (clientId > 0) clientId.toString() else "") }
    var date by rememberSaveable { mutableStateOf(initialDate.ifBlank { Rules.today().toString() }) }
    var event by rememberSaveable { mutableStateOf("Boda") }
    var pack by rememberSaveable { mutableStateOf("") }
    var dateDialog by rememberSaveable { mutableStateOf(false) }
    val enabled = !state.writing && !state.loading && !state.uncertainWrite
    val selectedPackage = activePackages.find { it.id == pack }
    val occupied = state.bookings.any { it.event_date == date && Rules.occupiesDate(it.status) }
    val past = LocalDate.parse(date).isBefore(Rules.today())
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionHeading("RESERVACIONES", "Una nueva historia", "Elige los detalles de la cobertura y registra la solicitud.")
        Choice("Cliente", client, activeClients.map { it.id.toString() to "${it.name} · ${it.phone}" }, enabled) { client = it }
        Surface(onClick = { dateDialog = true }, enabled = enabled, shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline), modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.CalendarMonth, null, tint = MaterialTheme.colorScheme.primary)
                Column(Modifier.weight(1f)) {
                    Text("Fecha del evento", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(Rules.date(date), style = MaterialTheme.typography.bodyLarge)
                }
                Text("Elegir", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            }
        }
        Choice("Tipo de evento", event, Rules.eventTypes.map { it to it }, enabled) { event = it }
        Choice("Paquete", pack, activePackages.map { it.id to "${it.name} · ${Rules.money(it.price_cents)}" }, enabled) { pack = it }
        if (selectedPackage != null) {
            if (!selectedPackage.description.isNullOrBlank()) {
                Surface(color = MaterialTheme.colorScheme.surfaceContainerLow, shape = RoundedCornerShape(12.dp)) {
                    Text(
                        selectedPackage.description,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Text("Total: ${Rules.money(selectedPackage.price_cents)}", style = MaterialTheme.typography.titleLarge)
            Text("Anticipo mínimo: ${Rules.money((selectedPackage.price_cents + 1) / 2)}")
        }
        Text("La solicitud queda pendiente de anticipo. La fecha se aparta al confirmar el pago y está sujeta a disponibilidad hasta ese momento.", style = MaterialTheme.typography.bodyMedium)
        if (past || occupied) Text(if (past) "Selecciona una fecha vigente." else "Esta fecha ya tiene un evento confirmado.", color = MaterialTheme.colorScheme.error)
        if (activeClients.isEmpty()) Text("Primero registra o activa un cliente en el directorio.")
        Button(onClick = { save(BookingRequest(client.toLong(), date, event, pack)) }, enabled = enabled && !past && !occupied && activeClients.any { it.id.toString() == client } && selectedPackage != null, modifier = Modifier.fillMaxWidth()) {
            Text(if (state.writing) "Guardando…" else "Registrar solicitud")
        }
    }
    if (dateDialog) EventDateDialog(date, state.bookings.filter { Rules.occupiesDate(it.status) }.map { it.event_date }.toSet(),
        dismiss = { dateDialog = false }, choose = { date = it; dateDialog = false })
}

@Composable
fun BookingDetail(
    id: Long,
    state: StudioState,
    confirm: (Booking, String, () -> Unit) -> Unit,
    cancel: (Booking, () -> Unit) -> Unit,
    onSaveDelivery: (Long, String?, String, Int) -> Unit = { _, _, _, _ -> },
    onRejectReceipt: (Long, String) -> Unit = { _, _ -> }
) {
    val booking = state.bookings.find { it.id == id }
    val client = booking?.let { b -> state.clients.find { it.id == b.client_id } }
    val pkg = booking?.let { b -> state.packages.find { it.id == b.`package` } }
    val tracking = state.deliveries[id] ?: DeliveryTracking()

    var action by rememberSaveable(id) { mutableStateOf("") }
    var amount by rememberSaveable(id) { mutableStateOf("") }
    var rejectionReason by rememberSaveable(id) { mutableStateOf(tracking.rejectionReason) }
    var galleryUrl by rememberSaveable(id, tracking.galleryUrl) { mutableStateOf(tracking.galleryUrl) }
    var photosCount by rememberSaveable(id, tracking.photosCount) { mutableIntStateOf(tracking.photosCount) }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        if (uris.isNotEmpty()) {
            photosCount = uris.size
            onSaveDelivery(id, null, galleryUrl, photosCount)
        }
    }

    val enabled = !state.writing && !state.loading && !state.uncertainWrite
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (booking == null) EmptyContent("Reserva no disponible", "Actualiza para consultar el registro.") else {
            Text(booking.client_name, style = MaterialTheme.typography.headlineMedium)
            StatusLabel(booking.status)
            Text("${booking.event_type} · ${Rules.date(booking.event_date)}", style = MaterialTheme.typography.titleLarge)
            Text("Paquete: ${pkg?.name ?: booking.`package`}")
            if (!pkg?.description.isNullOrBlank()) {
                Text(pkg!!.description!!, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            // HU-05: Domicilio de entrega y botón GPS directo desde la reserva
            if (client != null && client.address.isNotBlank()) {
                Surface(color = MaterialTheme.colorScheme.surfaceContainerLow, shape = RoundedCornerShape(14.dp)) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("DOMICILIO DE ENTREGA Y RUTA GPS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        Text(client.address, style = MaterialTheme.typography.bodyMedium)
                        Text("Contacto: ${client.phone} · ${client.email}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        DeliveryDirections(client.address)
                    }
                }
            }

            // HU-04: Control de pagos, anticipos y saldos
            Surface(color = MaterialTheme.colorScheme.surfaceContainerLow, shape = RoundedCornerShape(14.dp)) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    val balance = (booking.total_cents - booking.paid_cents).coerceAtLeast(0L)
                    Text("CONTROL DE ANTICIPO Y SALDO", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                    Text("Total del paquete: ${Rules.money(booking.total_cents)}")
                    Text("Monto pagado: ${Rules.money(booking.paid_cents)}")
                    Text(
                        text = if (balance == 0L && booking.paid_cents > 0L) "Saldo: Liquidado ($0.00)"
                        else "Saldo pendiente: ${Rules.money(balance)}",
                        style = MaterialTheme.typography.titleMedium,
                        color = if (balance == 0L && booking.paid_cents > 0L) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                    )
                    if (tracking.rejectionReason.isNotBlank()) {
                        Text(
                            "Último motivo de rechazo: ${tracking.rejectionReason}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            val awaitingConfirmation = booking.status in setOf(Rules.PENDING, Rules.RECEIPT_SENT)
            if (awaitingConfirmation && booking.event_date >= Rules.today().toString()) {
                Button(
                    onClick = {
                        amount = Rules.amount((booking.total_cents + 1) / 2)
                        action = "confirm"
                    },
                    enabled = enabled,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(if (booking.status == Rules.RECEIPT_SENT) "Aprobar comprobante y anticipo" else "Registrar anticipo")
                }
            }
            if (booking.status == Rules.RECEIPT_SENT) {
                OutlinedButton(
                    onClick = { action = "reject" },
                    enabled = enabled,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Rechazar comprobante con motivo")
                }
            }
            if (booking.status == Rules.PENDING && booking.paid_cents == 0L) {
                OutlinedButton(
                    onClick = { action = "cancel" },
                    enabled = enabled,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Cancelar solicitud")
                }
            }

            // HU-05 & HU-08: Seguimiento de cobertura, carga de galería y entrega digital
            if (booking.status in setOf(Rules.CONFIRMED, Rules.COMPLETED, Rules.DELIVERED)) {
                Surface(color = MaterialTheme.colorScheme.surfaceContainerLow, shape = RoundedCornerShape(14.dp)) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("GALERÍA DIGITAL Y ESTADO DE ENTREGA", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        Text(
                            "Prepara las fotografías del evento y el enlace de video (Drive o YouTube no listado) para la entrega al cliente.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedButton(
                            onClick = { photoPicker.launch("image/*") },
                            enabled = enabled,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Outlined.PhotoLibrary, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(
                                if (photosCount > 0) "$photosCount fotografías seleccionadas"
                                else "Elegir fotografías",
                                maxLines = 1
                            )
                        }
                        OutlinedTextField(
                            value = galleryUrl,
                            onValueChange = { galleryUrl = it },
                            label = { Text("Enlace de video (Drive / YouTube)") },
                            placeholder = { Text("https://drive.google.com/...") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                            leadingIcon = { Icon(Icons.Outlined.Link, contentDescription = null) }
                        )
                        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (booking.status == Rules.CONFIRMED) {
                                OutlinedButton(
                                    onClick = { onSaveDelivery(booking.id, Rules.COMPLETED, galleryUrl, photosCount) },
                                    enabled = enabled,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Marcar como Realizada", maxLines = 1)
                                }
                            }
                            Button(
                                onClick = { onSaveDelivery(booking.id, Rules.DELIVERED, galleryUrl, photosCount) },
                                enabled = enabled && (photosCount > 0 || galleryUrl.isNotBlank() || booking.status != Rules.DELIVERED),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Outlined.CloudUpload, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(if (booking.status == Rules.DELIVERED) "Actualizar entrega" else "Marcar como Entregada", maxLines = 1)
                            }
                        }
                        if (photosCount > 0 || galleryUrl.isNotBlank()) {
                            HorizontalDivider()
                            Text("RESUMEN DE ENTREGA", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                            Text("Cliente: ${booking.client_name}", style = MaterialTheme.typography.bodySmall)
                            if (client != null) Text("Domicilio: ${client.address}", style = MaterialTheme.typography.bodySmall)
                            if (photosCount > 0) Text("Fotografías listas: $photosCount archivos", style = MaterialTheme.typography.bodySmall)
                            if (galleryUrl.isNotBlank()) Text("Enlace compartido: $galleryUrl", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            Text("Los registros cancelados se conservan en el historial.", style = MaterialTheme.typography.bodySmall)
        }
    }
    if (booking != null && action.isNotEmpty()) AlertDialog(onDismissRequest = { if (!state.writing) action = "" },
        title = {
            Text(
                when (action) {
                    "confirm" -> "Confirmar anticipo"
                    "reject" -> "Rechazar comprobante"
                    else -> "Cancelar solicitud"
                }
            )
        },
        text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            when (action) {
                "confirm" -> {
                    Text("Registra únicamente un pago recibido. Entre ${Rules.money((booking.total_cents + 1) / 2)} y ${Rules.money(booking.total_cents)}.")
                    OutlinedTextField(amount, { amount = it }, label = { Text("Importe en MXN") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true, enabled = !state.writing)
                }
                "reject" -> {
                    Text("Indica el motivo por el cual el comprobante de ${booking.client_name} no pudo validarse.")
                    OutlinedTextField(
                        value = rejectionReason,
                        onValueChange = { rejectionReason = it },
                        label = { Text("Motivo del rechazo") },
                        placeholder = { Text("Ej. Imagen ilegible o monto inferior al 50 %") },
                        enabled = !state.writing
                    )
                }
                else -> Text("Se cancelará la solicitud de ${booking.client_name}. Esta acción no elimina el historial.")
            }
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        } },
        confirmButton = {
            Button(
                onClick = {
                    when (action) {
                        "confirm" -> confirm(booking, amount) { action = "" }
                        "reject" -> {
                            onRejectReceipt(booking.id, rejectionReason)
                            action = ""
                        }
                        else -> cancel(booking) { action = "" }
                    }
                },
                enabled = enabled && when (action) {
                    "confirm" -> Rules.validPayment(amount, booking.total_cents)
                    "reject" -> rejectionReason.trim().length >= 4
                    else -> true
                }
            ) {
                Text(if (state.writing) "Guardando…" else "Confirmar")
            }
        },
        dismissButton = { TextButton(onClick = { action = "" }, enabled = !state.writing) { Text("Volver") } })
}
