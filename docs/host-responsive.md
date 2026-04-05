# Host Responsive

## Scope

Diese Doku beschreibt die aktuelle responsive Ueberarbeitung des browserbasierten Host-Modus unter `beatbrain-frontend/src/host/*`.

Angepasste Screens:
- `HostLoginScreen`
- `HostLobbyScreen`
- `HostSetupModeScreen`
- `HostChoosePlaylistScreen`
- `HostQuizCreateScreen`
- `HostQuizScreen`
- `HostResultsScreen`
- gemeinsame Huelle: `HostLayout`, `HostPage`, `HostHeader`, `HostActionButton`, `HostActionBar`

## Konkrete Ursachen, die gefunden wurden

- Der fruehere QA-Check pruefte nur Dokument-Overflow. Mehrere Host-Screens waren trotzdem in einer inneren Web-`ScrollView` zu hoch und erzeugten vertikale Scrollbars bzw. abgeschnittene Inhalte.
- Header, Branding-Badge, Logo und Notice waren auf Laptop-Hoehen noch zu dominant und verbrauchten zu viel vertikalen Raum.
- Die fruehere `compactViewport`-Heuristik behandelte niedrige Laptop-Hoehen zu spaet, waehrend `HostActionBar` dadurch auf breiten, aber niedrigen Viewports unnoetig vertikal stapelte.
- `HostChoosePlaylistScreen` zeigte auf Laptop-Hoehen gleichzeitig Kopfpanel, Kartenraster und eine zweite grosse Zusammenfassungskarte. Das war zu viel vertikaler Inhalt.
- `HostLobbyScreen` liess die Player-Stage auf mittleren Desktop-/Laptop-Hoehen zu spaet in genug Spalten laufen.
- `HostResultsScreen` war durch nur zwei Ergebnis-Spalten plus gestapelte CTA-Reihe zu hoch.
- `HostQuizScreen` nutzte im Reveal zu viel Vertikalraum fuer Antwortkarten plus getrennten Song-Info- und Next-Status-Bereich.

## Aktuelle Responsive Strategie

- Width breakpoints in `src/host/hooks/useHostViewport.ts`:
  - `verySmall <= 359`
  - `small 360-479`
  - `mobile 480-767`
  - `tablet 768-1023`
  - `laptop 1024-1279`
  - `desktop 1280-1599`
  - `wide >= 1600`
- Height-aware flags:
  - `compactHeight < 860`
  - `lowHeight < 760`
  - `veryLowHeight < 680`
  - `shortHeight < 700`
  - `veryShortHeight < 580`
  - `landscapePhone <= 932x430`
- Zusatzflags:
  - `largeDisplay >= 2440`
  - `4K >= 3840` oder `2160` Hoehe
- Fluid sizing:
  - gemeinsame host-only Tokens fuer Spacing, Panel-Padding, Radien, Typografie und Control-Min-Heights
  - `fluidBetween(...)`, `fluid(...)` plus zusaetzliche height-density-Skalierung fuer niedrige Laptop-Hoehen

## Verwendete responsive Primitives

- `src/host/hooks/useHostViewport.ts`
- `src/host/components/HostScreenContainer.tsx`
- `src/host/components/HostPanel.tsx`
- `src/host/components/HostActionBar.tsx`
- `src/host/components/HostResponsiveGrid.tsx`
- `src/host/components/HostPlayerAvatar.tsx`
- `src/host/components/HostPlayerStageGrid.tsx`

## Entfernte oder ersetzte problematische Muster

- Ersetzt: zu grosse Header-/Branding-Flaechen auf Laptop-Hoehen durch dichtere Header-Tokens.
- Ersetzt: height-insensitive Action-Bar-Stapelung auf breiten Laptop-Fenstern.
- Ersetzt: zweite grosse Auswahl-Zusammenfassung unter dem Kartenraster auf `Choose` durch eine kompakte Top-Zusammenfassung bei mittleren/niedrigen Hoehen.
- Ersetzt: zu spaete Spaltenverteilung in Lobby/Results durch dichtere Kartenraster auf Laptop-/Desktop-Breiten.
- Ersetzt: getrennte Reveal-Footer-Panels in `Quiz` durch eine kombinierte kompakte Footer-Variante auf Laptop-/Desktop-Hoehen.
- Verstaerkt: `HostPage` nutzt kleinere top/bottom Paddings bei niedriger Hoehe und aktiviert Web-Scroll nur, wenn der Inhalt wirklich groesser ist.

## Screen-Verhalten jetzt

- Header / Branding:
  - Logo, Badge, Padding und Copy skalieren frueher kompakt.
  - Notice-Pill wird bei `compactHeight` ebenfalls verdichtet.
- Login:
  - kleinere Step-Karten, kleinere Statusbox, weniger Vertikalabstand.
  - CTA-Reihe bleibt auf breiten Laptop-Screens horizontal statt wegen geringer Hoehe zu stapeln.
