plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Avoid java.util.Properties — Flutter's Gradle DSL shadows the `java` package name.
val mapsApiKey: String =
    rootProject
        .file("local.properties")
        .takeIf { it.exists() }
        ?.readLines()
        ?.firstOrNull { it.startsWith("GOOGLE_MAPS_API_KEY=") }
        ?.substringAfter("=")
        ?.trim()
        .orEmpty()

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
