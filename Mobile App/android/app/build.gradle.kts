plugins {
    id("com.android.application")
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
    namespace = "ug.mygarage.mygarage_buyer"
    // Pin to a fully installed SDK platform. Plugins may request 37; android-37 can fail
    // AGP resolution on some Windows SDKs (ApiLevel "37.0"). 36 is present and complete.
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "ug.mygarage.app"
        minSdk = flutter.minSdkVersion
        targetSdk = 36
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] = mapsApiKey
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
