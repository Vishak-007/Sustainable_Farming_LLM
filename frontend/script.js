
const API_BASE = 'http://localhost:5000/api';

// ── Auth ──────────────────────────────────────
const Auth = {
  getMobile() { return localStorage.getItem('farmerMobile'); },
  getName()   { return localStorage.getItem('farmerName') || 'Farmer'; },
  logout() {
    localStorage.removeItem('farmerMobile');
    localStorage.removeItem('farmerName');
    sessionStorage.removeItem('cropPromptV2');
    window.location.href = 'landing-page.html';
  }
};

function logout() { Auth.logout(); }

// ── Toast ─────────────────────────────────────
function toast(msg, type = 'green') {
  const t = document.getElementById('toast');
  t.className = `sf-toast ${type}`;
  t.innerHTML = (type === 'green' ? '✅ ' : 'âŒ ') + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ── API ──────────────────────────────────────
const API = {
  async get(path) {
    const r = await fetch(API_BASE + path, { headers: { 'Content-Type': 'application/json' } });
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  },
  async put(path, data) {
    const r = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return r.json();
  }
};

// ── Navigation ────────────────────────────────
let currentPage = 'dashboard';

function goPage(name) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const navEl  = document.querySelector(`[data-page="${name}"]`);
  const pageEl = document.getElementById(`page-${name}`);
  if (navEl)  navEl.classList.add('active');
  if (pageEl) pageEl.classList.add('active');
  currentPage = name;
  document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => goPage(item.dataset.page));
});

// ── State ─────────────────────────────────────
let farmerData   = null;
let advisoryData = null;
let allPrices    = [];
let mktFilter    = 'all';
let farmerCrop   = '';
let currentChart = null;
let isEditing    = false;

// ── Load All Data ─────────────────────────────
async function loadAll() {
  const mobile = Auth.getMobile();

  // If no mobile, run demo mode (don't redirect so the dashboard is always visible)
  if (!mobile) {
    loadDemoData();
  } else {
    // Fetch farmer profile
    try {
      const res = await API.get(`/farmers/${mobile}`);
      farmerData   = res.farmer;
      advisoryData = res.advisory;
      populateDashboard(farmerData, advisoryData);
      populateFarm(farmerData);
      populateProfile(farmerData, advisoryData);
      highlightFarmerCrop();
    } catch (e) {
      console.warn('Backend not connected — running in demo mode', e);
      loadDemoData();
      highlightFarmerCrop();
    }

    // Fetch notifications (non-fatal)
    try {
      const notifs = await API.get('/notifications/farmer');
      if (notifs && notifs.notifications && advisoryData) {
        const formatNotifs = notifs.notifications.map(n => ({
          level: n.type === 'alert' ? 'danger' : n.type === 'offer' ? 'success' : 'info',
          icon: '🔔',
          msg: `<strong>${n.title}</strong>: ${n.message}`
        }));
        advisoryData.alerts = [...formatNotifs, ...(advisoryData.alerts || [])];
        populateDashboard(farmerData, advisoryData);
      }
    } catch (e) { console.warn('Notifications fetch failed', e); }

    // Fetch shipments (non-fatal)
    try {
      const shipmentRes = await API.get('/shipments');
      populateShipments(shipmentRes.data || shipmentRes);
    } catch (e) {
      console.warn('Shipments fetch failed', e);
      populateShipments([]);
    }
  }

  // Market prices – always shows a full table (live data merged with demo fallback)
  // ------------------------------------------------------------------
  try {
    const rawPrices = await API.get('/mandi');
    if (rawPrices && rawPrices.length > 0) {
      const formatted = rawPrices.map(p => {
        const livePrice = parseFloat((parseFloat(p.price_per_kg) * 100).toFixed(2));
        const cropKey   = (p.commodity || '').toLowerCase();
        const demoMatch = demoMarketPrices.find(d => cropKey.includes(d.crop.toLowerCase()));
        return {
          crop:   p.commodity,
          market: livePrice || (demoMatch ? demoMatch.market : livePrice),
          msp:    demoMatch ? demoMatch.msp    : null,
          unit:   'quintal',
          trend:  demoMatch ? demoMatch.trend  : 'up',
          change: demoMatch ? demoMatch.change : 0
        };
      });
      const liveCropNames = new Set(formatted.map(f => f.crop.toLowerCase()));
      const missingDemo   = demoMarketPrices.filter(d => !liveCropNames.has(d.crop.toLowerCase()));
      populateMarket([...formatted, ...missingDemo]);
    } else {
      populateMarket(demoMarketPrices);
    }
  } catch {
    populateMarket(demoMarketPrices);
  }


  populateAdvice();
  // Get location from farmer data or browser geolocation
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => loadWeather(pos.coords.latitude, pos.coords.longitude),
    () => {
     
      loadWeather(20.0, 73.8); 
    }
  );
} else {
  loadWeather(20.0, 73.8); 
}
setTimeout(checkCropPrompt, 500);
}

// ── Demo Data ─────────────────────────────────
function loadDemoData() {
  const demo = {
    firstName: 'Rajan', lastName: 'Sharma', mobile: '9876543210',
    language: 'Hindi', age: 38, qualification: 'Graduate', gender: 'Male',
    country: 'India', state: 'Maharashtra', district: 'Nashik',
    landSize: 5, landUnit: 'Acres', soilType: 'Black',
    regularCrop: 'Rice', hasLivestock: true, cows: 3, goats: 5, hens: 20,
    waterSource: 'borewell',
    prevYearProfit: 85000, prevYearInvestment: 45000,
    fertilizerUsed: 'Urea, DAP', pesticideUsed: 'Chlorpyrifos',
    govSubsidy: 'PM-KISAN', additionalBusiness: 'Dairy',
    feedback: 'Need better irrigation advice.'
  };
  const adv = {
    roi: ((85000 / 45000) * 100).toFixed(1),
    season: 'rabi',
    advice: [
      { type: 'fertilizer', icon: '🌿', title: 'Fertilizer Recommendation', body: 'Apply NPK 20-10-10 at transplanting. Top-dress with Urea at tillering stage.' },
      { type: 'irrigation', icon: '💧', title: 'Irrigation Advice', body: 'Borewell available — use drip or sprinkler irrigation to save water. Monitor water table levels regularly.' },
      { type: 'soil', icon: '🌱', title: 'Soil Management', body: 'Black soil retains moisture well. Avoid waterlogging. Ideal for cotton and sorghum. Add lime if pH < 6.' },
      { type: 'season', icon: '📅', title: 'Seasonal Advisory', body: 'Rabi season (Nov–Apr): Ideal time for wheat, mustard, chickpea, barley. Irrigate at critical stages.' },
      { type: 'livestock', icon: 'ðŸ„', title: 'Livestock Integration', body: 'You have 28 animals. Use animal waste as organic manure — reduces fertilizer costs by 30–40%.' },
      { type: 'finance', icon: '💰', title: 'Financial Health', body: 'Your ROI is 88.9%. Excellent! Consider reinvesting in better irrigation equipment or expanding land area.' },
    ],
    alerts: [
      { level: 'info',    icon: 'ℹï¸',  msg: 'PM-KISAN enrolled — next installment due in March.' },
      { level: 'success', icon: '✅',  msg: 'Wheat crop matured — ready for harvest this week!' },
      { level: 'warn',    icon: '⚠ï¸', msg: 'Heavy rain expected in 2 days — avoid pesticide spraying.' },
    ],
    diseases: [
      { name: 'Blast Disease',    tip: 'Spray Tricyclazole 0.1% at tillering. Avoid excess nitrogen.' },
      { name: 'Brown Plant Hopper', tip: 'Use BPMC spray. Keep field drainage clear.' }
    ]
  };
  farmerData   = demo;
  advisoryData = adv;
  populateDashboard(demo, adv);
  populateFarm(demo);
  populateProfile(demo, adv);
  populateShipments([]);
}

