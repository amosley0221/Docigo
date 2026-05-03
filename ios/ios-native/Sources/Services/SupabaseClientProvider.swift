import Foundation
import Supabase

/// Single shared SupabaseClient. The Swift SDK handles session
/// persistence in the iOS Keychain automatically, so users stay
/// signed in across launches.
enum SupabaseClientProvider {
    static let shared: SupabaseClient = {
        SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabasePublishableKey
        )
    }()
}
