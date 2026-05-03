import SwiftUI

/// Renders a flat list of groups within a location. Subgroups appear
/// with depth-based indentation. Tapping a group selects it.
struct GroupListView: View {
    @ObservedObject var store: WorkspaceStore
    let location: Location
    @Binding var selectedGroup: Group?

    var body: some View {
        let flat = flatten()
        return List(selection: $selectedGroup) {
            if flat.isEmpty {
                Text("No groups yet.")
                    .foregroundStyle(.secondary)
            }
            ForEach(flat, id: \.group.id) { row in
                NavigationLink(value: row.group) {
                    HStack(spacing: 8) {
                        Image(systemName: "folder")
                            .foregroundStyle(.secondary)
                        Text(row.group.name)
                            .padding(.leading, CGFloat(row.depth) * 12)
                        Spacer()
                        Text("\(store.items(in: row.group).count)")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
        }
    }

    private struct Row {
        let group: Group
        let depth: Int
    }

    private func flatten() -> [Row] {
        var out: [Row] = []
        func walk(_ g: Group, depth: Int) {
            out.append(Row(group: g, depth: depth))
            for child in store.childGroups(of: g)
                .sorted(by: { $0.position < $1.position })
            {
                walk(child, depth: depth + 1)
            }
        }
        for g in store.topLevelGroups(in: location)
            .sorted(by: { $0.position < $1.position })
        {
            walk(g, depth: 0)
        }
        return out
    }
}