// ── Dashboard ─────────────────────────────────
function populateDashboard(f, adv) {
  document.getElementById('sf-name').textContent = `${f.firstName} ${f.lastName}`;
  document.getElementById('sf-loc').textContent  = `ðŸ“ ${[f.district, f.state].filter(Boolean).join(', ') || 'India'}`;
  document.getElementById('d-landsize').textContent = f.landSize ? `${f.landSize} ${f.landUnit}` : '—';
  document.getElementById('d-crop').textContent = f.regularCrop || '—';
  document.getElementById('d-farmname').textContent = `${f.firstName}'s Farm âœï¸`;

  // Season on farm card
  const seasons = { kharif: 'Kharif', rabi: 'Rabi', zaid: 'Zaid' };
  const seasonEl = document.getElementById('d-season');
  if (seasonEl) seasonEl.textContent = seasons[adv?.season] || adv?.season || '—';

  // Health
  const healthEl = document.getElementById('d-health');
  if (healthEl) healthEl.textContent = 'Good';

  // ROI
  if (adv && adv.roi) {
    document.getElementById('d-roi').textContent = adv.roi + '%';
    const roi = parseFloat(adv.roi);
    const trendEl = document.getElementById('d-roi-trend');
    trendEl.textContent  = roi > 50 ? '↑ Excellent ROI' : roi > 20 ? '↑ Good ROI' : '↓ Low ROI';
    trendEl.className    = `stat-trend ${roi > 20 ? 'trend-up' : 'trend-down'}`;
  }

  // Alerts count + list
  const alerts = adv && adv.alerts ? adv.alerts : [];
  document.getElementById('d-alerts-count').textContent = alerts.length;
  const alertTrend = document.getElementById('d-alert-trend');
  alertTrend.textContent = alerts.length > 0 ? `↑ ${alerts.length} alert${alerts.length > 1 ? 's' : ''}` : 'No new alerts';
  alertTrend.className   = alerts.length > 0 ? 'stat-trend trend-down' : 'stat-trend trend-up';

  const lvlMap = { warning: 'warn', info: 'info', danger: 'danger', success: 'success', warn: 'warn' };
  document.getElementById('d-alerts-wrap').innerHTML = alerts.length
    ? alerts.map(a => `<div class="alert alert-${lvlMap[a.level] || 'info'}">${a.icon || ''} ${a.msg}</div>`).join('')
    : '<div style="padding:10px;color:var(--text-3);font-size:.9rem;">No alerts at this time.</div>';

  // Crop list
  const demoCrops = [
    { emoji: '🌾', name: 'Barley',  stage: 'Maturing',     pct: 90,  color: 'pf-green', textColor: 'var(--primary)' },
    { emoji: '🌾', name: 'Millet',  stage: 'Ripening',     pct: 85,  color: 'pf-green', textColor: 'var(--primary)' },
    { emoji: '🌽', name: 'Corn',    stage: 'Vegetative',   pct: 23,  color: 'pf-amber', textColor: 'var(--accent)'  },
    { emoji: '🌿', name: 'Oats',    stage: 'Ripening',     pct: 75,  color: 'pf-amber', textColor: 'var(--accent)'  },
    { emoji: '🌾', name: 'Rice',    stage: 'Seed Started', pct: 10,  color: 'pf-red',   textColor: 'var(--red)'     },
    { emoji: '🌾', name: 'Wheat',   stage: 'Matured',      pct: 100, color: 'pf-green', textColor: 'var(--primary)' },
  ];
  document.getElementById('d-crop-list').innerHTML = demoCrops.map(c => `
    <div class="crop-item">
      <div class="crop-thumb">${c.emoji}</div>
      <div class="crop-info">
        <div class="crop-name">${c.name}</div>
        <div class="crop-stage">${c.stage}</div>
        <div class="prog-bar"><div class="prog-fill ${c.color}" style="width:${c.pct}%"></div></div>
      </div>
      <div class="crop-pct" style="color:${c.textColor}">${c.pct}%</div>
    </div>`).join('');
}
async function loadWeather(lat, lon) {
  try {
    const data = await API.get(`/weather?lat=${lat}&lon=${lon}`);
    updateWeatherUI(data.current, data.forecast);
  } catch (e) {
    console.warn('Weather fetch failed', e);
  }
}

function getWeatherEmoji(code) {
  if (code >= 200 && code < 300) return '⛈ï¸';
  if (code >= 300 && code < 400) return '🌦ï¸';
  if (code >= 500 && code < 600) return '🌧ï¸';
  if (code >= 600 && code < 700) return 'â„ï¸';
  if (code === 800) return '☀ï¸';
  if (code === 801 || code === 802) return '⛅';
  return 'â˜ï¸';
}

