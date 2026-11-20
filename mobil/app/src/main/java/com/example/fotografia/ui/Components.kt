package com.example.fotografia.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.fotografia.data.*

@Composable
fun SectionHeading(eyebrow: String, title: String, subtitle: String) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(eyebrow, style = MaterialTheme.typography.labelSmall, letterSpacing = 1.6.sp, color = MaterialTheme.colorScheme.secondary)
        Text(title, style = MaterialTheme.typography.headlineMedium)
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun StatusLabel(status: String) {
    val color = when (status) {
        Rules.CONFIRMED -> Color(0xFF254C41)
        Rules.PENDING -> Color(0xFF805321)
        else -> Color(0xFF62695F)
    }
    Surface(color = color.copy(alpha = .09f), shape = RoundedCornerShape(8.dp)) {
        Text(status, color = color, style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
    }
}

@Composable
fun BookingCard(booking: Booking, onClick: () -> Unit) {
    OutlinedCard(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(booking.client_name, style = MaterialTheme.typography.titleMedium)
            Text("${Rules.date(booking.event_date)} · ${booking.event_type}", style = MaterialTheme.typography.bodyMedium)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusLabel(booking.status)
                Text(Rules.money(booking.total_cents), style = MaterialTheme.typography.titleSmall)
            }
        }
    }
}

@Composable
fun EmptyContent(title: String, text: String) {
    Column(Modifier.fillMaxWidth().padding(vertical = 28.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
