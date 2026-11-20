package com.example.fotografia.data

import com.google.gson.JsonParser
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.OkHttpClient
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.io.IOException
import java.util.concurrent.TimeUnit

interface ClientsApi {
    @POST("api/auth/login") suspend fun login(@Body body: LoginRequest): LoginResponse
    @GET("api/auth/me") suspend fun me(): StudioUser
    @GET("api/clientes") suspend fun clients(): List<Client>
    @POST("api/clientes") suspend fun createClient(@Body body: ClientRequest): Client
}
interface BookingsApi {
    @GET("api/paquetes") suspend fun packages(): List<PackageOption>
    @GET("api/reservas") suspend fun bookings(): List<Booking>
    @POST("api/reservas") suspend fun createBooking(@Body body: BookingRequest): Booking
    @POST("api/reservas/{id}/confirmar") suspend fun confirm(@Path("id") id: Long, @Body body: PaymentRequest): BookingChange
    @POST("api/reservas/{id}/cancelar") suspend fun cancel(@Path("id") id: Long): BookingChange
}

class Session {
    @Volatile var token: String? = null
        private set
    private val mutableUser = MutableStateFlow<StudioUser?>(null)
    val user = mutableUser.asStateFlow()
    fun open(response: LoginResponse) { token = response.access_token; mutableUser.value = response.user }
    fun clear() { token = null; mutableUser.value = null }
}

class StudioRepository(val session: Session = Session()) {
    private lateinit var clientsApi: ClientsApi
    private lateinit var bookingsApi: BookingsApi
    fun configure(clientsUrl: String, bookingsUrl: String, allowHttp: Boolean) {
        fun valid(raw: String): String {
            val url = raw.trim().toHttpUrlOrNull() ?: throw IllegalArgumentException("Revisa la dirección del servidor.")
            require(url.username.isEmpty() && url.password.isEmpty() && url.query == null && url.fragment == null) { "Usa una dirección sin credenciales, parámetros ni fragmentos." }
            require(allowHttp || url.isHttps) { "Esta versión requiere una conexión HTTPS." }
            return url.toString().trimEnd('/') + "/"
        }
        val clientsBase = valid(clientsUrl)
        val bookingsBase = valid(bookingsUrl)
        val http = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS)
            .callTimeout(30, TimeUnit.SECONDS).retryOnConnectionFailure(false)
            .followRedirects(false).followSslRedirects(false)
            .addInterceptor { chain ->
                val token = session.token
                val request = chain.request().newBuilder().apply {
                    if (token != null) header("Authorization", "Bearer $token")
                }.build()
                chain.proceed(request)
            }.build()
        fun retrofit(url: String) = Retrofit.Builder().baseUrl(url).client(http)
            .addConverterFactory(GsonConverterFactory.create()).build()
        clientsApi = retrofit(clientsBase).create(ClientsApi::class.java)
        bookingsApi = retrofit(bookingsBase).create(BookingsApi::class.java)
    }
    suspend fun login(email: String, password: String) {
        session.clear()
        val response = clientsApi.login(LoginRequest(email.trim().lowercase(), password))
        require(response.user.role == "Administrador") { "El acceso al estudio requiere una cuenta de administrador." }
        require(response.access_token.isNotBlank()) { "El servidor no devolvió una sesión válida." }
        session.open(response)
        try {
            val verified = clientsApi.me()
            require(verified.role == "Administrador" && verified.id == response.user.id) { "El servidor devolvió una sesión inconsistente." }
            session.open(response.copy(user = verified))
        } catch (e: Exception) { session.clear(); throw e }
    }
    suspend fun clients() = clientsApi.clients()
    suspend fun packages() = bookingsApi.packages()
    suspend fun bookings() = bookingsApi.bookings()
    suspend fun createClient(body: ClientRequest) = clientsApi.createClient(body)
    suspend fun createBooking(body: BookingRequest) = bookingsApi.createBooking(body)
    suspend fun confirm(id: Long, cents: Long) = bookingsApi.confirm(id, PaymentRequest(Rules.amount(cents)))
    suspend fun cancel(id: Long) = bookingsApi.cancel(id)
}

fun errorMessage(error: Throwable, writing: Boolean = false): String {
    if (error is CancellationException) throw error
    if (error is HttpException) {
        return when (error.code()) {
            401 -> "La sesión venció o las credenciales son incorrectas. Vuelve a iniciar sesión."
            403 -> "Tu cuenta no tiene permiso para realizar esta operación."
            404 -> "El registro ya no está disponible. Actualiza la lista."
            400, 409, 422 -> runCatching {
                val detail = JsonParser.parseString(error.response()?.errorBody()?.string()).asJsonObject.get("detail")
                if (detail.isJsonPrimitive) detail.asString else "Revisa los datos del formulario."
            }.getOrDefault("Revisa los datos o actualiza la información antes de continuar.")
            else -> if (writing) "No se pudo confirmar el resultado. Actualiza y revisa el registro antes de repetir la operación." else "El servicio no está disponible. Intenta actualizar en unos momentos."
        }
    }
    if (error is IOException) return if (writing) "Se perdió la respuesta. Actualiza y comprueba si se guardó antes de repetir la operación." else "No se pudo conectar. Revisa el servidor y tu conexión."
    return if (error is IllegalArgumentException) error.message ?: "Revisa los datos." else "No se pudo interpretar la respuesta del servidor."
}
