import Foundation

struct Group: Identifiable, Codable, Hashable {
    let id: UUID
    let userId: UUID
    let locationId: UUID
    let parentGroupId: UUID?
    let name: String
    let position: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case locationId = "location_id"
        case parentGroupId = "parent_group_id"
        case name
        case position
        case createdAt = "created_at"
    }
}
