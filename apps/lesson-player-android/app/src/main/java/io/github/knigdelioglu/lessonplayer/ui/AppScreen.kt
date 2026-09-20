package io.github.knigdelioglu.lessonplayer.ui

/** Phase-1 navigation only. The canonical lesson engine arrives in phases 2–3. */
enum class AppScreen(val title: String, val shortLabel: String) {
    LIBRARY("Ders kitablığı", "Dersler"),
    LESSON("Ders ekranı", "Ders"),
    GUIDE("Öğretmen rehberi", "Rehber"),
    SETTINGS("Görünüm ayarları", "Ayarlar")
}

fun backDestination(current: AppScreen): AppScreen = AppScreen.LIBRARY
