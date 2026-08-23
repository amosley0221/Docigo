import SwiftUI

struct ContentView: View {
    /// Live site. Swap to "https://docigo.net" once that domain's DNS is
    /// pointed at Render and the certificate has been issued — both hosts
    /// are already allow-listed in WebView.swift, so this is the only line
    /// that needs to change.
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
