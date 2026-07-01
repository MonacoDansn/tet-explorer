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
