# Lumi TV ExoPlayer (Android TV)

Mini app Android TV native avec ExoPlayer pour lire ton stream Lumi sans passer par le navigateur TV.

## Ce que fait cette version
- Lecture video via ExoPlayer (Media3).
- Champ URL + bouton `Lire`.
- Support d'ouverture via intent/deep link:
  - `stream_url` (extra intent)
  - `lumina://play?url=<url_encodee>`
- Cleartext HTTP autorise pour ton LAN (`http://192.168.x.x`).

## Ouvrir dans Android Studio
1. Ouvre le dossier `android-tv-exoplayer`.
2. Laisse Android Studio sync le projet Gradle.
3. Build APK et installe sur la TV.

## Exemple URL a lire
`http://192.168.1.192:3000/download/api/stream?path=C%3A%5C...`

## Lancement via ADB (optionnel)
```bash
adb shell am start \
  -n com.lumina.tvplayer/.MainActivity \
  --es stream_url "http://192.168.1.192:3000/download/api/stream?path=..."
```

