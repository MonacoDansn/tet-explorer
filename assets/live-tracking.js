/* ════════════════════════════════════════════════════════════════
   ENDURO EXPLORERS — Live GPS Tracking
   Firebase Realtime DB (onChildAdded) + Leaflet-Karte
   ════════════════════════════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, query, orderByKey, onChildAdded }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── Firebase-Config (öffentlich; Schutz läuft über Security Rules) ──
const firebaseConfig = {
  apiKey: "AIzaSyDe94HBnnBTh0u2KMcJz-HbQc4haoRorvM",
  authDomain: "enduro-explorers-live.firebaseapp.com",
  databaseURL: "https://enduro-explorers-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "enduro-explorers-live",
  appId: "1:577325830451:web:881acb1341f91b4b506e46"
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
    // Karte immer auf die komplette Spur skalieren
    map.fitBounds(trail.getBounds().pad(0.25));
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