function updateWeatherUI(curr, fore) {
  // Update topbar pill
  const temp = Math.round(curr.main.temp);
  const emoji = getWeatherEmoji(curr.weather[0].id);
  const desc = curr.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
  
  document.querySelector('.weather-pill').innerHTML = 
    `<span>${emoji}</span><span class="temp">${temp}°C</span><span>${desc}</span>`;

  // Update forecast section
  const days = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5'];
  const foreHtml = fore.list.map((item, i) => {
    const icon = getWeatherEmoji(item.weather[0].id);
    const t = Math.round(item.main.temp);
    const rain = Math.round((item.pop || 0) * 100);
    const d = item.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
    return `<div class="weather-day">
      <span class="wd-icon">${icon}</span>
      <div><div class="wd-day">${days[i]}</div><div class="wd-desc">${d}</div></div>
      <div class="wd-temp">${t}°C</div>
      <div class="wd-rain">${rain}%</div>
    </div>`;
  }).join('');
  document.querySelector('.weather-days').innerHTML = foreHtml;
}
// ── Farm Details ──────────────────────────────
function populateFarm(f) {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
  const waterLabels = { rainfed: 'Rainfed', borewell: 'Borewell', canal: 'Canal Irrigation', river: 'River', tank: 'Tank/Pond', mixed: 'Mixed' };

  setText('fdh-name', `${f.firstName || 'My'} Farm`);
  setText('fdh-sub', `${[f.district, f.state].filter(Boolean).join(', ') || 'India'} Â· ${f.landSize} ${f.landUnit}`);
  document.getElementById('fdh-crop').textContent  = f.regularCrop || 'Crop';
  document.getElementById('fdh-land').textContent  = `${f.landSize} ${f.landUnit}`;
  document.getElementById('fdh-state').textContent = f.state || 'India';

  setText('fi-country',  f.country || 'India');
  setText('fi-state',    f.state);
  setText('fi-district', f.district);
  setText('fi-water',    waterLabels[f.waterSource] || f.waterSource);
  setText('fi-land',     `${f.landSize} ${f.landUnit}`);
  setText('fi-soil',     f.soilType);
  setText('fi-crop',     f.regularCrop);
  setText('fi-fert',     f.fertilizerUsed);
  setText('fi-pest',     f.pesticideUsed);
  setText('fi-sub',      f.govSubsidy);
  setText('fi-biz',      f.additionalBusiness);
  setText('lc-cows',     f.cows  || 0);
  setText('lc-goats',    f.goats || 0);
  setText('lc-hens',     f.hens  || 0);

  // Soil health bars
  const soilProfiles = {
    Black:    [85, 30, 88, 70, 60],
    Red:      [45, 70, 40, 55, 40],
    Loamy:    [90, 75, 70, 80, 85],
    Sandy:    [30, 95, 20, 60, 25],
    Clayey:   [65, 20, 90, 65, 50],
    Alluvial: [85, 60, 65, 75, 80],
    Laterite: [40, 80, 35, 45, 30]
  };
  const labels = ['Fertility', 'Drainage', 'Moisture Retention', 'pH Balance', 'Organic Matter'];
  const colors = ['pf-green', 'pf-blue', 'pf-green', 'pf-amber', 'pf-green'];
  const vals   = soilProfiles[f.soilType] || [60, 60, 60, 65, 50];
  document.getElementById('soil-bars').innerHTML = labels.map((lbl, i) => `
    <div class="soil-bar-row">
      <div class="sbr-label">${lbl}</div>
      <div class="sbr-bar"><div class="prog-bar"><div class="prog-fill ${colors[i]}" style="width:${vals[i]}%"></div></div></div>
      <div class="sbr-val">${vals[i]}%</div>
    </div>`).join('');
}

// ── Market Prices ─────────────────────────────
const demoMarketPrices = [
  { crop: 'Rice',       msp: 2183, market: 2350, unit: 'quintal', trend: 'up',   change:  3.2 },
  { crop: 'Wheat',      msp: 2275, market: 2180, unit: 'quintal', trend: 'down', change: -1.8 },
  { crop: 'Maize',      msp: 2090, market: 2240, unit: 'quintal', trend: 'up',   change:  2.1 },
  { crop: 'Cotton',     msp: 7020, market: 7400, unit: 'quintal', trend: 'up',   change:  4.5 },
  { crop: 'Groundnut',  msp: 6783, market: 6500, unit: 'quintal', trend: 'down', change: -2.9 },
  { crop: 'Sugarcane',  msp:  340, market:  355, unit: 'quintal', trend: 'up',   change:  1.4 },
  { crop: 'Soybean',    msp: 4892, market: 5100, unit: 'quintal', trend: 'up',   change:  3.8 },
  { crop: 'Mustard',    msp: 5950, market: 6200, unit: 'quintal', trend: 'up',   change:  5.2 },
  { crop: 'Onion',      msp: null, market: 1800, unit: 'quintal', trend: 'down', change: -8.1 },
  { crop: 'Tomato',     msp: null, market: 2400, unit: 'quintal', trend: 'up',   change: 12.3 },
  { crop: 'Chickpea',   msp: 5440, market: 5600, unit: 'quintal', trend: 'up',   change:  1.9 },
  { crop: 'Moong Dal',  msp: 8558, market: 8900, unit: 'quintal', trend: 'up',   change:  2.7 },
];

