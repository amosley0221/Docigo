import Foundation

struct Location: Identifiable, Codable, Hashable {
    let id: UUID
    let userId: UUID
    let name: String
    let kind: String
    let color: String
    let position: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case kind
        case color
        case position
        case createdAt = "created_at"
    }
}
