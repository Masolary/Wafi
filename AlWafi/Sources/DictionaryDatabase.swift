import Foundation
import SQLite3

@MainActor
final class DictionaryDatabase: ObservableObject {
    @Published private(set) var isReady = false
    @Published private(set) var entryCount = 0
    @Published private(set) var databaseURL: URL?
    @Published var lastError: String?

    private let fileManager = FileManager.default
    private let installedFileName = "alwafi_ios.sqlite"

    init() {
        Task { await discoverDatabase() }
    }

    func discoverDatabase() async {
        do {
            if let installed = installedDatabaseURL(), fileManager.fileExists(atPath: installed.path) {
                let count = try await DictionarySearchEngine.validate(databaseURL: installed)
                databaseURL = installed
                entryCount = count
                isReady = true
                return
            }

            if let bundled = Bundle.main.url(forResource: "alwafi_ios", withExtension: "sqlite") {
                let count = try await DictionarySearchEngine.validate(databaseURL: bundled)
                databaseURL = bundled
                entryCount = count
                isReady = true
                return
            }

            isReady = false
            entryCount = 0
            databaseURL = nil
        } catch {
            isReady = false
            entryCount = 0
            databaseURL = nil
            lastError = error.localizedDescription
        }
    }

    func importDatabase(from sourceURL: URL) async throws {
        let accessed = sourceURL.startAccessingSecurityScopedResource()
        defer {
            if accessed { sourceURL.stopAccessingSecurityScopedResource() }
        }

        let destination = try makeApplicationSupportDirectory().appendingPathComponent(installedFileName)
        let temporary = destination.deletingLastPathComponent().appendingPathComponent(".alwafi-import-\(UUID().uuidString).sqlite")

        do {
            if fileManager.fileExists(atPath: temporary.path) {
                try fileManager.removeItem(at: temporary)
            }
            try fileManager.copyItem(at: sourceURL, to: temporary)
            let count = try await DictionarySearchEngine.validate(databaseURL: temporary)

            if fileManager.fileExists(atPath: destination.path) {
                try fileManager.removeItem(at: destination)
            }
            try fileManager.moveItem(at: temporary, to: destination)

            databaseURL = destination
            entryCount = count
            isReady = true
            lastError = nil
        } catch {
            try? fileManager.removeItem(at: temporary)
            throw DictionaryError.copyFailed(error.localizedDescription)
        }
    }

    func search(_ query: String, mode: SearchMode, limit: Int = 200) async throws -> [DictionaryEntry] {
        guard let databaseURL else { return [] }
        return try await DictionarySearchEngine.search(databaseURL: databaseURL, query: query, mode: mode, limit: limit)
    }

    func removeImportedDatabase() async {
        guard let installed = installedDatabaseURL() else { return }
        if fileManager.fileExists(atPath: installed.path) {
            try? fileManager.removeItem(at: installed)
        }
        await discoverDatabase()
    }

    private func makeApplicationSupportDirectory() throws -> URL {
        let base = try fileManager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let directory = base.appendingPathComponent("AlWafi", isDirectory: true)
        if !fileManager.fileExists(atPath: directory.path) {
            try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        return directory
    }

    private func installedDatabaseURL() -> URL? {
        guard let base = try? fileManager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true) else {
            return nil
        }
        return base.appendingPathComponent("AlWafi", isDirectory: true).appendingPathComponent(installedFileName)
    }
}

enum DictionarySearchEngine {
    static func validate(databaseURL: URL) async throws -> Int {
        try await Task.detached(priority: .userInitiated) {
            var db: OpaquePointer?
            guard sqlite3_open_v2(databaseURL.path, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK, let db else {
                throw DictionaryError.cannotOpenDatabase
            }
            defer { sqlite3_close(db) }

            var statement: OpaquePointer?
            let sql = "SELECT COUNT(*) FROM entries"
            guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
                throw DictionaryError.invalidSchema
            }
            defer { sqlite3_finalize(statement) }

            guard sqlite3_step(statement) == SQLITE_ROW else {
                throw DictionaryError.invalidSchema
            }
            let count = Int(sqlite3_column_int64(statement, 0))
            guard count > 250_000 else { throw DictionaryError.invalidSchema }
            return count
        }.value
    }

    static func search(databaseURL: URL, query rawQuery: String, mode: SearchMode, limit: Int) async throws -> [DictionaryEntry] {
        let trimmed = rawQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }

        return try await Task.detached(priority: .userInitiated) {
            var db: OpaquePointer?
            guard sqlite3_open_v2(databaseURL.path, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK, let db else {
                throw DictionaryError.cannotOpenDatabase
            }
            defer { sqlite3_close(db) }
            sqlite3_busy_timeout(db, 1500)

            let normalizedQuery = containsArabic(trimmed) ? trimmed : trimmed.lowercased()
            let prefix = normalizedQuery + "%"

            var sql = """
                SELECT id, direction, domain_en, domain_ar, source_term, target_term, code, qualifier_ar
                FROM entries
                WHERE (source_term LIKE ? COLLATE NOCASE OR target_term LIKE ? COLLATE NOCASE)
                """
            if mode.databaseDirection != nil {
                sql += " AND direction = ? "
            }
            sql += """
                ORDER BY
                    CASE
                        WHEN source_term = ? COLLATE NOCASE THEN 0
                        WHEN target_term = ? COLLATE NOCASE THEN 1
                        ELSE 2
                    END,
                    length(source_term), source_term, target_term
                LIMIT ?
                """

            var statement: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
                throw DictionaryError.sqlite(String(cString: sqlite3_errmsg(db)))
            }
            defer { sqlite3_finalize(statement) }

            var parameter: Int32 = 1
            bind(prefix, to: statement, at: parameter); parameter += 1
            bind(prefix, to: statement, at: parameter); parameter += 1
            if let direction = mode.databaseDirection {
                bind(direction, to: statement, at: parameter); parameter += 1
            }
            bind(normalizedQuery, to: statement, at: parameter); parameter += 1
            bind(normalizedQuery, to: statement, at: parameter); parameter += 1
            sqlite3_bind_int(statement, parameter, Int32(limit))

            var results: [DictionaryEntry] = []
            results.reserveCapacity(min(limit, 200))

            while sqlite3_step(statement) == SQLITE_ROW {
                results.append(DictionaryEntry(
                    id: sqlite3_column_int64(statement, 0),
                    direction: text(statement, 1),
                    domainEnglish: text(statement, 2),
                    domainArabic: text(statement, 3),
                    source: text(statement, 4),
                    target: text(statement, 5),
                    code: text(statement, 6),
                    qualifierArabic: text(statement, 7)
                ))
            }
            return results
        }.value
    }

    private static func bind(_ value: String, to statement: OpaquePointer, at index: Int32) {
        value.withCString { pointer in
            sqlite3_bind_text(statement, index, pointer, -1, SQLITE_TRANSIENT)
        }
    }

    private static func text(_ statement: OpaquePointer, _ index: Int32) -> String {
        guard let pointer = sqlite3_column_text(statement, index) else { return "" }
        return String(cString: pointer)
    }

    private static func containsArabic(_ string: String) -> Bool {
        string.unicodeScalars.contains { scalar in
            switch scalar.value {
            case 0x0600...0x06FF, 0x0750...0x077F, 0x08A0...0x08FF, 0xFB50...0xFDFF, 0xFE70...0xFEFF:
                return true
            default:
                return false
            }
        }
    }
}

private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
