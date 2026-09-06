# Optional bundled database

Place `alwafi_ios.sqlite.xz` in this folder to make a self-contained IPA.
The GitHub Actions workflow decompresses it to `AlWafi/Resources/alwafi_ios.sqlite` immediately before the Xcode project is generated.

If this file is omitted, the IPA still works and asks the user to import `alwafi_ios.sqlite` from the Files app on first launch.
