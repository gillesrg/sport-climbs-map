// Sport Climbs Map — crag markers for sportclimbs.uk, details in a bottom sheet.
const SITE = "https://www.sportclimbs.uk";
const GRADES = ["3", "4", "4+", "5", "5+", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+",
  "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a", "9a+", "9b"];
const BANDS = [["≤5+", "3", "5+"], ["6a–b+", "6a", "6b+"], ["6c–7a+", "6c", "7a+"],
  ["7b–c+", "7b", "7c+"], ["8a+", "8a", "9b"]];
const REGIONS = {
  "Peak District": "--peak", "North Wales": "--nwales",
  "South Wales": "--swales", "Yorkshire": "--yorks",
};
const gi = g => GRADES.indexOf(g);
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};

// ---- Map ----
const map = L.map("map", { zoomControl: false, tap: true }).setView([52.6, -2.6], 7);
const LAYERS = {
  Map: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap contributors",
  }),
  Topo: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17, attribution: "© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)",
  }),
  Satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
  }),
};
let layerName = store.get("layer", "Map");
if (!LAYERS[layerName]) layerName = "Map";
LAYERS[layerName].addTo(map);

const cluster = L.markerClusterGroup({
  maxClusterRadius: 40, showCoverageOnHover: false, spiderfyOnMaxZoom: true,
  iconCreateFunction: cl => {
    const n = cl.getChildCount(), size = n < 10 ? 34 : n < 40 ? 40 : 48;
    return L.divIcon({ className: "", iconSize: [size, size], html: `<div class="cluster" style="width:${size}px;height:${size}px">${n}</div>` });
  },
});
map.addLayer(cluster);

// ---- State ----
let crags = [];
const markers = new Map();
const filters = {
  regions: new Set(store.get("regions", Object.keys(REGIONS))),
  gMin: store.get("gMin", "3"), gMax: store.get("gMax", "9b"),
};

function pinIcon(c) {
  const color = css(REGIONS[c.region] || "--accent");
  const approx = c.confidence === "approx" ? " approx" : "";
  return L.divIcon({
    className: "", iconSize: [28, 28], iconAnchor: [14, 28],
    html: `<div class="crag-pin${approx}" style="background:${color}"><span>${c.routes || ""}</span></div>`,
  });
}

function matchesFilters(c) {
  if (!filters.regions.has(c.region)) return false;
  const lo = gi(filters.gMin), hi = gi(filters.gMax);
  if (lo === 0 && hi === GRADES.length - 1) return true;
  return c.grades.some(g => gi(g) >= lo && gi(g) <= hi);
}

function render() {
  cluster.clearLayers();
  const shown = crags.filter(c => c.lat != null && matchesFilters(c));
  cluster.addLayers(shown.map(c => markers.get(c.id)));
  $("count").textContent = `${shown.length} of ${crags.length} crags shown`;
  const active = filters.regions.size < Object.keys(REGIONS).length ||
    filters.gMin !== "3" || filters.gMax !== "9b";
  $("filterDot").hidden = !active;
}