function populateMarket(prices) {
  allPrices  = prices;
  farmerCrop = farmerData?.regularCrop || '';

  // Hero stats
  const rising  = prices.filter(p => p.trend === 'up').length;
  const falling  = prices.filter(p => p.trend === 'down').length;
  document.getElementById('mkt-tracked').textContent = prices.length;
  document.getElementById('mkt-rising').textContent  = rising;
  document.getElementById('mkt-falling').textContent = falling;

  // Stat cards for farmer's crop + top 3
  const topCrops = prices.filter(p => p.crop.toLowerCase() !== farmerCrop.toLowerCase()).slice(0, 3);
  const yourCrop = prices.find(p => p.crop.toLowerCase() === farmerCrop.toLowerCase());
  const featured = yourCrop ? [yourCrop, ...topCrops.slice(0, 3)] : topCrops.slice(0, 4);
  const icons    = ['🌾', '🌽', '🌿', '🧅'];
  const siColors = ['si-green', 'si-amber', 'si-blue', 'si-red'];
  document.getElementById('mkt-stats-row').innerHTML = featured.map((p, i) => `
    <div class="stat-card">
      <div class="stat-icon ${siColors[i % 4]}">${icons[i % 4]}</div>
      <div>
        <div class="stat-val">₹${p.market.toLocaleString('en-IN')}</div>
        <div class="stat-lbl">${p.crop}${p.crop.toLowerCase() === farmerCrop.toLowerCase() ? ' (Your Crop)' : ''}</div>
        <div class="stat-trend ${p.trend === 'up' ? 'trend-up' : 'trend-down'}">${p.trend === 'up' ? '↑' : '↓'} ${Math.abs(p.change)}% today</div>
      </div>
    </div>`).join('');

  renderPriceTable();
  renderMandis();
  document.getElementById('mkt-upd').textContent = 'Updated: ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function renderPriceTable() {
  let data = allPrices;
  if (mktFilter === 'up')    data = data.filter(p => p.trend === 'up');
  if (mktFilter === 'down')  data = data.filter(p => p.trend === 'down');
  if (mktFilter === 'yours') data = data.filter(p => p.crop.toLowerCase() === farmerCrop.toLowerCase());

  document.getElementById('price-tbody').innerHTML = data.map(p => {
    const mine = p.crop.toLowerCase() === farmerCrop.toLowerCase();
    const vs   = p.msp
      ? (p.market > p.msp
          ? `<span class="chip chip-green">+₹${(p.market - p.msp).toLocaleString('en-IN')} above MSP</span>`
          : `<span class="chip chip-amber">-₹${(p.msp - p.market).toLocaleString('en-IN')} below MSP</span>`)
      : '<span style="color:var(--text-3)">No MSP</span>';
    const badge = p.trend === 'up'
      ? `<span class="trend-up-badge">▲ ${Math.abs(p.change)}%</span>`
      : `<span class="trend-down-badge">▼ ${Math.abs(p.change)}%</span>`;
    return `<tr ${mine ? 'class="highlight"' : ''}>
      <td><strong>${p.crop}</strong>${mine ? ' <span class="chip chip-green">Your Crop</span>' : ''}</td>
      <td style="font-weight:800;font-size:.9rem;">₹${p.market.toLocaleString('en-IN')}</td>
      <td>${p.msp ? '₹' + p.msp.toLocaleString('en-IN') : '—'}</td>
      <td>${vs}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}

function filterMkt(f, btn) {
  document.querySelectorAll('.ft').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  mktFilter = f;
  renderPriceTable();
}

function renderMandis() {
  const mandis = [
    { name: 'APMC Nashik',       dist: '12 km', open: '6AM–2PM',  days: 'Mon–Sat', fee: '1.5%' },
    { name: 'Lasalgaon Mandi',   dist: '8 km',  open: '7AM–1PM',  days: 'Tue,Thu,Sat', fee: '1.5%' },
    { name: 'Vashi APMC',        dist: '45 km', open: '6AM–3PM',  days: 'Mon–Fri', fee: '2%'   },
    { name: 'Pune APMC',         dist: '35 km', open: '5AM–12PM', days: 'Daily',   fee: '1%'   },
  ];
  document.getElementById('mandi-grid').innerHTML = mandis.map(m => `
    <div class="mandi-card">
      <div class="mandi-name">ðŸª ${m.name}</div>
      <div class="mandi-dist">ðŸ“ ${m.dist} away</div>
      <div class="mandi-row"><span>Timing</span><span>${m.open}</span></div>
      <div class="mandi-row"><span>Open Days</span><span>${m.days}</span></div>
      <div class="mandi-row"><span>Commission</span><span>${m.fee}</span></div>
    </div>`).join('');
}

// ── Price Prediction ──────────────────────────

// Crops supported by the Python ML model
const ML_CROPS = ['Wheat', 'Rice', 'Tomato', 'Onion', 'Potato'];

/**
 * Called when user clicks a crop card in the AI Price Prediction section.
 * Highlights the selected card, stores the name in the hidden input,
 * and enables the Forecast button.
 */
function selectCropCard(cropName) {
  // Deselect all
  ML_CROPS.forEach(c => {
    const el = document.getElementById(`csel-${c}`);
    if (el) el.classList.remove('selected');
  });
  // Select clicked
  const sel = document.getElementById(`csel-${cropName}`);
  if (sel) sel.classList.add('selected');

  document.getElementById('predict-crop').value = cropName;
  const label = document.getElementById('predict-crop-label');
  if (label) label.textContent = `Selected: ${cropName}`;

  const btn = document.getElementById('predict-btn');
  if (btn) btn.disabled = false;
}

/**
 * After farmer data loads, auto-highlight the farmer's own crop
 * if it is one of the 5 ML-supported crops.
 */
function highlightFarmerCrop() {
  const crop = farmerData?.regularCrop || '';
  const match = ML_CROPS.find(c => c.toLowerCase() === crop.toLowerCase());
  ML_CROPS.forEach(c => {
    const el = document.getElementById(`csel-${c}`);
    if (el) {
      el.classList.remove('yours-badge');
      if (c === match) el.classList.add('yours-badge');
    }
  });
}

async function handlePredictPrice() {
  const cropStr = document.getElementById('predict-crop').value.trim();
  if (!cropStr) { toast('Please select a crop first', 'red'); return; }

  const loader    = document.getElementById('predict-loader');
  const resultDiv = document.getElementById('predict-result');
  const btn       = document.getElementById('predict-btn');
  loader.style.display    = 'block';
  resultDiv.style.display = 'none';
  if (btn) { btn.disabled = true; btn.textContent = 'â³ Forecasting…'; }

  try {
    const res = await API.get(`/mandi/predict/${encodeURIComponent(cropStr)}`);
    loader.style.display    = 'none';
    resultDiv.style.display = 'block';

    document.getElementById('predict-title').textContent = `${cropStr} Price Forecast`;
    const trendBadge = document.getElementById('predict-badge');
    if (res.prediction.trend === 'Increase') {
      trendBadge.className = 'chip chip-green';
      trendBadge.textContent = '▲ ' + res.prediction.trend;
    } else {
      trendBadge.className = 'chip chip-red';
      trendBadge.textContent = '▼ ' + res.prediction.trend;
    }
    document.getElementById('predict-reason').textContent = '🤖 AI Insight: ' + res.prediction.reason;

    const historyPrices  = res.inputs.last_10_day_prices;
    const predictedPrice = res.prediction.predicted_price;

    // Build real calendar date labels: Day 1 = 10 days ago, Day 10 = yesterday
    const today     = new Date();
    const dateLabels = historyPrices.map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (10 - i));      // 10 days ago → yesterday
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });
    dateLabels.push('Tomorrow\n(Predicted)');

    const dataPoints   = [...historyPrices, predictedPrice];
    const bgColors     = historyPrices.map(() => 'rgba(45,122,58,0.45)');
    const borderColors = historyPrices.map(() => 'rgba(45,122,58,1)');
    const isUp = res.prediction.trend === 'Increase';
    bgColors.push(isUp ? 'rgba(82,192,99,0.9)' : 'rgba(239,68,68,0.9)');
    borderColors.push(isUp ? 'rgba(82,192,99,1)' : 'rgba(239,68,68,1)');

    if (currentChart) { currentChart.destroy(); currentChart = null; }
    const ctx = document.getElementById('predictionChart').getContext('2d');
    currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dateLabels,
        datasets: [{
          label: `${cropStr} Price (₹/kg)`,
          data:  dataPoints,
          backgroundColor: bgColors,
          borderColor:     borderColors,
          borderWidth: 1.5,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ₹${ctx.parsed.y.toFixed(2)} / kg`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: v => '₹' + v.toFixed(1) }
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, font: { size: 10 } }
          }
        }
      }
    });

  } catch (e) {
    loader.style.display = 'none';
    toast('Prediction failed. Make sure the Python model is accessible.', 'red');
    console.error(e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📈 Forecast Price'; }
  }
}

