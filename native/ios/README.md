# Spotify App Remote iOS Native Module

These files provide the native React Native bridge for:

- `configure({ clientId, redirectUrl })`
- `connect(accessToken)`
- `disconnect()`
- `playTrackUri(uri)`

## Integration Notes

1. This project currently does not keep an `ios/` folder in VCS (Expo managed flow).
2. To use this module on a device, build an iOS Dev Client.
3. Add the two files from this folder into the generated iOS project target:
   - `SpotifyAppRemoteModule.swift`
   - `SpotifyAppRemoteModuleBridge.m`
4. Add Spotify iOS SDK (`SpotifyiOS`) to the iOS project (SPM or CocoaPods).
5. Rebuild the Dev Client and run the app there (Expo Go cannot load this native bridge).
6. Ensure OAuth scope includes `app-remote-control` and pass a valid Spotify user access token to `connect(accessToken)` (this repo now fetches it from backend `/auth/spotify/token`).

No OAuth/redirect/auth flow changes are required by this module.
