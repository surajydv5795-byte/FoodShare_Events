// ═══════════════════════════════════════════════════════════════
//  FoodShare Events — Food Redistribution Modules
//  Refined Steampunk Design System · 3-Step Donation Flow
// ═══════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────
//  Helper Functions
// ────────────────────────────────────────────────────────────

function formatTimeRemaining(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function getStatusColor(status) {
  const map = {
    PENDING: 'status-pending',
    CLAIMED: 'status-claimed',
    IN_TRANSIT: 'status-in-transit',
    COMPLETED: 'status-completed',
    EXPIRED: 'status-expired',
    CANCELLED: 'status-expired',
  };
  return map[status] || 'status-pending';
}

function createDonationCard(donation) {
  const donorName = donation.donor && donation.donor.name ? donation.donor.name : 'Event Organizer';
  const foodTypeLabel = donation.foodType === 'cooked' ? 'Cooked' : 'Raw';
  const foodTypeBadgeClass = donation.foodType === 'cooked' ? 'badge-cooked' : 'badge-raw';

  const truncatedAddress = donation.pickupAddress && donation.pickupAddress.length > 45
    ? donation.pickupAddress.substring(0, 45) + '...'
    : donation.pickupAddress || 'N/A';

  const timeRemaining = formatTimeRemaining(donation.expiryTime);
  const statusClass = getStatusColor(donation.status);
  const statusLabel = donation.status === 'PENDING' ? 'AVAILABLE' : donation.status.replace('_', ' ');

  const eventTitle = donation.eventName || donation.description || 'Surplus Consignment';
  const descSnippet = donation.description && donation.description.length > 65
    ? donation.description.substring(0, 65) + '...'
    : (donation.description || '');

  const currentUser = getUser();
  const donorObjId = donation.donor ? (donation.donor._id || donation.donor.id || donation.donor).toString() : '';
  const currentUserId = currentUser ? (currentUser._id || currentUser.id || '').toString() : '';
  const isCardOwner = currentUser && (currentUser.role === 'admin' || (donorObjId && donorObjId === currentUserId) || (donation.donor && donation.donor.email && donation.donor.email === currentUser.email));

  return `
    <div class="donation-card card" onclick="navigateTo('/donations/${donation._id}')">
      <div class="donation-card-header">
        <h3 class="donation-card-title">${escapeHtml(eventTitle)}</h3>
        <span class="badge ${foodTypeBadgeClass}">${foodTypeLabel}</span>
      </div>

      ${descSnippet ? `<p class="donation-card-desc">${escapeHtml(descSnippet)}</p>` : ''}

      <div class="donation-card-meta">
        <div class="meta-row">
          <span class="meta-label"><i class="fa-solid fa-scale-balanced text-xs"></i> Qty:</span>
          <span class="meta-value font-bold">${escapeHtml(String(donation.quantity))} ${escapeHtml(donation.quantityUnit || '')}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label"><i class="fa-solid fa-location-dot text-xs"></i> Pickup:</span>
          <span class="meta-value">${escapeHtml(truncatedAddress)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label"><i class="fa-solid fa-user text-xs"></i> Donor:</span>
          <span class="meta-value">${escapeHtml(donorName)}</span>
        </div>
      </div>

      <div class="donation-card-footer">
        <span class="status-badge ${statusClass}">
          <i class="fa-solid fa-circle-check text-xs"></i> ${statusLabel}
        </span>
        <span class="time-remaining font-mono">${escapeHtml(timeRemaining)}</span>
      </div>

      <div class="flex items-center gap-2 mt-2">
        <button class="btn btn-outline btn-sm btn-view-details flex-1" onclick="event.stopPropagation(); navigateTo('/donations/${donation._id}')">
          Inspect Details <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
        ${isCardOwner && donation.status !== 'COMPLETED' && donation.status !== 'CANCELLED' ? `
          <button class="btn btn-outline btn-sm text-red-700 border-red-700 hover:bg-red-700 hover:text-white px-3" onclick="event.stopPropagation(); deleteDonation('${donation._id}')" title="Remove Consignment">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// ────────────────────────────────────────────────────────────
//  1. renderDonations() — Browse Food Page (Renamed from Food Depot)
// ────────────────────────────────────────────────────────────

async function renderDonations() {
  const appEl = document.getElementById('app');
  const user = getUser();
  const isDonorOrAdmin = user && (user.role === 'donor' || user.role === 'admin');
  const actionButtonHtml = isDonorOrAdmin
    ? `<a href="#donate" class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i> Donate Surplus Food</a>`
    : (user && user.role === 'ngo'
        ? `<span class="badge badge-cooked"><i class="fa-solid fa-hand-holding-heart"></i> NGO Mode &bull; Click Available food to claim</span>`
        : (user && user.role === 'volunteer'
            ? `<span class="badge badge-cooked"><i class="fa-solid fa-truck-fast"></i> Courier Mode &bull; Click Claimed food for pickup</span>`
            : ''));

  appEl.innerHTML = `
    <section class="page-section donations-page">
      <div class="page-header">
        <h1 class="page-title"><i class="fa-solid fa-boxes-stacked text-gold"></i> Browse Food</h1>
        <p class="page-subtitle">Real-time manifest of surplus provisions available for rescue</p>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar card p-4 mb-8 flex flex-wrap gap-4 items-center justify-between">
        <div class="flex flex-wrap gap-4 items-center">
          <div class="filter-group flex items-center gap-2">
            <label for="filter-status" class="filter-label font-bold text-sm text-ink-dark">Status:</label>
            <select id="filter-status" class="steampunk-select" onchange="applyDonationFilters()">
              <option value="">All Statuses</option>
              <option value="PENDING" selected>Available (Pending)</option>
              <option value="CLAIMED">Claimed</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="COMPLETED">Delivered</option>
            </select>
          </div>
          <div class="filter-group flex items-center gap-2">
            <label for="filter-foodtype" class="filter-label font-bold text-sm text-ink-dark">Food Type:</label>
            <select id="filter-foodtype" class="steampunk-select" onchange="applyDonationFilters()">
              <option value="">All Types</option>
              <option value="cooked">Cooked Meals</option>
              <option value="raw">Raw Produce</option>
            </select>
          </div>
        </div>

        ${actionButtonHtml}
      </div>

      <!-- Donation Cards Grid -->
      <div id="donations-grid" class="donations-grid">
        <div class="card p-12 text-center col-span-full">
          <i class="fa-solid fa-gear fa-spin text-3xl text-brass mb-3"></i>
          <p class="text-ink-faded font-sans">Connecting to live surplus depot&hellip;</p>
        </div>
      </div>
    </section>
  `;

  await loadDonations();
}

async function loadDonations() {
  const grid = document.getElementById('donations-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="card p-12 text-center col-span-full">
      <i class="fa-solid fa-gear fa-spin text-3xl text-brass mb-3"></i>
      <p class="text-ink-faded font-sans">Connecting to live surplus depot&hellip;</p>
    </div>
  `;

  try {
    const statusFilter = document.getElementById('filter-status') ? document.getElementById('filter-status').value : '';
    const foodTypeFilter = document.getElementById('filter-foodtype') ? document.getElementById('filter-foodtype').value : '';

    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (foodTypeFilter) params.append('foodType', foodTypeFilter);

    const queryString = params.toString();
    const url = '/api/donations' + (queryString ? '?' + queryString : '');

    const donations = await api(url);

    if (!donations || donations.length === 0) {
      const user = getUser();
      const isDonorOrAdmin = user && (user.role === 'donor' || user.role === 'admin');
      grid.innerHTML = `
        <div class="empty-state col-span-full card p-10 text-center">
          <div class="empty-state-icon text-3xl text-brass mb-2"><i class="fa-solid fa-boxes-packing"></i></div>
          <h3 class="font-bold text-xl text-ink-dark mb-1">No Consignments Match Current Filters</h3>
          <p class="text-ink-faded max-w-md mx-auto mb-4">${isDonorOrAdmin ? 'No active listings match your selection. You can submit new banquet surplus now.' : 'No active listings match your selection at this moment.'}</p>
          ${isDonorOrAdmin ? '<a href="#donate" class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i> Donate Surplus Food</a>' : '<button onclick="loadDonations()" class="btn btn-primary btn-sm"><i class="fa-solid fa-rotate"></i> Refresh Listings</button>'}
        </div>
      `;
      return;
    }

    grid.innerHTML = donations.map(createDonationCard).join('');
  } catch (error) {
    grid.innerHTML = `
      <div class="empty-state error-state col-span-full card p-10 text-center">
        <h3 class="font-bold text-xl text-red-800 mb-1">Network Transmission Interrupted</h3>
        <p class="text-ink-faded">Unable to retrieve current records. Please refresh or retry.</p>
      </div>
    `;
    showToast('Failed to load donations manifest.', 'error');
  }
}

function applyDonationFilters() {
  loadDonations();
}

// ────────────────────────────────────────────────────────────
//  2. renderDonateForm() — 3-Step Donation Flow (Checklist Item 4)
// ────────────────────────────────────────────────────────────

let currentDonateStep = 1;
let donateFormData = {
  eventName: '',
  foodType: 'cooked',
  quantity: '',
  quantityUnit: 'meals',
  description: '',
  expiryTime: '',
  pickupAddress: '',
  contactPhone: '',
};

function renderDonateForm() {
  const appEl = document.getElementById('app');
  const user = getUser();

  if (!user || (user.role !== 'donor' && user.role !== 'admin')) {
    const isReceiverOrVolunteer = user && (user.role === 'ngo' || user.role === 'volunteer');
    appEl.innerHTML = `
      <section class="page-section">
        <div class="card p-10 text-center max-w-md mx-auto">
          <div class="text-4xl text-orange mb-3"><i class="fa-solid fa-shield-halved"></i></div>
          <h2 class="text-2xl font-bold font-serif text-ink-dark mb-2">Donor Role Required</h2>
          <p class="text-ink-faded mb-6 text-sm">
            ${isReceiverOrVolunteer 
              ? `You are currently authenticated as <strong>${escapeHtml((user.role).toUpperCase())}</strong> (${escapeHtml(user.name || 'Member')}). Surplus donations can only be submitted by registered Event Hosts / Caterers.`
              : 'Only registered Event Donors may submit surplus food. Please authenticate with a donor account or register as a host.'}
          </p>
          <div class="flex justify-center gap-3">
            <button class="btn btn-primary" onclick="navigateTo('#donations')"><i class="fa-solid fa-boxes-stacked"></i> Browse Food</button>
            ${!user ? '<button class="btn btn-outline" onclick="navigateTo(\'#login\')">Log In as Donor</button>' : ''}
          </div>
        </div>
      </section>
    `;
    return;
  }

  currentDonateStep = 1;
  renderDonateStepView();
}

function renderDonateStepView() {
  const appEl = document.getElementById('app');

  appEl.innerHTML = `
    <section class="page-section donate-form-page">
      <div class="page-header">
        <h1 class="page-title"><i class="fa-solid fa-hand-holding-heart text-gold"></i> Donate Surplus Food</h1>
        <p class="page-subtitle">Turn leftover banquet food into meals for people who need it</p>
      </div>

      <!-- 3-Step Progress Bar (Checklist Item 4) -->
      <div class="max-w-3xl mx-auto donate-progress-container mb-8">
        <div class="step-indicator-item ${currentDonateStep === 1 ? 'active' : ''} ${currentDonateStep > 1 ? 'completed' : ''}">
          <div class="step-bubble">${currentDonateStep > 1 ? '<i class="fa-solid fa-check"></i>' : '1'}</div>
          <span class="step-text">1. What Food</span>
        </div>
        <div class="step-indicator-item ${currentDonateStep === 2 ? 'active' : ''} ${currentDonateStep > 2 ? 'completed' : ''}">
          <div class="step-bubble">${currentDonateStep > 2 ? '<i class="fa-solid fa-check"></i>' : '2'}</div>
          <span class="step-text">2. When &amp; Where</span>
        </div>
        <div class="step-indicator-item ${currentDonateStep === 3 ? 'active' : ''}">
          <div class="step-bubble">3</div>
          <span class="step-text">3. Confirm &amp; Submit</span>
        </div>
      </div>

      <div class="donate-layout max-w-4xl mx-auto">
        <!-- Main Step Form Card -->
        <div class="card p-8">
          ${renderStepContent(currentDonateStep)}
        </div>

        <!-- Live Network Helper Side-Panel -->
        <div class="live-network-panel">
          <h4><i class="fa-solid fa-tower-broadcast text-orange"></i> Live Network</h4>
          <div class="flex flex-col gap-3 text-sm text-ink-faded">
            <div class="p-2.5 bg-white/70 border border-brass/30 rounded flex items-start gap-2">
              <i class="fa-solid fa-shield-halved text-green mt-1"></i>
              <div>
                <strong class="text-ink-dark">24 Vetted NGOs</strong>
                <p class="text-xs">Active community pantries ready to claim in your sector.</p>
              </div>
            </div>

            <div class="p-2.5 bg-white/70 border border-brass/30 rounded flex items-start gap-2">
              <i class="fa-solid fa-truck-fast text-orange mt-1"></i>
              <div>
                <strong class="text-ink-dark">12 Volunteer Couriers</strong>
                <p class="text-xs">Dispatch couriers available for rapid event pickup.</p>
              </div>
            </div>

            <div class="p-2.5 bg-white/70 border border-brass/30 rounded flex items-start gap-2">
              <i class="fa-solid fa-clock-rotate-left text-brass mt-1"></i>
              <div>
                <strong class="text-ink-dark">1-Hour Safety Lock</strong>
                <p class="text-xs">Provisions are protected with automated expiry thresholds.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // Attach step listeners
  attachStepListeners();
}

function renderStepContent(step) {
  if (step === 1) {
    return `
      <h3 class="text-xl font-bold font-serif text-ink-dark mb-4 pb-2 border-b border-brass/30">
        Step 1: Consignment Specifications
      </h3>

      <div class="steampunk-form">
        <!-- Event Name -->
        <div class="form-group">
          <label for="donate-event-name" class="form-label">Event / Venue Name *</label>
          <input
            type="text"
            id="donate-event-name"
            class="form-input text-lg py-2.5"
            placeholder="e.g. Royal Horticultural Gala"
            value="${escapeHtml(donateFormData.eventName)}"
            required
          />
        </div>

        <!-- Food Type Toggle -->
        <div class="form-group">
          <label class="form-label">Food Classification *</label>
          <div class="grid grid-cols-2 gap-3 mt-1">
            <label class="role-card card p-3 text-center cursor-pointer border border-brass/50 hover:border-orange transition" id="card-cooked" style="background:var(--parchment-light);">
              <input type="radio" name="foodType" value="cooked" ${donateFormData.foodType === 'cooked' ? 'checked' : ''} class="hidden" />
              <div class="text-xl text-orange mb-1"><i class="fa-solid fa-utensils"></i></div>
              <div class="font-bold text-sm text-ink-dark">Cooked Meals</div>
              <div class="text-xs text-ink-faded">Prepared banquets, trays</div>
            </label>
            <label class="role-card card p-3 text-center cursor-pointer border border-brass/50 hover:border-orange transition" id="card-raw" style="background:var(--parchment-light);">
              <input type="radio" name="foodType" value="raw" ${donateFormData.foodType === 'raw' ? 'checked' : ''} class="hidden" />
              <div class="text-xl text-green mb-1"><i class="fa-solid fa-carrot"></i></div>
              <div class="font-bold text-sm text-ink-dark">Raw Produce / Grains</div>
              <div class="text-xs text-ink-faded">Uncooked bulk ingredients</div>
            </label>
          </div>
        </div>

        <!-- Quantity + Unit -->
        <div class="form-row">
          <div class="form-group">
            <label for="donate-quantity" class="form-label">Estimated Quantity *</label>
            <input
              type="number"
              id="donate-quantity"
              class="form-input text-lg py-2.5"
              placeholder="e.g. 75"
              min="1"
              value="${escapeHtml(donateFormData.quantity)}"
              required
            />
          </div>
          <div class="form-group">
            <label for="donate-unit" class="form-label">Measurement Unit *</label>
            <select id="donate-unit" class="steampunk-select text-lg py-2.5">
              <option value="meals" ${donateFormData.quantityUnit === 'meals' ? 'selected' : ''}>Meals (Servings)</option>
              <option value="kg" ${donateFormData.quantityUnit === 'kg' ? 'selected' : ''}>Kilograms (Kg)</option>
            </select>
          </div>
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="donate-description" class="form-label">Contents &amp; Preparation Description *</label>
          <textarea
            id="donate-description"
            class="form-input form-textarea"
            rows="3"
            placeholder="e.g. Herb-roasted chicken, steamed rice, sautéed greens. Packed in thermal containers."
            required
          >${escapeHtml(donateFormData.description)}</textarea>
        </div>

        <div class="pt-4 flex justify-end">
          <button type="button" class="btn btn-primary px-8 py-3 text-lg" onclick="goToStep(2)">
            Continue to Logistics &rarr;
          </button>
        </div>
      </div>
    `;
  }

  if (step === 2) {
    return `
      <h3 class="text-xl font-bold font-serif text-ink-dark mb-4 pb-2 border-b border-brass/30">
        Step 2: Pickup Window &amp; Dispatch Location
      </h3>

      <div class="steampunk-form">
        <!-- Expiry Date & Time -->
        <div class="form-group">
          <label for="donate-expiry" class="form-label">Consume By / Expiry Threshold *</label>
          <input
            type="datetime-local"
            id="donate-expiry"
            class="form-input text-lg py-2.5"
            value="${escapeHtml(donateFormData.expiryTime)}"
            required
          />
          <span class="text-xs text-ink-faded mt-1"><i class="fa-solid fa-circle-info"></i> Consignments are locked 1 hour before this timestamp.</span>
        </div>

        <!-- Pickup Address -->
        <div class="form-group">
          <label for="donate-address" class="form-label">Complete Venue Address *</label>
          <input
            type="text"
            id="donate-address"
            class="form-input text-lg py-2.5"
            placeholder="e.g. Grand Ballroom Service Entrance, 42 Industrial Way"
            value="${escapeHtml(donateFormData.pickupAddress)}"
            required
          />
        </div>

        <!-- Contact Phone -->
        <div class="form-group">
          <label for="donate-phone" class="form-label">On-Site Contact Phone *</label>
          <input
            type="tel"
            id="donate-phone"
            class="form-input text-lg py-2.5"
            placeholder="+91 98200 12345"
            value="${escapeHtml(donateFormData.contactPhone)}"
            required
          />
        </div>

        <div class="pt-4 flex justify-between items-center">
          <button type="button" class="btn btn-outline" onclick="goToStep(1)">
            &larr; Back to Food Details
          </button>
          <button type="button" class="btn btn-primary px-8 py-3 text-lg" onclick="goToStep(3)">
            Review &amp; Confirm &rarr;
          </button>
        </div>
      </div>
    `;
  }

  if (step === 3) {
    return `
      <h3 class="text-xl font-bold font-serif text-ink-dark mb-2 pb-2 border-b border-brass/30">
        Step 3: Confirm &amp; Dispatch Surplus
      </h3>
      <p class="text-sm text-ink-faded mb-4">Please verify the details below before submitting to the live depot:</p>

      <div class="confirm-summary-box">
        <div class="confirm-item">
          <span class="font-bold text-ink-faded">Event Name:</span>
          <span class="font-bold text-ink-dark">${escapeHtml(donateFormData.eventName)}</span>
        </div>
        <div class="confirm-item">
          <span class="font-bold text-ink-faded">Classification:</span>
          <span class="uppercase font-mono font-bold ${donateFormData.foodType === 'cooked' ? 'text-orange' : 'text-green'}">${donateFormData.foodType}</span>
        </div>
        <div class="confirm-item">
          <span class="font-bold text-ink-faded">Quantity:</span>
          <span class="font-bold text-ink-dark font-mono">${escapeHtml(donateFormData.quantity)} ${escapeHtml(donateFormData.quantityUnit)}</span>
        </div>
        <div class="confirm-item">
          <span class="font-bold text-ink-faded">Description:</span>
          <span class="text-ink-dark max-w-xs text-right">${escapeHtml(donateFormData.description)}</span>
        </div>
        <div class="confirm-item">
          <span class="font-bold text-ink-faded">Pickup Address:</span>
          <span class="text-ink-dark text-right">${escapeHtml(donateFormData.pickupAddress)}</span>
        </div>
        <div class="confirm-item">
          <span class="font-bold text-ink-faded">Expiry Time:</span>
          <span class="font-mono text-ink-dark">${new Date(donateFormData.expiryTime).toLocaleString()}</span>
        </div>
        <div class="confirm-item">
          <span class="font-bold text-ink-faded">Contact:</span>
          <span class="font-mono text-ink-dark">${escapeHtml(donateFormData.contactPhone)}</span>
        </div>
      </div>

      <div class="pt-4 flex justify-between items-center">
        <button type="button" class="btn btn-outline" onclick="goToStep(2)">
          &larr; Edit Details
        </button>
        <button type="button" id="final-submit-btn" class="btn btn-primary px-8 py-3.5 text-lg" onclick="executeDonationSubmit()">
          <i class="fa-solid fa-paper-plane"></i> Confirm &amp; Dispatch Surplus
        </button>
      </div>
    `;
  }
}

function attachStepListeners() {
  const radioCooked = document.querySelector('input[name="foodType"][value="cooked"]');
  const radioRaw = document.querySelector('input[name="foodType"][value="raw"]');

  if (radioCooked && radioRaw) {
    const cardCooked = document.getElementById('card-cooked');
    const cardRaw = document.getElementById('card-raw');

    function syncRadioStyle() {
      if (radioCooked.checked) {
        cardCooked.style.borderColor = 'var(--orange)';
        cardCooked.style.boxShadow = '0 0 0 2px var(--orange)';
        cardRaw.style.borderColor = 'rgba(122, 74, 18, 0.4)';
        cardRaw.style.boxShadow = 'none';
        donateFormData.foodType = 'cooked';
      } else {
        cardRaw.style.borderColor = 'var(--green)';
        cardRaw.style.boxShadow = '0 0 0 2px var(--green)';
        cardCooked.style.borderColor = 'rgba(122, 74, 18, 0.4)';
        cardCooked.style.boxShadow = 'none';
        donateFormData.foodType = 'raw';
      }
    }

    radioCooked.addEventListener('change', syncRadioStyle);
    radioRaw.addEventListener('change', syncRadioStyle);
    syncRadioStyle();
  }
}

function goToStep(stepNumber) {
  // Validate Step 1 before proceeding
  if (stepNumber === 2 && currentDonateStep === 1) {
    const eventName = document.getElementById('donate-event-name').value.trim();
    const quantity = document.getElementById('donate-quantity').value.trim();
    const unit = document.getElementById('donate-unit').value;
    const description = document.getElementById('donate-description').value.trim();

    if (!eventName || !quantity || !description) {
      showToast('Please fill in event name, quantity and description.', 'error');
      return;
    }

    donateFormData.eventName = eventName;
    donateFormData.quantity = quantity;
    donateFormData.quantityUnit = unit;
    donateFormData.description = description;
  }

  // Validate Step 2 before proceeding
  if (stepNumber === 3 && currentDonateStep === 2) {
    const expiryTime = document.getElementById('donate-expiry').value;
    const pickupAddress = document.getElementById('donate-address').value.trim();
    const contactPhone = document.getElementById('donate-phone').value.trim();

    if (!expiryTime || !pickupAddress || !contactPhone) {
      showToast('Please specify expiry time, pickup address, and contact phone.', 'error');
      return;
    }

    donateFormData.expiryTime = expiryTime;
    donateFormData.pickupAddress = pickupAddress;
    donateFormData.contactPhone = contactPhone;
  }

  currentDonateStep = stepNumber;
  renderDonateStepView();
}

async function executeDonationSubmit() {
  const submitBtn = document.getElementById('final-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-gear fa-spin"></i> Registering Consignment...';
  }

  try {
    showLoading();
    const payload = {
      eventName: donateFormData.eventName,
      foodType: donateFormData.foodType,
      description: donateFormData.description,
      quantity: donateFormData.quantity,
      quantityUnit: donateFormData.quantityUnit,
      expiryTime: new Date(donateFormData.expiryTime).toISOString(),
      pickupAddress: donateFormData.pickupAddress,
      contactPhone: donateFormData.contactPhone,
    };

    const result = await api('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    hideLoading();
    showToast('Surplus food registered successfully!', 'success');

    // Show Success State with Status Tracker (Checklist Item 4)
    renderDonationSuccessView(result);
  } catch (err) {
    hideLoading();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Confirm &amp; Dispatch Surplus';
    }
    showToast(err.message || 'Failed to submit consignment.', 'error');
  }
}

function renderDonationSuccessView(donation) {
  const appEl = document.getElementById('app');

  appEl.innerHTML = `
    <section class="page-section">
      <div class="card p-10 max-w-2xl mx-auto text-center">
        <div class="w-20 h-20 mx-auto rounded-full bg-green/20 border-2 border-green text-green flex items-center justify-center text-3xl mb-4">
          <i class="fa-solid fa-circle-check"></i>
        </div>

        <h2 class="text-3xl font-bold font-serif text-ink-dark mb-2">Consignment Registered!</h2>
        <p class="text-ink-faded mb-8 max-w-md mx-auto">
          Pickup requested! Nearby community kitchens have been alerted to claim your banquet surplus.
        </p>

        <!-- Live Status Tracker (Checklist Item 4) -->
        <div class="bg-white/80 border border-brass/40 rounded-lg p-6 mb-8 text-left">
          <h4 class="font-bold text-sm uppercase text-ink-faded font-mono mb-4 tracking-wider">Consignment Lifecycle Tracker</h4>
          <div class="flex items-center justify-between relative">
            <div class="flex flex-col items-center z-10">
              <div class="w-8 h-8 rounded-full bg-green text-white flex items-center justify-center text-xs font-bold font-mono">1</div>
              <span class="text-xs font-bold text-green mt-1">Requested</span>
            </div>
            <div class="flex-1 h-0.5 bg-gray-300 mx-2"></div>
            <div class="flex flex-col items-center z-10 opacity-60">
              <div class="w-8 h-8 rounded-full bg-gray-200 border border-gray-400 text-gray-600 flex items-center justify-center text-xs font-bold font-mono">2</div>
              <span class="text-xs text-gray-500 mt-1">NGO Claim</span>
            </div>
            <div class="flex-1 h-0.5 bg-gray-300 mx-2"></div>
            <div class="flex flex-col items-center z-10 opacity-60">
              <div class="w-8 h-8 rounded-full bg-gray-200 border border-gray-400 text-gray-600 flex items-center justify-center text-xs font-bold font-mono">3</div>
              <span class="text-xs text-gray-500 mt-1">In Transit</span>
            </div>
            <div class="flex-1 h-0.5 bg-gray-300 mx-2"></div>
            <div class="flex flex-col items-center z-10 opacity-60">
              <div class="w-8 h-8 rounded-full bg-gray-200 border border-gray-400 text-gray-600 flex items-center justify-center text-xs font-bold font-mono">4</div>
              <span class="text-xs text-gray-500 mt-1">Delivered</span>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-4">
          <a href="#donations" class="btn btn-primary">
            <i class="fa-solid fa-boxes-stacked"></i> Browse Food
          </a>
          <button class="btn btn-outline" onclick="renderDonateForm()">
            <i class="fa-solid fa-plus"></i> Submit Another
          </button>
        </div>
      </div>
    </section>
  `;
}

// ────────────────────────────────────────────────────────────
//  3. renderDonationDetail(id) — Single Donation View
// ────────────────────────────────────────────────────────────

async function renderDonationDetail(id) {
  const appEl = document.getElementById('app');

  appEl.innerHTML = `
    <section class="page-section">
      <div class="card p-12 text-center max-w-md mx-auto">
        <i class="fa-solid fa-gear fa-spin text-3xl text-brass mb-3"></i>
        <p class="text-ink-faded font-sans">Retrieving consignment dossier&hellip;</p>
      </div>
    </section>
  `;

  try {
    const donation = await api('/api/donations/' + id);
    const user = getUser();

    const statusClass = getStatusColor(donation.status);
    const statusLabel = donation.status === 'PENDING' ? 'AVAILABLE' : donation.status.replace('_', ' ');
    const foodTypeLabel = donation.foodType === 'cooked' ? 'Cooked' : 'Raw';
    const foodTypeBadgeClass = donation.foodType === 'cooked' ? 'badge-cooked' : 'badge-raw';
    const timeRemaining = formatTimeRemaining(donation.expiryTime);
    const expiryFormatted = new Date(donation.expiryTime).toLocaleString();
    const createdFormatted = new Date(donation.createdAt).toLocaleString();

    const donorName = donation.donor && donation.donor.name ? donation.donor.name : 'Unknown Donor';
    const donorEmail = donation.donor && donation.donor.email ? donation.donor.email : '';
    const donorPhone = donation.donor && donation.donor.phone ? donation.donor.phone : '';
    const trackingId = donation._id;

    // Build Action Buttons based on User Role & Status
    let actionButtonsHtml = '';

    if (user && user.role === 'ngo' && donation.status === 'PENDING') {
      actionButtonsHtml = `
        <div class="action-panel mt-6 p-6 card border-2 border-green text-center">
          <h4 class="text-xl font-bold font-serif text-green mb-2">Claim This Consignment</h4>
          <p class="text-sm text-ink-faded mb-4">Claim this food for your community shelter. A secure 6-digit OTP will be generated.</p>
          <button class="btn btn-green text-lg px-8 py-3" onclick="claimDonation('${donation._id}')">
            <i class="fa-solid fa-hand-holding-heart"></i> Claim Food Now
          </button>
        </div>
      `;
    } else if (user && user.role === 'volunteer' && donation.status === 'CLAIMED') {
      actionButtonsHtml = `
        <div class="action-panel mt-6 p-6 card border-2 border-orange text-center">
          <h4 class="text-xl font-bold font-serif text-orange mb-2">Volunteer Courier Dispatch</h4>
          <p class="text-sm text-ink-faded mb-4">Accept this delivery route to transport food from the event to the recipient NGO.</p>
          <button class="btn btn-primary text-lg px-8 py-3" onclick="acceptPickup('${donation._id}')">
            <i class="fa-solid fa-truck-fast"></i> Accept Pickup Assignment
          </button>
        </div>
      `;
    } else if (user && (user.role === 'volunteer' || user.role === 'ngo' || user.role === 'admin') && donation.status === 'IN_TRANSIT') {
      actionButtonsHtml = `
        <div class="action-panel mt-6 p-6 card border-2 border-green text-center">
          <h4 class="text-xl font-bold font-serif text-green mb-2">Delivery Handshake Verification</h4>
          <p class="text-sm text-ink-faded mb-4">Enter the 6-digit recipient OTP upon food handover to confirm completion.</p>
          <div class="flex justify-center gap-2 max-w-xs mx-auto mb-4">
            <input type="text" id="otp-input" class="form-input text-center font-mono font-bold text-2xl tracking-widest" maxlength="6" placeholder="000000" />
            <button class="btn btn-green px-6" onclick="completeDelivery('${donation._id}')">
              Verify
            </button>
          </div>
        </div>
      `;
    }

    // Donor & Admin Manage Action Panel (Allows Donor to Cancel / Remove Consignment)
    const detailDonorId = donation.donor ? (donation.donor._id || donation.donor.id || donation.donor).toString() : '';
    const detailUserId = user ? (user._id || user.id || '').toString() : '';
    const isDonorOwner = user && (user.role === 'admin' || (detailDonorId && detailDonorId === detailUserId) || (donation.donor && donation.donor.email && donation.donor.email === user.email));

    if (isDonorOwner && donation.status !== 'COMPLETED' && donation.status !== 'CANCELLED') {
      actionButtonsHtml += `
        <div class="action-panel mt-6 p-6 card border-2 border-red-700/40 text-center" style="background: rgba(139, 0, 0, 0.04);">
          <h4 class="text-xl font-bold font-serif text-red-800 mb-2"><i class="fa-solid fa-trash-can"></i> Manage Consignment</h4>
          <p class="text-sm text-ink-faded mb-4">You registered this surplus consignment. You can remove it from the active manifest at any time.</p>
          <button class="btn btn-outline text-red-700 border-red-700 hover:bg-red-700 hover:text-white px-6 py-2.5" onclick="deleteDonation('${donation._id}')">
            <i class="fa-solid fa-trash-can"></i> Remove Consignment
          </button>
        </div>
      `;
    }

    appEl.innerHTML = `
      <section class="page-section donation-detail-page">
        <button class="btn btn-outline btn-sm mb-6" onclick="navigateTo('/donations')">
          &larr; Back to Browse Food
        </button>

        <div class="card p-8">
          <div class="flex justify-between items-start flex-wrap gap-4 pb-6 border-b border-brass/30">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="badge ${foodTypeBadgeClass}">${foodTypeLabel}</span>
                <span class="status-badge ${statusClass}"><i class="fa-solid fa-circle-check text-xs"></i> ${statusLabel}</span>
              </div>
              <h1 class="text-3xl font-bold font-serif text-ink-dark">${escapeHtml(donation.eventName || 'Surplus Consignment')}</h1>
              <p class="text-sm text-ink-faded font-sans mt-1">Logged on ${createdFormatted}</p>
            </div>
            <div class="text-right">
              <span class="text-xs uppercase font-mono text-ink-muted block">Tracking Identifier</span>
              <span class="font-mono text-xs font-bold text-ink-dark bg-parchment-light px-2.5 py-1 border border-brass/40 rounded">${escapeHtml(trackingId)}</span>
            </div>
          </div>

          <!-- Alert for PRD 6.1: 30-min courier unassigned -->
          ${donation.selfPickupRequired ? `
            <div class="p-4 bg-orange/15 border-2 border-orange text-ink-dark rounded-md mt-6 flex items-center gap-3">
              <i class="fa-solid fa-triangle-exclamation text-2xl text-orange"></i>
              <div>
                <strong>Courier Auto-Escalation:</strong>
                <p class="text-sm text-ink-faded">${escapeHtml(donation.selfPickupAlert)}</p>
              </div>
            </div>
          ` : ''}

          <div class="grid md:grid-cols-2 gap-6 my-6">
            <!-- Consignment Spec -->
            <div class="detail-section p-4 bg-parchment-light border border-brass/30 rounded">
              <h3 class="font-bold text-ink-dark font-serif text-lg mb-3">Consignment Details</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-ink-faded font-semibold">Quantity:</span> <span class="font-bold text-ink-dark font-mono">${escapeHtml(String(donation.quantity))} ${escapeHtml(donation.quantityUnit || '')}</span></div>
                <div class="flex justify-between"><span class="text-ink-faded font-semibold">Type:</span> <span class="font-bold text-ink-dark">${foodTypeLabel}</span></div>
                <div class="flex justify-between"><span class="text-ink-faded font-semibold">Expiry Window:</span> <span class="font-mono text-orange font-bold">${expiryFormatted} (${timeRemaining})</span></div>
                <div class="mt-2 pt-2 border-t border-brass/20 text-xs text-ink-faded">${escapeHtml(donation.description || 'No additional instructions provided.')}</div>
              </div>
            </div>

            <!-- Venue & Donor Contact -->
            <div class="detail-section p-4 bg-parchment-light border border-brass/30 rounded">
              <h3 class="font-bold text-ink-dark font-serif text-lg mb-3">Venue &amp; Logistics Contact</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-ink-faded font-semibold">Donor / Organizer:</span> <span class="font-bold text-ink-dark">${escapeHtml(donorName)}</span></div>
                <div class="flex justify-between"><span class="text-ink-faded font-semibold">Phone:</span> <span class="font-mono text-ink-dark">${escapeHtml(donation.contactPhone || donorPhone || 'On file')}</span></div>
                <div class="flex justify-between"><span class="text-ink-faded font-semibold">Pickup Address:</span> <span class="font-bold text-ink-dark text-right max-w-xs">${escapeHtml(donation.pickupAddress || 'Address on file')}</span></div>
              </div>
            </div>
          </div>

          <!-- Beneficiary & OTP section (if Claimed) -->
          ${donation.claimedBy ? `
            <div class="p-4 bg-teal/10 border border-teal/40 rounded mb-6 text-sm">
              <div class="flex justify-between items-center">
                <div>
                  <strong class="text-teal font-serif text-base block">Claimed Beneficiary: ${escapeHtml(donation.claimedBy.name || 'Vetted NGO')}</strong>
                  <span class="text-xs text-ink-faded">Claimed at: ${new Date(donation.claimedAt).toLocaleString()}</span>
                </div>
                ${donation.otp ? `
                  <div class="text-right">
                    <span class="text-xs uppercase font-mono text-ink-faded block">Delivery Handshake OTP</span>
                    <span class="font-mono text-xl font-bold text-orange tracking-widest bg-white px-3 py-1 border border-orange rounded">${escapeHtml(donation.otp)}</span>
                    <span class="text-xs text-ink-faded block mt-1">Provide this code to the courier upon delivery</span>
                  </div>
                ` : `
                  <div class="text-right text-xs text-ink-faded italic">
                    <i class="fa-solid fa-lock text-orange"></i> Recipient NGO holds secret OTP.<br>Obtain OTP in person upon arrival.
                  </div>
                `}
              </div>
            </div>
          ` : ''}

          <!-- Assigned Courier (if in transit) -->
          ${donation.volunteer ? `
            <div class="p-4 bg-orange/10 border border-orange/40 rounded mb-6 text-sm">
              <strong class="text-orange font-serif text-base block">Assigned Volunteer Courier: ${escapeHtml(donation.volunteer.name || 'Courier')}</strong>
              <span class="text-xs text-ink-faded">Dispatched at: ${new Date(donation.volunteerAcceptedAt).toLocaleString()}</span>
            </div>
          ` : ''}

          <!-- Action Panels -->
          ${actionButtonsHtml}
        </div>
      </section>
    `;
  } catch (err) {
    showToast('Failed to load consignment details.', 'error');
  }
}

async function claimDonation(donationId) {
  try {
    showLoading();
    const result = await api(`/api/donations/${donationId}/claim`, { method: 'PUT' });
    hideLoading();
    showToast(`Donation claimed! Your OTP is: ${result.otp || 'Verified'}`, 'success');
    renderDonationDetail(donationId);
  } catch (err) {
    hideLoading();
    showToast(err.message || 'Failed to claim consignment.', 'error');
  }
}

async function acceptPickup(donationId) {
  try {
    showLoading();
    await api(`/api/donations/${donationId}/accept`, { method: 'PUT' });
    hideLoading();
    showToast('Pickup accepted! Consignment is now IN TRANSIT.', 'success');
    renderDonationDetail(donationId);
  } catch (err) {
    hideLoading();
    showToast(err.message || 'Failed to accept pickup route.', 'error');
  }
}

async function completeDelivery(donationId) {
  const otpInput = document.getElementById('otp-input');
  const otp = otpInput ? otpInput.value.trim() : '';

  if (!otp || otp.length < 6) {
    showToast('Please enter the 6-digit delivery OTP code.', 'error');
    return;
  }

  try {
    showLoading();
    await api(`/api/donations/${donationId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });
    hideLoading();
    showToast('Delivery confirmed and marked COMPLETED via OTP handshake!', 'success');
    renderDonationDetail(donationId);
  } catch (err) {
    hideLoading();
    showToast(err.message || 'Failed to complete delivery. Check OTP.', 'error');
  }
}

async function deleteDonation(donationId) {
  if (!confirm('Are you sure you want to remove this surplus consignment? It will be removed from the active depot.')) {
    return;
  }
  try {
    showLoading();
    try {
      await api(`/api/donations/${donationId}`, { method: 'DELETE' });
    } catch (delErr) {
      await api(`/api/donations/${donationId}/cancel`, { method: 'PUT' });
    }
    hideLoading();
    showToast('Consignment removed successfully!', 'success');
    window.location.hash = '#donations';
  } catch (err) {
    hideLoading();
    showToast(err.message || 'Failed to remove consignment.', 'error');
  }
}
window.deleteDonation = deleteDonation;