// ── Shipments ─────────────────────────────────
function populateShipments(data) {
  const tbody = document.getElementById('shipments-tbody');
  if (!tbody) return;
  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:20px;">No active shipments found.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(s => `
    <tr>
      <td>#${String(s.shipmentId || s._id || s.id || '').substring(0,8)}</td>
      <td><strong>${s.crop || 'Crop'}</strong></td>
      <td>${s.qty || '-'} tons</td>
      <td>${s.buyer || 'Unknown Buyer'}</td>
      <td><span class="chip ${String(s.status).toLowerCase() === 'delivered' ? 'chip-green' : 'chip-amber'}">${s.status || 'Pending'}</span></td>
      <td>${s.eta ? new Date(s.eta).toLocaleDateString() : '—'}</td>
    </tr>`).join('');
}

// ── Crop Advice ───────────────────────────────
function populateAdvice() {
  const season  = advisoryData?.season || 'rabi';
  const seasons = { kharif: '🌧ï¸ Kharif Season (Jun–Nov)', rabi: 'â„ï¸ Rabi Season (Nov–Apr)', zaid: '☀ï¸ Zaid Season (Mar–Jun)' };
  document.getElementById('season-pill').textContent = seasons[season] || '🗓ï¸ ' + season;

  const advice = advisoryData?.advice || [];
  document.getElementById('advice-grid').innerHTML = advice.length
    ? advice.map(a => `
        <div class="advice-card">
          <span class="ac-icon">${a.icon}</span>
          <div class="ac-title">${a.title}</div>
          <div class="ac-body">${a.body}</div>
        </div>`).join('')
    : '<div style="padding:10px;color:var(--text-3);font-size:.9rem;grid-column:1/-1;">Complete your farm profile to receive personalized advice.</div>';

  const crop = farmerData && farmerData.regularCrop ? farmerData.regularCrop : 'Rice';
  const soil  = farmerData && farmerData.soilType   ? farmerData.soilType   : '';
  const state = farmerData && farmerData.state       ? farmerData.state      : '';

  // Update disease card crop badge
  const badge = document.getElementById('disease-crop-badge');
  if (badge) badge.textContent = crop;

  // Trigger RAG disease alerts (async — updates grid when ready)
  loadRAGDiseaseAlerts(crop, soil, state);
}

// ── AI Advisor ────────────────────────────────
async function askAI() {
  const q = document.getElementById('ai-q').value.trim();
  if (!q) return;

  const btn = document.getElementById('ai-btn');
  const resp = document.getElementById('ai-resp');

  btn.disabled = true;
  btn.textContent = '…';
  resp.className = 'ai-resp show';
  resp.innerHTML = '<em>Thinking…</em>';

  const ctx = farmerData 
    ? `Farmer ${farmerData.firstName} from ${farmerData.state}, India. Crop: ${farmerData.regularCrop}. Soil: ${farmerData.soilType}. Land: ${farmerData.landSize} ${farmerData.landUnit}. Water: ${farmerData.waterSource}. Fertilizer: ${farmerData.fertilizerUsed}.`
    : 'Indian farmer.';

  try {
    const res = await fetch("http://127.0.0.1:5001/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        question: q + " " + ctx   // 👈 sends farmer context also
      })
    });

    const data = await res.json();

    resp.innerHTML = '<strong>🤖 Advisor:</strong> ' + (data.response || 'No response');

  } catch (error) {
    resp.innerHTML = 'âŒ Could not connect to server';
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ask →';
  }
}

document.getElementById('ai-q').addEventListener('keydown', e => {
  if (e.key === 'Enter') askAI();
});
// ── Profile ───────────────────────────────────
function populateProfile(f, adv) {
  document.getElementById('pro-name').textContent   = `${f.firstName} ${f.lastName}`;
  document.getElementById('pro-sub').textContent    = `📱 ${f.mobile} Â· ðŸ“ ${[f.district, f.state].filter(Boolean).join(', ') || 'India'}`;
  document.getElementById('pro-avatar').textContent = f.gender === 'Female' ? '👩â€🌾' : '👨â€🌾';

  const total = (f.cows || 0) + (f.goats || 0) + (f.hens || 0);
  document.getElementById('pro-badges').innerHTML = `
    <span class="ph-badge">🌾 ${f.regularCrop || 'Farmer'}</span>
    <span class="ph-badge">🗺ï¸ ${f.landSize} ${f.landUnit}</span>
    ${f.hasLivestock ? `<span class="ph-badge">ðŸ„ ${total} Animals</span>` : ''}`;

  document.getElementById('ps-age').textContent    = f.age || '—';
  document.getElementById('ps-roi').textContent    = adv?.roi ? adv.roi + '%' : '—';
  document.getElementById('ps-profit').textContent = f.prevYearProfit ? '₹' + Number(f.prevYearProfit).toLocaleString('en-IN') : '—';
  document.getElementById('ps-qual').textContent   = f.qualification || '—';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('pf-fn',     f.firstName);   set('pf-ln',   f.lastName);  set('pf-mob', f.mobile);
  set('pf-age',    f.age);         set('pf-gen',  f.gender);    set('pf-lang', f.language);
  set('pf-qual',   f.qualification);
  set('pf-state',  f.state);       set('pf-dist', f.district);
  set('pf-land',   f.landSize);    set('pf-unit', f.landUnit);  set('pf-soil', f.soilType);
  set('pf-crop',   f.regularCrop); set('pf-water',f.waterSource);
  set('pf-fert',   f.fertilizerUsed);  set('pf-pest', f.pesticideUsed);
  set('pf-profit', f.prevYearProfit);  set('pf-invest', f.prevYearInvestment);
  set('pf-sub',    f.govSubsidy);  set('pf-biz',  f.additionalBusiness);  set('pf-fb', f.feedback);
}

function showPTab(name, btn) {
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ptab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`ptp-${name}`).classList.add('active');
}

function toggleEdit() {
  isEditing = !isEditing;
  document.querySelectorAll('#page-profile input:not(#pf-mob), #page-profile textarea').forEach(el => el.disabled = !isEditing);
  document.querySelector('.ph-edit-btn').textContent = isEditing ? '✕ Cancel' : 'âœï¸ Edit Profile';
  document.getElementById('save-bar').classList.toggle('show', isEditing);
}

function cancelEdit() {
  isEditing = false;
  if (farmerData) populateProfile(farmerData, advisoryData);
  document.querySelectorAll('#page-profile input:not(#pf-mob), #page-profile textarea').forEach(el => el.disabled = true);
  document.querySelector('.ph-edit-btn').textContent = 'âœï¸ Edit Profile';
  document.getElementById('save-bar').classList.remove('show');
}

function g(id) { return (document.getElementById(id)?.value || '').trim(); }

async function saveProfile() {
  const updates = {
    firstName: g('pf-fn'), lastName: g('pf-ln'),
    age: parseFloat(g('pf-age')) || 0, gender: g('pf-gen'), language: g('pf-lang'), qualification: g('pf-qual'),
    state: g('pf-state'), district: g('pf-dist'),
    landSize: parseFloat(g('pf-land')) || 0, landUnit: g('pf-unit'),
    soilType: g('pf-soil'), regularCrop: g('pf-crop'), waterSource: g('pf-water'),
    fertilizerUsed: g('pf-fert'), pesticideUsed: g('pf-pest'),
    prevYearProfit: parseFloat(g('pf-profit')) || 0, prevYearInvestment: parseFloat(g('pf-invest')) || 0,
    govSubsidy: g('pf-sub'), additionalBusiness: g('pf-biz'), feedback: g('pf-fb'),
  };
  try {
    const mobile = Auth.getMobile();
    if (mobile) {
      const r = await API.put(`/farmers/${mobile}`, updates);
      if (r.success) { farmerData = r.farmer; toast('Profile updated!'); }
      else toast('Update failed', 'red');
    } else {
      Object.assign(farmerData, updates);
      toast('Changes saved (demo mode)');
    }
    localStorage.setItem('farmerName', `${updates.firstName} ${updates.lastName}`);
    cancelEdit();
    populateDashboard(farmerData, advisoryData);
    populateFarm(farmerData);
  } catch { toast('Failed to save', 'red'); }
}

// ── Crop Recommendation Modal ──
function checkCropPrompt() {
  const trigger = sessionStorage.getItem('triggerSignupPrompt');
  if (trigger) {
    showCropModal();
  }
}

function showCropModal() {
  const modal = document.getElementById('crop-prompt-modal');
  if (modal) modal.classList.add('show');
  sessionStorage.removeItem('triggerSignupPrompt');
}

function closeCropModal() {
  const modal = document.getElementById('crop-prompt-modal');
  if (modal) modal.classList.remove('show');
  setTimeout(() => {
    document.getElementById('modal-step-prompt').style.display = 'block';
    document.getElementById('modal-step-form').style.display = 'none';
    document.getElementById('modal-step-result').style.display = 'none';
  }, 300);
}

function showRecForm() {
  document.getElementById('modal-step-prompt').style.display = 'none';
  document.getElementById('modal-step-form').style.display = 'block';
  if (farmerData) {
    if (farmerData.soilType) {
      const soilOpt = Array.from(document.getElementById('rec-soil').options).find(o => o.value.includes(farmerData.soilType));
      if(soilOpt) soilOpt.selected = true;
    }
    if (farmerData.waterSource) {
      const wOpt = Array.from(document.getElementById('rec-water').options).find(o => o.value.toLowerCase().includes(farmerData.waterSource.toLowerCase()));
      if(wOpt) wOpt.selected = true;
    }
  }
}

let currentRecommendation = null;

async function fetchCropRecommendation() {
  const btn = document.getElementById('rec-submit-btn');
  btn.textContent = 'Thinking...';
  btn.disabled = true;

  const reqData = {
    soilType: document.getElementById('rec-soil').value,
    waterSource: document.getElementById('rec-water').value,
    season: document.getElementById('rec-season').value
  };

  try {
    const res = await fetch(`${API_BASE}/cropRecommendation/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData)
    });
    
    if (!res.ok) throw new Error('Failed to get recommendation');
    
    const data = await res.json();
    currentRecommendation = data.recommendation;

    document.getElementById('modal-step-form').style.display = 'none';
    document.getElementById('modal-step-result').style.display = 'block';

    document.getElementById('rec-msg').textContent = data.message;
    document.getElementById('rec-res-name').textContent = currentRecommendation.crop;
    document.getElementById('rec-res-profit').textContent = currentRecommendation.profit_level + ' Profit';
    document.getElementById('rec-res-risk').textContent = currentRecommendation.risk_level + ' Risk';
    
    const dur = currentRecommendation.duration_days;
    document.getElementById('rec-res-duration').textContent = `${dur[0]}-${dur[1]} Days`;

  } catch (err) {
    console.error(err);
    toast('Error fetching recommendation', 'red');
  } finally {
    btn.textContent = 'Get Recommendation';
    btn.disabled = false;
  }
}

