package com.example.fotografia.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.example.fotografia.ui.auth.LoginScreen
import com.example.fotografia.ui.bookings.*
import com.example.fotografia.ui.clients.*
import com.example.fotografia.ui.home.HomeScreen

@Composable
fun StudioApp(model: StudioViewModel = viewModel()) {
    val state by model.state.collectAsStateWithLifecycle()
    if (state.user == null) Surface { Box(Modifier.systemBarsPadding()) { LoginScreen(state, model::login) } }
    else StudioContent(state, model)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StudioContent(state: StudioState, model: StudioViewModel) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route ?: "home"
    val snack = remember { SnackbarHostState() }
    var leaving by remember { mutableStateOf(false) }
    val roots = listOf("home", "clients", "bookings")
    LaunchedEffect(state.notice) { state.notice?.let { snack.showSnackbar(it); model.dismissNotice() } }
    BackHandler(enabled = state.writing) { }
    Scaffold(snackbarHost = { SnackbarHost(snack) }, topBar = {
        TopAppBar(title = { Text("Luz & Memoria") }, navigationIcon = {
            if (route !in roots) IconButton(onClick = { nav.popBackStack() }, enabled = !state.writing) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Volver") }
        }, actions = {
            IconButton(onClick = model::refresh, enabled = !state.loading && !state.writing) { Icon(Icons.Outlined.Refresh, "Actualizar") }
            IconButton(onClick = { leaving = true }, enabled = !state.writing) { Icon(Icons.AutoMirrored.Outlined.Logout, "Cerrar sesión") }
        })
    }, bottomBar = {
        NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
            listOf(Triple("home", "Inicio", Icons.Outlined.Home), Triple("clients", "Clientes", Icons.Outlined.People), Triple("bookings", "Agenda", Icons.Outlined.CalendarMonth)).forEach { (target, label, icon) ->
                NavigationBarItem(colors = NavigationBarItemDefaults.colors(indicatorColor = MaterialTheme.colorScheme.primaryContainer, selectedIconColor = MaterialTheme.colorScheme.primary, selectedTextColor = MaterialTheme.colorScheme.primary), selected = route == target || (target == "clients" && route.startsWith("client/")) || (target == "bookings" && route.startsWith("booking/")), enabled = !state.writing,
                    onClick = { nav.navigate(target) { popUpTo("home"); launchSingleTop = true } }, icon = { Icon(icon, null) }, label = { Text(label) })
            }
        }
    }) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            if (state.loading || state.writing) LinearProgressIndicator(Modifier.fillMaxWidth())
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) }
            NavHost(nav, "home", Modifier.weight(1f)) {
                composable("home") { HomeScreen(state, { nav.navigate("client/new") }, { nav.navigate("booking/new") }, { nav.navigate("booking/$it") }) }
                composable("clients") { ClientList(state, { nav.navigate("client/new") }, { nav.navigate("client/$it") }) }
                composable("client/new") { ClientForm(state) { body -> model.createClient(body) { nav.popBackStack() } } }
                composable("client/{id}", listOf(navArgument("id") { type = NavType.LongType })) { back ->
                    ClientDetail(back.arguments!!.getLong("id"), state, { nav.navigate("booking/new?clientId=$it") }, { nav.navigate("booking/$it") })
                }
                composable("bookings") { AgendaScreen(state, { nav.navigate("booking/new?date=$it") }, { nav.navigate("booking/$it") }) }
                composable("booking/new?clientId={clientId}&date={date}", listOf(navArgument("clientId") { type = NavType.LongType; defaultValue = 0L }, navArgument("date") { defaultValue = "" })) { back ->
                    BookingForm(state, back.arguments!!.getLong("clientId"), back.arguments!!.getString("date").orEmpty()) { body -> model.createBooking(body) { nav.popBackStack() } }
                }
                composable("booking/{id}", listOf(navArgument("id") { type = NavType.LongType })) { back ->
                    BookingDetail(back.arguments!!.getLong("id"), state, model::confirm, model::cancel)
                }
            }
        }
    }
    if (leaving) AlertDialog(onDismissRequest = { leaving = false }, title = { Text("Cerrar sesión") }, text = { Text("Tendrás que iniciar sesión para volver a consultar el estudio.") }, confirmButton = { TextButton(onClick = model::logout) { Text("Salir") } }, dismissButton = { TextButton(onClick = { leaving = false }) { Text("Volver") } })
}
