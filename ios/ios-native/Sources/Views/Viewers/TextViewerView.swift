import SwiftUI

struct TextViewerView: View {
    let path: String
    @State private var content: String? = nil
    @State private var error: String? = nil

    var body: some View {
        Group {
            if let content {
                ScrollView {
                    Text(content)
                        .font(.system(.body, design: .monospaced))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .textSelection(.enabled)
                        .padding()
                }
            } else if let error {
                ContentUnavailableView(
                    "Couldn’t load file",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else {
                ProgressView().tint(.white)
            }
        }
        .task(id: path) {
            do {
                let data = try await StorageService.download(path)
                self.content = String(data: data, encoding: .utf8)
                    ?? String(data: data, encoding: .isoLatin1)
                    ?? ""
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