// ---- Bottom sheet ----
function directionsUrl(lat, lng) {
  const apple = /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  return apple ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function histogram(c) {
  const counts = BANDS.map(([, a, b]) => c.grades.filter(g => gi(g) >= gi(a) && gi(g) <= gi(b)).length);
  const max = Math.max(1, ...counts);
  return `<div class="hist">${counts.map(n => `<div style="height:${(n / max) * 100}%" title="${n} routes"></div>`).join("")}</div>
    <div class="hist-labels">${BANDS.map(([l], i) => `<span>${l}<br>${counts[i]}</span>`).join("")}</div>`;
}

function openSheet(c, { fly = false } = {}) {
  const dest = c.parking || [c.lat, c.lng];
  const sectors = c.sectors.map(s => `<li><a href="${SITE}${esc(s.url)}" target="_blank" rel="noopener">
      ${esc(s.name)}<span>${s.routes ? s.routes + " routes" : "info"} ›</span></a></li>`).join("");
  $("sheetBody").innerHTML = `
    <h2>${esc(c.name)}</h2>
    ${c.aka ? `<div class="aka">${esc(c.aka)}</div>` : ""}
    <div class="crumb"><span class="swatch" style="background:${css(REGIONS[c.region])}"></span>${esc(c.region)} · ${esc(c.area)}</div>
    ${c.routes ? `<div class="stats">
      <div class="stat"><b>${c.routes}</b><span>sport routes</span></div>
      <div class="stat"><b>${esc(c.minGrade)}–${esc(c.maxGrade)}</b><span>grade range</span></div>
      <div class="stat"><b>${c.stars}</b><span>starred</span></div>
    </div>${histogram(c)}` : ""}
    <div class="actions">
      <a class="btn primary" href="${SITE}${esc(c.url)}" target="_blank" rel="noopener">Open on SportClimbs</a>
      ${c.lat != null ? `<a class="btn" href="${directionsUrl(dest[0], dest[1])}" target="_blank" rel="noopener">Directions${c.parking ? " to parking" : ""}</a>` : ""}
    </div>
    ${c.ukc ? `<a class="ukc" href="${esc(c.ukc)}" target="_blank" rel="noopener">See this crag on UKClimbing ›</a>` : ""}
    ${sectors ? `<h3>Sectors &amp; topos</h3><ul class="sectors">${sectors}</ul>` : ""}
    ${c.confidence === "approx" ? `<p class="note">Map position is approximate — check the approach notes on SportClimbs.</p>` : ""}`;
  const sheet = $("sheet");
  sheet.hidden = false;
  sheet.scrollTop = 0;
  document.body.classList.add("sheet-open");
  document.body.style.setProperty("--sheet-h", sheet.offsetHeight + "px");
  if (fly && c.lat != null) map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 14), { duration: .6 });
  history.replaceState(null, "", "#" + encodeURIComponent(c.id));
}

function closeSheet() {
  $("sheet").hidden = true;
  document.body.classList.remove("sheet-open");
  history.replaceState(null, "", location.pathname);
}
$("closeSheet").onclick = closeSheet;
map.on("click", () => { closeSheet(); hidePanels(); });

