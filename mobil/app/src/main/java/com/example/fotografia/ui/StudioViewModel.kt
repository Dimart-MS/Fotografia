package com.example.fotografia.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.fotografia.BuildConfig
import com.example.fotografia.data.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import retrofit2.HttpException

data class DeliveryTracking(
    val stageOverride: String? = null,
    val galleryUrl: String = "",
    val photosCount: Int = 0,
    val rejectionReason: String = ""
)

data class StudioState(
    val user: StudioUser? = null, val loading: Boolean = false,
    val writing: Boolean = false, val error: String? = null,
    val notice: String? = null, val clients: List<Client> = emptyList(),
    val packages: List<PackageOption> = emptyList(), val bookings: List<Booking> = emptyList(),
    val deliveries: Map<Long, DeliveryTracking> = emptyMap(),
    val loaded: Boolean = false, val uncertainWrite: Boolean = false
)

class StudioViewModel : ViewModel() {
    private val repository = StudioRepository()
    private val mutableState = MutableStateFlow(StudioState())
    val state = mutableState.asStateFlow()
    private var epoch = 0

    fun login(email: String, password: String) {
        if (state.value.loading) return
        mutableState.value = StudioState(loading = true)
        viewModelScope.launch {
            try {
                repository.configure(ConnectionConfig.clientsUrl, ConnectionConfig.bookingsUrl, BuildConfig.DEBUG)
                repository.login(email, password)
                mutableState.update { it.copy(user = repository.session.user.value, loading = false) }
                refresh()
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                mutableState.value = StudioState(error = errorMessage(error))
            }
        }
    }
    fun logout() { epoch++; repository.session.clear(); mutableState.value = StudioState() }
    fun dismissNotice() { mutableState.update { it.copy(notice = null) } }
    private fun fail(error: Exception, writing: Boolean = false) {
        if (error is CancellationException) throw error
        if (error is HttpException && error.code() == 401) {
            logout(); mutableState.update { it.copy(error = "Tu sesión terminó. Inicia sesión de nuevo.") }
        } else mutableState.update { it.copy(error = errorMessage(error, writing)) }
    }
    fun refresh() {
        if (state.value.loading || state.value.writing || state.value.user == null) return
        val currentEpoch = epoch
        mutableState.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            try {
                val clients = repository.clients()
                val packages = repository.adminPackages()
                val bookings = repository.bookings()
                if (epoch == currentEpoch) mutableState.update {
                    val overrides = it.deliveries
                    val mergedBookings = bookings.map { b ->
                        val localStage = overrides[b.id]?.stageOverride
                        if (localStage != null && b.status == Rules.CONFIRMED) b.copy(status = localStage) else b
                    }
                    it.copy(clients = clients, packages = packages, bookings = mergedBookings,
                        loaded = true, loading = false, uncertainWrite = false)
                }
            } catch (error: Exception) { if (epoch == currentEpoch) { fail(error); mutableState.update { it.copy(loading = false) } } }
        }
    }
    private fun write(action: suspend () -> Unit, notice: String, completed: () -> Unit) {
        if (state.value.writing || state.value.loading || state.value.uncertainWrite) return
        val currentEpoch = epoch
        mutableState.update { it.copy(writing = true, error = null) }
        viewModelScope.launch {
            try {
                action()
                if (epoch == currentEpoch) {
                    mutableState.update { it.copy(writing = false, notice = notice) }
                    completed()
                    refresh()
                }
            } catch (error: Exception) {
                if (epoch == currentEpoch) {
                    fail(error, true)
                    val uncertain = error !is HttpException || error.code() >= 500
                    mutableState.update { it.copy(writing = false, uncertainWrite = uncertain && it.user != null) }
                }
            }
        }
    }
    fun createClient(body: ClientRequest, completed: () -> Unit) {
        val error = Rules.clientError(body)
        if (error != null) { mutableState.update { it.copy(error = error) }; return }
        write({ repository.createClient(body) }, "Cliente registrado", completed)
    }
    fun updateClient(id: Long, body: ClientRequest, completed: () -> Unit) {
        val error = Rules.clientError(body)
        if (error != null) { mutableState.update { it.copy(error = error) }; return }
        write({ repository.updateClient(id, body) }, "Datos del cliente actualizados", completed)
    }
    fun setClientActive(id: Long, active: Boolean, completed: () -> Unit = {}) {
        val msg = if (active) "Cliente reactivado" else "Cliente inactivado"
        write({ repository.setClientActive(id, active) }, msg, completed)
    }
    fun createPackage(body: PackageCreateRequest, completed: () -> Unit) {
        write({ repository.createPackage(body) }, "Paquete creado", completed)
    }
    fun updatePackage(clave: String, body: PackageUpdateRequest, completed: () -> Unit) {
        write({ repository.updatePackage(clave, body) }, "Paquete actualizado", completed)
    }
    fun setPackageActive(clave: String, active: Boolean) {
        val msg = if (active) "Paquete reactivado" else "Paquete inactivado"
        write({ repository.setPackageActive(clave, active) }, msg, {})
    }
    fun saveDeliveryProgress(bookingId: Long, stage: String?, galleryUrl: String, photosCount: Int) {
        mutableState.update { current ->
            val prev = current.deliveries[bookingId] ?: DeliveryTracking()
            val updated = prev.copy(
                stageOverride = stage ?: prev.stageOverride,
                galleryUrl = galleryUrl.trim(),
                photosCount = photosCount
            )
            val updatedBookings = current.bookings.map { b ->
                if (b.id == bookingId && updated.stageOverride != null) b.copy(status = updated.stageOverride) else b
            }
            current.copy(
                deliveries = current.deliveries + (bookingId to updated),
                bookings = updatedBookings,
                notice = if (stage == Rules.DELIVERED) "Entrega y galería registradas" else "Progreso de cobertura actualizado"
            )
        }
    }
    fun rejectReceipt(bookingId: Long, reason: String) {
        val cleanReason = reason.trim()
        if (cleanReason.length < 4) {
            mutableState.update { it.copy(error = "Indica el motivo del rechazo para orientar al cliente.") }
            return
        }
        mutableState.update { current ->
            val prev = current.deliveries[bookingId] ?: DeliveryTracking()
            val updated = prev.copy(rejectionReason = cleanReason, stageOverride = Rules.PENDING)
            val updatedBookings = current.bookings.map { b ->
                if (b.id == bookingId) b.copy(status = Rules.PENDING) else b
            }
            current.copy(
                deliveries = current.deliveries + (bookingId to updated),
                bookings = updatedBookings,
                notice = "Comprobante rechazado con motivo registrado"
            )
        }
    }
    fun createBooking(body: BookingRequest, completed: () -> Unit) =
        write({ repository.createBooking(body) }, "Solicitud registrada", completed)
    fun confirm(booking: Booking, amount: String, completed: () -> Unit) {
        if (!Rules.validPayment(amount, booking.total_cents)) {
            mutableState.update { it.copy(error = "El anticipo debe estar entre el 50 % y el 100 %, con hasta dos decimales.") }; return
        }
        write({ repository.confirm(booking.id, Rules.cents(amount)!!) }, "Anticipo confirmado", completed)
    }
    fun cancel(booking: Booking, completed: () -> Unit) =
        write({ repository.cancel(booking.id) }, "Solicitud cancelada", completed)
}
