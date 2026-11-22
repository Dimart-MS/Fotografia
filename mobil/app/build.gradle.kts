import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

val localProps = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.isFile) file.inputStream().use(::load)
}
val studioApiUrl = providers.gradleProperty("studioApiUrl").orElse("")
val studioClientsUrl = providers.gradleProperty("studioClientsUrl").orElse(studioApiUrl).get()
val studioBookingsUrl = providers.gradleProperty("studioBookingsUrl").orElse(studioApiUrl).get()
val studioPlacesApiKey = providers.gradleProperty("studioPlacesApiKey")
    .orElse(providers.environmentVariable("STUDIO_PLACES_API_KEY"))
    .orElse(localProps.getProperty("studioPlacesApiKey", "")).get()
fun asConfigString(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "com.example.fotografia"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.fotografia"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        buildConfigField("String", "CLIENTS_BASE_URL", asConfigString(studioClientsUrl))
        buildConfigField("String", "BOOKINGS_BASE_URL", asConfigString(studioBookingsUrl))
        buildConfigField("String", "PLACES_API_KEY", asConfigString(studioPlacesApiKey))

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.navigation:navigation-compose:2.8.9")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("androidx.compose.material:material-icons-extended")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")


    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
// Las direcciones de producción se proporcionan al compilar, no desde el login.
tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    doFirst {
        require(studioClientsUrl.startsWith("https://") && studioBookingsUrl.startsWith("https://")) {
            "Configura studioApiUrl con la URL HTTPS del backend para generar release."
        }
    }
}
