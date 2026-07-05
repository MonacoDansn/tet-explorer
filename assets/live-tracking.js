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

  // Render-Batching: beim Initial-Load kommen tausende Punkte einzeln rein —
  // UI-Updates (fitAll/Legende/Stats) nur 1× pro Frame statt pro Punkt.
  let renderScheduled = false;
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    setTimeout(() => {
      renderScheduled = false;
      updateMarker();
      fitAll();
      renderInfo();
      renderLegend();
      showGpxBtn();
    }, 250);
  }

  onChildAdded(query(ref(db, TRACK_PATH), orderByKey()), (snap) => {
    const p = snap.val();
    if (!p || typeof p.lat !== "number" || typeof p.lon !== "number") return;
    const pt = { lat: p.lat, lon: p.lon, t: Number(p.t) || 0, spd: typeof p.spd === "number" ? p.spd : null };
    points.push(pt);
    addPointToDay(pt);   // Polyline-Punkt sofort (billig), Rest gebatcht
    scheduleRender();
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

  // Auto-Fit nur solange der Besucher die Karte nicht selbst bewegt hat.
  // DOM-Events statt Leaflet-Events: programmatisches fitBounds feuert
  // zoomstart, aber keine echten Pointer-Events.
  let userMovedMap = false;
  const stopAutoFit = () => { userMovedMap = true; };
  mapEl.addEventListener("pointerdown", stopAutoFit, { passive: true });
  mapEl.addEventListener("wheel", stopAutoFit, { passive: true });

  function fitAll() {
    if (userMovedMap) return;
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
    let totalKm = 0, totalMoveSec = 0, totalMax = 0;
    const cards = dayList.map(day => {
      const st = dayStats(day);
      totalKm += st.km;
      totalMoveSec += st.moveSec;
      if (st.maxKmh > totalMax) totalMax = st.maxKmh;
      return '<div class="day-card">'
        + '<div class="day-card-head"><span class="legend-dot" style="background:' + day.color + '"></span>'
        + fmtDayLabel(day.key) + '</div>'
        + '<div class="day-card-stats">'
        + '<span>Strecke <b>' + st.km.toFixed(0) + ' km</b></span>'
        + '<span>Fahrzeit <b>' + fmtDur(st.moveSec) + '</b></span>'
        + '<span>&Oslash; Tempo <b>' + (st.avgKmh > 0 ? Math.round(st.avgKmh) + ' km/h' : '–') + '</b></span>'
        + '<span>Max <b>' + (st.maxKmh > 0 ? Math.round(st.maxKmh) + ' km/h' : '–') + '</b></span>'
        + '<span>Start <b>' + st.startTime + '</b></span>'
        + '<span>Ende <b>' + st.endTime + '</b></span>'
        + '</div></div>';
    });
    const totalCard = '<div class="day-total-card">'
      + '<span>Gesamt <b>' + totalKm.toFixed(0) + ' km</b></span>'
      + '<span>Fahrzeit <b>' + fmtDur(totalMoveSec) + '</b></span>'
      + (totalMax > 0 ? '<span>Top-Speed <b>' + Math.round(totalMax) + ' km/h</b></span>' : '')
      + '<span>Tage <b>' + dayList.length + '</b></span>'
      + '</div>';
    legendEl.innerHTML = cards.join("") + totalCard;
  }

  // ── Tages-Statistik: Strecke, Fahrzeit (in Bewegung), Ø/Max-Tempo, Start/Ende ──
  function dayStats(day) {
    let dist = 0, moveDist = 0, moveSec = 0, maxKmh = 0;
    for (let i = 1; i < day.pts.length; i++) {
      const a = day.pts[i - 1], b = day.pts[i];
      const d = haversine(a, b);
      const dt = b.t - a.t;
      const segKmh = dt > 0 ? (d / dt) * 3.6 : Infinity;
      // Strecke: GPS-Ausreißer raus (impliziertes Tempo > 160 km/h springt nicht real).
      // Lange Tracker-Lücken bleiben drin — die Luftlinie ist dort eine Untergrenze.
      if (segKmh <= 160) dist += d;
      // Fahrzeit/Ø-Tempo nur aus dichten Segmenten (Lücke ≤ 5 Min)
      if (dt > 0 && dt <= 300) {
        if (segKmh >= 3 && segKmh <= 160) { moveSec += dt; moveDist += d; }  // "in Bewegung" ab 3 km/h
        if (segKmh > maxKmh && segKmh <= 160) maxKmh = segKmh;
      }
      // Geräte-Speed ist genauer, wenn vorhanden
      if (b.spd != null) {
        const s = b.spd * 3.6;
        if (s > maxKmh && s <= 200) maxKmh = s;
      }
    }
    const first = day.pts[0], last = day.pts[day.pts.length - 1];
    return {
      km: (dist / 1000) * DIST_FACTOR,
      moveSec: moveSec,
      avgKmh: moveSec > 0 ? (moveDist / moveSec) * 3.6 : 0,
      maxKmh: maxKmh,
      startTime: first ? fmtClock(first.t) : "–",
      endTime: last ? fmtClock(last.t) : "–"
    };
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

  // ── GPX-Export: ein <trk> pro Tag, Zeitstempel in ISO-8601 ──
  const gpxBtn = document.getElementById("live-gpx-btn");
  if (gpxBtn) gpxBtn.addEventListener("click", downloadTrackedGPX);

  function showGpxBtn() {
    if (gpxBtn && !gpxBtn.classList.contains("visible")) gpxBtn.classList.add("visible");
  }

  function downloadTrackedGPX() {
    if (!dayList.length) return;
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<gpx version="1.1" creator="Enduro Explorers Live-Tracker" '
      + 'xmlns="http://www.topografix.com/GPX/1/1">\n'
      + '  <metadata><name>Explore our 2026 — Live-Track</name></metadata>\n';
    for (const day of dayList) {
      xml += '  <trk><name>' + fmtDayLabel(day.key) + '</name><trkseg>\n';
      for (const p of day.pts) {
        xml += '    <trkpt lat="' + p.lat.toFixed(6) + '" lon="' + p.lon.toFixed(6) + '">'
          + '<time>' + new Date(p.t * 1000).toISOString() + '</time></trkpt>\n';
      }
      xml += '  </trkseg></trk>\n';
    }
    xml += '</gpx>\n';
    const blob = new Blob([xml], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enduro-explorers-2026-live-track.gpx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ── Helpers ──
  function fmtDur(sec) {
    if (!sec || sec <= 0) return "–";
    // Erst auf ganze Minuten runden, dann h/m ableiten — sonst "1:60 h" möglich
    const totalMin = Math.round(sec / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h + ":" + pad(m) + " h";
  }

  function fmtClock(tSec) {
    const d = new Date(tSec * 1000);
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

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
