package expo.modules.appblocker

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Log
import java.util.concurrent.Executors
import kotlin.math.PI
import kotlin.math.sin

/**
 * Lightweight PCM sine-wave chime synthesizer with smooth fade envelopes.
 * Requires zero bundled audio assets and respects Hourglass's sound toggle.
 */
object SoundFeedbackManager {
    private const val TAG = "SoundFeedbackManager"
    private const val SAMPLE_RATE = 22050
    private val audioExecutor = Executors.newSingleThreadExecutor()

    fun play(context: Context, type: String) {
        if (!BlockerStorage.isSoundEnabled(context)) return

        audioExecutor.execute {
            try {
                when (type) {
                    "warning" -> {
                        playTone(523.25, 110, 0.25)
                        Thread.sleep(35)
                        playTone(659.25, 150, 0.28)
                    }
                    "lock" -> {
                        playTone(440.0, 140, 0.28)
                        Thread.sleep(40)
                        playTone(329.63, 240, 0.26)
                    }
                    "extension" -> {
                        playTone(587.33, 100, 0.26)
                        Thread.sleep(30)
                        playTone(783.99, 190, 0.30)
                    }
                    "breathe" -> {
                        playTone(392.0, 320, 0.22)
                    }
                    "success" -> {
                        playTone(659.25, 90, 0.25)
                        Thread.sleep(25)
                        playTone(880.0, 160, 0.28)
                    }
                    "error" -> {
                        playTone(196.0, 140, 0.24)
                    }
                    else -> {
                        playTone(587.33, 140, 0.24)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Unable to play sound cue $type", e)
            }
        }
    }

    private fun playTone(freqHz: Double, durationMs: Int, amplitude: Double) {
        val numSamples = (SAMPLE_RATE * durationMs) / 1000
        if (numSamples <= 0) return

        val samples = ShortArray(numSamples)
        val fadeSamples = minOf(numSamples / 4, (SAMPLE_RATE * 18) / 1000).coerceAtLeast(1)

        for (i in 0 until numSamples) {
            val angle = 2.0 * PI * i * freqHz / SAMPLE_RATE
            // Fundamental + soft octave harmonic for warm marimba-like chime
            val raw = (sin(angle) * 0.85) + (sin(angle * 2.0) * 0.15)
            val env = when {
                i < fadeSamples -> i.toDouble() / fadeSamples
                i > numSamples - fadeSamples -> (numSamples - i).toDouble() / fadeSamples
                else -> 1.0
            }
            samples[i] = (raw * amplitude * env * Short.MAX_VALUE).toInt()
                .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
                .toShort()
        }

        val minBuf = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufferBytes = maxOf(minBuf, samples.size * 2)

        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setTransferMode(AudioTrack.MODE_STATIC)
            .setBufferSizeInBytes(bufferBytes)
            .build()

        track.write(samples, 0, samples.size)
        track.play()
        Thread.sleep((durationMs + 25).toLong())
        track.stop()
        track.release()
    }
}
