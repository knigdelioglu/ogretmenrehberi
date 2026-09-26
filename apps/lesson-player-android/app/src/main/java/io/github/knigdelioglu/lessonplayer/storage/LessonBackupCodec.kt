package io.github.knigdelioglu.lessonplayer.storage

import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Backward-compatible model for legacy v1 backup progress records.
 */
data class BackupProgress(
    val lessonId: String,
    val contentDigest: String,
    val stepId: String,
    val stepOrderJson: String,
    val overridesJson: String
)

data class BackupClassGroup(
    val id: String,
    val academicYear: String,
    val grade: Int,
    val section: String,
    val displayName: String,
    val archived: Boolean = false,
    val sortOrder: Int = 0
)

data class BackupClassProgress(
    val classGroupId: String,
    val lessonId: String,
    val contentDigest: String,
    val stepId: String,
    val updatedAtMillis: Long
)

data class BackupLessonCustomization(
    val lessonId: String,
    val contentDigest: String,
    val stepOrderJson: String,
    val overridesJson: String,
    val updatedAtMillis: Long
)

data class BackupMark(
    val academicYear: String,
    val track: String,
    val itemId: String,
    val checked: Boolean
)

data class LessonBackupSnapshot(
    val schemaVersion: Int = 2,
    val classGroups: List<BackupClassGroup> = emptyList(),
    val classProgress: List<BackupClassProgress> = emptyList(),
    val lessonCustomizations: List<BackupLessonCustomization> = emptyList(),
    val marks: List<BackupMark> = emptyList(),
    val legacyProgress: List<BackupProgress> = emptyList()
)

object LessonBackupCodec {
    const val FORMAT = "ogretmenrehberi.lesson-player.backup"
    const val SCHEMA_VERSION = 2
    private const val KDF = "PBKDF2WithHmacSHA256"
    private const val ENCRYPTION = "AES-256-GCM"
    private const val SIGNATURE = "HMAC-SHA256"
    private const val ITERATIONS = 120_000
    private const val SALT_BYTES = 16
    private const val NONCE_BYTES = 12
    private const val DERIVED_BYTES = 64
    private const val MIN_PASSPHRASE_LENGTH = 8
    private val random = SecureRandom()

