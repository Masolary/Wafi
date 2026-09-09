import SwiftUI

@main
struct ReaderGuardApp: App {
    var body: some Scene {
        WindowGroup { SetupView() }
    }
}

private struct SetupView: View {
    private let green = Color(red: 0.08, green: 0.36, blue: 0.31)
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 52)).foregroundStyle(green)
                        .accessibilityHidden(true)
                    Text("Read in Safari.")
                        .font(.largeTitle.bold())
                    Text("This small app installs the NovelCool Safari extension. Reading happens in Safari—not here.")
                        .font(.title3).foregroundStyle(.secondary)
                    GroupBox("Enable the extension") {
                        VStack(alignment: .leading, spacing: 16) {
                            step("1", "Open Settings → Apps → Safari → Extensions. On iOS 17, Safari is directly in Settings.")
                            step("2", "Turn on NovelCool Reader Guard and allow access to novelcool.com.")
                            step("3", "Open your chapter in Safari and reload it. Look for the green Reader Guard toolbar.")
                        }.padding(.vertical, 8)
                    }
                    Link(destination: URL(string: "https://www.novelcool.com/novel/Marquis-of-Grand-Xia.html")!) {
                        Label("Open Marquis of Grand Xia", systemImage: "safari")
                            .frame(maxWidth: .infinity).padding(8)
                    }.buttonStyle(.borderedProminent).tint(green)
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Direct chapter navigation", systemImage: "arrow.left.arrow.right")
                        Label("Clean text, font sizes and themes", systemImage: "textformat.size")
                        Label("No analytics or account required", systemImage: "lock.shield")
                    }
                    Text("Protection blocks page scripts on NovelCool chapter and novel pages. Comments, ratings and some menus may stop working. Turn protection off in Safari’s extension popup and reload when you need original site controls.")
                        .font(.footnote).foregroundStyle(.secondary)
                    Text("If you sideload this package, keep its embedded Safari extension when signing. Signing and enabling the extension are required before it can run.")
                        .font(.footnote).foregroundStyle(.secondary)
                }.padding(24).frame(maxWidth: 680)
            }.frame(maxWidth: .infinity)
                .navigationTitle("Reader Guard")
                .navigationBarTitleDisplayMode(.inline)
        }
    }
    private func step(_ number: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number).font(.headline).foregroundStyle(green)
            Text(text).fixedSize(horizontal: false, vertical: true)
        }
    }
}
