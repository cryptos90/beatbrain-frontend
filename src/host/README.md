# Host Web App

Dieser Ordner enthält die Host-Webapp für den Big-Screen-Flow:
- Login (HostLoginScreen)
- Lobby (HostLobbyScreen)
- Quiz Setup (HostQuizSetupScreen)
- Quiz (HostQuizScreen)
- Results (HostResultsScreen)

## Host-Erkennung

- Der Host-Flow wird nur im Web gerendert.
- Einstieg ist `beatbrain-frontend/App.tsx`.
- Host wird aktiviert, wenn `Platform.OS === "web"` und entweder die Route mit `/host` beginnt oder keine Mobile-Query-Parameter wie `joinCode`, `sessionId`, `code`, `auth_code`, `state` oder `error` vorhanden sind.

## Layout-Prinzip

- `center when there is space, otherwise scroll`
- Die gemeinsame Viewport-Huelle liegt in `src/host/components/HostPage.tsx`.
- `src/host/components/HostLayout.tsx` nutzt `HostPage` unterhalb des Host-Headers mit Logo.
- Wenn der verfuegbare Platz groesser als der Screen-Content ist, wird vertikal zentriert.
- Wenn der Content hoeher als der verfuegbare Bereich ist, startet die Seite oben und scrollt vertikal statt abgeschnitten zu werden.

## Verwendete Screens

- Start/Login: `HostLoginScreen`
- Session/Lobby: `HostLobbyScreen`
- Setup-Auswahl: `HostSetupModeScreen`
- Quiz-Auswahl: `HostQuizSetupScreen`
- Quiz per Playlist-ID: `HostQuizCreateScreen`
- Live-Quiz: `HostQuizScreen`
- Results: `HostResultsScreen`

## Responsive Hinweise

- Alle Host-Screens laufen ueber `HostLayout` und damit indirekt ueber `HostPage`.
- Buttons bleiben in moderaten Breiten statt fensterbreit zu werden.
- Mehrspaltige Bereiche fallen bei kleineren Browserbreiten auf eine Spalte zurueck.
- Diese Anpassungen sind host-only; mobile Screens und mobile Navigation bleiben unberuehrt.

## Lokal testen

- `cd beatbrain-frontend`
- `npm run start:web`
- `http://localhost:8081/` oder `http://localhost:8081/host/start` im Browser aufrufen
- Relevante Host-Web-Breakpoints: `1920x1080`, `1366x768`, `1024x768`, `390x844`
