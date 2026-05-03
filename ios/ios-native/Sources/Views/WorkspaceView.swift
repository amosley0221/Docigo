import SwiftUI

struct WorkspaceView: View {
    @EnvironmentObject var auth: AuthStore
    @StateObject private var store = WorkspaceStore()
    @State private var selectedLocation: Location? = nil
    @State private var selectedGroup: Group? = nil
    @State private var selectedItem: Item? = nil

    var body: some View {
        NavigationSplitView {
            LocationListView(
                store: store,
                selected: $selectedLocation
            )
            .navigationTitle("Docigo")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Text(auth.displayName)
                        Button("Sign out", role: .destructive) {
                            Task { await auth.signOut() }
                        }
                    } label: {
                        Image(systemName: "person.crop.circle")
                    }
                }
            }
        } content: {
            if let location = selectedLocation {
                GroupListView(
                    store: store,
                    location: location,
                    selectedGroup: $selectedGroup
                )
                .navigationTitle(location.name)
            } else {
                ContentUnavailableView(
                    "Pick a location",
                    systemImage: "tray",
                    description: Text("Select a location from the list to dive in.")
                )
            }
        } detail: {
            if let group = selectedGroup {
                ItemListView(
                    store: store,
                    group: group,
                    selectedItem: $selectedItem
                )
                .navigationTitle(group.name)
            } else {
                ContentUnavailableView(
                    "Pick a group",
                    systemImage: "folder",
                    description: Text("Choose a group to see its items.")
                )
            }
        }
        .task {
            await store.reload()
        }
        .refreshable {
            await store.reload()
        }
    }
}
