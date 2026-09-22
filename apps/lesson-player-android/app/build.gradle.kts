plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

val lessonContentBaseUrl = providers.gradleProperty("lessonContentBaseUrl")
    .orElse("https://raw.githubusercontent.com/knigdelioglu/ogretmenrehberi/main/apps/lesson-player-android/remote-content")
    .get()

android {
    namespace = "io.github.knigdelioglu.lessonplayer"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.knigdelioglu.lessonplayer"
        minSdk = 36
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "LESSON_CONTENT_BASE_URL", "\"$lessonContentBaseUrl\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.foundation)
    implementation("androidx.compose.animation:animation")
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui.tooling.preview)

    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)

    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.room.testing)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.ext.junit)
}

 
// Generate assets from the *same validated data as web* before any APK build.
val prepareLessonAssets = tasks.register<Exec>("prepareLessonAssets") {
    workingDir = rootProject.projectDir
    commandLine("node",
        rootProject.projectDir.resolve("../lesson-player/scripts/package-android-data.mjs"))
}
tasks.named("preBuild") { dependsOn(prepareLessonAssets) }
tasks.matching { it.name.startsWith("merge") && it.name.endsWith("Assets") }
    .configureEach { dependsOn(prepareLessonAssets) }

// Persist the Room schema for explicit versioned migrations in later releases.
ksp { arg("room.schemaLocation", "$projectDir/schemas") }
