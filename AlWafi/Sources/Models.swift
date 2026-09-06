import Foundation

enum SearchMode: String, CaseIterable, Identifiable, Sendable {
    case auto = "Auto"
    case arabicToEnglish = "AR → EN"
    case englishToArabic = "EN → AR"

    var id: String { rawValue }

    var databaseDirection: String? {
        switch self {
        case .auto: return nil
        case .arabicToEnglish: return "ar-en"
        case .englishToArabic: return "en-ar"
        }
    }
}

struct DictionaryEntry: Identifiable, Hashable, Sendable {
    let id: Int64
    let direction: String
    let domainEnglish: String
    let domainArabic: String
    let source: String
    let target: String
    let code: String
    let qualifierArabic: String

    var directionLabel: String {
        direction == "ar-en" ? "AR → EN" : "EN → AR"
    }
}

enum DictionaryError: LocalizedError {
    case cannotOpenDatabase
    case invalidSchema
    case copyFailed(String)
    case sqlite(String)

    var errorDescription: String? {
        switch self {
        case .cannotOpenDatabase:
            return "The selected file could not be opened as a SQLite database."
        case .invalidSchema:
            return "This does not appear to be the Al-Wafi iOS dictionary database."
        case .copyFailed(let message):
            return "The dictionary could not be copied: \(message)"
        case .sqlite(let message):
            return "SQLite error: \(message)"
        }
    }
}
