import SwiftUI

struct ContentView: View {
    /// Update this to your deployed URL (Render, custom domain, etc).
    private let url = URL(string: "https://docigo.onrender.com")!

    var body: some View {
        ZStack {
            // Match the web app's background so the iOS status bar /
            // home indicator areas don't flash white during loads.
            Color(red: 0.039, green: 0.043, blue: 0.071)
                .ignoresSafeArea()
            WebView(url: url)
                .ignoresSafeArea()
        }
    }
}

#Preview {
    ContentView()
}
