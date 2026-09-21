plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Avoid java.util.Properties — Flutter's Gradle DSL shadows the `java` package name.
fun readKeyedValue(file: java.io.File, key: String): String? {
    if (!file.exists()) return null
    for (raw in file.readLines()) {
        val line = raw.trim()
        if (line.isEmpty() || line.startsWith("#")) continue
        if (!line.startsWith("$key=")) continue
        var value = line.substringAfter("=").trim()
        if ((value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.substring(1, value.length - 1)
        }
        if (value.isNotEmpty()) return value
    }
    return null
}

fun resolveGoogleMapsApiKey(): String {
    val fromLocal = readKeyedValue(rootProject.file("local.properties"), "GOOGLE_MAPS_API_KEY")
    if (!fromLocal.isNullOrBlank()) return fromLocal
    val files =
        listOf(
            rootProject.file("../.env"),
            rootProject.file("../assets/app.env"),
            rootProject.file("../../.env"),
        )
    for (file in files) {
        val value =
            readKeyedValue(file, "GOOGLE_MAPS_API_KEY")
                ?: readKeyedValue(file, "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
        if (!value.isNullOrBlank()) return value
    }
    return ""
}

val mapsApiKey: String = resolveGoogleMapsApiKey()
if (mapsApiKey.isNotEmpty()) {
    try {
        val iosSecrets = rootProject.file("../ios/Flutter/MapsSecrets.xcconfig")
        iosSecrets.parentFile.mkdirs()
        iosSecrets.writeText("GOOGLE_MAPS_API_KEY=$mapsApiKey\n")
    } catch (_: Exception) {
    }
}

android {
    namespace = "ug.mygarage.services"
    // Must match or exceed plugins such as permission_handler_android (API 37).
    compileSdk = 37
    ndkVersion = flutter.ndkVersion

    compileOptions {
        // Required by flutter_local_notifications (and related plugins).
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "ug.mygarage.services"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] = mapsApiKey
    }

    buildTypes {
        release {
            // Debug signing for local install testing. Replace before Play Store release.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

flutter {
    source = "../.."
}
