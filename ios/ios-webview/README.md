# Docigo — WKWebView wrapper

Native iOS shell that hosts the live Docigo web app inside a `WKWebView`.

## Setup

1. Open this folder in Xcode 15 or later (`File → Open…`, pick `Docigo.xcodeproj`). If you don't see a project file, create a new SwiftUI iOS app in Xcode named `Docigo`, then drag the files in `Sources/` into the project.
2. Make sure the **Bundle Identifier** is unique (e.g. `com.yourname.docigo`).
3. Set the deployment target to iOS 16.0 or later (the web app uses modern browser APIs).
4. Build & run — the wrapper points at `https://docigo.onrender.com` by default. Edit `WebView.swift` if your live URL is different.

## What's included

- **`DocigoApp.swift`** — App entry, sets up the WebView at the safe-area-respecting full screen.
- **`ContentView.swift`** — Container view, applies the dark background that matches Docigo's theme.
- **`WebView.swift`** — `UIViewRepresentable` wrapping `WKWebView`. Configured for:
  - Local file picker / camera access (file `<input type="file">` works).
  - Pull-to-refresh.
  - Persistent cookies + localStorage (for staying signed in).
  - Inline media playback.
  - The viewport uses iOS safe areas via `viewport-fit=cover` already in the web app's `index.html`.
- **`Info.plist`** — adds the camera / photo library / microphone usage descriptions Apple requires when WKWebView's media-capture is enabled. Customize the prompts to match your App Store submission.

## App Store notes

Apple guideline 4.2 says wrapped websites are fine when the app provides "additional functionality." This wrapper adds:
- Native file picker bridge.
- iOS share sheet integration when you tap a downloaded file.
- Pull-to-refresh.
- Persistent session across app launches.

These are normally enough. If review pushes back, two common follow-ups: ship a real native splash screen, or add a small native settings page. Both are easy.
