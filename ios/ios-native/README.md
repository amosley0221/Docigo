# Docigo — SwiftUI native starter

A SwiftUI app that talks directly to your Supabase project (auth + Postgres + Storage), giving you a real native iOS experience. The starter implements:

- Sign in / sign up against Supabase Auth.
- Fetching locations, groups, and items from Postgres with the same RLS-protected schema.
- A two-pane workspace: locations sidebar + group / item list.
- Basic viewers for PDFs, images, and plain text.
- File upload via the iOS document picker, streaming the file to Supabase Storage.
- Sign out.

## Setup

1. Open Xcode, **File → New → Project → iOS → App**, name it `Docigo`, language **Swift**, interface **SwiftUI**, storage **None**. Save next to this folder.
2. Drag the `Sources/` folder from this repo into the new project (target = the `Docigo` app, copy if needed).
3. **File → Add Package Dependencies…** and add `https://github.com/supabase/supabase-swift` — pin to the latest 2.x release. Add the `Supabase` library to the app target.
4. Open `Sources/Config.swift` and paste your Supabase URL and **publishable** key (the same values used by the web app).
5. Set the deployment target to iOS 16.0+. Build & run.

## What's included

```
Sources/
  Config.swift                        — Supabase URL + publishable key
  DocigoApp.swift                     — App entry, AuthGate routing
  Models/
    Location.swift, Group.swift, Item.swift
  Services/
    SupabaseClientProvider.swift      — shared SupabaseClient
    AuthStore.swift                   — session state (ObservableObject)
    WorkspaceStore.swift              — locations / groups / items load + cache
    StorageService.swift              — upload / download / signed URLs
  Views/
    AuthView.swift                    — sign in + sign up form
    WorkspaceView.swift               — root navigation after sign-in
    LocationListView.swift            — sidebar
    GroupListView.swift               — groups within a location
    ItemListView.swift                — items within a group
    Viewers/
      PDFViewerView.swift             — PDFKit + signed URL
      ImageViewerView.swift           — AsyncImage + signed URL
      TextViewerView.swift            — fetch + render UTF-8 text
      UnknownViewerView.swift         — download / share fallback
  Components/
    UploadButton.swift                — DocumentPicker bridge
```

## What's missing (intentional)

The starter keeps scope tight. To reach feature parity with the web app you'll add:

- Spreadsheet / Word / PowerPoint viewers. Easiest paths:
  - Spreadsheets: parse with [`CoreXLSX`](https://github.com/CoreOffice/CoreXLSX) or render the same SheetJS via a tiny embedded WKWebView.
  - Word docs: use `NSAttributedString(data:options:documentAttributes:)` with `.docFormat` / `.openXMLFormat`, or call your existing convert service to PDF and use PDFKit.
  - PowerPoint: call your existing `docigo-convert` service, render the resulting PDF with PDFKit (this is the cleanest reuse).
- Quote / checklist / chart editing UI.
- Drag-and-drop reordering (use `.onDrag` / `.onDrop` modifiers).
- Search, filters, item rename / delete, etc.
- Push notifications, share extension.

The pieces in the starter are intentionally small so you can extend them without untangling layers.

## Notes on auth + sessions

- `SupabaseClientProvider` constructs a single `SupabaseClient` with the publishable key. Sessions are persisted automatically by the SDK (Keychain-backed on iOS).
- `AuthStore` listens for auth state changes and publishes a `currentUser` to `WorkspaceView`.
- The "Keep me signed in" toggle from the web app isn't needed — iOS Keychain persists sessions across launches by default. If you want a per-session opt-out, sign out on `applicationDidEnterBackground` for users who toggled it off.
