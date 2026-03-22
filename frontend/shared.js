/**
 * SMART FARMER — shared.js
 * Shared utilities used by all 5 dashboard pages.
 * Handles: Auth, API calls, Sidebar, Topbar, Toast, Demo data
 */

const API_BASE = 'http://localhost:3000';

/* ══════ AUTH ══════ */
const Auth = {
  getMobile() { return localStorage.getItem('farmerMobile'); },
  getName()   { return localStorage.getItem('farmerName') || 'Farmer'; },
  setName(n)  { localStorage.setItem('farmerName', n); },
  logout() {
    localStorage.removeItem('farmerMobile');
    localStorage.removeItem('farmerName');
    window.location.href = 'landingpage.html';
  }
};

/* ══════ API ══════ */
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

/* ══════ TOAST ══════ */
function toast(msg, type = 'green') {
  let el = document.getElementById('sf-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sf-toast';
    el.className = 'sf-toast';
    document.body.appendChild(el);
  }
  el.className = `sf-toast ${type}`;
  el.innerHTML = (type === 'green' ? '✅ ' : '❌ ') + msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

/* ══════ DEMO DATA ══════ */
const DEMO_FARMER = {
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

const DEMO_ADVISORY = {
  roi: ((85000 / 45000) * 100).toFixed(1),
  season: 'rabi',
  advice: [
    { icon: '🌿', title: 'Fertilizer Recommendation', body: 'Apply NPK 20-10-10 at transplanting. Top-dress with Urea at tillering stage.' },
    { icon: '💧', title: 'Irrigation Advice', body: 'Borewell available — use drip or sprinkler irrigation. Monitor water table levels.' },
    { icon: '🌱', title: 'Soil Management', body: 'Black soil retains moisture well. Avoid waterlogging. Add lime if pH < 6.' },
    { icon: '📅', title: 'Seasonal Advisory', body: 'Rabi season (Nov–Apr): Ideal for wheat, mustard, chickpea, barley.' },
    { icon: '🐄', title: 'Livestock Integration', body: 'Use animal waste as organic manure — reduces fertilizer costs by 30–40%.' },
    { icon: '💰', title: 'Financial Health', body: 'Your ROI is 88.9%. Consider reinvesting in better irrigation equipment.' },
  ],
  alerts: [
    { level: 'info',    icon: 'ℹ️', msg: 'PM-KISAN enrolled — next installment due in March.' },
    { level: 'success', icon: '✅', msg: 'Wheat crop matured — ready for harvest this week!' },
    { level: 'warn',    icon: '⚠️', msg: 'Heavy rain expected in 2 days — avoid pesticide spraying.' },
  ]
};

const DEMO_PRICES = [
  { crop: 'Rice',      msp: 2183, market: 2350, trend: 'up',   change: 3.2  },
  { crop: 'Wheat',     msp: 2275, market: 2180, trend: 'down', change: -1.8 },
  { crop: 'Maize',     msp: 2090, market: 2240, trend: 'up',   change: 2.1  },
  { crop: 'Cotton',    msp: 7020, market: 7400, trend: 'up',   change: 4.5  },
  { crop: 'Groundnut', msp: 6783, market: 6500, trend: 'down', change: -2.9 },
  { crop: 'Sugarcane', msp: 340,  market: 355,  trend: 'up',   change: 1.4  },
  { crop: 'Soybean',   msp: 4892, market: 5100, trend: 'up',   change: 3.8  },
  { crop: 'Mustard',   msp: 5950, market: 6200, trend: 'up',   change: 5.2  },
  { crop: 'Onion',     msp: null, market: 1800, trend: 'down', change: -8.1 },
  { crop: 'Tomato',    msp: null, market: 2400, trend: 'up',   change: 12.3 },
  { crop: 'Chickpea',  msp: 5440, market: 5600, trend: 'up',   change: 1.9  },
  { crop: 'Moong Dal', msp: 8558, market: 8900, trend: 'up',   change: 2.7  },
];

/* ══════ LOAD FARMER DATA ══════
   Call this on every page. Returns { farmer, advisory }.
   Falls back to demo data if backend is unavailable.
*/
async function loadFarmerData() {
  const mobile = Auth.getMobile();
  if (mobile) {
    try {
      const data = await API.get(`/farmer/${mobile}`);
      return data;
    } catch (e) {
      console.warn('Backend unavailable — using demo data');
    }
  }
  return { farmer: DEMO_FARMER, advisory: DEMO_ADVISORY };
}

/* ══════ RENDER SIDEBAR ══════ */
function renderSidebar(activePage) {
  const pages = [
    { id: 'dashboard', href: 'dashboard.html',     icon: '🏠', label: 'Dashboard' },
    { id: 'farm',      href: 'farm-details.html',  icon: '🌾', label: 'Farm Details' },
    { id: 'market',    href: 'market-prices.html', icon: '📈', label: 'Market Prices' },
    { id: 'advice',    href: 'crop-advice.html',   icon: '🌱', label: 'Crop Advice', badge: '3' },
    { id: 'profile',   href: 'my-profile.html',    icon: '👤', label: 'My Profile' },
  ];

  const farmerName = Auth.getName();
  const firstName  = farmerName.split(' ')[0];

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__brand">
        <div class="brand-icon">🌾</div>
        <div class="brand-text">
          <strong>Smart Farmer</strong>
          <span>Advisory System</span>
        </div>
      </div>
      <nav class="sidebar__nav">
        <div class="nav-group">
          <div class="nav-label">Main</div>
          ${pages.slice(0, 4).map(p => `
            <a href="${p.href}" class="nav-item ${activePage === p.id ? 'active' : ''}">
              <span class="ni">${p.icon}</span>
              ${p.label}
              ${p.badge ? `<span class="nav-badge">${p.badge}</span>` : ''}
            </a>`).join('')}
        </div>
        <div class="nav-group">
          <div class="nav-label">Account</div>
          <a href="${pages[4].href}" class="nav-item ${activePage === 'profile' ? 'active' : ''}">
            <span class="ni">${pages[4].icon}</span> ${pages[4].label}
          </a>
        </div>
      </nav>
      <div class="sidebar__farmer">
        <div class="farmer-avatar" id="sb-avatar">👨‍🌾</div>
        <div>
          <div class="farmer-name" id="sb-name">${farmerName}</div>
          <div class="farmer-loc" id="sb-loc">📍 Loading…</div>
        </div>
      </div>
    </aside>`;
}

/* ══════ RENDER TOPBAR ══════ */
function renderTopbar(pageTitle) {
  return `
    <div class="topbar">
      <button class="hamburger" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
      <div class="topbar-search">
        <span>🔍</span>
        <input type="text" placeholder="Search crops, fields…">
      </div>
      <div class="topbar-spacer"></div>
      <div class="weather-pill">
        <span>⛅</span>
        <span class="temp">28°C</span>
        <span>Partly Sunny</span>
      </div>
      <div class="notif-btn">🔔<div class="notif-dot"></div></div>
      <div class="topbar-avatar" onclick="window.location.href='my-profile.html'">👨‍🌾</div>
    </div>`;
}

/* ══════ UPDATE SIDEBAR FARMER INFO ══════ */
function updateSidebarFarmer(farmer) {
  const nameEl = document.getElementById('sb-name');
  const locEl  = document.getElementById('sb-loc');
  const avEl   = document.getElementById('sb-avatar');
  if (nameEl) nameEl.textContent = `${farmer.firstName} ${farmer.lastName}`;
  if (locEl)  locEl.textContent  = `📍 ${[farmer.district, farmer.state].filter(Boolean).join(', ') || 'India'}`;
  if (avEl)   avEl.textContent   = farmer.gender === 'Female' ? '👩‍🌾' : '👨‍🌾';
  Auth.setName(`${farmer.firstName} ${farmer.lastName}`);
}

/* ══════ SOIL PROFILES ══════ */
const SOIL_PROFILES = {
  Black:    [85, 30, 88, 70, 60],
  Red:      [45, 70, 40, 55, 40],
  Loamy:    [90, 75, 70, 80, 85],
  Sandy:    [30, 95, 20, 60, 25],
  Clayey:   [65, 20, 90, 65, 50],
  Alluvial: [85, 60, 65, 75, 80],
  Laterite: [40, 80, 35, 45, 30],
};
const SOIL_LABELS = ['Fertility', 'Drainage', 'Moisture Retention', 'pH Balance', 'Organic Matter'];
const SOIL_COLORS = ['pf-green', 'pf-blue', 'pf-green', 'pf-amber', 'pf-green'];

function renderSoilBars(soilType) {
  const vals = SOIL_PROFILES[soilType] || [60, 60, 60, 65, 50];
  return SOIL_LABELS.map((lbl, i) => `
    <div class="soil-bar-row">
      <div class="sbr-label">${lbl}</div>
      <div class="sbr-bar">
        <div class="prog-bar"><div class="prog-fill ${SOIL_COLORS[i]}" style="width:${vals[i]}%"></div></div>
      </div>
      <div class="sbr-val">${vals[i]}%</div>
    </div>`).join('');
}

/* ══════ WATER SOURCE LABELS ══════ */
const WATER_LABELS = {
  rainfed: 'Rainfed', borewell: 'Borewell',
  canal: 'Canal Irrigation', river: 'River / Stream',
  tank: 'Tank / Pond', mixed: 'Mixed Sources'
};

/* ══════ FORMAT CURRENCY ══════ */
function formatCurrency(n) {
  if (!n && n !== 0) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

/* ══════ DISEASE DATABASE ══════ */
const DISEASE_DB = {
  Rice:    [{ name: 'Blast Disease',    tip: 'Spray Tricyclazole 0.1% at tillering. Avoid excess nitrogen.' },
            { name: 'Brown Plant Hopper', tip: 'Use BPMC spray. Keep field drainage clear.' }],
  Wheat:   [{ name: 'Yellow Rust',      tip: 'Apply Propiconazole 0.1% at first sign. Use resistant varieties.' },
            { name: 'Aphids',           tip: 'Spray Dimethoate 0.03%. Natural predators help.' }],
  Maize:   [{ name: 'Fall Armyworm',    tip: 'Apply Emamectin benzoate 5 SG. Monitor whorls daily.' },
            { name: 'Leaf Blight',      tip: 'Use Mancozeb 0.25% spray. Ensure proper crop spacing.' }],
  Cotton:  [{ name: 'Bollworm',         tip: 'Use Bt cotton. Spray Chlorpyrifos if >5 larvae/plant.' },
            { name: 'Whitefly',         tip: 'Spray Imidacloprid 17.8 SL. Use yellow sticky traps.' }],
  default: [{ name: 'Root Rot',         tip: 'Treat seeds with Thiram 75 WP. Avoid waterlogging.' },
            { name: 'Leaf Spot',        tip: 'Apply Mancozeb 0.25% spray. Ensure proper spacing.' }],
};

/* ══════ INIT EVERY PAGE ══════ */
// Call this at top of each page's DOMContentLoaded
function initPage(activePage) {
  document.getElementById('sidebar-mount').innerHTML  = renderSidebar(activePage);
  document.getElementById('topbar-mount').innerHTML   = renderTopbar();
}