async function acceptRecommendation() {
  if (!currentRecommendation) return;
  const cropName = currentRecommendation.crop;
  
  if (farmerData) {
    farmerData.regularCrop = cropName;
    try {
      const mobile = Auth.getMobile();
      if (mobile) {
        await API.put(`/farmers/${mobile}`, { regularCrop: cropName });
      }
      toast('Crop selected and profile updated!');
      populateDashboard(farmerData, advisoryData);
      populateFarm(farmerData);
      populateProfile(farmerData, advisoryData);
    } catch {
      toast('Failed to save to profile, but applying locally for now', 'red');
    }
  }
  closeCropModal();
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadAll);

// ── RAG Advisor (time-gated) ────────────────────────────
const RAG_API     = 'http://127.0.0.1:5001/crop-advice';
const DISEASE_API = 'http://127.0.0.1:5001/disease-alerts';

const RAGAdvisor = {
  currentWeek: 1,
  totalWeeks:  16,
  loading:     false,

  // Crop growing duration in weeks (mirrors backend table)
  CROP_WEEKS: {
    'rice':16,'wheat':18,'maize':13,'corn':13,'cotton':22,'sugarcane':24,
    'soybean':15,'soya':15,'mustard':16,'groundnut':18,'onion':17,
    'tomato':14,'potato':13,'chickpea':16,'moong dal':10,'lentil':14,
    'barley':16,'millet':12,'sorghum':14,'sunflower':14,
  },

  getTotalWeeks(crop) {
    return this.CROP_WEEKS[(crop || '').toLowerCase().trim()] || 16;
  },

  // ── localStorage time-gate helpers ──────────────────────
  _storageKey(crop) { return 'ragStart_' + (crop || 'default').toLowerCase().replace(/\s+/g, '_'); },

  getStartDate(crop) {
    const key = this._storageKey(crop);
    let stored = localStorage.getItem(key);
    if (!stored) {
      stored = new Date().toISOString();
      localStorage.setItem(key, stored);
    }
    return new Date(stored);
  },

  getCurrentAvailableWeek(crop, totalWeeks) {
    const startDate   = this.getStartDate(crop);
    const daysElapsed = Math.floor((Date.now() - startDate.getTime()) / 86400000);
    return Math.min(Math.floor(daysElapsed / 7) + 1, totalWeeks);
  },

  getUnlockDate(crop, week) {
    const d = new Date(this.getStartDate(crop).getTime() + (week - 1) * 7 * 86400000);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  getDaysUntilUnlock(crop, week) {
    const unlockMs = this.getStartDate(crop).getTime() + (week - 1) * 7 * 86400000;
    return Math.max(0, Math.ceil((unlockMs - Date.now()) / 86400000));
  },

  // ── Progress bar ─────────────────────────────────────
  updateProgress(week, totalWeeks, focus) {
    const pct   = Math.min(100, Math.round((week / totalWeeks) * 100));
    const bar   = document.getElementById('rag-progress-bar');
    const label = document.getElementById('rag-progress-label');
    if (bar)   bar.style.width = pct + '%';
    if (label) label.textContent = 'Week ' + week + ' of ' + totalWeeks
      + (focus ? ' \u2014 ' + focus.split(',')[0].trim() : '') + ' (' + pct + '% growing cycle)';
  },

  // ── Locked week view ──────────────────────────────────
  showLockedWeek(week, crop, totalWeeks) {
    const body     = document.getElementById('rag-advice-body');
    const badge    = document.getElementById('rag-week-badge');
    const label    = document.getElementById('rag-week-label');
    const nextBtn  = document.getElementById('rag-next-btn');
    const prevBtn  = document.getElementById('rag-prev-btn');
    const unlockDate = this.getUnlockDate(crop, week);
    const daysLeft   = this.getDaysUntilUnlock(crop, week);

    if (badge) badge.textContent = 'Week ' + week + ' of ' + totalWeeks;
    if (label) label.textContent = 'Locked';
    if (prevBtn) prevBtn.disabled = week <= 1;
    if (nextBtn) nextBtn.disabled = true;
    this.updateProgress(week - 1, totalWeeks, '');

    if (body) {
      body.innerHTML = '<div class="rag-locked-card">'
        + '<div class="rag-lock-icon">\ud83d\udd12</div>'
        + '<div class="rag-lock-title">Week ' + week + ' advice is not yet available</div>'
        + '<div class="rag-lock-sub">This week\'s growing guide unlocks on <strong>' + unlockDate + '</strong><br>'
        + 'Your advisor sends advice every 7 days to match your crop growth.</div>'
        + '<div class="rag-lock-countdown">' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + ' left</div>'
        + '</div>';
    }
  },

  // ── Harvest complete view ─────────────────────────────
  showHarvestComplete(crop, totalWeeks) {
    const body    = document.getElementById('rag-advice-body');
    const badge   = document.getElementById('rag-week-badge');
    const label   = document.getElementById('rag-week-label');
    const nextBtn = document.getElementById('rag-next-btn');
    const prevBtn = document.getElementById('rag-prev-btn');

    if (badge)   badge.textContent = 'Harvested!';
    if (label)   label.textContent = 'Growing cycle complete';
    if (nextBtn) nextBtn.disabled  = true;
    if (prevBtn) prevBtn.disabled  = false;
    this.updateProgress(totalWeeks, totalWeeks, 'Harvest complete');

    if (body) {
      body.innerHTML = '<div class="rag-harvest-complete">'
        + '<div class="rag-harvest-icon">\ud83c\udf3e</div>'
        + '<div class="rag-harvest-title">Harvest Time for ' + crop + '!</div>'
        + '<div class="rag-harvest-sub">'
        + 'Your ' + crop + ' crop has completed its full ' + totalWeeks + '-week growing cycle.<br>'
        + 'It is now ready for harvest. Review your Week ' + totalWeeks + ' advice for best practices.<br><br>'
        + '<strong>Next step:</strong> Update your crop in your profile for the next season!'
        + '</div></div>';
    }
  },

  // ── Parse LLM markdown into styled HTML ─────────────────
  parseAdviceHTML(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let html = '', inList = false;
    for (const line of lines) {
      if (/warning|caution|important/i.test(line.slice(0, 20)) || line.startsWith('\u26a0')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<div class="rag-warning">' + line + '</div>'; continue;
      }
      if (/^[-*\u2022]/.test(line) || /^\d+[.)]\s/.test(line)) {
        if (!inList) { html += '<ul>'; inList = true; }
        const c = line.replace(/^[-*\u2022]\s*/, '').replace(/^\d+[.)]\s*/, '');
        html += '<li>' + c.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</li>'; continue;
      }
      if (line.startsWith('##') || (line.startsWith('**') && line.endsWith('**'))) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<p><strong>' + line.replace(/^#+\s*/, '').replace(/\*\*/g, '') + '</strong></p>'; continue;
      }
      if (inList) { html += '</ul>'; inList = false; }
      html += '<p>' + line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>';
    }
    if (inList) html += '</ul>';
    return html;
  },

  // ── Render successful API response ────────────────────────
  renderAdvice(data, availableWeek) {
    const body      = document.getElementById('rag-advice-body');
    const badge     = document.getElementById('rag-week-badge');
    const label     = document.getElementById('rag-week-label');
    const sourceTag = document.getElementById('rag-source-tag');
    const prevBtn   = document.getElementById('rag-prev-btn');
    const nextBtn   = document.getElementById('rag-next-btn');
    if (!body) return;

    const total = data.total_weeks || this.totalWeeks;
    this.totalWeeks = total;
    if (badge) badge.textContent = 'Week ' + data.week + ' of ' + total;
    if (label) label.textContent = data.is_final_week ? 'Final Week' : 'Week ' + data.week;
    this.updateProgress(data.week, total, data.focus);

    if (data.sources && data.sources.length) {
      if (sourceTag) sourceTag.innerHTML = '\ud83d\udcc4 Sources: ' + data.sources.map(s => '<span>' + s + '</span>').join(' ');
    } else {
      if (sourceTag) sourceTag.innerHTML = '\ud83d\udcc4 Source: Agricultural Knowledge Base';
    }

    body.innerHTML = this.parseAdviceHTML(data.advice || 'No advice available.');
    if (prevBtn) prevBtn.disabled = data.week <= 1;
    if (nextBtn) nextBtn.disabled = data.week >= availableWeek || data.week >= total;
  },

  // ── Main fetch ─────────────────────────────────────────────
  async fetch(week) {
    if (this.loading) return;

    const crop        = (farmerData && farmerData.regularCrop) ? farmerData.regularCrop : 'Rice';
    const total       = this.getTotalWeeks(crop);
    this.totalWeeks   = total;
    const available   = this.getCurrentAvailableWeek(crop, total);
    week              = Math.max(1, Math.min(week, total));
    this.currentWeek  = week;

    // All weeks done — show harvest card
    if (available > total) {
      this.showHarvestComplete(crop, total);
      return;
    }

    // Week is in the future — show lock card
    if (week > available) {
      this.showLockedWeek(week, crop, total);
      return;
    }

    // Fetch from RAG backend
    this.loading = true;
    const body = document.getElementById('rag-advice-body');
    if (body) body.innerHTML = '<div class="rag-loading">Fetching Week ' + week + ' advice from knowledge base...</div>';

    const season = (advisoryData && advisoryData.season) ? advisoryData.season : '';
    const soil   = (farmerData && farmerData.soilType)   ? farmerData.soilType  : '';
    const state  = (farmerData && farmerData.state)      ? farmerData.state     : '';

    try {
      const res  = await fetch(RAG_API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop, week, season, soil, state })
      });
      if (!res.ok) throw new Error('Server ' + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.total_weeks) this.totalWeeks = data.total_weeks;
      this.renderAdvice(data, available);
    } catch (err) {
      console.error('[RAG] fetch error:', err);
      const prevBtn = document.getElementById('rag-prev-btn');
      const nextBtn = document.getElementById('rag-next-btn');
      if (body) body.innerHTML = '<div class="rag-error">Could not load advice. Make sure the Python server is running:<br><code>python backend/app.py</code><br><small>' + err.message + '</small></div>';
      if (prevBtn) prevBtn.disabled = week <= 1;
      if (nextBtn) nextBtn.disabled = true;
    } finally {
      this.loading = false;
    }
  },

  init() {
    const crop      = (farmerData && farmerData.regularCrop) ? farmerData.regularCrop : 'Rice';
    const total     = this.getTotalWeeks(crop);
    const available = this.getCurrentAvailableWeek(crop, total);
    this.currentWeek = Math.min(available, total);
    this.fetch(this.currentWeek);
  }
};

