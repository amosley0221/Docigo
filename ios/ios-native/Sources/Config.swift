import Foundation

/// Supabase project credentials. Use the same values from the web app's
/// `.env` (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). The
/// publishable key is a public token — safe to ship in the binary.
enum Config {
    static let supabaseURL = URL(
        string: "https://nvypvpdgombzwcmjcnxk.supabase.co"
    )!
    static let supabasePublishableKey =
        "sb_publishable_Z7MMwOGGRA1Zncru9ZIy1g_hK1jfMzk"

    /// Storage bucket used for file blobs.
    static let filesBucket = "files"
}
