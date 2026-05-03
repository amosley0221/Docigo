import Foundation
import Supabase

/// Thin wrapper around Supabase Storage for the `files` bucket.
/// The web app uses paths shaped like `<userId>/<itemId>/<filename>`.
enum StorageService {
    private static var client: SupabaseClient { SupabaseClientProvider.shared }

    /// Upload data to a path in the files bucket. Returns the path.
    @discardableResult
    static func upload(
        _ data: Data,
        to path: String,
        contentType: String?
    ) async throws -> String {
        try await client.storage
            .from(Config.filesBucket)
            .upload(
                path: path,
                file: data,
                options: FileOptions(
                    contentType: contentType,
                    upsert: true
                )
            )
        return path
    }

    /// Download bytes for a path in the files bucket.
    static func download(_ path: String) async throws -> Data {
        try await client.storage
            .from(Config.filesBucket)
            .download(path: path)
    }

    /// Get a short-lived signed URL for streaming a file directly to a
    /// system view (PDFKit, AsyncImage, etc).
    static func signedURL(
        for path: String,
        expiresIn seconds: Int = 60 * 30
    ) async throws -> URL {
        try await client.storage
            .from(Config.filesBucket)
            .createSignedURL(path: path, expiresIn: seconds)
    }

    /// Build the storage path for a new item upload.
    static func makePath(userId: UUID, itemId: UUID, fileName: String) -> String {
        let safe = fileName
            .components(separatedBy: CharacterSet(charactersIn: "/\\"))
            .joined(separator: "_")
        return "\(userId.uuidString.lowercased())/\(itemId.uuidString.lowercased())/\(safe)"
    }
}
