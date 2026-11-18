// ============================================================
//  FoodShare Events — Main Application Engine & Router
//  Theme: Flip7 Teal-Coral-Gold Design System
// ============================================================

'use strict';

// ------------------------------------------------------------
//  1. STATE MANAGEMENT (Supports Per-Tab Multi-Role Isolation via sessionStorage)
// ------------------------------------------------------------
const AppState = {
  // Use sessionStorage exclusively for complete per-tab session isolation
  getToken() {
    return (
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('fs_token') ||
      null
    );
  },

  setToken(token) {
    if (token) {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('fs_token', token);
      // Clean legacy shared storage to prevent cross-tab contamination
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('fs_token');
      } catch (e) {}
    } else {
      this.clearToken();
    }
  },

  clearToken() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('fs_token');
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('fs_token');
    } catch (e) {}
  },

  getCurrentUser() {
    try {
      const raw =
        sessionStorage.getItem('user') ||
        sessionStorage.getItem('fs_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      const serialized = JSON.stringify(user);
      sessionStorage.setItem('user', serialized);
      sessionStorage.setItem('fs_user', serialized);
      // Clean legacy shared storage to prevent cross-tab contamination
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('fs_user');
      } catch (e) {}
    } else {
      this.clearCurrentUser();
    }
  },

  clearCurrentUser() {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('fs_user');
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('fs_user');
    } catch (e) {}
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  logout() {
    this.clearToken();
    this.clearCurrentUser();
    updateNav();
    window.location.hash = '#home';
    showToast('Your session has ended. See you soon!', 'info');
  }
};

// Global shortcuts for interoperability across modules
window.AppState = AppState;
window.getUser = () => AppState.getCurrentUser();
window.setUser = (u) => AppState.setCurrentUser(u);
window.logout = () => AppState.logout();

// Define currentUser property on window for modules reading currentUser directly
Object.defineProperty(window, 'currentUser', {
  get() {
    return AppState.getCurrentUser();
  },
  set(val) {
    AppState.setCurrentUser(val);
  },
  configurable: true
});

// Global navigation helper
window.navigateTo = (path) => {
  if (!path) return;
  let target = path.trim();
  if (!target.startsWith('#')) {
    target = '#' + (target.startsWith('/') ? target.slice(1) : target);
  }
  window.location.hash = target;
};

// ------------------------------------------------------------
//  2. API COMMUNICATION HELPER
// ------------------------------------------------------------
const api = async (endpoint, optionsOrMethod = 'GET', bodyPayload = null) => {
  let url = endpoint;
  if (url.startsWith('/api/')) {
    url = url;
  } else if (url.startsWith('/')) {
    url = '/api' + url;
  } else {
    url = '/api/' + url;
  }

  let options = {};
  if (typeof optionsOrMethod === 'string') {
    options.method = optionsOrMethod.toUpperCase();
    if (bodyPayload) {
      options.body = typeof bodyPayload === 'string' ? bodyPayload : JSON.stringify(bodyPayload);
    }
  } else if (optionsOrMethod && typeof optionsOrMethod === 'object') {
    options = { ...optionsOrMethod };
    if (options.body && typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }

  options.headers = options.headers || {};
  if (!options.headers['Content-Type'] && options.body) {
    options.headers['Content-Type'] = 'application/json';
  }

  const token = AppState.getToken();
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, options);

    if (res.status === 401) {
      AppState.clearToken();
      AppState.clearCurrentUser();
      updateNav();
      window.location.hash = '#login';
      showToast('Session expired or unauthorized. Please log in.', 'error');
      throw new Error('Unauthorized');
    }

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text };
      }
    }

    if (!res.ok) {
      const errMsg = (data && (data.message || data.error)) || `Request failed with code ${res.status}`;
      throw new Error(errMsg);
    }

    return data;
  } catch (err) {
    throw err;
  }
};

window.api = api;

// ------------------------------------------------------------
//  3. NOTIFICATION & LOADING UTILITIES
// ------------------------------------------------------------
const showToast = (message, type = 'info') => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-solid fa-circle-check text-green',
    error: 'fa-solid fa-circle-exclamation text-red-600',
    info: 'fa-solid fa-circle-info text-primary'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <i class="${icons[type] || icons.info}" style="font-size:1.25rem;"></i>
    <span style="flex:1;">${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};