// Called by Prev / Next buttons
function ragChangeWeek(delta) {
  const crop      = (farmerData && farmerData.regularCrop) ? farmerData.regularCrop : 'Rice';
  const total     = RAGAdvisor.getTotalWeeks(crop);
  const available = RAGAdvisor.getCurrentAvailableWeek(crop, total);
  const next      = RAGAdvisor.currentWeek + delta;
  if (next < 1) return;
  // Allow browsing past locked weeks (shows lock card)
  if (next > total) return;
  RAGAdvisor.fetch(next);
}

// ── RAG Disease Alerts ───────────────────────────────────
async function loadRAGDiseaseAlerts(crop, soil, state) {
  const grid  = document.getElementById('disease-grid');
  const badge = document.getElementById('disease-crop-badge');
  if (!grid) return;
  if (badge) badge.textContent = crop;
  grid.innerHTML = '<div style="padding:12px;color:var(--text-3);font-size:.9rem;"><em>Analyzing knowledge base for ' + crop + ' disease risks...</em></div>';

  try {
    const res = await fetch(DISEASE_API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop, soil, state })
    });
    if (!res.ok) throw new Error('Server ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const diseases = data.diseases || [];
    if (!diseases.length) {
      grid.innerHTML = '<div style="padding:12px;color:var(--text-3);font-size:.9rem;">No active disease alerts for ' + crop + ' at this time.</div>';
      return;
    }
    grid.innerHTML = diseases.map(d => '<div class="disease-card">'
      + '<div class="dis-name">\u26a0\ufe0f ' + (d.name || 'Unknown') + '</div>'
      + '<div class="dis-crop">Affects: ' + crop + '</div>'
      + (d.symptoms ? '<div class="dis-tip" style="color:var(--text-2);margin-bottom:5px;">\ud83d\udd0d ' + d.symptoms + '</div>' : '')
      + '<div class="dis-tip">\ud83d\udc8a ' + (d.tip || 'Consult your local agricultural extension for treatment.') + '</div>'
      + '</div>').join('');
  } catch (err) {
    console.warn('[DISEASE] fetch failed:', err);
    // Fallback to static advisoryData diseases
    const diseases = advisoryData && advisoryData.diseases ? advisoryData.diseases : [];
    grid.innerHTML = diseases.length
      ? diseases.map(d => '<div class="disease-card"><div class="dis-name">\u26a0\ufe0f ' + d.name + '</div>'
          + '<div class="dis-crop">Affects: ' + crop + '</div><div class="dis-tip">\ud83d\udc8a ' + d.tip + '</div></div>').join('')
      : '<div style="padding:12px;color:var(--text-3);font-size:.9rem;">Ensure the Python server is running for live alerts.</div>';
  }
}

// ── Patch goPage to auto-init advice tab ─────────────────
const _origGoPage = goPage;
goPage = function(name) {
  _origGoPage(name);
  if (name === 'advice') setTimeout(() => RAGAdvisor.init(), 150);
};
document.querySelectorAll('.nav-item[data-page="advice"]').forEach(el => {
  el.addEventListener('click', () => setTimeout(() => RAGAdvisor.init(), 200));
});
