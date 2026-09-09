import json
import pathlib
import plistlib
import sys

app = pathlib.Path(sys.argv[1])
extension = app / 'PlugIns' / 'NovelCoolSafariExtension.appex'
assert app.is_dir(), 'Containing app missing'
assert extension.is_dir(), 'Safari extension missing from IPA payload'
with (app / 'Info.plist').open('rb') as f:
    host_info = plistlib.load(f)
with (extension / 'Info.plist').open('rb') as f:
    ext_info = plistlib.load(f)
assert ext_info['NSExtension']['NSExtensionPointIdentifier'] == 'com.apple.Safari.web-extension'
assert ext_info['CFBundleIdentifier'].startswith(host_info['CFBundleIdentifier'] + '.')
assert (app / host_info['CFBundleExecutable']).stat().st_size > 0
assert (extension / ext_info['CFBundleExecutable']).stat().st_size > 0
manifest = json.loads((extension / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert manifest['host_permissions'] == ['*://*.novelcool.com/*']
resources = [manifest['action']['default_popup'], manifest['action']['default_icon']]
resources += list(manifest['icons'].values())
for entry in manifest['content_scripts']:
    resources += entry.get('js', []) + entry.get('css', [])
for entry in manifest['declarative_net_request']['rule_resources']:
    resources.append(entry['path'])
for name in resources + ['popup.js', 'popup.css']:
    assert (extension / name).is_file(), f'Extension resource missing: {name}'
assert 'iPhoneOS' in host_info['CFBundleSupportedPlatforms']
assert 'iPhoneOS' in ext_info['CFBundleSupportedPlatforms']
print('PASS: iOS host, embedded Safari extension, executables, identifiers, and all web resources verified.')
print('This package is unsigned. Re-sign both the app and embedded extension for device installation.')
