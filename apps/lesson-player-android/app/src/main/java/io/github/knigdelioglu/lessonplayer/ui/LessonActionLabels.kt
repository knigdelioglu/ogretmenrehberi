package io.github.knigdelioglu.lessonplayer.ui

import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.player.LessonSession

internal fun revealLayerLabel(key: RevealKey): String = when (key) {
    RevealKey.GUIDANCE -> "Yönlendirme"
    RevealKey.ANSWER -> "Cevap"
    RevealKey.EVIDENCE -> "Metinden kanıt"
    RevealKey.EXPLANATION -> "Açıklama"
    RevealKey.NOTE -> "Öğretmen notu"
}

internal fun nextLessonActionLabel(step: LessonStep, state: LessonSession): String {
    val nextReveal = step.revealOrder.firstOrNull { it !in state.revealed }
    return when {
        nextReveal != null -> "Göster: ${revealLayerLabel(nextReveal)}"
        state.order.indexOf(state.stepId) < state.order.lastIndex -> "Sonraki adıma geç"
        else -> "Ders tamamlandı"
    }
}
