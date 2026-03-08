package com.lumina.tvplayer

import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView

class MainActivity : AppCompatActivity() {
    private var player: ExoPlayer? = null
    private lateinit var playerView: PlayerView
    private lateinit var urlInput: EditText
    private lateinit var playButton: Button
    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        playerView = findViewById(R.id.player_view)
        urlInput = findViewById(R.id.url_input)
        playButton = findViewById(R.id.play_button)
        statusText = findViewById(R.id.status_text)

        val initialUrl = resolveIncomingUrl(intent?.data, intent?.extras)
        if (!initialUrl.isNullOrBlank()) {
            urlInput.setText(initialUrl)
        }

        playButton.setOnClickListener {
            playCurrentInput()
        }
    }

    override fun onStart() {
        super.onStart()
        if (player == null) {
            setupPlayer()
        }
    }

    override fun onStop() {
        releasePlayer()
        super.onStop()
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        val url = resolveIncomingUrl(intent.data, intent.extras)
        if (!url.isNullOrBlank()) {
            urlInput.setText(url)
            playCurrentInput()
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN && event.keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE) {
            player?.let {
                it.playWhenReady = !it.playWhenReady
                return true
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private fun setupPlayer() {
        player = ExoPlayer.Builder(this).build().also { exo ->
            playerView.player = exo
            exo.repeatMode = Player.REPEAT_MODE_OFF
            exo.playWhenReady = true
            exo.addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(playbackState: Int) {
                    statusText.text = when (playbackState) {
                        Player.STATE_BUFFERING -> getString(R.string.status_buffering)
                        Player.STATE_READY -> getString(R.string.status_ready)
                        Player.STATE_ENDED -> getString(R.string.status_ended)
                        else -> getString(R.string.status_idle)
                    }
                }
            })
        }
    }

    private fun releasePlayer() {
        playerView.player = null
        player?.release()
        player = null
    }

    private fun playCurrentInput() {
        val url = urlInput.text?.toString()?.trim().orEmpty()
        if (url.isBlank()) {
            statusText.text = getString(R.string.status_missing_url)
            return
        }

        val exo = player ?: return
        exo.setMediaItem(MediaItem.fromUri(url))
        exo.prepare()
        exo.playWhenReady = true
    }

    private fun resolveIncomingUrl(data: Uri?, extras: Bundle?): String? {
        val fromQuery = data?.getQueryParameter("url")
        if (!fromQuery.isNullOrBlank()) return fromQuery

        val fromExtra = extras?.getString("stream_url")
        if (!fromExtra.isNullOrBlank()) return fromExtra

        return null
    }
}

