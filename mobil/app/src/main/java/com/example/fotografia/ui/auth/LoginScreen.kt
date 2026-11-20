package com.example.fotografia.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.fotografia.R
import com.example.fotografia.ui.StudioState

@Composable
fun LoginScreen(state: StudioState, login: (String, String) -> Unit) {
    val focus = LocalFocusManager.current
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var visible by remember { mutableStateOf(false) }
    val canLogin = !state.loading && email.isNotBlank() && password.isNotBlank()
    fun submit() { if (canLogin) { focus.clearFocus(); login(email, password) } }
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).background(MaterialTheme.colorScheme.background)) {
        Box(Modifier.fillMaxWidth().height(248.dp)) {
            Image(painterResource(R.drawable.studio_wedding), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0x99202E25), Color(0x33202E25), Color(0xEE173B30)))))
            Row(Modifier.align(Alignment.TopStart).padding(24.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Outlined.PhotoCamera, null, tint = Color.White, modifier = Modifier.size(28.dp))
                Column {
                    Text("Luz & Memoria", color = Color.White, style = MaterialTheme.typography.titleLarge)
                    Text("FOTOGRAFÍA & VIDEO", color = Color(0xFFE3E9DD), fontSize = 9.sp, letterSpacing = 2.sp)
                }
            }
            Column(Modifier.align(Alignment.BottomStart).padding(24.dp)) {
                Text("ADMINISTRACIÓN DEL ESTUDIO", color = Color(0xFFD8E2CD), fontSize = 9.sp, letterSpacing = 1.4.sp)
                Spacer(Modifier.height(10.dp))
                Text("Gestión integral", color = Color.White, style = MaterialTheme.typography.headlineMedium)
                Text("de eventos y clientes.", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontStyle = FontStyle.Italic)
            }
        }
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 25.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("ACCESO ADMINISTRATIVO", color = MaterialTheme.colorScheme.secondary, style = MaterialTheme.typography.labelSmall, letterSpacing = 2.sp)
                Text("Iniciar sesión", style = MaterialTheme.typography.headlineLarge)
                Text("Tu agenda, tus clientes y cada detalle de tu estudio, en un solo lugar.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
            }
            OutlinedTextField(email, { email = it }, label = { Text("Correo electrónico") }, singleLine = true, shape = RoundedCornerShape(12.dp),
                leadingIcon = { Icon(Icons.Outlined.MailOutline, null, modifier = Modifier.size(20.dp)) }, enabled = !state.loading,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focus.moveFocus(androidx.compose.ui.focus.FocusDirection.Down) }), modifier = Modifier.fillMaxWidth())
            OutlinedTextField(password, { password = it }, label = { Text("Contraseña") }, singleLine = true, shape = RoundedCornerShape(12.dp),
                leadingIcon = { Icon(Icons.Outlined.Lock, null, modifier = Modifier.size(20.dp)) }, enabled = !state.loading,
                visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { submit() }), modifier = Modifier.fillMaxWidth(),
                trailingIcon = { IconButton(onClick = { visible = !visible }) { Icon(if (visible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, if (visible) "Ocultar contraseña" else "Mostrar contraseña", modifier = Modifier.size(20.dp)) } })
            if (state.error != null) Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(12.dp)) {
                Text(state.error, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.bodySmall)
            }
            Button(onClick = { submit() }, enabled = canLogin, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp)) {
                if (state.loading) { CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary); Spacer(Modifier.width(12.dp)); Text("Verificando acceso…") }
                else { Text("Entrar al estudio"); Spacer(Modifier.width(12.dp)); Icon(Icons.AutoMirrored.Outlined.ArrowForward, null, Modifier.size(18.dp)) }
            }
            Text("Acceso exclusivo para administradores del estudio.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Text("LUZ & MEMORIA · GESTIÓN DEL ESTUDIO", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 1.sp)
        }
    }
}
