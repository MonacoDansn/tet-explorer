# Live-GPS-Tracking — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Handy sendet per GPSLogger live seine Position an Firebase; `explore-2026.html` zeigt sie in Echtzeit als Marker + gefahrene Spur.

**Architecture:** Statische GitHub-Pages-Site. GPSLogger (Android) POSTet Positionspunkte an eine Firebase Realtime Database. Das Firebase-JS-SDK auf `explore-2026.html` hört per `onChildAdded` live mit und rendert eine Leaflet-Karte (Polyline-Spur + Live-Marker + Info-Box). Kein eigenes Backend, kein Build-Tool.

**Tech Stack:** HTML/CSS/Vanilla-JS, Leaflet 1.9.4 (CDN), Firebase Realtime Database + Firebase JS SDK v10 (CDN, ES-Module), GPSLogger for Android (fertige App).

**Hinweis zur Verifikation:** Dieses Repo hat **kein** automatisiertes Test-Framework (reine statische Site). Verifikation erfolgt daher durch (a) ein PowerShell-Simulationsskript, das echte Punkte an Firebase sendet, und (b) manuelles Beobachten der Seite im Browser. Das ist die dem Projekt angemessene Prüfmethode.

**Repo:** `C:\Users\KaltenbrunnD\OneDrive\3D_Druck\202601_Huawei_Mini_Display\TET_Website`, Branch `live-gps-tracking`.

---

## Dateiübersicht

- **Create** `docs/live-tracking-setup.md` — Anleitung: Firebase-Projekt, Security Rules, GPSLogger-Konfig, „neue Tour"-Reset.
- **Create** `assets/live-tracking.js` — Firebase-Anbindung + Leaflet-Live-Karte (ES-Modul).
- **Create** `scripts/simulate-track.ps1` — sendet Testpunkte an Firebase (Verifikation ohne Handy).
- **Modify** `explore-2026.html` — Leaflet-Einbindung, Live-Sektion, Live-CSS im `<style>`-Block, Modul-Script.
- **Modify** `kontakt.html` — Datenschutz-Absatz zu Live-Ortung.

**Platzhalter-Konvention:** Die Firebase-Web-Config-Werte (`apiKey`, `projectId`, `databaseURL`, `appId`) sowie der Datenbank-Secret sind bis Task 1 unbekannt. In allen Code-Blöcken stehen sie als `REPLACE_*` und werden in Task 4 / Task 6 mit den echten Werten aus Task 1 ersetzt.

---

## Task 1: Firebase-Projekt & Datenbank anlegen (User-Aktion, geführt)

**Files:** keine (Firebase-Konsole)

- [ ] **Step 1: Projekt anlegen**

Auf https://console.firebase.google.com „Projekt hinzufügen" → Name z.B. `enduro-explorers-live`. Google Analytics kann deaktiviert werden.

- [ ] **Step 2: Realtime Database erstellen**

Menü „Build → Realtime Database" → „Datenbank erstellen" → **Standort `europe-west1` (Belgien)** wählen (EU/DSGVO) → im Startdialog „Im gesperrten Modus starten".

- [ ] **Step 3: Security Rules setzen**

Reiter „Regeln" → exakt einfügen und veröffentlichen:

```json
{
  "rules": {
    "tracks": {
      "2026": {
        ".read": true,
        ".write": false
      }
    }
  }
}
```

Bedeutung: Jeder darf `tracks/2026` **lesen** (die Website). Normales Schreiben ist gesperrt. GPSLogger und das Simulationsskript schreiben mit dem Datenbank-Secret (nächster Schritt), das die Regeln als Admin **umgeht** — so kann niemand ohne Secret die Position fälschen.

- [ ] **Step 4: Datenbank-Secret holen**

Zahnrad → „Projekteinstellungen" → Reiter „Dienstkonten" → „Datenbankgeheimnisse" (Database secrets) → vorhandenes Secret anzeigen/erstellen und **notieren**. (Legacy-Feature, für diesen Zweck bewusst gewählt — Trade-off ist im Design dokumentiert.)

- [ ] **Step 5: Web-App-Config holen**

