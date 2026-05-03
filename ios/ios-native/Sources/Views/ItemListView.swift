import SwiftUI

struct ItemListView: View {
    @ObservedObject var store: WorkspaceStore
    let group: Group
    @Binding var selectedItem: Item?

    var body: some View {
        let groupItems = store.items(in: group)
            .sorted(by: { $0.createdAt < $1.createdAt })
        return Group {
            if let item = selectedItem, groupItems.contains(item) {
                detail(for: item)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button {
                                selectedItem = nil
                            } label: {
                                Image(systemName: "chevron.left")
                            }
                        }
                    }
            } else {
                listView(groupItems)
            }
        }
    }

    @ViewBuilder
    private func listView(_ groupItems: [Item]) -> some View {
        if groupItems.isEmpty {
            ContentUnavailableView(
                "Empty group",
                systemImage: "tray",
                description: Text("Upload a file from your device or paste text on the web to capture a quote.")
            )
        } else {
            List {
                ForEach(groupItems) { item in
                    Button {
                        selectedItem = item
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: icon(for: item.kind))
                                .foregroundStyle(.secondary)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name).foregroundStyle(.white)
                                Text(subtitle(for: item))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func detail(for item: Item) -> some View {
        switch item.kind {
        case .pdf:
            if let path = item.derivedPdfPath ?? item.storagePath {
                PDFViewerView(path: path)
            } else {
                Text("PDF not available").foregroundStyle(.secondary)
            }
        case .image:
            if let path = item.storagePath {
                ImageViewerView(path: path)
            } else {
                Text("Image not available").foregroundStyle(.secondary)
            }
        case .text:
            if let path = item.storagePath {
                TextViewerView(path: path)
            } else {
                Text("Text not available").foregroundStyle(.secondary)
            }
        case .quote:
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    Text(item.quoteText ?? "")
                        .font(.system(.title3, design: .serif))
                        .italic()
                        .foregroundStyle(.white)
                    if let source = item.quoteSource {
                        Text("— \(source)").foregroundStyle(.secondary)
                    }
                }
                .padding()
            }
        case .unknown, .spreadsheet, .document, .checklist, .chart:
            // Fall back to download for kinds the starter doesn't render
            // natively. Spreadsheet / document viewers are listed in the
            // README as next steps.
            if let path = item.derivedPdfPath {
                PDFViewerView(path: path)
            } else if let path = item.storagePath {
                UnknownViewerView(item: item, path: path)
            } else {
                Text("No preview available").foregroundStyle(.secondary)
            }
        }
    }

    private func icon(for kind: Item.Kind) -> String {
        switch kind {
        case .pdf: return "doc.richtext"
        case .image: return "photo"
        case .text: return "doc.text"
        case .quote: return "quote.bubble"
        case .checklist: return "checklist"
        case .chart: return "chart.bar"
        case .spreadsheet: return "tablecells"
        case .document: return "doc"
        case .unknown: return "questionmark.folder"
        }
    }

    private func subtitle(for item: Item) -> String {
        switch item.kind {
        case .quote:
            return String((item.quoteText ?? "").prefix(60))
        case .checklist:
            let total = item.checklistEntries?.count ?? 0
            let done = item.checklistEntries?.filter { $0.done }.count ?? 0
            return "\(done) of \(total) done"
        case .chart:
            return "\(item.chartType ?? "chart") · \(item.chartData?.count ?? 0) point(s)"
        default:
            if let mime = item.mime, !mime.isEmpty { return mime }
            return item.kind.rawValue
        }
    }
}
