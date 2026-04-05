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
- Host-Web-Groessen kommen host-only aus `src/host/hooks/useHostViewport.ts`, mit den Breakpoint-Baendern `359`, `479`, `767`, `1023`, `1279`, `1599`, `1600+` plus Zusatzflags fuer `shortHeight`, `landscapePhone`, `2440+` und `4K`.
- Fuer niedrige Laptop-Hoehen gibt es zusaetzlich host-only Flags `compactHeight (<860)`, `lowHeight (<760)` und `veryLowHeight (<680)`.
- Gemeinsame host-only Primitives fuer Reflow und Wrap liegen in `src/host/components/HostPanel.tsx`, `HostActionBar.tsx`, `HostResponsiveGrid.tsx`, `HostScreenContainer.tsx` und `HostPlayerAvatar.tsx`.
- Die Lobby-Spielerflaeche nutzt zusaetzlich `src/host/components/HostPlayerStageGrid.tsx`, damit viele Spieler die Stage nicht nach unten vergroessern, sondern ihre Kacheln innerhalb derselben Flaeche skalieren.
- Die Host-Playlist-Auswahl ist jetzt ein responsives Kartenraster statt eines horizontalen Carousels, damit kleine Browserfenster keinen Zoom-Workaround mehr brauchen.
- Browser-only Preview-Routen fuer Layout-QA liegen unter `/host/preview/*` und rendern dieselben Host-Screens mit festen Fixture-Daten.
- Die ausfuehrliche Responsive-Doku liegt unter `docs/host-responsive.md`.
- Fuer lokale Host-Web-Checks gibt es zusaetzlich:
  - `npx expo export -p web --dev --clear --max-workers 1`
  - `node scripts/serve-dist.cjs dist 8081`
  - `node scripts/verify-host-responsive.cjs`
- Das Verifikationsskript prueft jetzt sowohl horizontalen Overflow als auch innere vertikale Scroll-Regionen der Web-Host-Screens.

## Spotify redirect URI rules

- Mobile (Expo/React Native): `beatbrain-login://callback`
- Local web: `http://127.0.0.1:<PORT>/auth/spotify/callback` (or `http://[::1]:<PORT>/auth/spotify/callback`)
- Production web: `https://<domain>/.../callback`
- Avoid `192.168.x.x`, `localhost` mismatches, and `exp://...` as Spotify redirect URI.
