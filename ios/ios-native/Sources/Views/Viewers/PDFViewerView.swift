import SwiftUI
import PDFKit

struct PDFViewerView: View {
    let path: String
    @State private var url: URL? = nil
    @State private var error: String? = nil

    var body: some View {
        Group {
            if let url {
                PDFKitRepresented(url: url)
            } else if let error {
                ContentUnavailableView(
                    "Couldn’t load PDF",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else {
                ProgressView().tint(.white)
            }
        }
        .task(id: path) {
            do {
                self.url = try await StorageService.signedURL(for: path)
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

private struct PDFKitRepresented: UIViewRepresentable {
    let url: URL
    func makeUIView(context: Context) -> PDFView {
        let v = PDFView()
        v.autoScales = true
        v.displayMode = .singlePageContinuous
        v.displayDirection = .vertical
        v.backgroundColor = UIColor(red: 0.039, green: 0.043, blue: 0.071, alpha: 1)
        v.document = PDFDocument(url: url)
        return v
    }
    func updateUIView(_ uiView: PDFView, context: Context) {
        if uiView.document?.documentURL != url {
            uiView.document = PDFDocument(url: url)
        }
    }
}
