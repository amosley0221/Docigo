import Foundation
import Supabase

@MainActor
final class WorkspaceStore: ObservableObject {
    @Published var locations: [Location] = []
    @Published var groups: [Group] = []
    @Published var items: [Item] = []
    @Published var isLoading: Bool = false
    @Published var lastError: String? = nil

    private let client = SupabaseClientProvider.shared

    /// Fetch the user's locations / groups / items in parallel.
    func reload() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let locs: [Location] = client
                .from("locations")
                .select()
                .order("position")
                .execute()
                .value
            async let grps: [Group] = client
                .from("groups")
                .select()
                .order("position")
                .execute()
                .value
            async let its: [Item] = client
                .from("items")
                .select()
                .order("created_at")
                .execute()
                .value

            self.locations = try await locs
            self.groups = try await grps
            self.items = try await its
            self.lastError = nil
        } catch {
            self.lastError = error.localizedDescription
        }
    }

    func topLevelGroups(in location: Location) -> [Group] {
        groups.filter { $0.locationId == location.id && $0.parentGroupId == nil }
    }

    func childGroups(of group: Group) -> [Group] {
        groups.filter { $0.parentGroupId == group.id }
    }

    func items(in group: Group) -> [Item] {
        items.filter { $0.groupId == group.id }
    }
}
