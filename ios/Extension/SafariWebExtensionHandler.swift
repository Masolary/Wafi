import Foundation
import SafariServices

// Safari loads manifest.json and the web resources from this .appex bundle.
// The extension does not request nativeMessaging or forward browsing data.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        context.completeRequest(returningItems: [], completionHandler: nil)
    }
}
