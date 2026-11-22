package com.example.fotografia.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp

private val StudioColors = lightColorScheme(
    primary = Color(0xFF254C41), onPrimary = Color.White,
    primaryContainer = Color(0xFFE4EBDD), onPrimaryContainer = Color(0xFF254C41),
    secondary = Color(0xFF68745B), secondaryContainer = Color(0xFFE4EBDD), onSecondaryContainer = Color(0xFF254C41), background = Color(0xFFF7F6F2),
    surface = Color(0xFFFFFEFA), onSurface = Color(0xFF282C28),
    surfaceContainerLowest = Color(0xFFFFFEFA), surfaceContainerLow = Color(0xFFF7F6F2),
    surfaceContainer = Color(0xFFF1F2EB), surfaceContainerHigh = Color(0xFFEDEFE6), surfaceContainerHighest = Color(0xFFE4EBDD),
    onBackground = Color(0xFF282C28), onSurfaceVariant = Color(0xFF62695F),
    outline = Color(0xFF9DA795), outlineVariant = Color(0xFFDFE3D9)
)

@Composable
fun FotografiaTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = StudioColors,
        typography = Typography(
            headlineLarge = TextStyle(fontFamily = FontFamily.Serif, fontSize = 32.sp, lineHeight = 38.sp),
            headlineMedium = TextStyle(fontFamily = FontFamily.Serif, fontSize = 26.sp, lineHeight = 32.sp),
            titleLarge = TextStyle(fontFamily = FontFamily.Serif, fontSize = 22.sp, lineHeight = 28.sp)
        ), content = content)
}