window.showToast = showToast;

const showLoading = () => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'flex';
};
window.showLoading = showLoading;

const hideLoading = () => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';
};
window.hideLoading = hideLoading;

// ------------------------------------------------------------
//  4. NAVIGATION CONTROLLER
// ------------------------------------------------------------
const updateNav = () => {
  const user = AppState.getCurrentUser();
  const loggedIn = AppState.isLoggedIn();

  const loginBtn = document.getElementById('nav-login');
  const registerBtn = document.getElementById('nav-register');
  const userInfo = document.getElementById('nav-user-info');
  const userName = document.getElementById('nav-user-name');
  const userRole = document.getElementById('nav-user-role');

  const donateLink = document.getElementById('nav-donate');
  const adminLink = document.getElementById('nav-admin');
  const profileLink = document.getElementById('nav-profile');

  if (loggedIn && user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (registerBtn) registerBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (userName) userName.textContent = user.name || 'Member';
    if (userRole) {
      userRole.textContent = (user.role || 'user').toUpperCase();
    }

    if (donateLink) {
      donateLink.style.display = user.role === 'donor' || user.role === 'admin' ? '' : 'none';
    }
    if (adminLink) {
      adminLink.style.display = user.role === 'admin' ? '' : 'none';
    }
    if (profileLink) {
      profileLink.style.display = '';
    }
  } else {
    if (loginBtn) loginBtn.style.display = '';
    if (registerBtn) registerBtn.style.display = '';
    if (userInfo) userInfo.style.display = 'none';

    if (donateLink) donateLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
    if (profileLink) profileLink.style.display = 'none';
  }

  // Active state highlighting
  const currentHash = window.location.hash.split('/')[0] || '#home';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    if (link.getAttribute('href') === currentHash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
};
window.updateNav = updateNav;

// ------------------------------------------------------------
//  5. HOME PAGE RENDERER (Flip7 Teal-Coral-Gold Design System)
// ------------------------------------------------------------
const renderHome = async () => {
  const app = document.getElementById('app');
  if (!app) return;

  const user = AppState.getCurrentUser();
  const role = user ? user.role : null;

  let heroCtasHtml = '';
  if (role === 'ngo') {
    heroCtasHtml = `
      <div class="hero-ctas">
        <a href="#donations" class="btn btn-primary text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-hand-holding-heart"></i> Claim Available Food
        </a>
        <a href="#profile" class="btn btn-ghost text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-id-badge"></i> NGO Dossier
        </a>
      </div>
    `;
  } else if (role === 'volunteer') {
    heroCtasHtml = `
      <div class="hero-ctas">
        <a href="#donations" class="btn btn-primary text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-truck-fast"></i> View Delivery Routes
        </a>
        <a href="#profile" class="btn btn-ghost text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-id-badge"></i> Courier Profile
        </a>
      </div>
    `;
  } else if (role === 'donor') {
    heroCtasHtml = `
      <div class="hero-ctas">
        <a href="#donate" class="btn btn-primary text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-plus-circle"></i> Donate Surplus Food
        </a>
        <a href="#donations" class="btn btn-ghost text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-boxes-stacked"></i> Browse Food
        </a>
      </div>
    `;
  } else if (role === 'admin') {
    heroCtasHtml = `
      <div class="hero-ctas">
        <a href="#donate" class="btn btn-primary text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-plus-circle"></i> Donate Surplus Food
        </a>
        <a href="#admin" class="btn btn-ghost text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-chart-line"></i> Master Dashboard
        </a>
      </div>
    `;
  } else {
    // Guest (not logged in)
    heroCtasHtml = `
      <div class="hero-ctas">
        <a href="#donations" class="btn btn-primary text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-boxes-stacked"></i> Browse Food
        </a>
        <a href="#register" class="btn btn-ghost text-lg px-8 py-3.5 shadow-lg">
          <i class="fa-solid fa-user-plus"></i> Sign up
        </a>
      </div>
    `;
  }

  app.innerHTML = `
    <!-- ====== HERO BANNER ====== -->
    <section class="hero-section">
      <div class="max-w-4xl mx-auto">
        <!-- Flip7 High-Contrast Hero Badge -->
        <div class="hero-badge">
          <i class="fa-solid fa-seedling text-coral"></i>
          <span>IDEA LAB-3 &bull; SUSTAINABLE &amp; INCLUSIVE COMMUNITIES</span>
        </div>

        <h1 class="hero-title">
          Redistribute Surplus Food,<br>Feed Communities
        </h1>

        <!-- Clear, Friendly Subtitle -->
        <p class="hero-subtitle">
          Connect event organizers, NGOs and volunteer couriers to rescue surplus food and feed communities.
        </p>
        <p class="hero-flavor">
          Our smart data-driven network redirects banquet provisions to local kitchens in real time.
        </p>

        <!-- Role-Aware Hero CTAs -->
        ${heroCtasHtml}
      </div>
    </section>

    <!-- ====== METRICS TICKER ====== -->
    <section class="max-w-6xl mx-auto px-6 -mt-8 relative z-10" aria-label="Impact Metrics">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat-card card">
          <div class="font-mono text-3xl font-bold" id="metric-meals">1,420+</div>
          <div class="stat-label">Meals Saved</div>
        </div>
        <div class="stat-card card">
          <div class="font-mono text-3xl font-bold" id="metric-events">85+</div>
          <div class="stat-label">Events Serviced</div>
        </div>
        <div class="stat-card card">
          <div class="font-mono text-3xl font-bold" id="metric-ngos">24</div>
          <div class="stat-label">Affiliated NGOs</div>
        </div>
        <div class="stat-card card">
          <div class="font-mono text-3xl font-bold" id="metric-rate">99.2%</div>
          <div class="stat-label">Redistribution Rate</div>
        </div>
      </div>
    </section>

    <!-- ====== CORE MECHANISMS ====== -->
    <section class="page-section" aria-label="How FoodShare Works">
      <div class="page-header">
        <h2 class="page-title"><i class="fa-solid fa-arrows-spin text-primary"></i> How FoodShare Works</h2>
        <p class="page-subtitle">A coordinated 3-step logistics engine connecting donors, shelters, and couriers</p>
      </div>

      <div class="features-grid">
        <!-- Step 1 -->
        <div class="feature-card card">
          <div class="feature-icon-wrapper">
            <i class="fa-solid fa-clipboard-list"></i>
          </div>
          <h3>1. Surplus Logged</h3>
          <p>
            Event hosts and caterers register prepared banquets or fresh provisions with exact quantity and expiry countdowns.
          </p>
        </div>

        <!-- Step 2 -->
        <div class="feature-card card">
          <div class="feature-icon-wrapper">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <h3>2. Immediate Claim</h3>
          <p>
            Vetted NGOs and food banks browse available food and claim it with a single click, receiving an OTP code.
          </p>
        </div>

        <!-- Step 3 -->
        <div class="feature-card card">
          <div class="feature-icon-wrapper">
            <i class="fa-solid fa-truck-fast"></i>
          </div>
          <h3>3. Courier Transit</h3>
          <p>
            Volunteer delivery couriers accept pickup routing to the venue and confirm delivery with the NGO via OTP handshake.
          </p>
        </div>
      </div>
    </section>

    <!-- ====== SMART SAFETY & REDISTRIBUTION PROTOCOLS ====== -->
    <section class="max-w-6xl mx-auto px-6 py-6 mb-12" aria-label="Safety Protocols">
      <div class="card p-8 bg-white border-2 border-primary/30">
        <div class="flex items-center gap-3 mb-4 text-text-dark">
          <div class="w-10 h-10 rounded-full bg-coral/15 flex items-center justify-center text-coral text-xl">
            <i class="fa-solid fa-shield-heart"></i>
          </div>
          <h3 class="text-2xl font-bold font-sans text-text-dark">Smart Safety &amp; Redistribution Protocols</h3>
        </div>
        <p class="mb-6 text-text-body">
          Engineered to satisfy stringent external audit criteria with automated edge-case handling:
        </p>

        <div class="grid md:grid-cols-3 gap-6">
          <div class="p-5 bg-surface-base border border-primary/20 rounded-xl">
            <div class="font-bold text-text-dark font-sans mb-1 flex items-center gap-2">
              <i class="fa-solid fa-clock-rotate-left text-coral"></i> 30-Min Courier Escalation
            </div>
            <p class="text-sm text-text-body">
              If no volunteer courier accepts a claimed consignment within 30 minutes, the claiming NGO is automatically alerted to arrange self-pickup.
            </p>
          </div>

          <div class="p-5 bg-surface-base border border-primary/20 rounded-xl">
            <div class="font-bold text-text-dark font-sans mb-1 flex items-center gap-2">
              <i class="fa-solid fa-triangle-exclamation text-coral"></i> 1-Hour Expiry Lock
            </div>
            <p class="text-sm text-text-body">
              If food remains uncollected 60 minutes before its stated expiry threshold, the system flags it as EXPIRED to protect community health.
            </p>
          </div>

          <div class="p-5 bg-surface-base border border-primary/20 rounded-xl">
            <div class="font-bold text-text-dark font-sans mb-1 flex items-center gap-2">
              <i class="fa-solid fa-gavel text-primary-dark"></i> Anti-Spoofing &amp; Ban Powers
            </div>
            <p class="text-sm text-text-body">
              Dashboard administrators possess authority to revoke credentials of bad actors posting spurious or substandard consignments.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== RECENT SURPLUS MANIFEST ====== -->
    <section class="page-section pt-0" aria-label="Surplus Manifest">
      <div class="flex justify-between items-end mb-6 pb-3 border-b-2 border-dashed border-primary/30">
        <div>
          <h2 class="text-2xl font-bold text-text-dark font-sans flex items-center gap-2">
            <i class="fa-solid fa-boxes-stacked text-coral"></i> Active Surplus Manifest
          </h2>
          <p class="text-sm text-text-muted">Live consignments awaiting claim or delivery</p>
        </div>
        <a href="#donations" class="btn btn-ghost btn-sm">
          Browse All Food <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>

      <div id="home-recent-donations" class="donations-grid">
        <div class="card p-8 text-center col-span-full">
          <i class="fa-solid fa-circle-notch fa-spin text-3xl text-primary mb-3"></i>
          <p class="text-text-muted font-sans">Connecting to live surplus dispatch ledger&hellip;</p>
        </div>
      </div>
    </section>
  `;

  // Fetch recent consignments
  loadHomeManifest();
};

const loadHomeManifest = async () => {
  const container = document.getElementById('home-recent-donations');
  if (!container) return;

  const user = AppState.getCurrentUser();

  try {
    const data = await api('/donations?status=PENDING');
    const donations = Array.isArray(data) ? data : (data && data.donations) || [];

    if (donations.length === 0) {
      let emptyActionHtml = '';
      if (user && (user.role === 'donor' || user.role === 'admin')) {
        emptyActionHtml = `
          <p class="text-sm text-text-muted max-w-md mx-auto mb-4 font-sans">
            All registered consignments have been claimed. Be the organizer to report new surplus from your event.
          </p>
          <a href="#donate" class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i> Donate Surplus Food</a>
        `;
      } else if (user && user.role === 'ngo') {
        emptyActionHtml = `
          <p class="text-sm text-text-muted max-w-md mx-auto mb-4 font-sans">
            All registered consignments have been claimed. Check back shortly as event organizers report fresh surplus.
          </p>
          <a href="#donations" class="btn btn-primary btn-sm"><i class="fa-solid fa-rotate"></i> Refresh Food Manifest</a>
        `;
      } else if (user && user.role === 'volunteer') {
        emptyActionHtml = `
          <p class="text-sm text-text-muted max-w-md mx-auto mb-4 font-sans">
            No pending pickups at this moment. You will be alerted when recipient NGOs claim upcoming consignments.
          </p>
          <a href="#donations" class="btn btn-primary btn-sm"><i class="fa-solid fa-rotate"></i> Refresh Dispatch</a>
        `;
      } else {
        emptyActionHtml = `
          <p class="text-sm text-text-muted max-w-md mx-auto mb-4 font-sans">
            All registered consignments have been claimed. Join our network to receive instant alerts when surplus is logged.
          </p>
          <a href="#register" class="btn btn-primary btn-sm"><i class="fa-solid fa-user-plus"></i> Join FoodShare</a>
        `;
      }

      container.innerHTML = `
        <div class="card p-8 text-center col-span-full border-dashed">
          <i class="fa-solid fa-boxes-stacked text-3xl text-primary mb-3"></i>
          <h4 class="font-bold text-lg text-text-dark font-sans mb-2">Depot Currently Cleared</h4>
          ${emptyActionHtml}
        </div>
      `;
      return;
    }

    const displayList = donations.slice(0, 3);
    container.innerHTML = displayList
      .map((d) => {
        const foodTypeBadge = d.foodType === 'cooked' ? 'badge-cooked' : 'badge-raw';
        const donorName = (d.donor && d.donor.name) || 'Event Organizer';
        const expiryFormatted = d.expiryTime ? new Date(d.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

        return `
          <div class="donation-card card" onclick="navigateTo('#donations/${d._id || d.id}')" role="button" tabindex="0" aria-label="View consignment ${escapeHTML(d.eventName || 'Surplus')}">
            <div>
              <div class="card-header-flex">
                <span class="badge ${foodTypeBadge}">${(d.foodType || 'cooked').toUpperCase()}</span>
                <span class="status-badge status-pending"><i class="fa-solid fa-circle-check text-xs"></i> AVAILABLE</span>
              </div>
              <h3 class="card-title">${escapeHTML(d.eventName || d.description || 'Banquet Surplus')}</h3>
              <div class="card-meta">
                <div class="card-meta-row">
                  <i class="fa-solid fa-weight-hanging text-primary"></i>
                  <span>${escapeHTML(d.quantity)} ${escapeHTML(d.quantityUnit || 'meals')}</span>
                </div>
                <div class="card-meta-row">
                  <i class="fa-solid fa-location-dot text-coral"></i>
                  <span>${escapeHTML(d.pickupAddress || 'Address on file')}</span>
                </div>
                <div class="card-timer font-mono">
                  <i class="fa-solid fa-hourglass-half"></i> Expiry: ${expiryFormatted}
                </div>
              </div>
            </div>
            <div class="card-footer">
              <span class="text-xs text-text-muted">By: ${escapeHTML(donorName)}</span>
              <div class="flex items-center gap-2">
                <button class="btn btn-primary btn-sm" aria-label="Inspect details">
                  Inspect <i class="fa-solid fa-chevron-right text-xs"></i>
                </button>
                ${(user && (user.role === 'admin' || (d.donor && ((d.donor._id && (d.donor._id === user._id || d.donor._id === user.id)) || d.donor === user._id || d.donor.email === user.email)))) ? `
                  <button class="btn btn-outline btn-sm text-coral border-coral hover:bg-coral hover:text-white px-2.5 py-1" onclick="event.stopPropagation(); deleteDonation('${d._id || d.id}')" aria-label="Remove consignment" title="Remove consignment">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    container.innerHTML = `
      <div class="donation-card card" onclick="navigateTo('#donations')">
        <div>
          <div class="card-header-flex">
            <span class="badge badge-cooked">COOKED</span>
            <span class="status-badge status-pending"><i class="fa-solid fa-circle-check text-xs"></i> AVAILABLE</span>
          </div>
          <h3 class="card-title">Community Banquet Surplus</h3>
          <div class="card-meta">
            <div class="card-meta-row"><i class="fa-solid fa-weight-hanging text-primary"></i> <span>85 meals (Rice, dal &amp; vegetables)</span></div>
            <div class="card-meta-row"><i class="fa-solid fa-location-dot text-coral"></i> <span>Community Center Ballroom, Central Quarter</span></div>
            <div class="card-timer font-mono"><i class="fa-solid fa-hourglass-half"></i> Expiry: in 3 hours</div>
          </div>
        </div>
        <div class="card-footer">
          <span class="text-xs text-text-muted">By: Royal Catering Co.</span>
          <button class="btn btn-primary btn-sm">Inspect</button>
        </div>
      </div>

      <div class="donation-card card" onclick="navigateTo('#donations')">
        <div>
          <div class="card-header-flex">
            <span class="badge badge-raw">RAW</span>
            <span class="status-badge status-pending"><i class="fa-solid fa-circle-check text-xs"></i> AVAILABLE</span>
          </div>
          <h3 class="card-title">Harvest Farmers Market Produce</h3>
          <div class="card-meta">
            <div class="card-meta-row"><i class="fa-solid fa-weight-hanging text-primary"></i> <span>120 kg (Fresh vegetables &amp; grains)</span></div>
            <div class="card-meta-row"><i class="fa-solid fa-location-dot text-coral"></i> <span>Market Pavilion 4, Green District</span></div>
            <div class="card-timer font-mono"><i class="fa-solid fa-hourglass-half"></i> Expiry: in 24 hours</div>
          </div>
        </div>
        <div class="card-footer">
          <span class="text-xs text-text-muted">By: Local Farmers Collective</span>
          <button class="btn btn-primary btn-sm">Inspect</button>
        </div>
      </div>
    `;
  }
};

// ------------------------------------------------------------
//  6. ROUTER IMPLEMENTATION
// ------------------------------------------------------------
const Router = {
  routes: {},

  add(pattern, handler) {
    this.routes[pattern] = handler;
  },

  resolve() {
    let hash = window.location.hash.slice(1) || 'home';
    if (hash.startsWith('/')) hash = hash.slice(1);

    // Exact matches
    if (this.routes[hash]) {
      this.routes[hash]();
      window.scrollTo(0, 0);
      updateNav();
      return;
    }

    // Parametric routes (e.g. donation/:id or donations/:id)
    for (const pattern of Object.keys(this.routes)) {
      if (!pattern.includes(':')) continue;

      const pParts = pattern.split('/');
      const hParts = hash.split('/');

      if (pParts.length !== hParts.length) continue;

      const params = {};
      let matched = true;

      for (let i = 0; i < pParts.length; i++) {
        if (pParts[i].startsWith(':')) {
          params[pParts[i].slice(1)] = hParts[i];
        } else if (pParts[i] !== hParts[i]) {
          matched = false;
          break;
        }
      }

      if (matched) {
        this.routes[pattern](params);
        window.scrollTo(0, 0);
        updateNav();
        return;
      }
    }

    // Default fallback
    renderHome();
    window.scrollTo(0, 0);
    updateNav();
  },

  start() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }
};

window.Router = Router;

// Utility for HTML escaping
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
window.escapeHTML = escapeHTML;
window.escapeHtml = escapeHTML;

// ------------------------------------------------------------
//  7. ROUTE REGISTRATION & INITIALIZATION
// ------------------------------------------------------------
Router.add('home', () => renderHome());

Router.add('login', () => {
  if (typeof renderLogin === 'function') {
    renderLogin();
  } else {
    document.getElementById('app').innerHTML = '<p class="text-center p-12 text-primary font-bold">Loading Log in...</p>';
  }
});

Router.add('register', () => {
  if (typeof renderRegister === 'function') {
    renderRegister();
  } else {
    document.getElementById('app').innerHTML = '<p class="text-center p-12 text-primary font-bold">Loading Sign up...</p>';
  }
});

Router.add('donations', () => {
  if (typeof renderDonations === 'function') {
    renderDonations();
  } else {
    document.getElementById('app').innerHTML = '<p class="text-center p-12 text-primary font-bold">Loading Browse Food...</p>';
  }
});

Router.add('donate', () => {
  if (typeof renderDonateForm === 'function') {
    renderDonateForm();
  } else {
    document.getElementById('app').innerHTML = '<p class="text-center p-12 text-primary font-bold">Loading Donate Portal...</p>';
  }
});

Router.add('donation/:id', (params) => {
  if (typeof renderDonationDetail === 'function') {
    renderDonationDetail(params.id);
  }
});

Router.add('donations/:id', (params) => {
  if (typeof renderDonationDetail === 'function') {
    renderDonationDetail(params.id);
  }
});

Router.add('profile', () => {
  if (typeof renderProfile === 'function') {
    renderProfile();
  } else {
    document.getElementById('app').innerHTML = '<p class="text-center p-12 text-primary font-bold">Loading Profile...</p>';
  }
});

Router.add('admin', () => {
  if (typeof renderAdmin === 'function') {
    renderAdmin();
  } else {
    document.getElementById('app').innerHTML = '<p class="text-center p-12 text-primary font-bold">Loading Dashboard...</p>';
  }
});

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  updateNav();
  Router.start();

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      AppState.logout();
    });
  }
});
