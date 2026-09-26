package io.github.knigdelioglu.lessonplayer

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.knigdelioglu.lessonplayer.storage.BackupClassGroup
import io.github.knigdelioglu.lessonplayer.storage.BackupClassProgress
import io.github.knigdelioglu.lessonplayer.storage.BackupLessonCustomization
import io.github.knigdelioglu.lessonplayer.storage.BackupMark
import io.github.knigdelioglu.lessonplayer.storage.BackupProgress
import io.github.knigdelioglu.lessonplayer.storage.LessonBackupCodec
import io.github.knigdelioglu.lessonplayer.storage.LessonBackupSnapshot
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import java.nio.charset.StandardCharsets
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

@RunWith(AndroidJUnit4::class)
class LessonBackupCodecTest {
    private val contentSignature = "a".repeat(64)
    private val workflowSignature = "b".repeat(64)
    private val passphrase = "ogretmen-2026".toCharArray()
    private val snapshot = LessonBackupSnapshot(
        schemaVersion = 2,
        classGroups = listOf(
            BackupClassGroup("11A", "2026-2027", 11, "A", "11A", false, 1),
            BackupClassGroup("11B", "2026-2027", 11, "B", "11B", false, 2)
        ),
        classProgress = listOf(
            BackupClassProgress("11A", "TEMA_01_DERS_01", "c".repeat(64), "T01-S1", 100L),
            BackupClassProgress("11B", "TEMA_01_DERS_01", "c".repeat(64), "T01-S2", 200L)
        ),
        lessonCustomizations = listOf(
            BackupLessonCustomization("TEMA_01_DERS_01", "c".repeat(64), "[\"T01-S1\",\"T01-S2\"]", "{\"T01-S1\":{}}", 150L)
        ),
        marks = listOf(BackupMark("2026-2027", "portfolio", "task:1", true))
    )

    @Test
    fun roundTripPreservesUserState() {
        val raw = LessonBackupCodec.encode(
            snapshot, passphrase.copyOf(), contentSignature, workflowSignature
        )
        assertEquals(
            snapshot,
            LessonBackupCodec.decode(
                raw, passphrase.copyOf(), contentSignature, workflowSignature
            )
        )
    }

    @Test
    fun legacyV1BackupDecodesSuccessfully() {
        val salt = ByteArray(16) { 1 }
        val nonce = ByteArray(12) { 2 }
        val iterations = 100_000
        val derived = LessonBackupCodec.derive(passphrase, salt, iterations)
        val v1Payload = JSONObject().apply {
            put("schemaVersion", 1)
            put("progress", JSONArray().apply {
                put(JSONObject()
                    .put("lessonId", "TEMA_01_DERS_01")
                    .put("contentDigest", "c".repeat(64))
                    .put("stepId", "T01-S1")
                    .put("stepOrderJson", "[\"T01-S1\"]")
                    .put("overridesJson", "{\"T01-S1\":{}}"))
            })
            put("marks", JSONArray().apply {
                put(JSONObject()
                    .put("academicYear", "2026-2027")
                    .put("track", "portfolio")
                    .put("itemId", "task:1")
                    .put("checked", true))
            })
        }.toString().toByteArray(StandardCharsets.UTF_8)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(
                Cipher.ENCRYPT_MODE,
                SecretKeySpec(derived.copyOfRange(0, 32), "AES"),
                GCMParameterSpec(128, nonce)
            )
        }
        val ciphertext = cipher.doFinal(v1Payload)
        val encodedCiphertext = LessonBackupCodec.b64(ciphertext)
        val signature = LessonBackupCodec.hmac(
            derived.copyOfRange(32, 64),
            LessonBackupCodec.signatureInput(
                1, contentSignature, workflowSignature, salt, nonce, encodedCiphertext
            )
        )
        val v1Envelope = JSONObject()
            .put("format", LessonBackupCodec.FORMAT)
            .put("schemaVersion", 1)
            .put("project", JSONObject()
                .put("application", "lesson-player-android")
                .put("contentSignature", contentSignature)
                .put("workflowSignature", workflowSignature))
            .put("encryption", JSONObject()
                .put("algorithm", "AES-256-GCM")
                .put("kdf", "PBKDF2WithHmacSHA256")
                .put("iterations", iterations)
                .put("salt", LessonBackupCodec.b64(salt))
                .put("nonce", LessonBackupCodec.b64(nonce))
                .put("keyProvenance", "user-passphrase"))
            .put("ciphertext", encodedCiphertext)
            .put("signature", JSONObject()
                .put("algorithm", "HMAC-SHA256")
                .put("value", LessonBackupCodec.b64(signature)))
            .toString()

        val decoded = LessonBackupCodec.decode(
            v1Envelope, passphrase.copyOf(), contentSignature, workflowSignature
        )
        assertEquals(1, decoded.schemaVersion)
        assertEquals(1, decoded.legacyProgress.size)
        assertEquals("TEMA_01_DERS_01", decoded.legacyProgress.first().lessonId)
        assertEquals(1, decoded.marks.size)
    }

    @Test
    fun wrongPassphraseFailsClosed() {
        val raw = LessonBackupCodec.encode(
            snapshot, passphrase.copyOf(), contentSignature, workflowSignature
        )
        assertThrows(IllegalArgumentException::class.java) {
            LessonBackupCodec.decode(
                raw, "başka-parola".toCharArray(), contentSignature, workflowSignature
            )
        }
    }

    @Test
    fun contentSignatureMismatchDoesNotDecode() {
        val raw = LessonBackupCodec.encode(
            snapshot, passphrase.copyOf(), contentSignature, workflowSignature
        )
        assertThrows(IllegalArgumentException::class.java) {
            LessonBackupCodec.decode(
                raw, passphrase.copyOf(), "d".repeat(64), workflowSignature
            )
        }
    }

    @Test
    fun tamperedCiphertextFailsBeforePlaintextUse() {
        val raw = LessonBackupCodec.encode(
            snapshot, passphrase.copyOf(), contentSignature, workflowSignature
        )
        val envelope = JSONObject(raw)
        val ciphertext = envelope.getString("ciphertext")
        envelope.put("ciphertext", (if (ciphertext.first() == 'A') "B" else "A") +
            ciphertext.drop(1))
        val tampered = envelope.toString()
        assertThrows(IllegalArgumentException::class.java) {
            LessonBackupCodec.decode(
                tampered, passphrase.copyOf(), contentSignature, workflowSignature
            )
        }
    }
}
