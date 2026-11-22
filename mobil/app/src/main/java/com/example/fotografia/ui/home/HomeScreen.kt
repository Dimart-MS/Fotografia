package com.example.fotografia.ui.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.example.fotografia.R
import com.example.fotografia.data.Rules
import com.example.fotografia.ui.*

@Composable
fun HomeScreen(state: StudioState, newClient: () -> Unit, newBooking: () -> Unit, detail: (Long) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { SectionHeading("VISTA GENERAL", "Tu estudio, al día", "Cada detalle en su lugar. Cada historia por recordar.") }
        item {
            Box(Modifier.fillMaxWidth().height(205.dp).clip(RoundedCornerShape(20.dp))) {
                Image(painterResource(R.drawable.studio_wedding), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xEE173B30)))))
                Column(Modifier.align(androidx.compose.ui.Alignment.BottomStart).padding(20.dp)) {
                    Text("Agenda de eventos\ny contrataciones", color = Color.White, style = MaterialTheme.typography.headlineMedium)
                    Text("Fechas, clientes y anticipos de tu estudio", color = Color(0xFFE6EDDF), style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        if (state.loaded) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf("Clientes" to state.clients.size, "Confirmadas" to state.bookings.count { it.status == Rules.CONFIRMED },
                        "Pendientes" to state.bookings.count { it.status == Rules.PENDING }).forEach { (label, count) ->
                        Card(Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Column(Modifier.padding(12.dp)) {
                                Text(count.toString(), style = MaterialTheme.typography.headlineMedium)
                                Text(label, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = newClient, modifier = Modifier.weight(1f)) { Text("Nuevo cliente") }
                    Button(onClick = newBooking, modifier = Modifier.weight(1f), enabled = state.clients.isNotEmpty()) { Text("Nueva reserva") }
                }
            }
            val next = state.bookings.filter { it.status == Rules.CONFIRMED && it.event_date >= Rules.today().toString() }.minByOrNull { it.event_date }
            if (next != null) item {
                Card(onClick = { detail(next.id) }, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = Color.White), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("PRÓXIMA COBERTURA CONFIRMADA", style = MaterialTheme.typography.labelSmall)
                        Text(next.client_name, style = MaterialTheme.typography.titleLarge)
                        Text("${next.event_type} · ${Rules.date(next.event_date)}", style = MaterialTheme.typography.bodyMedium)
                        Text("Ver detalles →", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
            item { Text("Próximos encuentros", style = MaterialTheme.typography.titleLarge) }
            val upcoming = state.bookings.filter { it.status != Rules.CANCELLED && it.event_date >= Rules.today().toString() }.sortedBy { it.event_date }.take(5)
            if (upcoming.isEmpty()) item { EmptyContent("Tu agenda está libre", "Las próximas solicitudes aparecerán aquí.") }
            items(upcoming, key = { it.id }) { BookingCard(it) { detail(it.id) } }
        } else if (!state.loading) item { EmptyContent("Conecta con tu estudio", "Pulsa Actualizar para consultar tus registros.") }
    }
}
