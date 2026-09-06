import SwiftUI

@main
struct AlWafiApp: App {
    @StateObject private var database = DictionaryDatabase()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(database)
        }
    }
}
