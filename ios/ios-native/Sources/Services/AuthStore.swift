import Foundation
import Supabase

@MainActor
final class AuthStore: ObservableObject {
    @Published var user: User? = nil
    @Published var isReady: Bool = false

    private var listenerTask: Task<Void, Never>? = nil

    /// Pull the current session at startup and start listening for auth
    /// state changes (sign-in, sign-out, refresh).
    func bootstrap() async {
        let client = SupabaseClientProvider.shared

        do {
            let session = try await client.auth.session
            self.user = session.user
        } catch {
            self.user = nil
        }
        self.isReady = true

        listenerTask?.cancel()
        listenerTask = Task { [weak self] in
            for await change in client.auth.authStateChanges {
                guard let self else { return }
                self.user = change.session?.user
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        try await SupabaseClientProvider.shared.auth.signIn(
            email: email,
            password: password
        )
    }

    func signUp(
        email: String,
        password: String,
        firstName: String,
        lastName: String
    ) async throws {
        try await SupabaseClientProvider.shared.auth.signUp(
            email: email,
            password: password,
            data: [
                "first_name": .string(firstName),
                "last_name": .string(lastName),
            ]
        )
    }

    func signOut() async {
        try? await SupabaseClientProvider.shared.auth.signOut()
    }

    var displayName: String {
        guard let user else { return "" }
        let first = (user.userMetadata["first_name"]?.stringValue) ?? ""
        let last = (user.userMetadata["last_name"]?.stringValue) ?? ""
        let combined = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        return combined.isEmpty ? (user.email ?? "Account") : combined
    }
}

private extension AnyJSON {
    var stringValue: String? {
        if case let .string(s) = self { return s }
        return nil
    }
}