// Swipe the sheet down to close it.
(() => {
  let y0 = null;
  const sheet = $("sheet");
  sheet.addEventListener("touchstart", e => { y0 = sheet.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
  sheet.addEventListener("touchmove", e => {
    if (y0 == null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener("touchend", e => {
    if (y0 == null) return;
    const dy = e.changedTouches[0].clientY - y0;
    sheet.style.transform = "";
    if (dy > 90) closeSheet();
    y0 = null;
  });
})();

// ---- Search ----
function hidePanels() {
  $("results").hidden = true;
  $("filters").hidden = true;
  $("filterBtn").setAttribute("aria-expanded", "false");
}
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "");
$("q").addEventListener("input", () => {
  const q = norm($("q").value.trim());
  const ul = $("results");
  $("filters").hidden = true;
  if (!q) { ul.hidden = true; return; }
  const hits = crags.filter(c => norm(`${c.name} ${c.aka} ${c.area} ${c.sectors.map(s => s.name).join(" ")}`).includes(q))
    .sort((a, b) => norm(b.name).startsWith(q) - norm(a.name).startsWith(q)).slice(0, 12);
  ul.innerHTML = hits.length ? hits.map(c => `<li data-id="${esc(c.id)}">
      <span class="swatch" style="background:${css(REGIONS[c.region])}"></span>
      <div>${esc(c.name)}<small>${esc(c.area)}${c.routes ? ` · ${c.routes} routes ${esc(c.minGrade)}–${esc(c.maxGrade)}` : ""}</small></div></li>`).join("")
    : `<li class="empty">No crags match “${esc($("q").value)}”</li>`;
  ul.hidden = false;
});
$("results").addEventListener("click", e => {
  const li = e.target.closest("li[data-id]");
  if (!li) return;
  const c = crags.find(x => x.id === li.dataset.id);
  $("q").blur();
  hidePanels();
  openSheet(c, { fly: true });
});

// ---- Filters ----
function buildFilters() {
  $("regionChips").innerHTML = Object.keys(REGIONS).map(r => `<button class="chip" data-r="${r}" aria-pressed="${filters.regions.has(r)}">
    <span class="swatch" style="background:${css(REGIONS[r])}"></span>${r}</button>`).join("");
  const opts = GRADES.map(g => `<option>${g}</option>`).join("");
  $("gMin").innerHTML = opts; $("gMax").innerHTML = opts;
  $("gMin").value = filters.gMin; $("gMax").value = filters.gMax;
}
$("regionChips").addEventListener("click", e => {
  const b = e.target.closest(".chip");
  if (!b) return;
  const r = b.dataset.r;
  filters.regions.has(r) ? filters.regions.delete(r) : filters.regions.add(r);
  b.setAttribute("aria-pressed", filters.regions.has(r));
  store.set("regions", [...filters.regions]);
  render();
});
for (const id of ["gMin", "gMax"]) {
  $(id).addEventListener("change", () => {
    filters[id] = $(id).value;
    if (gi(filters.gMin) > gi(filters.gMax)) {
      const other = id === "gMin" ? "gMax" : "gMin";
      filters[other] = filters[id]; $(other).value = filters[id];
    }
    store.set("gMin", filters.gMin); store.set("gMax", filters.gMax);
    render();
  });
}
$("filterBtn").onclick = () => {
  const open = $("filters").hidden;
  hidePanels();
  $("filters").hidden = !open;
  $("filterBtn").setAttribute("aria-expanded", open);
};

// ---- Layers ----
$("layerBtn").onclick = e => {
  e.stopPropagation();
  let menu = document.querySelector(".layer-menu");
  if (menu) { menu.remove(); return; }
  menu = document.createElement("div");
  menu.className = "layer-menu";
  menu.innerHTML = Object.keys(LAYERS).map(n => `<button role="menuitemradio" aria-checked="${n === layerName}" data-l="${n}">${n}</button>`).join("");
  menu.onclick = ev => {
    const n = ev.target.dataset.l;
    if (!n) return;
    map.removeLayer(LAYERS[layerName]);
    layerName = n; LAYERS[n].addTo(map); store.set("layer", n);
    menu.remove();
  };
  $("layerBtn").parentElement.appendChild(menu);
};
document.addEventListener("click", e => {
  if (!e.target.closest(".layer-menu, #layerBtn")) document.querySelector(".layer-menu")?.remove();
});

// ---- Location ----
let meMarker = null, watching = false;
$("locateBtn").onclick = () => {
  if (!navigator.geolocation) return alert("Location isn't available in this browser.");
  if (meMarker) map.flyTo(meMarker.getLatLng(), Math.max(map.getZoom(), 11));
  if (watching) return;
  watching = true;
  $("locateBtn").classList.add("active");
  let first = true;
  navigator.geolocation.watchPosition(p => {
    const ll = [p.coords.latitude, p.coords.longitude];
    if (!meMarker) {
      meMarker = L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [18, 18] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
    } else meMarker.setLatLng(ll);
    if (first) { map.flyTo(ll, Math.max(map.getZoom(), 10)); first = false; }
  }, err => {
    watching = false;
    $("locateBtn").classList.remove("active");
    alert(err.code === 1 ? "Location permission was denied. You can allow it in Settings › Safari › Location." : "Couldn't get your location.");
  }, { enableHighAccuracy: true, maximumAge: 30000 });
};

// ---- Load ----
fetch("data/crags.json").then(r => r.json()).then(data => {
  crags = data;
  for (const c of crags) {
    if (c.lat == null) continue;
    const m = L.marker([c.lat, c.lng], { icon: pinIcon(c), title: c.name });
    m.on("click", () => { hidePanels(); openSheet(c); });
    markers.set(c.id, m);
  }
  buildFilters();
  render();
  const hash = decodeURIComponent(location.hash.slice(1));
  const fromHash = crags.find(c => c.id === hash);
  if (fromHash) openSheet(fromHash, { fly: true });
  else {
    const pts = crags.filter(c => c.lat != null).map(c => [c.lat, c.lng]);
    if (pts.length) map.fitBounds(pts, { padding: [30, 30] });
  }
});

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => { });
}
