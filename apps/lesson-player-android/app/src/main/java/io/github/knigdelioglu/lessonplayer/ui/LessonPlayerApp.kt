package io.github.knigdelioglu.lessonplayer.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.R
import io.github.knigdelioglu.lessonplayer.content.ContentRepository
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTheme

@Composable
fun LessonPlayerApp() {
    LessonTheme {
        val appContext = LocalContext.current.applicationContext
        var bundle by remember { mutableStateOf<LessonBundle?>(null) }
        var loadError by remember { mutableStateOf<String?>(null) }
        var currentScreen by rememberSaveable { mutableStateOf(AppScreen.LIBRARY) }
        var selectedLessonId by rememberSaveable { mutableStateOf<String?>(null) }
        LaunchedEffect(appContext) {
            try {
                bundle = ContentRepository(appContext).load()
            } catch (error: Exception) {
                loadError = error.message ?: error::class.simpleName ?: "Bilinmeyen hata"
            }
        }
        BackHandler(enabled = currentScreen != AppScreen.LIBRARY) {
            currentScreen = backDestination(currentScreen)
        }
        when {
            loadError != null -> Box(Modifier.fillMaxSize().padding(LessonSpacing.large),
                contentAlignment = Alignment.Center) {
                Text("Ders paketi doğrulanamadı: $loadError",
                    color = MaterialTheme.colorScheme.error)
            }
            bundle == null -> Box(Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center) { Text("Dersler doğrulanıyor…") }
            else -> LessonPlayerShell(
                currentScreen = currentScreen, bundle = bundle!!,
                selectedLessonId = selectedLessonId,
                navigate = { currentScreen = it },
                selectLesson = {
                    selectedLessonId = it
                    currentScreen = AppScreen.LESSON
                }
            )
        }
    }
}

@Composable
internal fun LessonPlayerShell(
    currentScreen: AppScreen,
    bundle: LessonBundle,
    selectedLessonId: String?,
    navigate: (AppScreen) -> Unit,
    selectLesson: (String) -> Unit
) {
    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val wide = maxWidth >= 840.dp
        Scaffold(
            contentWindowInsets = WindowInsets.safeDrawing,
            containerColor = MaterialTheme.colorScheme.background,
            topBar = {
                Row(
                    modifier = Modifier.fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .heightIn(min = 76.dp)
                        .padding(horizontal = LessonSpacing.large, vertical = LessonSpacing.small),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("ÖĞRETMEN REHBERİ", style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.secondary)
                        Text(currentScreen.title, style = MaterialTheme.typography.titleLarge)
                    }
                    Text("11. SINIF", style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.secondary)
                }
            },
            bottomBar = {
                if (!wide) {
                    NavigationBar {
                        AppScreen.entries.forEach { destination ->
                            NavigationBarItem(
                                selected = currentScreen == destination,
                                onClick = { navigate(destination) },
                                icon = { AppNavigationIcon(destination) },
                                label = { Text(destination.shortLabel) },
                                alwaysShowLabel = true
                            )
                        }
                    }
                }
            }
        ) { safePadding ->
            Row(
                modifier = Modifier.fillMaxSize().padding(safePadding),
                verticalAlignment = Alignment.Top
            ) {
                if (wide) {
                    NavigationRail {
                        AppScreen.entries.forEach { destination ->
                            NavigationRailItem(
                                selected = currentScreen == destination,
                                onClick = { navigate(destination) },
                                icon = { AppNavigationIcon(destination) },
                                label = { Text(destination.shortLabel) },
                                alwaysShowLabel = true
                            )
                        }
                    }
                }
                Box(modifier = Modifier.weight(1f).fillMaxSize()) {
                    PhaseOneScreen(currentScreen, bundle, selectedLessonId, selectLesson)
                }
            }
        }
    }
}

@Composable
private fun AppNavigationIcon(destination: AppScreen) {
    val icon = when (destination) {
        AppScreen.LIBRARY -> R.drawable.ic_library
        AppScreen.LESSON -> R.drawable.ic_lesson
        AppScreen.GUIDE -> R.drawable.ic_guide
        AppScreen.SETTINGS -> R.drawable.ic_settings
    }
    Icon(painter = painterResource(icon), contentDescription = null)
}
