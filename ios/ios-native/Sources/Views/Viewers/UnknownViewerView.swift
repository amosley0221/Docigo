import SwiftUI

/// Fallback for kinds the starter doesn't render natively yet
/// (spreadsheets, Word, charts, checklists). Surfaces a Download button
/// that streams the file to a temp URL and presents the iOS share sheet
/// so the user can open it in Excel / Word / Numbers / etc.
struct UnknownViewerView: View {
    let item: Item
    let path: String
    @State private var sharedURL: URL? = nil
    @State private var error: String? = nil
    @State private var working = false

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "tray.full")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text(item.name).font(.headline)
            Text("This file type doesn’t preview natively yet. Save it to use in another app.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)

            Button {
                Task { await prepareShare() }
            } label: {
                Label(working ? "Preparing…" : "Save / Share",
                      systemImage: "square.and.arrow.down")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .background(Color.accentColor)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .disabled(working)
            .padding(.horizontal)

            if let error {
                Text(error).font(.footnote).foregroundStyle(.red)
            }
        }
        .padding()
        .sheet(item: Binding(
            get: { sharedURL.map { ShareItem(url: $0) } },
            set: { sharedURL = $0?.url }
        )) { item in
            ShareSheet(items: [item.url])
        }
    }

    private func prepareShare() async {
        working = true
        defer { working = false }
        do {
            let data = try await StorageService.download(path)
            let tempURL = FileManager.default.temporaryDirectory
                .appendingPathComponent(item.name)
            try? FileManager.default.removeItem(at: tempURL)
            try data.write(to: tempURL)
            sharedURL = tempURL
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
