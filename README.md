# beatbrain-frontend

Expo frontend for BeatBrain (singleplayer, host, player flows).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` (copy from `.env.example`) and set at least:

```env
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=<your-client-id>
EXPO_PUBLIC_SPOTIFY_REDIRECT_URI=beatbrain-login://callback
EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB=http://127.0.0.1:3000/auth/spotify/callback
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

Notes:
- Keep `.env` local only; do not commit it.
- `.env.example` must stay secret-free.
- `EXPO_PUBLIC_API_BASE_URL` is optional when you start via `start-frontend.bat`; the launcher auto-detects the current machine's LAN IP and uses `http://<detected-ip>:3000`.

## Run locally

Option 1 (script in this folder):

```bat
start-frontend.bat
```

`start-frontend.bat` startet jetzt standardmäßig im stabilen LAN-Modus. Wenn du den Expo-Tunnel wirklich brauchst, starte ihn explizit mit `tunnel`.

Optional modes:

```bat
start-frontend.bat web
start-frontend.bat lan
start-frontend.bat tunnel
```

Optional backend override:

```bat
start-frontend.bat lan 192.168.2.50
start-frontend.bat lan http://192.168.2.50:3000
```

Option 2 (manual):

```bash
npm run start
```

`npm run start` startet jetzt ebenfalls `start:lan`.

For Expo Web / host mode:

```bash
npm run start:web
```

Notes:
- Opening `http://localhost:8081/` now defaults to the host web app and canonicalizes to `/host/start`.
- Player join links still use the root URL with query params, for example `http://localhost:8081/?joinCode=ABCD`.
- Host-Web nutzt den gemeinsamen Layoutpfad `src/host/components/HostLayout.tsx` + `src/host/components/HostPage.tsx` mit dem Prinzip `center when there is space, otherwise scroll`; Mobile bleibt davon unberuehrt.
- Host-Web-Groessen kommen host-only aus `src/host/hooks/useHostViewport.ts`, mit den Breakpoints `narrow < 1024`, `laptop 1024-1439`, `wide >= 1440` plus `shortHeight < 780`, damit Header, Cards, Buttons und Typografie auf Breite und Hoehe des Browser-Viewports reagieren statt auf feste Monitor-Groessen.
- Die Host-Playlist-Auswahl bleibt ein responsives Carousel in `src/host/screens/HostChoosePlaylistScreen.tsx`; der Look bleibt gleich, wird aber ueber Breite/Hoehe sauber skaliert.
- Fuer lokale Host-Web-Checks wurden die Breakpoints `2560x1440`, `1920x1080`, `1366x768`, `1280x800`, `1024x768`, `820x600` und `390x844` als relevante Layout-Groessen festgehalten.

## Spotify redirect URI rules

- Mobile (Expo/React Native): `beatbrain-login://callback`
- Local web: `http://127.0.0.1:<PORT>/auth/spotify/callback` (or `http://[::1]:<PORT>/auth/spotify/callback`)
- Production web: `https://<domain>/.../callback`
- Avoid `192.168.x.x`, `localhost` mismatches, and `exp://...` as Spotify redirect URI.
