import AppKit
// Rasterize the existing simple book icon with macOS's built-in graphics APIs.
let image = NSImage(size: NSSize(width: 1024, height: 1024))
image.lockFocus()
NSColor(srgbRed: 0.08, green: 0.36, blue: 0.31, alpha: 1).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1024, height: 1024)).fill()
NSColor(srgbRed: 1, green: 0.97, blue: 0.90, alpha: 1).setFill()
let book = NSBezierPath()
book.move(to: NSPoint(x: 192, y: 280))
book.curve(to: NSPoint(x: 512, y: 240), controlPoint1: NSPoint(x: 320, y: 320), controlPoint2: NSPoint(x: 420, y: 280))
book.curve(to: NSPoint(x: 832, y: 280), controlPoint1: NSPoint(x: 620, y: 280), controlPoint2: NSPoint(x: 730, y: 320))
book.line(to: NSPoint(x: 832, y: 760))
book.curve(to: NSPoint(x: 512, y: 720), controlPoint1: NSPoint(x: 720, y: 800), controlPoint2: NSPoint(x: 610, y: 780))
book.curve(to: NSPoint(x: 192, y: 760), controlPoint1: NSPoint(x: 410, y: 780), controlPoint2: NSPoint(x: 300, y: 800))
book.close(); book.fill()
NSColor(srgbRed: 0.08, green: 0.36, blue: 0.31, alpha: 1).setStroke()
let lines = NSBezierPath(); lines.lineWidth = 24; lines.lineCapStyle = .round
for segment in [(512.0, 290.0, 512.0, 720.0), (280.0, 620.0, 416.0, 620.0), (280.0, 520.0, 416.0, 520.0), (608.0, 620.0, 744.0, 620.0), (608.0, 520.0, 744.0, 520.0)] {
    lines.move(to: NSPoint(x: segment.0, y: segment.1)); lines.line(to: NSPoint(x: segment.2, y: segment.3))
}
lines.stroke(); image.unlockFocus()
guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("Icon conversion failed") }
try png.write(to: URL(fileURLWithPath: "ios/Host/Assets.xcassets/AppIcon.appiconset/AppIcon.png"))
