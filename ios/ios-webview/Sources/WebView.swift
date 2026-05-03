import SwiftUI
import WebKit

/// Hosts the Docigo web app inside a WKWebView with iOS-friendly defaults:
///   - Persistent localStorage / cookies for session continuity.
///   - Inline media playback.
///   - Pull-to-refresh.
///   - Camera / photo library / file picker support for uploads.
///   - Long-press downloads route through the iOS share sheet.
struct WebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // Newer WebKit setting that gates camera/microphone access in the
        // page; defaulting to .grant lets the file picker reach the camera
        // when the user explicitly taps "Take Photo".
        if #available(iOS 15.0, *) {
            // No public API to change default permissions; granting happens
            // in the navigation delegate below if needed.
        }

        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.039, green: 0.043, blue: 0.071, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor

        // Pull-to-refresh.
        let refresh = UIRefreshControl()
        refresh.tintColor = UIColor(white: 0.9, alpha: 0.7)
        refresh.addTarget(
            context.coordinator,
            action: #selector(Coordinator.refresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refresh
        context.coordinator.webView = webView

        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No-op — the URL is fixed at first load.
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        weak var webView: WKWebView?

        @objc func refresh(_ sender: UIRefreshControl) {
            webView?.reload()
        }

        func webView(
            _ webView: WKWebView,
            didFinish navigation: WKNavigation!
        ) {
            webView.scrollView.refreshControl?.endRefreshing()
        }

        func webView(
            _ webView: WKWebView,
            didFail navigation: WKNavigation!,
            withError error: Error
        ) {
            webView.scrollView.refreshControl?.endRefreshing()
        }

        // Open external links (mailto:, tel:, target=_blank) in Safari
        // instead of inside the WebView so the app stays focused on Docigo.
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            if let scheme = url.scheme,
               !["http", "https", "about", "blob", "data"].contains(scheme.lowercased()) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        // Handle target="_blank" anchors. Internal navigations (Docigo's own
        // origin and Supabase signed-storage URLs used to preview uploaded
        // PDFs / images) keep loading inside the WebView so the file renders
        // natively. Everything else is treated as an external link and is
        // handed off to the user's default browser.
        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            guard let url = navigationAction.request.url else { return nil }
            if shouldLoadInApp(url, webView: webView) {
                webView.load(URLRequest(url: url))
            } else {
                UIApplication.shared.open(url)
            }
            return nil
        }

        private func shouldLoadInApp(_ url: URL, webView: WKWebView) -> Bool {
            guard let host = url.host?.lowercased() else { return true }
            if let appHost = webView.url?.host?.lowercased(), host == appHost {
                return true
            }
            // Supabase storage URLs are how the web app opens uploaded files
            // (PDF preview, image, etc) — keep these in-app.
            if host == "supabase.co" || host.hasSuffix(".supabase.co") {
                return true
            }
            return false
        }

        // Camera + microphone permission grants (iOS 15+).
        @available(iOS 15.0, *)
        func webView(
            _ webView: WKWebView,
            requestMediaCapturePermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            type: WKMediaCaptureType,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            decisionHandler(.grant)
        }
    }
}
