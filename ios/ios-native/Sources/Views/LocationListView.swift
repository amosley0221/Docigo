import SwiftUI

struct LocationListView: View {
    @ObservedObject var store: WorkspaceStore
    @Binding var selected: Location?

    var body: some View {
        List(selection: $selected) {
            if store.locations.isEmpty && !store.isLoading {
                Text("No locations yet.")
                    .foregroundStyle(.secondary)
            }
            ForEach(store.locations) { loc in
                NavigationLink(value: loc) {
                    HStack(spacing: 10) {
                        Circle()
                            .fill(Color(hex: loc.color) ?? .accentColor)
                            .frame(width: 18, height: 18)
                            .opacity(0.85)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(loc.name).font(.body)
                            Text(loc.kind.capitalized)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .overlay {
            if store.isLoading && store.locations.isEmpty {
                ProgressView()
            }
        }
    }
}

extension Color {
    /// Parse a hex string like "#aa3bff". Returns nil for invalid input.
    init?(hex: String) {
        var s = hex
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = Int(s, radix: 16) else { return nil }
        let r = Double((v >> 16) & 0xFF) / 255
        let g = Double((v >> 8) & 0xFF) / 255
        let b = Double(v & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