Projektübersicht → „App hinzufügen" → Web (`</>`) → App registrieren (kein Hosting nötig). Das angezeigte `firebaseConfig`-Objekt **kopieren**: `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`.

- [ ] **Step 6: Werte bereitstellen**

`databaseURL`, das vollständige `firebaseConfig` und den Datenbank-Secret dem Implementierer (Claude) übergeben — sie füllen die `REPLACE_*`-Platzhalter in Task 4 und Task 6.

**Verifikation:** In der Konsole unter „Realtime Database → Daten" ist die (leere) DB sichtbar; `databaseURL` hat die Form `https://<projectId>-default-rtdb.europe-west1.firebasedatabase.app`.

---

## Task 2: Setup-Anleitung schreiben

**Files:**
- Create: `docs/live-tracking-setup.md`

- [ ] **Step 1: Anleitungsdatei erstellen**

Inhalt (exakt):

````markdown
# Live-Tracking — Einrichtung & Betrieb

## 1. Firebase (einmalig)
Siehe Implementierungsplan Task 1: Projekt anlegen, Realtime Database in
`europe-west1`, Regeln setzen, Datenbank-Secret + Web-Config notieren.

Regeln (Reiter „Regeln"):
```json
{ "rules": { "tracks": { "2026": { ".read": true, ".write": false } } } }
```

## 2. GPSLogger (Android) konfigurieren
1. GPSLogger installieren (F-Droid oder Play Store).
2. „Logging details → Log to custom URL" aktivieren.
3. **URL:**
   `https://REPLACE_PROJECT-default-rtdb.europe-west1.firebasedatabase.app/tracks/2026.json?auth=REPLACE_SECRET`
4. **HTTP Method:** `POST`
5. **HTTP Body:**
   `{"lat":%LAT,"lon":%LON,"t":%TIMESTAMP,"spd":%SPD}`
6. **HTTP Headers:** `Content-Type: application/json`
7. „Performance → Logging interval": **30 Sekunden**; „Distance filter": **250 Meter**.
8. Zum Tourstart in GPSLogger auf **Start** tippen; zum Ende auf **Stop**.

Hinweis: `%TIMESTAMP` = Unix-Sekunden, `%SPD` = Geschwindigkeit in m/s
(0 im Stand). Die Website rechnet in km/h um.

## 3. Neue Tour starten (Track zurücksetzen)
Firebase-Konsole → „Realtime Database → Daten" → Knoten `tracks/2026`
auswählen → löschen (Papierkorb). Die Karte startet dann leer.

## 4. Datenschutz
Die Live-Ortung ist freiwillig und nur während aktiver Touren in Betrieb.
Details siehe Datenschutzabschnitt auf kontakt.html.
````

- [ ] **Step 2: Commit**

```
git add docs/live-tracking-setup.md
git commit -m "docs: Anleitung Live-Tracking (Firebase + GPSLogger)"
```

---

## Task 3: Live-Tracking-JavaScript anlegen (mit Platzhalter-Config)

**Files:**
- Create: `assets/live-tracking.js`

- [ ] **Step 1: Datei mit vollständigem Code erstellen**

```js
/* ════════════════════════════════════════════════════════════════
   ENDURO EXPLORERS — Live GPS Tracking
   Firebase Realtime DB (onChildAdded) + Leaflet-Karte
   ════════════════════════════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, query, orderByKey, onChildAdded }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── Firebase-Config (öffentlich; Schutz läuft über Security Rules) ──
const firebaseConfig = {
  apiKey: "REPLACE_API_KEY",
  authDomain: "REPLACE_PROJECT.firebaseapp.com",
  databaseURL: "https://REPLACE_PROJECT-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "REPLACE_PROJECT",
  appId: "REPLACE_APP_ID"
};

const TRACK_PATH = "tracks/2026";
const OFFLINE_AFTER_MS = 5 * 60 * 1000; // 5 Minuten

const mapEl = document.getElementById("live-map");
if (mapEl) initLive();

function initLive() {
  const map = L.map("live-map", { scrollWheelZoom: false }).setView([46.5, 8.0], 5);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap-Mitwirkende &copy; CARTO',
    maxZoom: 19
  }).addTo(map);

  const trail = L.polyline([], { color: "#d4a41c", weight: 4, opacity: 0.9 }).addTo(map);
  const points = [];
  let marker = null;
  let lastT = 0;        // epoch ms des letzten Punkts
  let lastSpeed = null; // m/s
  let fitted = false;

  const infoEl = document.getElementById("live-info");

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  onChildAdded(query(ref(db, TRACK_PATH), orderByKey()), (snap) => {
    const p = snap.val();
    if (!p || typeof p.lat !== "number" || typeof p.lon !== "number") return;
    const latlng = [p.lat, p.lon];
    points.push(latlng);
    trail.setLatLngs(points);
    lastT = (Number(p.t) || 0) * 1000;
    lastSpeed = typeof p.spd === "number" ? p.spd : null;
    if (!marker) marker = L.marker(latlng, { icon: liveIcon(false) }).addTo(map);
    else marker.setLatLng(latlng);
    if (!fitted) { map.fitBounds(trail.getBounds().pad(0.25)); fitted = true; }
    else { map.panTo(latlng); }
    render();
  });

  function liveIcon(offline) {
    return L.divIcon({
      className: "",
      html: '<div class="live-dot' + (offline ? " offline" : "") + '"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  function render() {
    if (!infoEl) return;
    if (!points.length) { infoEl.textContent = "Noch keine Live-Daten."; return; }
    const ageMs = Date.now() - lastT;
    const offline = ageMs > OFFLINE_AFTER_MS;
    if (marker) marker.setIcon(liveIcon(offline));
    const kmh = lastSpeed != null ? Math.round(lastSpeed * 3.6) : null;
    if (offline) {
      infoEl.innerHTML = '<span class="live-badge off">Offline</span> Zuletzt gesehen: ' + timeAgo(ageMs);
    } else {
      infoEl.innerHTML = '<span class="live-badge on">● Live</span> Aktuell · ' + timeAgo(ageMs)
        + (kmh != null ? ' · ' + kmh + ' km/h' : '');
    }
  }

  function timeAgo(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return "gerade eben";
    const m = Math.round(s / 60);
    if (m < 60) return "vor " + m + " Min";
    const h = Math.round(m / 60);
    return "vor " + h + " Std";
  }

  // Info-Box regelmäßig aktualisieren (damit „vor X Min" / Offline-Status läuft)
  setInterval(render, 15000);
}
```

- [ ] **Step 2: Commit**

```
git add assets/live-tracking.js
git commit -m "feat: Live-Tracking-Modul (Firebase + Leaflet), Config-Platzhalter"
```

---

## Task 4: Echte Firebase-Config einsetzen

**Files:**
- Modify: `assets/live-tracking.js` (nur `firebaseConfig`-Block)

- [ ] **Step 1: Platzhalter ersetzen**

Im `firebaseConfig`-Objekt `REPLACE_API_KEY`, `REPLACE_PROJECT` (an allen Stellen) und `REPLACE_APP_ID` durch die echten Werte aus Task 1 Step 5 ersetzen. `databaseURL` muss exakt der Wert aus der Konsole sein (Region prüfen).

- [ ] **Step 2: Commit**

```
git add assets/live-tracking.js
git commit -m "chore: echte Firebase-Config eingesetzt"
```

---

## Task 5: `explore-2026.html` erweitern

**Files:**
- Modify: `explore-2026.html`

- [ ] **Step 1: Leaflet im `<head>` einbinden**

Direkt **nach** der Zeile `<link rel="stylesheet" href="assets/style.css">` einfügen:

```html
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

- [ ] **Step 2: Live-CSS in den vorhandenen `<style>`-Block einfügen**

Am **Ende** des bestehenden `<style>`-Blocks (direkt vor `</style>`) einfügen:

```css
        .live-map-wrap { margin: 2rem 0; }
        #live-map { width: 100%; height: 460px; border: 1px solid var(--gold); border-radius: 4px; overflow: hidden; z-index: 0; }
        #live-info { margin-top: 0.8rem; font-family: 'Inter', sans-serif; font-size: 0.95rem; color: var(--text-muted); text-align: center; }
        .live-badge { font-weight: 700; margin-right: 0.4rem; }
        .live-badge.on { color: #3ad07a; }
        .live-badge.off { color: #999; }
        .live-dot { width: 16px; height: 16px; border-radius: 50%; background: #3ad07a; border: 2px solid #fff; box-shadow: 0 0 0 0 rgba(58,208,122,0.6); animation: livePulse 1.8s infinite; }
        .live-dot.offline { background: #999; animation: none; }
        @keyframes livePulse {
            0%   { box-shadow: 0 0 0 0 rgba(58,208,122,0.55); }
            70%  { box-shadow: 0 0 0 14px rgba(58,208,122,0); }
            100% { box-shadow: 0 0 0 0 rgba(58,208,122,0); }
        }
```

- [ ] **Step 3: Live-Sektion einfügen (oberhalb der gpx.studio-Sektion)**

**Vor** der Zeile `<section class="section-wrap fade-in">` die die `<h2>Live <span>GPX-Karte</span></h2>` enthält, folgende neue Sektion einfügen:

```html
<section class="section-wrap fade-in">
    <div class="section-header">
        <h2>Live <span>Position</span></h2>
        <p>Wo die Gruppe gerade ist — live während der Tour. Aktueller Standort plus die bisher gefahrene Spur.</p>
    </div>
    <div class="live-map-wrap">
        <div id="live-map"></div>
        <div id="live-info">Noch keine Live-Daten.</div>
    </div>
</section>
```

- [ ] **Step 4: Modul-Script vor `</body>` einbinden**

**Nach** der Zeile `<script src="assets/site.js" defer></script>` einfügen:

```html
<script type="module" src="assets/live-tracking.js"></script>
```

- [ ] **Step 5: Commit**

```
git add explore-2026.html
git commit -m "feat: Live-Position-Sektion mit Leaflet-Karte auf explore-2026"
```

---

## Task 6: Simulationsskript für Verifikation

**Files:**
- Create: `scripts/simulate-track.ps1`

- [ ] **Step 1: Skript erstellen**

```powershell
# Sendet Testpunkte an Firebase, um die Live-Karte ohne Handy zu prüfen.
# Aufruf:
#   .\scripts\simulate-track.ps1 -DbUrl "https://<projectId>-default-rtdb.europe-west1.firebasedatabase.app" -Secret "<DB_SECRET>"
param(
    [Parameter(Mandatory=$true)][string]$DbUrl,
    [Parameter(Mandatory=$true)][string]$Secret,
    [int]$IntervalSec = 3
)
$endpoint = "$DbUrl/tracks/2026.json?auth=$Secret"
# Ein paar Punkte vom Gardasee Richtung Westen
$route = @(
    @{ lat = 45.6495; lon = 10.6853 },
    @{ lat = 45.6510; lon = 10.6300 },
    @{ lat = 45.6600; lon = 10.5600 },
    @{ lat = 45.6720; lon = 10.4800 },
    @{ lat = 45.6850; lon = 10.4000 },
    @{ lat = 45.7000; lon = 10.3200 }
)
foreach ($pt in $route) {
    $epoch = [int][math]::Floor((Get-Date -UFormat %s))
    $body = @{ lat = $pt.lat; lon = $pt.lon; t = $epoch; spd = 12.5 } | ConvertTo-Json -Compress
    Invoke-RestMethod -Method Post -Uri $endpoint -Body $body -ContentType 'application/json' | Out-Null
    Write-Host "gesendet: $($pt.lat), $($pt.lon)"
    Start-Sleep -Seconds $IntervalSec
}
Write-Host "Fertig. Karte auf explore-2026.html prüfen."
```

- [ ] **Step 2: Commit**

```
git add scripts/simulate-track.ps1
git commit -m "test: PowerShell-Simulationsskript für Live-Track"
```

---

## Task 7: Verifikation mit simulierten Daten

**Files:** keine (Prüfung)

- [ ] **Step 1: Track leeren**

Firebase-Konsole → Realtime Database → Daten → falls `tracks/2026` existiert, löschen.

- [ ] **Step 2: Seite öffnen**

`explore-2026.html` im Browser öffnen (lokal per Doppelklick oder über die Live-Domain nach Deploy). Erwartung: Live-Sektion sichtbar, Karte lädt, Text „Noch keine Live-Daten."

- [ ] **Step 3: Simulation starten**

In PowerShell im Repo-Ordner:

```
.\scripts\simulate-track.ps1 -DbUrl "https://<projectId>-default-rtdb.europe-west1.firebasedatabase.app" -Secret "<DB_SECRET>"
```

Erwartung im Browser (ohne Neuladen): Grüner pulsierender Marker erscheint, bewegt sich mit jedem Punkt, die goldene Spur wächst, Info-Box zeigt „● Live · gerade eben · ~45 km/h".

- [ ] **Step 4: Offline-Zustand prüfen**

Simulation zu Ende laufen lassen und ~5 Min warten (oder `OFFLINE_AFTER_MS` in `assets/live-tracking.js` temporär auf `10 * 1000` setzen, Seite neu laden, prüfen, danach zurücksetzen). Erwartung: Marker wird grau, Info-Box „Offline — Zuletzt gesehen: vor X Min", Spur bleibt sichtbar.

- [ ] **Step 5: Ergebnis festhalten**

Funktioniert alles → weiter. Falls nicht: Browser-Konsole auf Fehler prüfen (häufig: falsche `databaseURL`/Region, Rules nicht veröffentlicht, Secret falsch).

---

## Task 8: Datenschutz ergänzen

**Files:**
- Modify: `kontakt.html`

- [ ] **Step 1: Datenschutz-Absatz einfügen**

Im Datenschutz-Abschnitt (`#datenschutz`), innerhalb der Liste „Welche Daten wir erheben", einen neuen Punkt ergänzen (analog zum bestehenden Listen-Markup der Seite — vor dem Einfügen die genaue Listenstruktur in `kontakt.html` lesen und dem Muster folgen):

```html
<li><strong>Live-Standort (nur während Touren):</strong> Bei aktivem Live-Tracking sendet ein Vereinsgerät (App „GPSLogger") in Intervallen Standortkoordinaten, Zeit und Geschwindigkeit an eine Realtime-Datenbank von Google Firebase (Google Ireland Ltd.), Serverstandort EU (europe-west1). Diese Daten werden auf der Seite „Explore our 2026" öffentlich als Karte angezeigt. Das Tracking ist freiwillig, wird von der sendenden Person manuell gestartet/gestoppt und nur während Touren betrieben. Der Track wird nach Tourende gelöscht. Rechtsgrundlage: Art. 6(1)(a) DSGVO (Einwilligung der sendenden Person) bzw. Art. 6(1)(f) DSGVO.</li>
```

- [ ] **Step 2: Commit**

```
git add kontakt.html
git commit -m "docs: Datenschutz-Absatz zu Live-Standort (Firebase)"
```

---

## Task 9: Zusammenführen & Deploy

**Files:** keine

- [ ] **Step 1: Alles committet?**

```
git status -s
```
Erwartung: leer.

- [ ] **Step 2: Nach `main` mergen**

```
git checkout main
git merge --no-ff live-gps-tracking -m "feat: Live-GPS-Tracking auf explore-2026"
```

- [ ] **Step 3: Push (deployt GitHub Pages → tour.enduro-explorers.at)**

```
git push origin main
```

- [ ] **Step 4: Live prüfen**

Nach ~1–2 Min `https://tour.enduro-explorers.at/explore-2026.html` öffnen, Simulation erneut starten, Live-Marker auf der echten Seite bestätigen.

---

## Offene Punkte / Reihenfolge-Hinweis

- Task 1 (User) muss vor Task 4, 6, 7 abgeschlossen sein (liefert Config + Secret).
- Tasks 2, 3, 5 sind ohne Firebase-Werte machbar (Platzhalter).
- Wenn kein automatischer Zugriff auf die Firebase-Konsole besteht, führt der User die Konsolen-Schritte selbst aus; Claude liefert exakte Werte/JSON.
