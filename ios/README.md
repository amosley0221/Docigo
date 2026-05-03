# Docigo on iOS

Two starting points for shipping Docigo on the App Store. Pick one — they're not meant to be combined.

## Option A — WKWebView wrapper (`ios-webview/`)

A native iOS app that hosts the existing Docigo web app inside a `WKWebView`. The web bundle is loaded from the live URL (or you can ship a snapshot in-bundle), so every feature you've built keeps working without porting work.

Pros
- Smallest possible code surface (~50 lines of Swift).
- All viewers, drag/drop, paste, search, sync, conversion service — all already work because it's the same JS.
- Updates to the web app reach iPad/iPhone immediately on next launch (no App Store re-submission for app changes).

Cons
- Counts as a "web wrapper" under App Store review guideline 4.2; Apple expects some native value beyond just the website. The wrapper here adds native file picking, share sheet integration, and pull-to-refresh, which usually clears review.
- No push notifications, Siri, or Widgets unless you build them on top.
- App size is nearly empty (the JS lives on the server).

Open the project at `ios-webview/Docigo.xcodeproj` and run it.

## Option B — SwiftUI native rewrite (`ios-native/`)

A SwiftUI starter that talks directly to your Supabase project (auth + Postgres + Storage). Provides the auth screen, workspace shell, locations list, basic file/quote viewers — enough to build on.

Pros
- Fully native UI: instant taps, real iOS gestures, system look-and-feel.
- Easy path to widgets, push, share extensions, Apple Pencil, etc.
- App Store review is straightforward.

Cons
- Significant work to reach feature parity. You'll still need to port: spreadsheet rendering, Word rendering, chart editing, checklists, search index, drag-to-reorder, file uploading + the conversion flow, mobile-specific drop affordances, and so on.
- Two codebases to keep in sync going forward.

The starter uses [supabase-swift](https://github.com/supabase/supabase-swift) as a Swift Package dependency and assumes the same Supabase project URL + publishable key as the web app.

Open the project at `ios-native/Docigo.xcodeproj` (or import the `Sources/` files into a new SwiftUI project; both folders include a setup README).

## My recommendation

Ship the WebView wrapper first — you keep all your work and have an App Store build in a day. If Apple pushes back on guideline 4.2 (rare but possible), you have a working app while you build out the native version on the side.