- Lobby:
  - Sessioncode, QR-Bereich und Player-Cards sind hoehenbewusst kompakter.
  - Die Player-Stage hat jetzt eine feste responsive Hoehe; sie waechst nicht mehr mit jeder neuen Zeile.
  - `HostPlayerStageGrid` misst die verfuegbare Breite und berechnet daraus Reihen/Spalten/Kachelgroessen fuer die aktuelle Spieleranzahl.
  - Die Spielerkacheln schrumpfen innerhalb derselben Stage, statt den Bereich nach unten aufzusprengen.
- Setup:
  - Tempo-Panel und Modus-Karten sind dichter, aber bleiben klar lesbar.
- Choose:
  - auf Laptop-Hoehen wird die aktive Auswahl nach oben integriert statt als zusaetzlicher grosser Footer-Block gerendert.
  - Playlist-Karten nutzen flachere Cover-Proportionen bei knapper Hoehe.
- Quiz / Reveal:
  - Frage, Timer und Progress wurden deutlich verdichtet.
  - Reveal-Antworten laufen auf Laptop/Desktop als breite Kartenreihe statt als hohe Stapel.
  - Song-Info und `Naechste Frage` werden bei mittleren/niedrigen Hoehen in einem gemeinsamen kompakten Footer kombiniert.
- Results:
  - mehr Ergebnis-Spalten auf Laptop/Desktop, kleinere Karten, CTA-Reihe bleibt auf breiten Viewports horizontal.

## Container Query Einsatz

- Es wurden weiterhin keine nativen CSS-`@container`-Regeln eingefuehrt.
- Komponentenlokales Reflow-Verhalten kommt ueber gemessene Breiten in `HostResponsiveGrid` und ueber host-only Width/Height-Flags aus `useHostViewport`.

## Verifikation

Genutzte lokale Verifikationsschritte:
- `npx tsc --noEmit`
- `npx expo export -p web --dev --clear --max-workers 1`
- `node scripts/serve-dist.cjs dist 8081`
- `node scripts/verify-host-responsive.cjs`

Wichtige QA-Aenderung:
- `verify-host-responsive.cjs` prueft jetzt nicht mehr nur Dokument-Overflow.
- Es erkennt auch innere scrollbare Web-Regionen (`overflow-y: auto|scroll|overlay`) mit realem vertikalem Delta.
- Die Lobby-Preview rendert jetzt bewusst 10 Spieler, damit die Player-Stage auch im Vollbelegungsfall geprueft wird.

Gepruefte Viewports:
- `320x568`
- `360x640`
- `375x667`
- `390x844`
- `414x896`
- `568x320`
- `640x360`
- `900x650`
- `768x1024`
- `820x1180`
- `1024x640`
- `1024x768`
- `1280x680`
- `1280x800`
- `1366x650`
- `1366x768`
- `1440x900`
- `1536x864`
- `1920x1080`
- `2440x1440`
- `3840x2160`

Zentral verifizierte Laptop-/Desktop-Screens ohne internen oder externen Overflow:
- Login bei `1280x800`, `1366x768`, `1440x900`, `1536x864`, `1920x1080`, `2440x1440`, `3840x2160`
- Lobby bei `1280x800`, `1366x768`, `1440x900`, `1536x864`, `1920x1080`, `2440x1440`, `3840x2160`
- Setup bei `1280x800`, `1366x768`, `1440x900`, `1536x864`, `1920x1080`, `2440x1440`, `3840x2160`
- Create bei `1280x800`, `1366x768`, `1440x900`, `1536x864`, `1920x1080`, `2440x1440`, `3840x2160`
- Choose bei `1280x800`, `1366x768`, `1440x900`, `1536x864`, `1920x1080`, `2440x1440`, `3840x2160`
- Quiz Question bei `1280x800`, `1366x768`, `1440x900`, `1536x864`, `1920x1080`, `2440x1440`, `3840x2160`
- Quiz Reveal bei `1280x800`, `1366x768`, `1440x900`, `1536x864`, `1920x1080`, `2440x1440`, `3840x2160`
- Results bei `1280x800`, `1366x768`, `1440x900`, `1536x864`, `1920x1080`, `2440x1440`, `3840x2160`

## Bekannte Restprobleme

- Ultra-niedrige oder smartphone-aehnliche Preview-Viewports (`320x568`, `640x360` und aehnliche Reflow-Szenarien) erzeugen in mehreren Host-Screens weiterhin vertikale Scrollbereiche.
- Zusatzausreisser im aktuellen QA-Report:
  - `Lobby` bei `900x650` und `1024x640`
  - `Quiz Reveal` bei `900x650`, `1024x640`, `1024x768`, `768x1024`, `820x1180`
  - `Results` bei `768x1024` und `1280x680`
- Diese Restpunkte betreffen nicht die zentrale Laptop-/Desktop-Abnahme, sind aber noch offen, wenn der Host-Flow auch fuer sehr schmale bzw. extrem niedrige Browserfenster vollstaendig scrollbarfrei werden soll.
