import SwiftUI

@main
struct DocigoApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
                .ignoresSafeArea(.keyboard)
        }
    }
}
