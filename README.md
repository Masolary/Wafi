# NovelCool Reader Guard — iOS Safari extension

Native iPhone/iPad packaging for the NovelCool Safari web extension. Requires iOS/iPadOS 17 or newer. Reading occurs inside Safari; the small host app only explains setup.

**Download:** open **Actions → Build iOS Safari Extension → latest successful run → Artifacts**. The output is `NovelCool-Safari-iOS-unsigned.ipa`. See [INSTALL-iOS.md](INSTALL-iOS.md). An unsigned IPA must be signed together with its embedded extension before installation; no Mac ownership is required if your signing method supports Windows.

## Features

- Limits permissions to NovelCool; blocks page scripts on chapter and novel-listing pages using an appended response CSP.
- Restores advertising-wrapped links using valid page metadata and a bundled, verified index for *Marquis of Grand Xia*. Repairs the original page links as well as toolbar navigation; no numeric IDs are guessed. Other novels have no bundled fallback when the server encrypts all destinations.
- Adds direct navigation, a chapter selector, an optional clean reader, adjustable text and paper/dark/light themes.
- No remote code, accounts, analytics, or transmission of reading content. Preferences stay in extension-local storage.

## Build and validation

Version 1.1.1 fixes dead chapter taps: the live site wraps both anchors and previous/next metadata in advertising URLs. The bundled index contains the 132 entries exposed by the public catalogue on 2026-09-09 (87/88 are absent). Valid `.html` chapter links are also recognized. Reload existing tabs after installing this update; the toolbar shows 1.1.1.

Every push to `main` runs dependency-free JavaScript tests, generates the Xcode project using XcodeGen, compiles the iOS app and embedded Safari extension on a GitHub macOS runner, verifies the `.appex`, binaries, bundle identifiers and all manifest resources, and packages an unsigned IPA. It does not obtain signing credentials, publish to the App Store or alter Apple account settings.

`npm test` runs the JavaScript tests locally. `npm run test:ui` offers synthetic manual fixtures; these do not prove actual Safari DNR enforcement. Build success proves compilation/packaging, not that every site behavior was tested on a physical iPhone or iPad. Site scripts being disabled can break comments, ratings and some menus; see the installation guide.

## Repository reuse and recovery

This repository was repurposed from Wafi with the owner's authorization. The old main-branch files were replaced, not the repository history. The former dictionary project remains recoverable at commit `7b22ad681824ab4f465845a542c12743b0b42f19`. Old releases/tags were not deleted. New work is identifiable by the **Build iOS Safari Extension** workflow and **NovelCool-Safari-iOS-unsigned** artifact name.

## Source references

- [Apple Safari web extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions)
- [Apple: What's new in Safari extensions](https://developer.apple.com/videos/play/wwdc2023/10119/)
- [XcodeGen project specification](https://github.com/yonaskolb/XcodeGen/blob/master/Docs/ProjectSpec.md)

Independent personal utility; not affiliated with NovelCool or Apple.
