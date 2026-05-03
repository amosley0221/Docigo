import Foundation

/// Mirrors the `items` table. Most fields are nullable in the DB and
/// populated based on the `kind` column — file rows fill the file
/// fields, quote rows fill the quote fields, and so on.
struct Item: Identifiable, Codable, Hashable {
    let id: UUID
    let userId: UUID
    let locationId: UUID
    let groupId: UUID
    let kind: Kind
    let name: String

    // File-only
    let mime: String?
    let size: Int64?
    let storagePath: String?
    let derivedPdfPath: String?

    // Quote
    let quoteText: String?
    let quoteSource: String?

    // Checklist (raw JSON; decode lazily where needed)
    let checklistEntries: [ChecklistEntry]?

    // Chart
    let chartType: String?
    let chartData: [ChartPoint]?
    let chartXLabel: String?
    let chartYLabel: String?

    let position: Int
    let createdAt: Date
    let updatedAt: Date

    enum Kind: String, Codable, Hashable {
        case spreadsheet
        case document
        case pdf
        case image
        case text
        case quote
        case checklist
        case chart
        case unknown
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case locationId = "location_id"
        case groupId = "group_id"
        case kind
        case name
        case mime
        case size
        case storagePath = "storage_path"
        case derivedPdfPath = "derived_pdf_path"
        case quoteText = "quote_text"
        case quoteSource = "quote_source"
        case checklistEntries = "checklist_entries"
        case chartType = "chart_type"
        case chartData = "chart_data"
        case chartXLabel = "chart_x_label"
        case chartYLabel = "chart_y_label"
        case position
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct ChecklistEntry: Codable, Hashable, Identifiable {
    let id: String
    var text: String
    var done: Bool
}

struct ChartPoint: Codable, Hashable, Identifiable {
    let id: String
    var label: String
    var value: Double
}
