import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @EnvironmentObject private var database: DictionaryDatabase
    @State private var query = ""
    @State private var mode: SearchMode = .auto
    @State private var results: [DictionaryEntry] = []
    @State private var isImporting = false
    @State private var isSearching = false
    @State private var showAbout = false
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            Group {
                if database.isReady {
                    dictionaryView
                } else {
                    setupView
                }
            }
            .navigationTitle("Al-Wafi")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAbout = true
                    } label: {
                        Image(systemName: "info.circle")
                    }
                }
            }
            .sheet(isPresented: $showAbout) {
                AboutView(isReady: database.isReady, entryCount: database.entryCount) {
                    isImporting = true
                }
            }
            .fileImporter(
                isPresented: $isImporting,
                allowedContentTypes: [.item],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    Task {
                        do {
                            try await database.importDatabase(from: url)
                            query = ""
                            results = []
                        } catch {
                            database.lastError = error.localizedDescription
                        }
                    }
                case .failure(let error):
                    database.lastError = error.localizedDescription
                }
            }
            .alert("Dictionary Error", isPresented: Binding(
                get: { database.lastError != nil },
                set: { if !$0 { database.lastError = nil } }
            )) {
                Button("OK", role: .cancel) { database.lastError = nil }
            } message: {
                Text(database.lastError ?? "Unknown error")
            }
        }
    }

    private var dictionaryView: some View {
        VStack(spacing: 0) {
            VStack(spacing: 10) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Search Arabic or English", text: $query)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.search)
                    if !query.isEmpty {
                        Button {
                            query = ""
                            results = []
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(12)
                .background(.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))

                Picker("Direction", selection: $mode) {
                    ForEach(SearchMode.allCases) { item in
                        Text(item.rawValue).tag(item)
                    }
                }
                .pickerStyle(.segmented)
            }
            .padding()

            Divider()

            if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                ContentUnavailableView(
                    "Search the Dictionary",
                    systemImage: "character.book.closed",
                    description: Text("Offline Arabic ↔ English lookup with specialist scientific terminology.")
                )
            } else if isSearching && results.isEmpty {
                ProgressView("Searching…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if results.isEmpty {
                ContentUnavailableView.search(text: query)
            } else {
                List(results) { entry in
                    EntryRow(entry: entry)
                }
                .listStyle(.plain)
            }
        }
        .onChange(of: query) { _ in scheduleSearch() }
        .onChange(of: mode) { _ in scheduleSearch(immediate: true) }
    }

    private var setupView: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: "books.vertical.fill")
                .font(.system(size: 58))
                .foregroundStyle(.tint)

            Text("Dictionary database required")
                .font(.title2.bold())

            Text("Import **alwafi_ios.sqlite** once. The app copies it into its private storage and then works completely offline.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 28)

            Button {
                isImporting = true
            } label: {
                Label("Import Dictionary", systemImage: "square.and.arrow.down")
                    .frame(maxWidth: 260)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

            Text("Expected database: 279,093 translation rows")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func scheduleSearch(immediate: Bool = false) {
        searchTask?.cancel()
        let currentQuery = query
        let currentMode = mode
        searchTask = Task {
            if !immediate {
                try? await Task.sleep(nanoseconds: 220_000_000)
            }
            guard !Task.isCancelled else { return }
            let trimmed = currentQuery.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else {
                results = []
                isSearching = false
                return
            }
            isSearching = true
            do {
                let found = try await database.search(trimmed, mode: currentMode)
                guard !Task.isCancelled else { return }
                results = found
            } catch {
                if !Task.isCancelled {
                    database.lastError = error.localizedDescription
                    results = []
                }
            }
            isSearching = false
        }
    }
}

private struct EntryRow: View {
    let entry: DictionaryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline) {
                Text(entry.source)
                    .font(.headline)
                    .textSelection(.enabled)
                Spacer(minLength: 8)
                Text(entry.directionLabel)
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(.secondary.opacity(0.12), in: Capsule())
            }

            Text(entry.target)
                .font(.body)
                .textSelection(.enabled)

            HStack(spacing: 6) {
                Text(entry.domainEnglish)
                if !entry.code.isEmpty {
                    Text("•")
                    Text("Code \(entry.code)")
                }
                if !entry.qualifierArabic.isEmpty {
                    Text("•")
                    Text(entry.qualifierArabic)
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 3)
    }
}

private struct AboutView: View {
    @Environment(\.dismiss) private var dismiss
    let isReady: Bool
    let entryCount: Int
    let replaceAction: () -> Void

    var body: some View {
        NavigationStack {
            List {
                Section("Dictionary") {
                    LabeledContent("Translation rows", value: entryCount.formatted())
                    LabeledContent("Availability", value: isReady ? "Ready — offline" : "Not imported")
                }

                Section("Content") {
                    Text("General Arabic → English dictionary plus English → Arabic specialist terminology in Medicine, Veterinary Science, Biology, Physics, Mathematics/Statistics, Chemistry, Engineering, Geology, and Other Sciences.")
                }

                Section("Database") {
                    Button("Import / Replace Database", action: replaceAction)
                }

                Section("About") {
                    Text("Recovered from the legacy Golden Al-Wafi Windows dictionary and converted to Unicode SQLite for modern use.")
                }
            }
            .navigationTitle("About Al-Wafi")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
