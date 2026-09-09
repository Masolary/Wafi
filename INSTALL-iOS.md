# Install NovelCool Reader Guard in iOS/iPadOS Safari

This is a Safari extension, packaged inside the small containing app required by iOS. It is not a separate web browser or a novel-reading app. After installation, you read inside Safari.

## Download and sign

1. Open this repository's **Actions** tab and the latest successful **Build iOS Safari Extension** run.
2. Download the **NovelCool-Safari-iOS-v1.1.2** artifact and unzip it to obtain `NovelCool-Safari-iOS-v1.1.2-unsigned.ipa`. Do not use an older artifact with the old filename.
3. Delete the previous Reader Guard app before installing this one; this clears Safari's cached extension resources. Use your existing legitimate iOS sideloading/signing method. The IPA is **unsigned**, so simply opening it on your iPhone/iPad will not install it. You do not need a Mac if your signing method supports Windows.
4. **Keep the embedded app extension** when your signing tool asks. Both the containing app and `NovelCoolSafariExtension.appex` must be signed/provisioned together. Removing the extension leaves only the instructions screen and no Safari functionality.

Apple signing credentials, a paid developer membership, TestFlight distribution, and an App Store submission are not included. Free-account sideloading may require periodic renewal and is subject to Apple's limits. Never send your Apple password or signing private keys in a chat or commit them to this repository.

## Enable in Safari

1. On iOS/iPadOS 18 or newer: **Settings → Apps → Safari → Extensions → NovelCool Reader Guard**. On iOS/iPadOS 17: **Settings → Safari → Extensions**.
2. Enable the extension and allow it to access **novelcool.com**. It does not require access to unrelated websites.
3. Open the novel/chapter in Safari and **reload**. The toolbar must say **NovelCool Reader Guard 1.1.2**. Tap **Clean reading** if you want the text-only reading view.
4. Use **Previous**, **Next**, **Chapter list**, and the chapter selector. Font/theme controls appear inside the clean reader.

If Safari does not list the extension, verify that the signer retained and signed its `.appex`. If the toolbar appears but redirects still happen, confirm website permission and reload. Existing pages must be reloaded after installation or toggling protection.

## Limits

Protection disables page JavaScript on `/chapter/` and `/novel/` pages. Comments, ratings, age-confirmation controls and some site menus may not work. If needed, turn protection off in Safari's extension popup, reload, and complete the normal site process yourself. Re-enable and reload for reading afterward. The extension does not bypass logins, age restrictions, paywalls or security checks.

Clean reading is text-only. Manga/image-only chapters and future site layout changes may not be supported. No guarantee is made that every redirect mechanism is blocked. The native package can be build-validated in CI, but actual Safari behavior still requires target-device testing.

To remove: disable the extension in Safari and delete the Reader Guard containing app. No subscriptions, account, analytics or server are involved.
