/* ════════════════════════════════════════════════════════════════
   ENDURO EXPLORERS — Live GPS Tracking
   Firebase Realtime DB (onChildAdded) + Leaflet-Karte
   - Spur pro Tag eingefärbt + Legende mit km/Tag (+10% Messfehler)
   - Hover über die Linie: Datum · Uhrzeit · Tempo
   - "Aktuelle Geschwindigkeit" = Ø der letzten 5 Minuten
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
const AVG_WINDOW_SEC = 5 * 60;          // Ø-Fenster: 5 Minuten
const DIST_FACTOR = 1.10;               // +10% wegen möglicher Messfehler
const DAY_COLORS = [
  "#d4a41c", "#3ad07a", "#4aa8ff", "#ff6b6b", "#b980ff",
  "#ff9f43", "#2ec4b6", "#e84393", "#00b894", "#fd79a8"
];
const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const mapEl = document.getElementById("live-map");
if (mapEl) initLive();

function initLive() {
  const map = L.map("live-map", { scrollWheelZoom: false }).setView([46.5, 8.0], 5);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap-Mitwirkende &copy; CARTO',
    maxZoom: 19
  }).addTo(map);

  const points = [];   // {lat, lon, t (Sekunden), spd (m/s|null)}
  const dayList = [];  // {key, color, pts:[], polyline}
  let marker = null;

  const infoEl = document.getElementById("live-info");
  const legendEl = document.getElementById("live-legend");

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  onChildAdded(query(ref(db, TRACK_PATH), orderByKey()), (snap) => {
    const p = snap.val();
    if (!p || typeof p.lat !== "number" || typeof p.lon !== "number") return;
    const pt = { lat: p.lat, lon: p.lon, t: Number(p.t) || 0, spd: typeof p.spd === "number" ? p.spd : null };
    points.push(pt);
    addPointToDay(pt);
    updateMarker();
    fitAll();
    renderInfo();
    renderLegend();
  });

  // ── Punkt in die passende Tages-Polyline einhängen ──
  function addPointToDay(pt) {
    const k = dayKey(pt.t);
    let day = dayList.length ? dayList[dayList.length - 1] : null;
    if (!day || day.key !== k) {
      const color = DAY_COLORS[dayList.length % DAY_COLORS.length];
      const polyline = L.polyline([], { color: color, weight: 4, opacity: 0.9 }).addTo(map);
      day = { key: k, color: color, pts: [], polyline: polyline };
      attachHover(day);
      dayList.push(day);
    }
    day.pts.push(pt);
    day.polyline.addLatLng([pt.lat, pt.lon]);
  }

  // ── Hover-Tooltip: nächstgelegener Punkt → Datum · Uhrzeit · Tempo ──
  function attachHover(day) {
    day.polyline.bindTooltip("", { sticky: true });
    day.polyline.on("mousemove", (e) => {
      const near = nearestPoint(day.pts, e.latlng);
      if (near) day.polyline.setTooltipContent(fmtHover(near));
    });
  }

  function updateMarker() {
    const last = points[points.length - 1];
    const latlng = [last.lat, last.lon];
    const offline = (Date.now() - last.t * 1000) > OFFLINE_AFTER_MS;
    if (!marker) marker = L.marker(latlng, { icon: liveIcon(offline) }).addTo(map);
    else { marker.setLatLng(latlng); marker.setIcon(liveIcon(offline)); }
  }

  function fitAll() {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 13);
    } else {
      const b = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      map.fitBounds(b.pad(0.25));
    }
  }

  function liveIcon(offline) {
    return L.divIcon({
      className: "",
      html: '<div class="live-dot' + (offline ? " offline" : "") + '"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  function renderInfo() {
    if (!infoEl) return;
    if (!points.length) { infoEl.textContent = "Noch keine Live-Daten."; return; }
    const lastT = points[points.length - 1].t * 1000;
    const ageMs = Date.now() - lastT;
    const offline = ageMs > OFFLINE_AFTER_MS;
    if (marker) marker.setIcon(liveIcon(offline));
    const kmh = avgSpeed5min();
    const spdTxt = kmh != null ? " · " + Math.round(kmh) + " km/h (Ø 5 Min)" : "";
    if (offline) {
      infoEl.innerHTML = '<span class="live-badge off">Offline</span> Zuletzt gesehen: ' + timeAgo(ageMs) + spdTxt;
    } else {
      infoEl.innerHTML = '<span class="live-badge on">● Live</span> Aktuell · ' + timeAgo(ageMs) + spdTxt;
    }
  }

  function renderLegend() {
    if (!legendEl) return;
    let total = 0;
    const parts = dayList.map(day => {
      const km = dayKm(day);
      total += km;
      return '<span class="legend-item"><span class="legend-dot" style="background:' + day.color + '"></span>'
        + fmtDayLabel(day.key) + ' — ' + km.toFixed(0) + ' km</span>';
    });
    const totalTxt = '<span class="legend-total">Gesamt: ' + total.toFixed(0) + ' km</span>';
    legendEl.innerHTML = parts.join("") + totalTxt;
  }

  // ── Ø-Geschwindigkeit der letzten 5 Minuten (Strecke ÷ Zeit) → km/h ──
  function avgSpeed5min() {
    if (!points.length) return null;
    if (points.length < 2) return points[0].spd != null ? points[0].spd * 3.6 : 0;
    const lastT = points[points.length - 1].t;
    const cutoff = lastT - AVG_WINDOW_SEC;
    const win = points.filter(p => p.t >= cutoff);
    if (win.length < 2) {
      const s = points[points.length - 1].spd;
      return s != null ? s * 3.6 : 0;
    }
    let dist = 0;
    for (let i = 1; i < win.length; i++) dist += haversine(win[i - 1], win[i]);
    const dt = win[win.length - 1].t - win[0].t;
    if (dt <= 0) {
      const s = points[points.length - 1].spd;
      return s != null ? s * 3.6 : 0;
    }
    return (dist / dt) * 3.6;
  }

  function dayKm(day) {
    let d = 0;
    for (let i = 1; i < day.pts.length; i++) d += haversine(day.pts[i - 1], day.pts[i]);
    return (d / 1000) * DIST_FACTOR;
  }

  // ── Helpers ──
  function dayKey(tSec) {
    const d = new Date(tSec * 1000);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function fmtDayLabel(key) {
    const parts = key.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return WD[d.getDay()] + " " + pad(d.getDate()) + "." + pad(d.getMonth() + 1) + ".";
  }

  function fmtHover(pt) {
    const d = new Date(pt.t * 1000);
    const date = WD[d.getDay()] + " " + pad(d.getDate()) + "." + pad(d.getMonth() + 1) + ".";
    const time = pad(d.getHours()) + ":" + pad(d.getMinutes()) + " Uhr";
    const spd = pt.spd != null ? " · " + Math.round(pt.spd * 3.6) + " km/h" : "";
    return date + " · " + time + spd;
  }

  function nearestPoint(pts, latlng) {
    let best = null, bd = Infinity;
    for (const p of pts) {
      const dx = p.lat - latlng.lat, dy = p.lon - latlng.lng;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function haversine(a, b) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
    const la1 = toRad(a.lat), la2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function timeAgo(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return "gerade eben";
    const m = Math.round(s / 60);
    if (m < 60) return "vor " + m + " Min";
    const h = Math.round(m / 60);
    return "vor " + h + " Std";
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  // Info-Box regelmäßig aktualisieren (Offline-Status / "vor X Min")
  setInterval(renderInfo, 15000);
}
