import SwiftUI

struct ImageViewerView: View {
    let path: String
    @State private var url: URL? = nil
    @State private var error: String? = nil

    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        ProgressView().tint(.white)
                    case .success(let img):
                        img.resizable().scaledToFit()
                    case .failure:
                        ContentUnavailableView(
                            "Image failed to load",
                            systemImage: "photo.badge.exclamationmark"
                        )
                    @unknown default:
                        EmptyView()
                    }
                }
            } else if let error {
                ContentUnavailableView(
                    "Couldn’t load image",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else {
                ProgressView().tint(.white)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
        .task(id: path) {
            do {
                self.url = try await StorageService.signedURL(for: path)
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
