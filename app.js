document.addEventListener("DOMContentLoaded", () => {
  const SCHOOL = { name: "SMP Islam Al-Azhar 19 Cibubur", lat: -6.3663, lng: 106.8883 };
  const STUDY_RADIUS_M = 250;
  const JAKARTA_BOUNDS = [[-6.39, 106.67], [-6.04, 106.99]];
  const LOCAL_STORAGE_KEY = "greenvox-observations-cibubur-v4";
  const LEGACY_STORAGE_KEY = "greenscope-observations-cibubur-v3";

  const cfg = window.GREENVOX_CONFIG || window.GREENSCOPE_CONFIG || {};
  const COMMUNITY_GOAL = Number(cfg.COMMUNITY_OBSERVATION_GOAL) || 50;
  const SUPABASE_URL = String(cfg.SUPABASE_URL || "").replace(/\/$/, "");
  const SUPABASE_KEY = String(cfg.SUPABASE_ANON_KEY || "");
  const SHARED_MODE = /^https:\/\/.+\.supabase\.co$/i.test(SUPABASE_URL) && SUPABASE_KEY.length > 20;

  const VERIFIED_ANALYSIS = {
    source: "Sentinel-2 SR Harmonized",
    period: "1 Juni sampai 23 Agustus (2022 vs 2026)",
    mean_ndvi: 0.30891812171287036,
    green_coverage_percent: 39.10176099746426,
    comparison: {
      mean_ndvi_2022: 0.39589758835456185,
      mean_ndvi_2026: 0.30891812171287036,
      relative_mean_change_percent: -21.970193605673924,
      decreased_area_percent: 53.73758431639827,
      stable_area_percent: 38.16523508363988,
      increased_area_percent: 8.097180599961915
    },
    trend: [
      { label: "2022", mean_ndvi: 0.39589758835456185 },
      { label: "2026", mean_ndvi: 0.30891812171287036 }
    ],
    note: "Komposit median Sentinel-2 pada jendela musiman yang sama. Ambang batas NDVI 0.35 dan perubahan 0.05 merupakan indikator penyaringan awal yang memerlukan verifikasi lapangan."
  };

  const categories = {
    critical: {
      label: "Lahan Kritis",
      color: "#111827",
      tagClass: "guide-critical",
      urgencyLabel: "Mendesak Ditanami",
      decisionText: "Prioritas utama aksi reboisasi. Lahan terbuka gundul memerlukan penanaman bibit pohon peneduh berakar dalam untuk mencegah erosi dan meningkatkan serapan air tanah."
    },
    open: {
      label: "Area Terbuka",
      color: "#111827",
      tagClass: "guide-open",
      urgencyLabel: "Potensial Reboisasi",
      decisionText: "Lahan terbuka yang potensial untuk penambahan kanopi hijau atau pohon pelindung lingkungan sekolah secara bertahap."
    },
    tree: {
      label: "Pohon Rindang",
      color: "#111827",
      tagClass: "guide-tree",
      urgencyLabel: "Area Terjaga Baik",
      decisionText: "Kerapatan kanopi baik dan terkonfirmasi rimbun. Perlu dirawat kelestariannya dan dipertahankan dari risiko alih fungsi lahan."
    },
    hardscape: {
      label: "Permukaan Keras",
      color: "#4b5563",
      tagClass: "guide-hardscape",
      urgencyLabel: "Bukan Area Tanam",
      decisionText: "Area perkerasan semen atau jalan aspal. Penanaman langsung di tanah tidak memungkinkan; disarankan tanaman dalam pot atau jalur hijau pembatas."
    }
  };

  const urgencies = {
    urgent: { label: "Mendesak Ditanami", class: "urgency-urgent" },
    potential: { label: "Potensial Reboisasi", class: "urgency-potential" },
    conserved: { label: "Area Terjaga Baik", class: "urgency-conserved" },
    ineligible: { label: "Bukan Area Tanam", class: "urgency-ineligible" }
  };

  const $ = id => document.getElementById(id);
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const escapeHtml = value => String(value || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));

  let observations = [];
  let surveyMode = false;
  let trendChart = null;
  let map = null;
  let drawnItems = null;
  let observationLayer = null;
  let activePhotoBase64 = null;
  let latestAnalysis = VERIFIED_ANALYSIS;
  const markerMap = new Map();

  const defaultSampleObservations = [
    {
      id: "titik-lapangan-1",
      category: "tree",
      urgency: "conserved",
      note: "Deretan pohon peneduh rimbun di koridor jalan dengan kanopi lebat dan vegetasi sehat. Berfungsi efektif sebagai peneduh alami dan penyerap emisi kendaraan.",
      photo: "data/photos/titik1-pic1.jpg",
      photos: [
        "data/photos/titik1-pic1.jpg",
        "data/photos/titik1-pic2.jpg"
      ],
      lat: -6.348527,
      lng: 106.884546,
      mapsUrl: "https://maps.app.goo.gl/GEemTwiDR9XQpgNN9",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: "titik-lapangan-2",
      category: "tree",
      urgency: "conserved",
      note: "Area pepohonan berbatang kokoh dan lantai tanah bervegetasi alami dengan lapisan serasah subur. Kondisi ekosistem lokal terjaga dengan baik.",
      photo: "data/photos/titik2-pic3.jpg",
      photos: [
        "data/photos/titik2-pic3.jpg",
        "data/photos/titik2-pic4.jpg"
      ],
      lat: -6.355526,
      lng: 106.886819,
      mapsUrl: "https://maps.app.goo.gl/TraoAJVF58rS2mDX8",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ];

  function localRead() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSampleObservations));
        return defaultSampleObservations;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSampleObservations));
        return defaultSampleObservations;
      }
      const hasLegacyOnly = parsed.every(o => String(o.id).startsWith("sample-cibubur"));
      if (hasLegacyOnly) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSampleObservations));
        return defaultSampleObservations;
      }
      return parsed;
    } catch {
      return defaultSampleObservations;
    }
  }

  function localWrite(items) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  }

  function supabaseHeaders(extra = {}) {
    return {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...extra
    };
  }

  async function remoteRead() {
    const endpoint = `${SUPABASE_URL}/rest/v1/observations?select=id,category,urgency,note,photo,lat,lng,created_at&order=created_at.desc&limit=500`;
    const response = await fetch(endpoint, { headers: supabaseHeaders(), cache: "no-store" });
    if (!response.ok) throw new Error(`Shared data HTTP ${response.status}`);
    const rows = await response.json();
    return rows.map(row => ({
      id: row.id,
      category: row.category || "open",
      urgency: row.urgency || "potential",
      note: row.note || "",
      photo: row.photo || null,
      lat: Number(row.lat),
      lng: Number(row.lng),
      createdAt: row.created_at
    }));
  }

  async function remoteInsert(observation) {
    const endpoint = `${SUPABASE_URL}/rest/v1/observations`;
    const payload = {
      category: observation.category,
      urgency: observation.urgency,
      note: observation.note,
      lat: observation.lat,
      lng: observation.lng
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: supabaseHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Submission HTTP ${response.status}`);
    return response.json();
  }

  function updateDataModeUI() {
    if (SHARED_MODE) {
      setText("dataModeStatus", "Mode Sinkronisasi Komunitas");
      setText("dataModeDescription", "Pantauan tersinkronisasi secara bersama melalui basis data online. Tidak ada nama, nomor kontak, atau identitas pribadi yang dikumpulkan.");
      if ($("clearObsBtn")) $("clearObsBtn").hidden = true;
    } else {
      setText("dataModeStatus", "Mode Perangkat Lokal");
      setText("dataModeDescription", "Pantauan disimpan aman di peramban lokal perangkat ini. Anda dapat mengekspornya kapan saja ke format GeoJSON.");
      if ($("clearObsBtn")) $("clearObsBtn").hidden = false;
    }
  }

  function applyAnalysis(data) {
    if (!data) return;
    latestAnalysis = data;
    setText("satStatus", `${data.source || "Sentinel-2"} · ${data.period || "Analisis termuat"}`);
    if (Number.isFinite(Number(data.mean_ndvi))) setText("meanNdvi", Number(data.mean_ndvi).toFixed(3));
    if (Number.isFinite(Number(data.green_coverage_percent))) setText("greenCoverage", `${Number(data.green_coverage_percent).toFixed(1)}%`);

    const c = data.comparison || {};
    if (Number.isFinite(c.mean_ndvi_2022)) setText("meanNdvi2022", c.mean_ndvi_2022.toFixed(3));
    if (Number.isFinite(c.mean_ndvi_2026)) setText("meanNdvi2026", c.mean_ndvi_2026.toFixed(3));
    if (Number.isFinite(c.relative_mean_change_percent)) {
      setText("relativeChange", `${c.relative_mean_change_percent > 0 ? "+" : ""}${c.relative_mean_change_percent.toFixed(2)}%`);
    }
    if (Number.isFinite(c.decreased_area_percent)) setText("decreasedArea", `${c.decreased_area_percent.toFixed(2)}%`);
    if (Number.isFinite(c.stable_area_percent)) setText("stableArea", `${c.stable_area_percent.toFixed(2)}%`);
    if (Number.isFinite(c.increased_area_percent)) setText("increasedArea", `${c.increased_area_percent.toFixed(2)}%`);

    if (trendChart && Array.isArray(data.trend)) {
      trendChart.data.labels = data.trend.map(item => item.label);
      trendChart.data.datasets[0].data = data.trend.map(item => item.mean_ndvi);
      trendChart.update();
    }
    setText("trendMessage", data.note || "Data analisis satelit siap diverifikasi.");
  }

  const trendCanvas = $("trendChart");
  if (trendCanvas && typeof Chart !== "undefined") {
    trendChart = new Chart(trendCanvas, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: "Rerata NDVI",
          data: [],
          borderColor: "#111827",
          backgroundColor: "rgba(17, 24, 39, 0.08)",
          fill: true,
          tension: 0.2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: "#111827"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: { font: { family: "IBM Plex Sans", size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: ctx => `Rerata NDVI: ${Number(ctx.parsed.y).toFixed(3)}`
            }
          }
        },
        scales: {
          y: {
            suggestedMin: 0.15,
            suggestedMax: 0.55,
            title: { display: true, text: "Nilai NDVI", font: { family: "IBM Plex Sans" } }
          },
          x: {
            title: { display: true, text: "Tahun Pengamatan", font: { family: "IBM Plex Sans" } }
          }
        }
      }
    });
  }

  applyAnalysis(VERIFIED_ANALYSIS);

  (async () => {
    try {
      const response = await fetch(`./data/analysis.json?v=${Date.now()}`, { cache: "no-store" });
      if (response.ok) applyAnalysis(await response.json());
    } catch {
      applyAnalysis(VERIFIED_ANALYSIS);
    }
  })();

  function updateImpact() {
    const greenCount = observations.filter(o => o.category === "tree" || o.category === "open").length;
    const reviewCount = observations.filter(o => o.category === "critical" || o.urgency === "urgent").length;
    const progress = Math.min(100, (observations.length / COMMUNITY_GOAL) * 100);

    setText("obsCount", observations.length);
    setText("actionCount", reviewCount);
    setText("impactObservations", observations.length);
    setText("impactGreen", greenCount);
    setText("impactNeedsReview", reviewCount);
    setText("missionProgressLabel", `${observations.length} / ${COMMUNITY_GOAL}`);
    if ($("missionProgress")) $("missionProgress").style.width = `${progress}%`;
  }

  let currentModalPhotos = [];
  let currentModalPhotoIndex = 0;

  window.switchModalPhoto = function(index) {
    if (!currentModalPhotos || !currentModalPhotos[index]) return;
    currentModalPhotoIndex = index;
    const modalPhoto = $("modalFieldPhoto");
    const modalBlur = $("modalFieldPhotoBlur");
    if (modalPhoto) modalPhoto.src = currentModalPhotos[index];
    if (modalBlur) modalBlur.src = currentModalPhotos[index];

    const buttons = document.querySelectorAll(".modal-gallery-btn");
    buttons.forEach((btn, i) => {
      btn.classList.toggle("active", i === index);
    });
  };

  window.showComparison = function(id) {
    const obs = observations.find(o => String(o.id) === String(id));
    if (!obs) return;

    const cat = categories[obs.category] || categories.critical;
    const urg = urgencies[obs.urgency] || urgencies.urgent;

    const modalPhoto = $("modalFieldPhoto");
    const modalBlur = $("modalFieldPhotoBlur");
    const modalNoPhoto = $("modalNoPhoto");
    const galleryEl = $("modalPhotoGallery");

    const photos = Array.isArray(obs.photos) && obs.photos.length > 0
      ? obs.photos
      : (obs.photo ? [obs.photo] : []);

    currentModalPhotos = photos;
    currentModalPhotoIndex = 0;

    if (photos.length > 1) {
      if (galleryEl) {
        galleryEl.innerHTML = photos.map((src, idx) => `
          <button type="button" class="modal-gallery-btn ${idx === 0 ? "active" : ""}" onclick="window.switchModalPhoto(${idx})">
            <img src="${src}" alt="Dokumentasi ${idx + 1}">
            <span>Foto ${idx + 1}</span>
          </button>
        `).join("");
        galleryEl.hidden = false;
      }
    } else {
      if (galleryEl) {
        galleryEl.innerHTML = "";
        galleryEl.hidden = true;
      }
    }

    if (photos.length > 0) {
      if (modalPhoto) {
        modalPhoto.src = photos[0];
        modalPhoto.hidden = false;
      }
      if (modalBlur) {
        modalBlur.src = photos[0];
        modalBlur.hidden = false;
      }
      if (modalNoPhoto) modalNoPhoto.hidden = true;
    } else {
      if (modalPhoto) modalPhoto.hidden = true;
      if (modalBlur) modalBlur.hidden = true;
      if (modalNoPhoto) modalNoPhoto.hidden = false;
    }

    setText("modalCategoryText", cat.label);
    setText("modalUrgencyBadge", urg.label);
    setText("modalNoteText", obs.note || "Tidak ada catatan lapangan tertulis.");
    setText("modalCoordText", `${Number(obs.lat).toFixed(5)}, ${Number(obs.lng).toFixed(5)}`);

    const dateStr = obs.createdAt ? new Date(obs.createdAt).toLocaleString("id-ID", {
      dateStyle: "medium", timeStyle: "short"
    }) : "-";
    setText("modalDateText", dateStr);

    const c = latestAnalysis.comparison || {};
    setText("modalSatNdvi2026", Number(c.mean_ndvi_2026 || latestAnalysis.mean_ndvi || 0.309).toFixed(3));
    setText("modalSatNdvi2022", Number(c.mean_ndvi_2022 || 0.396).toFixed(3));
    setText("modalSatChange", `${c.relative_mean_change_percent ? c.relative_mean_change_percent.toFixed(2) : "-21.97"}%`);

    let decisionHtml = cat.decisionText;
    if (obs.category === "critical") {
      decisionHtml = "Validasi Ground Truth: Citra satelit Sentinel-2 mendeteksi penurunan nilai NDVI sebesar 21.97% di area ini. Foto warga mengonfirmasi tanah terbuka gundul yang belum termanfaatkan. Rekomendasi: Sangat tepat untuk penanaman bibit pohon peneduh tahap pertama (Trembesi, Tabebuya, atau Ketapang Kencana).";
    } else if (obs.category === "open") {
      decisionHtml = "Validasi Ground Truth: Sinyal satelit berada di zona batas vegetasi. Foto warga menunjukkan area tanah lapang yang potensial untuk penambahan ruang terbuka hijau bertahap.";
    } else if (obs.category === "tree") {
      decisionHtml = "Validasi Ground Truth: Sinyal satelit terkonfirmasi dengan rimbunnya vegetasi eksisting di foto warga. Rekomendasi: Pertahankan sebagai area penyerap emisi dan rawat kanopi pohon.";
    } else if (obs.category === "hardscape") {
      decisionHtml = "Klarifikasi Ground Truth: Meskipun terjadi penurunan sinyal kanopi, lokasi ini merupakan permukaan perkerasan permanen. Rekomendasi: Bukan sasaran tanam bibit tanah; alihkan ke penanaman pot vertikal.";
    }
    setText("modalDecisionText", decisionHtml);

    const streetViewLink = $("modalStreetViewLink");
    if (streetViewLink) {
      streetViewLink.href = obs.mapsUrl || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${obs.lat},${obs.lng}`;
      streetViewLink.textContent = obs.mapsUrl ? "Buka di Google Maps ↗" : "Buka Google Street View 360°";
    }

    const dialog = $("comparisonDialog");
    if (dialog) dialog.showModal();
  };

  let selectedPointId = null;

  window.selectPoint = function(id) {
    selectedPointId = String(id);
    $("tabBtnFeed")?.click();
    renderObservations();
    const marker = markerMap.get(String(id));
    if (marker && !marker.isPopupOpen()) {
      marker.openPopup();
    }
  };

  window.clearPointFilter = function() {
    selectedPointId = null;
    renderObservations();
  };

  window.highlightObservationCard = function(id) {
    window.selectPoint(id);
  };

  window.locateObservation = function(id) {
    const obs = observations.find(o => String(o.id) === String(id));
    if (!obs || !map) return;
    window.selectPoint(id);
    map.setView([obs.lat, obs.lng], 18, { animate: true });
    const marker = markerMap.get(String(id));
    if (marker) {
      setTimeout(() => marker.openPopup(), 400);
    }
  };

  function renderObservations() {
    if (observationLayer) observationLayer.clearLayers();
    markerMap.clear();

    observations.forEach(obs => {
      const cat = categories[obs.category] || categories.critical;
      const urg = urgencies[obs.urgency] || urgencies.urgent;

      if (observationLayer) {
        const marker = L.circleMarker([obs.lat, obs.lng], {
          radius: 7,
          color: "#ffffff",
          fillColor: "#111827",
          fillOpacity: 0.95,
          weight: 2
        }).addTo(observationLayer);

        marker.on("click", () => {
          window.selectPoint(obs.id);
        });

        markerMap.set(String(obs.id), marker);

        const streetViewUrl = obs.mapsUrl || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${obs.lat},${obs.lng}`;
        const photoCountBadge = (obs.photos && obs.photos.length > 1)
          ? `<span class="popup-photo-badge">${obs.photos.length} Foto</span>`
          : "";
        const photoHtml = obs.photo
          ? `
            <div class="popup-thumb-wrap">
              <img src="${obs.photo}" class="popup-thumb" alt="Foto kondisi lapangan">
              ${photoCountBadge}
            </div>
          `
          : "";
        const popupContent = `
          <div class="popup-wrap">
            <div class="popup-header">
              <div class="popup-meta">
                <span class="popup-cat">${cat.label}</span>
                <span class="popup-sep">&middot;</span>
                <span class="popup-urg">${urg.label}</span>
              </div>
            </div>
            ${photoHtml}
            <p class="popup-note">${escapeHtml(obs.note || "Tidak ada catatan lapangan.")}</p>
            <div class="popup-btn-group">
              <button type="button" class="popup-btn" onclick="window.showComparison('${obs.id}')">Evaluasi</button>
              <a href="${streetViewUrl}" target="_blank" rel="noopener noreferrer" class="popup-streetview-btn">${obs.mapsUrl ? "Google Maps" : "Street View 360&deg;"}</a>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent, { className: "custom-popup" });
      }
    });

    const list = $("observationsList");
    if (list) {
      if (!observations.length) {
        list.innerHTML = '<p class="empty-state">Belum ada pantauan lapangan. Klik "+ Tambah Pantauan Baru" untuk menambahkan foto dan data kondisi tanah nyata.</p>';
      } else {
        const filteredObs = selectedPointId
          ? observations.filter(o => String(o.id) === selectedPointId)
          : observations;

        const filterHeader = selectedPointId
          ? `
            <div class="point-filter-bar">
              <span class="filter-indicator">Menampilkan Titik Terpilih</span>
              <button type="button" class="clear-filter-btn" onclick="window.clearPointFilter()">Tampilkan Semua (${observations.length})</button>
            </div>
          `
          : "";

        const cardsHtml = filteredObs.map(obs => {
          const cat = categories[obs.category] || categories.critical;
          const urg = urgencies[obs.urgency] || urgencies.urgent;
          const streetViewUrl = obs.mapsUrl || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${obs.lat},${obs.lng}`;
          const dateFormatted = obs.createdAt
            ? new Date(obs.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric"
              })
            : "2026";
          const photoCountBadge = (obs.photos && obs.photos.length > 1)
            ? `<span class="obs-photo-count">${obs.photos.length} Foto</span>`
            : "";
          const thumbHtml = obs.photo
            ? `
              <div class="obs-thumb-wrap">
                <img src="${obs.photo}" class="obs-thumb" alt="Foto lapangan">
                ${photoCountBadge}
              </div>
            `
            : `<div class="obs-thumb-placeholder"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Foto</span></div>`;

          return `
            <div class="obs-card" id="obs-card-${obs.id}" onclick="window.locateObservation('${obs.id}')">
              ${thumbHtml}
              <div class="obs-content">
                <div class="obs-title-wrap">
                  <span class="obs-title">${cat.label}</span>
                  <span class="obs-divider">&middot;</span>
                  <span class="obs-urgency-text ${urg.class}">${urg.label}</span>
                </div>
                <div class="obs-meta">
                  <span class="obs-date">${dateFormatted}</span>
                  <span class="obs-divider">&middot;</span>
                  <span class="obs-note-snippet">${escapeHtml(obs.note || "Catatan lapangan")}</span>
                </div>
                <div class="obs-action-row">
                  <button type="button" class="obs-inspect-btn" onclick="event.stopPropagation(); window.showComparison('${obs.id}')">Evaluasi</button>
                  <button type="button" class="obs-locate-btn" onclick="event.stopPropagation(); window.locateObservation('${obs.id}')">Lihat Peta</button>
                  <a href="${streetViewUrl}" target="_blank" rel="noopener noreferrer" class="obs-streetview-btn" onclick="event.stopPropagation()">${obs.mapsUrl ? "Google Maps" : "Street View"}</a>
                </div>
              </div>
            </div>
          `;
        }).join("");

        list.innerHTML = filterHeader + cardsHtml;
      }
    }
    updateImpact();
  }

  async function refreshCommunityData({ quiet = false } = {}) {
    if (SHARED_MODE) {
      try {
        observations = await remoteRead();
        renderObservations();
        if (!quiet) setText("dataModeStatus", "Mode Sinkronisasi Komunitas: Tersinkron");
        return;
      } catch (error) {
        console.warn("Basis data komunitas tidak dapat dijangkau, beralih ke lokal.", error);
        setText("dataModeStatus", "Mode Komunitas: Terputus");
        if (!quiet) alert("Basis data komunitas bersama tidak dapat dihubungi. Data lokal tetap dapat digunakan.");
      }
    }
    observations = localRead();
    renderObservations();
  }

  updateDataModeUI();

  if (typeof L === "undefined") {
    console.error("Leaflet gagal dimuat.");
    return;
  }

  map = L.map("map", {
    center: [-6.3574, 106.8864],
    zoom: 15,
    zoomControl: true
  });

  const satBase = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Esri, Maxar, Earthstar Geographics"
  });

  const satLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19
  });

  const satRoads = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19
  });

  const satHybrid = L.layerGroup([satBase, satRoads, satLabels]).addTo(map);

  const satPure = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Esri World Imagery"
  });

  const topoMap = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Esri Topo"
  });

  const streetMap = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Esri Street"
  });

  const hotOsm = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    subdomains: "abc",
    maxZoom: 19,
    attribution: "OpenStreetMap France / HOT"
  });

  L.control.layers({
    "Citra Satelit Riil (Hybrid)": satHybrid,
    "Citra Satelit Murni": satPure,
    "Peta Topografi & Kontur": topoMap,
    "Peta Jalan Vektor": streetMap,
    "Peta Komunitas (HOT)": hotOsm
  }, null, { position: "topright" }).addTo(map);

  const schoolMarker = L.marker([SCHOOL.lat, SCHOOL.lng], {
    icon: L.divIcon({
      className: "pilot-marker",
      html: '<div style="width:20px;height:20px;border-radius:50%;background:#111827;border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,0.35);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }).addTo(map).bindPopup(`
    <div class="popup-wrap school-popup-wrap">
      <div class="popup-title">Titik Fokus GreenVox</div>
      <div class="popup-school-name">${SCHOOL.name}</div>
      <p class="popup-note">Pusat zona studi satelit. Pantauan warga dapat ditambahkan di mana saja pada peta.</p>
    </div>
  `, { className: "custom-popup" });

  const studyCircleOuter = L.circle([SCHOOL.lat, SCHOOL.lng], {
    radius: STUDY_RADIUS_M,
    color: "#0f172a",
    weight: 4.5,
    opacity: 0.65,
    fill: false,
    interactive: false,
    className: "study-circle-outer"
  }).addTo(map);

  const studyCircle = L.circle([SCHOOL.lat, SCHOOL.lng], {
    radius: STUDY_RADIUS_M,
    color: "#ffffff",
    weight: 2,
    opacity: 1,
    fillColor: "#ffffff",
    fillOpacity: 0.06,
    dashArray: "6, 5",
    className: "study-circle-inner"
  }).addTo(map).bindTooltip("Zona Inti Pilot Cibubur (Radius 250 m)", {
    className: "circle-contrast-badge",
    direction: "top",
    sticky: true
  });

  studyCircle.on("mouseover", () => {
    studyCircle.setStyle({ fillOpacity: 0.14, weight: 2.5 });
  });
  studyCircle.on("mouseout", () => {
    studyCircle.setStyle({ fillOpacity: 0.06, weight: 2 });
  });
  studyCircle.on("click", () => {
    schoolMarker.openPopup();
  });

  const getStudyBounds = () => {
    const deltaLat = (STUDY_RADIUS_M + 40) / 111320;
    const deltaLng = (STUDY_RADIUS_M + 40) / (111320 * Math.cos((SCHOOL.lat * Math.PI) / 180));
    return L.latLngBounds(
      [SCHOOL.lat - deltaLat, SCHOOL.lng - deltaLng],
      [SCHOOL.lat + deltaLat, SCHOOL.lng + deltaLng]
    );
  };

  const showJakarta = () => map.fitBounds(JAKARTA_BOUNDS, { padding: [20, 20], animate: true, duration: 0.7 });
  const showPilot = () => {
    map.fitBounds(getStudyBounds(), { padding: [20, 20], animate: true, duration: 0.7 });
    setTimeout(() => schoolMarker.openPopup(), 500);
  };

  $("jakartaViewBtn")?.addEventListener("click", showJakarta);
  $("pilotViewBtn")?.addEventListener("click", showPilot);

  let tempMarker = null;

  function clearTempMarker() {
    if (tempMarker && map) {
      map.removeLayer(tempMarker);
      tempMarker = null;
    }
  }

  function showTempMarker(latlng) {
    clearTempMarker();
    tempMarker = L.marker(latlng, {
      icon: L.divIcon({
        className: "survey-target-pin",
        html: `
          <div class="target-pin-wrap">
            <div class="target-pin-crosshair"></div>
            <div class="target-pin-dot"></div>
            <div class="target-pin-tooltip">Titik Terpilih</div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      }),
      zIndexOffset: 1200
    }).addTo(map);
  }

  function setSurveyMode(active) {
    surveyMode = active;
    const btn = $("surveyModeBtn");
    const banner = $("surveyBanner");

    if (btn) {
      if (surveyMode) {
        btn.textContent = "Batal Menandai";
        btn.className = "secondary";
      } else {
        btn.textContent = "+ Tambah Pantauan Baru";
        btn.className = "action-btn";
      }
    }
    if (banner) banner.hidden = !surveyMode;
    map.getContainer().style.cursor = surveyMode ? "crosshair" : "";
    if (!surveyMode) {
      clearTempMarker();
    }
  }

  $("surveyModeBtn")?.addEventListener("click", () => setSurveyMode(!surveyMode));
  $("cancelSurveyBtn")?.addEventListener("click", () => setSurveyMode(false));
  $("joinMissionBtn")?.addEventListener("click", () => {
    document.getElementById("webgis")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setSurveyMode(true);
  });

  const tabDefs = [
    { btn: $("tabBtnFeed"), pane: $("tabFeed") },
    { btn: $("tabBtnSat"), pane: $("tabSat") },
    { btn: $("tabBtnGuide"), pane: $("tabGuide") }
  ];

  tabDefs.forEach(({ btn, pane }) => {
    btn?.addEventListener("click", () => {
      tabDefs.forEach(t => {
        t.btn?.classList.remove("active");
        if (t.pane) t.pane.hidden = true;
      });
      btn.classList.add("active");
      if (pane) pane.hidden = false;
      if (btn.id === "tabBtnSat" && trendChart) {
        setTimeout(() => trendChart.resize(), 80);
      }
    });
  });

  drawnItems = L.featureGroup().addTo(map);
  if (typeof L.Control !== "undefined" && L.Control.Draw) {
    try {
      map.addControl(new L.Control.Draw({
        edit: { featureGroup: drawnItems },
        draw: {
          marker: false, circlemarker: false, circle: false, rectangle: false, polyline: false,
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: "#111827", weight: 2.5, fillOpacity: 0.15 } }
        }
      }));
      map.on(L.Draw.Event.CREATED, event => {
        drawnItems.clearLayers();
        drawnItems.addLayer(event.layer);
        event.layer.bindPopup("Zona Prioritas Perhatian Komunitas", { className: "custom-popup" }).openPopup();
      });
    } catch (err) {
      console.warn("Leaflet.draw tidak dapat diaktifkan:", err);
    }
  }

  observationLayer = L.layerGroup().addTo(map);
  refreshCommunityData({ quiet: true });

  const obsPhotoInput = $("obsPhoto");
  const photoPreview = $("photoPreview");
  const photoPreviewWrap = $("photoPreviewWrap");
  const uploadPrompt = $("uploadPrompt");
  const removePhotoBtn = $("removePhotoBtn");

  function resetPhotoUpload() {
    activePhotoBase64 = null;
    if (obsPhotoInput) obsPhotoInput.value = "";
    if (photoPreview) photoPreview.src = "";
    if (photoPreviewWrap) photoPreviewWrap.hidden = true;
    if (uploadPrompt) uploadPrompt.hidden = false;
  }

  obsPhotoInput?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        activePhotoBase64 = canvas.toDataURL("image/jpeg", 0.75);
        if (photoPreview) photoPreview.src = activePhotoBase64;
        if (photoPreviewWrap) photoPreviewWrap.hidden = false;
        if (uploadPrompt) uploadPrompt.hidden = true;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  removePhotoBtn?.addEventListener("click", e => {
    e.stopPropagation();
    resetPhotoUpload();
  });

  const surveyDialog = $("surveyDialog");
  surveyDialog?.addEventListener("close", () => {
    if (surveyDialog.returnValue === "cancel") {
      clearTempMarker();
      setSurveyMode(false);
    }
  });

  map.on("click", event => {
    if (!surveyMode) return;
    const distance = map.distance(event.latlng, L.latLng(SCHOOL.lat, SCHOOL.lng));
    const isInsidePilot = distance <= STUDY_RADIUS_M;

    showTempMarker(event.latlng);

    $("obsLat").value = event.latlng.lat;
    $("obsLng").value = event.latlng.lng;
    const zoneLabel = isInsidePilot ? " (Zona Inti Cibubur)" : " (Wilayah Sekitar)";
    setText("coordDisplay", `Titik Lokasi: ${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}${zoneLabel}`);
    $("obsNote").value = "";
    resetPhotoUpload();
    surveyDialog?.showModal();
  });

  $("saveObsBtn")?.addEventListener("click", async () => {
    const category = $("obsCategory")?.value;
    const urgency = $("obsUrgency")?.value;
    const note = $("obsNote")?.value.trim() || "";
    const lat = Number($("obsLat")?.value);
    const lng = Number($("obsLng")?.value);

    if (!categories[category] || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert("Mohon lengkapi data pantauan lokasi.");
      return;
    }

    const newObservation = {
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      category,
      urgency,
      note,
      photo: activePhotoBase64,
      lat,
      lng,
      createdAt: new Date().toISOString()
    };

    if (SHARED_MODE) {
      const button = $("saveObsBtn");
      if (button) { button.disabled = true; button.textContent = "Mengirim..."; }
      try {
        await remoteInsert(newObservation);
      } catch (err) {
        console.warn("Gagal simpan online, menyimpan lokal.", err);
      } finally {
        if (button) { button.disabled = false; button.textContent = "Simpan Pantauan Lapangan"; }
      }
    }

    const current = localRead();
    current.unshift(newObservation);
    localWrite(current);
    observations = current;
    renderObservations();
    clearTempMarker();
    surveyDialog?.close();
    setSurveyMode(false);

    $("tabBtnFeed")?.click();
    window.locateObservation(newObservation.id);
  });

  $("closeComparisonBtn")?.addEventListener("click", () => $("comparisonDialog")?.close());
  $("dismissComparisonBtn")?.addEventListener("click", () => $("comparisonDialog")?.close());

  $("clearObsBtn")?.addEventListener("click", () => {
    if (confirm("Hapus seluruh data pantauan yang tersimpan di perangkat ini?")) {
      observations = [];
      localWrite([]);
      renderObservations();
    }
  });

  $("refreshCommunityBtn")?.addEventListener("click", () => refreshCommunityData());

  $("exportBtn")?.addEventListener("click", () => {
    const features = observations.map(o => ({
      type: "Feature",
      properties: {
        category: o.category,
        urgency: o.urgency,
        note: o.note,
        createdAt: o.createdAt,
        hasPhoto: Boolean(o.photo)
      },
      geometry: { type: "Point", coordinates: [o.lng, o.lat] }
    }));

    drawnItems.eachLayer(layer => {
      const feature = layer.toGeoJSON();
      feature.properties = { ...(feature.properties || {}), type: "community_focus_zone" };
      features.push(feature);
    });

    const geojson = {
      type: "FeatureCollection",
      metadata: {
        project: "GreenVox",
        fokus_wilayah: SCHOOL.name,
        study_radius_m: STUDY_RADIUS_M,
        exported_at: new Date().toISOString()
      },
      features
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `greenvox-pantauan-lapangan-${new Date().toISOString().slice(0, 10)}.geojson`;
    link.click();
    URL.revokeObjectURL(url);
  });

  $("analysisFile")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      applyAnalysis(JSON.parse(await file.text()));
    } catch {
      alert("Berkas JSON analisis tidak valid.");
    }
  });

  const refreshMap = () => {
    if (map) map.invalidateSize({ animate: false, pan: false });
  };
  setTimeout(refreshMap, 100);
  setTimeout(refreshMap, 300);
  setTimeout(refreshMap, 600);
  window.addEventListener("resize", refreshMap);
});
