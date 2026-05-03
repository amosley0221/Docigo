import SwiftUI

@main
struct DocigoApp: App {
    @StateObject private var auth = AuthStore()

    var body: some Scene {
        WindowGroup {
            AuthGate()
                .environmentObject(auth)
                .preferredColorScheme(.dark)
                .task {
                    await auth.bootstrap()
                }
        }
    }
}

/// Routes between the sign-in screen and the workspace based on the
/// current Supabase session.
struct AuthGate: View {
    @EnvironmentObject var auth: AuthStore

    var body: some View {
        Group {
            if !auth.isReady {
                ProgressView().tint(.white)
            } else if auth.user != nil {
                WorkspaceView()
            } else {
                AuthView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appBackground.ignoresSafeArea())
    }
}

extension Color {
    /// Matches the web app's #0a0b12 base.
    static let appBackground = Color(red: 0.039, green: 0.043, blue: 0.071)
}