    fun encode(
        snapshot: LessonBackupSnapshot,
        passphrase: CharArray,
        contentSignature: String,
        workflowSignature: String
    ): String {
        validatePassphrase(passphrase)
        require(contentSignature.matches(Regex("[0-9a-f]{64}")))
        require(workflowSignature.matches(Regex("[0-9a-f]{64}")))
        val salt = ByteArray(SALT_BYTES).also(random::nextBytes)
        val nonce = ByteArray(NONCE_BYTES).also(random::nextBytes)
        val derived = derive(passphrase, salt, ITERATIONS)
        val payload = payloadJson(snapshot).toString().toByteArray(StandardCharsets.UTF_8)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.ENCRYPT_MODE, SecretKeySpec(derived.copyOfRange(0, 32), "AES"),
                GCMParameterSpec(128, nonce))
        }
        val ciphertext = cipher.doFinal(payload)
        val encodedCiphertext = b64(ciphertext)
        val signature = hmac(derived.copyOfRange(32, DERIVED_BYTES), signatureInput(
            SCHEMA_VERSION, contentSignature, workflowSignature, salt, nonce, encodedCiphertext
        ))
        val envelope = JSONObject()
            .put("format", FORMAT)
            .put("schemaVersion", SCHEMA_VERSION)
            .put("project", JSONObject()
                .put("application", "lesson-player-android")
                .put("contentSignature", contentSignature)
                .put("workflowSignature", workflowSignature))
            .put("encryption", JSONObject()
                .put("algorithm", ENCRYPTION)
                .put("kdf", KDF)
                .put("iterations", ITERATIONS)
                .put("salt", b64(salt))
                .put("nonce", b64(nonce))
                .put("keyProvenance", "user-passphrase"))
            .put("ciphertext", encodedCiphertext)
            .put("signature", JSONObject()
                .put("algorithm", SIGNATURE)
                .put("value", b64(signature)))
        return envelope.toString()
    }

    fun decode(
        raw: String,
        passphrase: CharArray,
        expectedContentSignature: String,
        expectedWorkflowSignature: String
    ): LessonBackupSnapshot {
        validatePassphrase(passphrase)
        val envelope = JSONObject(raw)
        require(envelope.getString("format") == FORMAT) { "Geçersiz yedek formatı" }
        val envelopeVersion = envelope.getInt("schemaVersion")
        require(envelopeVersion in 1..2) {
            "Desteklenmeyen yedek şeması: $envelopeVersion"
        }
        val project = envelope.getJSONObject("project")
        require(project.getString("application") == "lesson-player-android")
        require(project.getString("contentSignature") == expectedContentSignature) {
            "Ders içeriği bu yedekle uyumlu değil"
        }
        require(project.getString("workflowSignature") == expectedWorkflowSignature) {
            "Öğretmen rehberi bu yedekle uyumlu değil"
        }
        val encryption = envelope.getJSONObject("encryption")
        require(encryption.getString("algorithm") == ENCRYPTION)
        require(encryption.getString("kdf") == KDF)
        require(encryption.getString("keyProvenance") == "user-passphrase")
        val iterations = encryption.getInt("iterations")
        require(iterations in 100_000..500_000)
        val salt = decodeB64(encryption.getString("salt"), SALT_BYTES)
        val nonce = decodeB64(encryption.getString("nonce"), NONCE_BYTES)
        val ciphertext = envelope.getString("ciphertext")
        require(ciphertext.isNotBlank())
        val derived = derive(passphrase, salt, iterations)
        val expectedSignature = hmac(derived.copyOfRange(32, DERIVED_BYTES), signatureInput(
            envelopeVersion, expectedContentSignature, expectedWorkflowSignature, salt, nonce, ciphertext
        ))
        val signature = envelope.getJSONObject("signature")
        require(signature.getString("algorithm") == SIGNATURE)
        val suppliedSignature = decodeB64(signature.getString("value"), 32)
        require(MessageDigest.isEqual(expectedSignature, suppliedSignature)) {
            "Yedek bütünlük doğrulaması başarısız"
        }
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
                init(Cipher.DECRYPT_MODE, SecretKeySpec(derived.copyOfRange(0, 32), "AES"),
                    GCMParameterSpec(128, nonce))
            }
            readPayload(String(cipher.doFinal(decodeB64(ciphertext)), StandardCharsets.UTF_8))
        } catch (error: Exception) {
            throw IllegalArgumentException("Yedek şifresi veya içeriği geçersiz", error)
        }
    }

    private fun payloadJson(snapshot: LessonBackupSnapshot): JSONObject = JSONObject().apply {
        put("schemaVersion", SCHEMA_VERSION)
        put("classGroups", JSONArray().apply {
            snapshot.classGroups.forEach {
                put(JSONObject()
                    .put("id", it.id)
                    .put("academicYear", it.academicYear)
                    .put("grade", it.grade)
                    .put("section", it.section)
                    .put("displayName", it.displayName)
                    .put("archived", it.archived)
                    .put("sortOrder", it.sortOrder))
            }
        })
        put("classProgress", JSONArray().apply {
            snapshot.classProgress.forEach {
                put(JSONObject()
                    .put("classGroupId", it.classGroupId)
                    .put("lessonId", it.lessonId)
                    .put("contentDigest", it.contentDigest)
                    .put("stepId", it.stepId)
                    .put("updatedAtMillis", it.updatedAtMillis))
            }
        })
        put("lessonCustomizations", JSONArray().apply {
            snapshot.lessonCustomizations.forEach {
                put(JSONObject()
                    .put("lessonId", it.lessonId)
                    .put("contentDigest", it.contentDigest)
                    .put("stepOrderJson", it.stepOrderJson)
                    .put("overridesJson", it.overridesJson)
                    .put("updatedAtMillis", it.updatedAtMillis))
            }
        })
        put("marks", JSONArray().apply {
            snapshot.marks.forEach {
                put(JSONObject()
                    .put("academicYear", it.academicYear)
                    .put("track", it.track)
                    .put("itemId", it.itemId)
                    .put("checked", it.checked))
            }
        })
    }

    private fun readPayload(raw: String): LessonBackupSnapshot {
        val payload = JSONObject(raw)
        val version = payload.optInt("schemaVersion", 1)
        return if (version == 1) {
            val legacy = payload.getJSONArray("progress").let { array ->
                (0 until array.length()).map { index ->
                    val item = array.getJSONObject(index)
                    BackupProgress(
                        lessonId = item.getString("lessonId"),
                        contentDigest = item.getString("contentDigest"),
                        stepId = item.getString("stepId"),
                        stepOrderJson = item.getString("stepOrderJson"),
                        overridesJson = item.getString("overridesJson")
                    )
                }
            }
            val marks = readMarks(payload.getJSONArray("marks"))
            LessonBackupSnapshot(
                schemaVersion = 1,
                legacyProgress = legacy,
                marks = marks
            )
        } else {
            val groups = payload.optJSONArray("classGroups")?.let { array ->
                (0 until array.length()).map { index ->
                    val item = array.getJSONObject(index)
                    BackupClassGroup(
                        id = item.getString("id"),
                        academicYear = item.getString("academicYear"),
                        grade = item.getInt("grade"),
                        section = item.getString("section"),
                        displayName = item.getString("displayName"),
                        archived = item.optBoolean("archived", false),
                        sortOrder = item.optInt("sortOrder", 0)
                    )
                }
            }.orEmpty()
            val classProgress = payload.optJSONArray("classProgress")?.let { array ->
                (0 until array.length()).map { index ->
                    val item = array.getJSONObject(index)
                    BackupClassProgress(
                        classGroupId = item.getString("classGroupId"),
                        lessonId = item.getString("lessonId"),
                        contentDigest = item.getString("contentDigest"),
                        stepId = item.getString("stepId"),
                        updatedAtMillis = item.optLong("updatedAtMillis", System.currentTimeMillis())
                    )
                }
            }.orEmpty()
            val customizations = payload.optJSONArray("lessonCustomizations")?.let { array ->
                (0 until array.length()).map { index ->
                    val item = array.getJSONObject(index)
                    BackupLessonCustomization(
                        lessonId = item.getString("lessonId"),
                        contentDigest = item.getString("contentDigest"),
                        stepOrderJson = item.getString("stepOrderJson"),
                        overridesJson = item.getString("overridesJson"),
                        updatedAtMillis = item.optLong("updatedAtMillis", System.currentTimeMillis())
                    )
                }
            }.orEmpty()
            val marks = readMarks(payload.getJSONArray("marks"))
            LessonBackupSnapshot(
                schemaVersion = 2,
                classGroups = groups,
                classProgress = classProgress,
                lessonCustomizations = customizations,
                marks = marks
            )
        }
    }

    private fun readMarks(array: JSONArray): List<BackupMark> =
        (0 until array.length()).map { index ->
            val item = array.getJSONObject(index)
            BackupMark(
                academicYear = item.getString("academicYear"),
                track = item.getString("track"),
                itemId = item.getString("itemId"),
                checked = item.getBoolean("checked")
            )
        }

    internal fun signatureInput(
        schemaVersion: Int,
        contentSignature: String,
        workflowSignature: String,
        salt: ByteArray,
        nonce: ByteArray,
        ciphertext: String
    ): ByteArray = listOf(
        FORMAT, schemaVersion.toString(), contentSignature, workflowSignature,
        b64(salt), b64(nonce), ciphertext
    ).joinToString("|").toByteArray(StandardCharsets.UTF_8)

    internal fun derive(passphrase: CharArray, salt: ByteArray, iterations: Int): ByteArray {
        val spec = PBEKeySpec(passphrase, salt, iterations, DERIVED_BYTES * 8)
        return try {
            SecretKeyFactory.getInstance(KDF).generateSecret(spec).encoded
        } finally {
            spec.clearPassword()
        }
    }

    internal fun hmac(key: ByteArray, value: ByteArray): ByteArray =
        Mac.getInstance("HmacSHA256").run {
            init(SecretKeySpec(key, "HmacSHA256"))
            doFinal(value)
        }

    private fun validatePassphrase(passphrase: CharArray) {
        require(passphrase.size >= MIN_PASSPHRASE_LENGTH) {
            "Yedek parolası en az 8 karakter olmalı"
        }
    }

    internal fun b64(value: ByteArray): String = Base64.getEncoder().encodeToString(value)

    private fun decodeB64(value: String, expectedBytes: Int? = null): ByteArray =
        try {
            Base64.getDecoder().decode(value).also {
                expectedBytes?.let { expected -> require(it.size == expected) }
            }
        } catch (error: Exception) {
            throw IllegalArgumentException("Yedek kodlaması geçersiz", error)
        }
}
