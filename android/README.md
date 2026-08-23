# Docigo — Android wrapper

Thin native Android app that hosts `https://docigo.net` in a WebView so
Docigo can be installed as a real Android app on any phone or tablet
(Android 8.0 / API 26 and above).

## Downloading the APK (no build needed)

Every push to `main` that touches `android/**` — plus every tag that
starts with `v` — triggers the **Android APK** workflow in GitHub
Actions. It produces `docigo.apk` two ways:

1. **Latest build (any push):** Actions tab → the run → **Artifacts**
   → `docigo-apk` (zip containing `docigo.apk`).
2. **Tagged release:** the workflow attaches `docigo.apk` directly to a
   GitHub Release named after the tag. Anyone can download from the
   Releases page without a GitHub login.

To cut a release: `git tag v1.0 && git push origin v1.0`.

## Installing on a phone

The APK the workflow produces is a **debug build** (signed with the
Android debug key). Debug APKs install fine on any device; they're just
not eligible for the Play Store.

1. Download `docigo.apk` to your phone (email it, put it in Drive, or
   scan a QR code that points at the Release URL).
2. Tap the APK to open. Android will ask permission to install apps
   from this source (Settings → Apps → Special access → Install unknown
   apps → allow the browser or file manager you used).
3. Tap Install. Docigo appears in your app drawer with a blue "D" icon.

## Features mirrored from the iOS wrapper

- Loads `https://docigo.net` full-screen with the app's dark background
  behind the status bar / nav bar (no white flash on load).
- Persistent cookies + `localStorage` so the Supabase session survives
  restarts.
- Pull-to-refresh anywhere in the app.
- Native file picker + camera permission grant for uploads.
- Hardware back button navigates the WebView history first, exits the
  app when there's nothing left to go back to.
- External links (anywhere off `docigo.net` / Supabase storage) open in
  the system default browser instead of hijacking the WebView.

## Building locally

Requires:

- JDK 17 (Temurin recommended)
- Android SDK with `platforms;android-34` and `build-tools;34.0.0`
- Gradle 8.10+ (or use the GitHub Actions workflow which handles this)

```bash
cd android
gradle :app:assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected device with:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Pointing at a different URL

Edit `APP_URL` in
`app/src/main/java/net/docigo/app/MainActivity.kt` and rebuild.

## Signed release builds (later, if you want Play Store)

The debug build is fine for sideloading. To ship a signed release APK:

1. Generate a keystore (`keytool -genkey -v -keystore …`).
2. Store the keystore + passwords as GitHub secrets.
3. Add a `signingConfigs { release { … } }` block to
   `app/build.gradle.kts` that reads those secrets from env vars.
4. Change the workflow's `assembleDebug` to `assembleRelease` and add a
   `bundleRelease` step for the AAB Play Store requires.

Ping me when you're ready to do that and I'll wire it up.
