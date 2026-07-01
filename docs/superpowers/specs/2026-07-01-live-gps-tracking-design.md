# Live-GPS-Tracking für Enduro Explorers — Design

**Datum:** 2026-07-01
**Repo:** tet-explorer (GitHub: MonacoDansn/tet-explorer, Hosting: GitHub Pages, Domain: tour.enduro-explorers.at)
**Status:** Genehmigt (Design), bereit für Implementierungsplan

## Ziel

Ein Handy sendet während einer Tour laufend seine GPS-Position. Besucher der Website
sehen auf `explore-2026.html` in Echtzeit die aktuelle Position der Gruppe plus die
bisher gefahrene Spur.

## Szenario (festgelegt)

- **Ein** sendendes Gerät (Gruppenführer), nicht mehrere Fahrer.
- Öffentlich sichtbar auf der Website (kein Login/Passwortschutz).
- Mit Anzeige der **gefahrenen Spur** (Verlauf), nicht nur aktueller Punkt.

## Architektur / Datenfluss

```
[Android: GPSLogger App]  --HTTPS POST alle ~30 s / 250 m-->  [Firebase Realtime DB]
                                                                     |  (Echtzeit-Push via SDK)
                                                                     v
                                    [explore-2026.html: Leaflet-Karte hört live mit]
```

- **App → Firebase:** GPSLogger („Custom URL"-Logging) sendet jeden Punkt per HTTP POST.
- **Firebase → Website:** Firebase-JS-SDK (`onChildAdded` / `onValue`) pusht neue Punkte
  in Echtzeit an alle offenen Browser. Kein Polling nötig.

Begründung Firebase: geringster eigener Code, echtes Echtzeit-Push, kostenloser Tarif
ausreichend. Alternative Cloudflare Worker wurde verworfen (mehr Setup, Polling).

## Komponenten

### 1. Firebase Realtime Database

- Neues kostenloses Firebase-Projekt (vom User angelegt).
- Datenmodell:
  - `tracks/2026/<pushId>` = `{ lat: Number, lon: Number, t: Number (epoch ms/s), spd: Number }`
    — append-only Liste aller Positionspunkte der aktuellen Tour.
  - Optional abgeleitet: der zuletzt angehängte Punkt = aktuelle Position.
- **Security Rules:**
  - **Lesen:** öffentlich, aber nur auf `tracks/2026` beschränkt (nicht die ganze DB).
  - **Schreiben:** nur wenn der mitgesendete geheime Token mit dem in der DB hinterlegten
    Wert übereinstimmt → verhindert Fälschen der Position durch Dritte.
  - Der Token steckt ausschließlich in der GPSLogger-Konfiguration, nicht im
    öffentlichen Website-Code.
- Die Firebase-Web-Config (apiKey etc.) auf der Website ist bewusst öffentlich — bei
  Firebase normal; der Schutz läuft über die Security Rules.

### 2. GPSLogger-Konfiguration (fertige Open-Source-App, kein eigener Code)

- App: GPSLogger for Android (F-Droid / Play Store).
- „Log to custom URL":
  - Methode: POST
  - URL: Firebase-REST-Endpunkt für `tracks/2026`
  - Body (JSON) mit Platzhaltern: `%LAT`, `%LON`, `%TIME`, `%SPD` + geheimer Token
- Sende-Intervall: **alle 30 s oder 250 m**, je nachdem was zuerst eintritt.
- Hintergrund-Logging aktiv, Start/Stopp manuell durch den Fahrer.
- Deliverable: Schritt-für-Schritt-Anleitung mit exakten Feldwerten.

### 3. Website-Änderungen — `explore-2026.html`

- Neue Sektion „🔴 Live-Position" **oberhalb** der bestehenden gpx.studio-Route.
- **Leaflet** (bereits im Projekt verwendet) mit OSM/Carto-Kacheln — gleicher Look wie
  `index.html`.
- Darstellung:
  - **Spur** als Polyline über alle Punkte.
  - **Aktueller Marker** am letzten Punkt (dezent animiert).
  - **Info-Box:** „Aktuell · vor X Min · Y km/h".
- **Offline-Verhalten:** Wenn der letzte Punkt > 5 Min alt ist:
  - Marker wird grau/„offline".
  - Text „Zuletzt gesehen: vor X Min".
  - Spur bleibt immer sichtbar.
- Neue Datei `assets/live-tracking.js` für die Firebase-Anbindung und Kartenlogik,
  getrennt vom bestehenden `assets/site.js`.
- Firebase-SDK wird per CDN eingebunden (analog zur bestehenden Leaflet-Einbindung).

### 4. Datenschutz — `kontakt.html`

- Neuer Absatz in der bestehenden Datenschutz-Sektion:
  - Live-Standort via GPSLogger → Firebase (Google LLC als Auftragsverarbeiter).
  - Zweck: freiwillige Live-Ortung während Vereinstouren.
  - Nur während aktiver Touren in Betrieb.
  - Speicherdauer / Löschung des Tracks nach Tourende.
  - Rechtsgrundlage: Art. 6(1)(f) bzw. Einwilligung der sendenden Person.

## Bewusst nicht enthalten (YAGNI)

- Kein Multi-Fahrer-Tracking.
- Keine eigene Android-App.
- Kein Login / kein Admin-Panel.
- „Neue Tour starten" = einmaliges Löschen des Knotens `tracks/2026` in der
  Firebase-Konsole (wird in der Anleitung dokumentiert).

## Aufgaben des Users (einmalig)

1. Kostenloses Firebase-Projekt anlegen (geführt, ~5 Min).
2. GPSLogger installieren und die gelieferte Konfiguration eintragen (~10 Min).
3. Website-Code, Security Rules und Anleitungen werden von Claude gebaut und
   committet/gepusht.

## Sicherheit / Trade-offs

- Schreibschutz über gemeinsamen Token in den Security Rules — ausreichend für einen
  Hobby-Tour-Tracker, kein Hochsicherheits-Setup.
- Öffentliche Firebase-Web-Config ist Standard und unkritisch.
- Live-Position ist öffentlich sichtbar — bewusst so gewählt (öffentliches
  Tour-Livetracking).

## Offene Punkte

Keine. Design vom User genehmigt.
