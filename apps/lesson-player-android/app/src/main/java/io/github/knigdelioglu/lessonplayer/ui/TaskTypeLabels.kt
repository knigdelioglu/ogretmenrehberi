package io.github.knigdelioglu.lessonplayer.ui

import java.util.Locale

private val taskTypeLabels = mapOf(
    "QUESTION" to "SORU",
    "TABLE" to "ÇALIŞMA",
    "PROCESS" to "SÜREÇ",
    "REFERENCE" to "BİLGİ",
    "ACTIVITY" to "ETKİNLİK",
    "PERFORMANCE" to "UYGULAMA",
    "ASSESSMENT" to "DEĞERLENDİRME",
    "COMPARISON" to "KARŞILAŞTIRMA",
    "VOCABULARY" to "SÖZ VARLIĞI"
)

internal fun lessonTaskTypeLabel(taskType: String): String =
    taskTypeLabels[taskType.trim().uppercase(Locale.ROOT)] ?: "DİĞER"
