// ============================================================
//  FoodShare Events — Admin Dashboard Renderer
//  Flip7 Design System · Modern Sustainable Dashboard
// ============================================================

/* global api, showToast, showLoading, hideLoading, currentUser */

// ── State ────────────────────────────────────────────────────
let adminStats = {};
let adminUsers = [];
let adminDonations = [];
let adminActiveTab = 'users';
let adminUserRoleFilter = 'all';

// ── Entry Point ──────────────────────────────────────────────
async function renderAdmin() {
  const app = document.getElementById('app');

  // ── Access guard ──────────────────────────────────────────
  if (!currentUser || currentUser.role !== 'admin') {
    app.innerHTML = `
      <div class="access-denied-container p-12 text-center">
        <div class="card max-w-md mx-auto p-8 border-2 border-coral">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-coral/15 flex items-center justify-center text-coral text-3xl">
            <i class="fa-solid fa-lock"></i>
          </div>
          <h2 class="text-2xl font-bold font-sans text-text-dark mb-2">Access Denied</h2>
          <p class="text-text-muted">Authorized Personnel Only. Please log in with administrator credentials.</p>
        </div>
      </div>`;
    return;
  }

  // ── Fetch data in parallel ────────────────────────────────
  showLoading();
  try {
    const [statsRes, usersRes, donationsRes] = await Promise.all([
      api('/api/admin/stats'),
      api('/api/admin/users'),
      api('/api/admin/donations')
    ]);

    adminStats      = statsRes  || {};
    adminUsers      = usersRes  && Array.isArray(usersRes.users)     ? usersRes.users     : (Array.isArray(usersRes)     ? usersRes     : []);
    adminDonations  = donationsRes && Array.isArray(donationsRes.donations) ? donationsRes.donations : (Array.isArray(donationsRes) ? donationsRes : []);
  } catch (err) {
    hideLoading();
    showToast('Failed to load admin data: ' + (err.message || err), 'error');
    return;
  }
  hideLoading();

  // ── Dashboard shell ───────────────────────────────────────
  app.innerHTML = `
    <section class="admin-dashboard">

      <!-- Header -->
      <header class="admin-header">
        <div class="admin-header-title">
          <i class="fa-solid fa-chart-line admin-header-icon text-primary"></i>
          <h1>Admin Dashboard</h1>
        </div>
        <p class="admin-header-sub">System Command &amp; Control Console</p>
      </header>

      <!-- Stats Cards -->
      <div class="admin-stats-grid">
        ${renderStatsCard('Total Donors',        adminStats.totalDonors       ?? 0, 'fa-utensils')}
        ${renderStatsCard('Total NGOs',           adminStats.totalNGOs         ?? 0, 'fa-shield-heart')}
        ${renderStatsCard('Total Volunteers',     adminStats.totalVolunteers   ?? 0, 'fa-truck-fast')}
        ${renderStatsCard('Active Donations',     adminStats.activeDonations   ?? 0, 'fa-boxes-stacked')}
        ${renderStatsCard('Completed Deliveries', adminStats.completedDeliveries ?? 0, 'fa-circle-check')}
        ${renderStatsCard('Expired Items',        adminStats.expiredItems      ?? 0, 'fa-triangle-exclamation')}
      </div>

      <!-- Tabs -->
      <nav class="admin-tabs" role="tablist">
        <button class="admin-tab ${adminActiveTab === 'users'    ? 'admin-tab--active' : ''}"
                data-tab="users" role="tab" aria-selected="${adminActiveTab === 'users'}">
          <i class="fa-solid fa-users"></i> Users Registry
        </button>
        <button class="admin-tab ${adminActiveTab === 'donations' ? 'admin-tab--active' : ''}"
                data-tab="donations" role="tab" aria-selected="${adminActiveTab === 'donations'}">
          <i class="fa-solid fa-book"></i> Donations Ledger
        </button>
        <button class="admin-tab ${adminActiveTab === 'activity'  ? 'admin-tab--active' : ''}"
                data-tab="activity" role="tab" aria-selected="${adminActiveTab === 'activity'}">
          <i class="fa-solid fa-clock-rotate-left"></i> Activity Log
        </button>
      </nav>

      <!-- Tab Content -->
      <div id="admin-tab-content" class="admin-tab-content">
        ${renderTabContent()}
      </div>
    </section>

    <!-- Confirmation Modal (hidden) -->
    <div id="admin-confirm-modal" class="admin-modal-overlay" style="display:none;" role="dialog" aria-modal="true">
      <div class="admin-modal">
        <h3 class="admin-modal-title" id="admin-modal-title">Confirm Action</h3>
        <p  class="admin-modal-body"  id="admin-modal-body"></p>
        <div class="admin-modal-actions">
          <button class="btn btn-ghost" id="admin-modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="admin-modal-confirm">Confirm</button>
        </div>
      </div>
    </div>
  `;

  bindAdminEvents();
}

// ── Stats Card Helper ────────────────────────────────────────
function renderStatsCard(title, value, icon) {
  return `
    <div class="admin-stat-card">
      <div class="admin-stat-icon">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="admin-stat-info">
        <span class="admin-stat-value">${value}</span>
        <span class="admin-stat-label">${title}</span>
      </div>
    </div>`;
}

// ── Tab Content Router ───────────────────────────────────────
function renderTabContent() {
  switch (adminActiveTab) {
    case 'users':     return renderUsersRegistry();
    case 'donations': return renderDonationsLedger();
    case 'activity':  return renderActivityLog();
    default:          return '';
  }
}

// ── Users Registry ───────────────────────────────────────────
function renderUsersRegistry() {
  const roles = ['all', 'donor', 'ngo', 'volunteer', 'admin'];

  const filtered = adminUserRoleFilter === 'all'
    ? adminUsers
    : adminUsers.filter(u => u.role === adminUserRoleFilter);

  const rows = filtered.map(u => {
    const roleBadge   = `<span class="badge badge--${u.role}">${capitalize(u.role)}</span>`;
    const verifiedCol = u.verified
      ? '<span class="text-green font-bold"><i class="fa-solid fa-circle-check"></i> Yes</span>'
      : '<span class="text-text-muted"><i class="fa-solid fa-circle-xmark"></i> No</span>';
    const bannedCol   = u.banned
      ? '<span class="text-coral font-bold"><i class="fa-solid fa-ban"></i> Banned</span>'
      : '<span class="text-green font-bold">Active</span>';

    // Action buttons
    const verifyBtn = !u.verified
      ? `<button class="btn btn--sm btn--teal admin-verify-btn" data-id="${u._id || u.id}" aria-label="Verify user">
           <i class="fa-solid fa-check"></i> Verify
         </button>`
      : '';

    const banBtn = !u.banned
      ? `<button class="btn btn--sm btn--danger admin-ban-btn" data-id="${u._id || u.id}" data-name="${escAttr(u.name)}" aria-label="Ban user">
           <i class="fa-solid fa-ban"></i> Ban
         </button>`
      : `<button class="btn btn--sm btn--success admin-unban-btn" data-id="${u._id || u.id}" aria-label="Unban user">
           <i class="fa-solid fa-unlock"></i> Unban
         </button>`;

    return `
      <tr>
        <td class="font-bold">${esc(u.name)}</td>
        <td>${esc(u.email)}</td>
        <td>${roleBadge}</td>
        <td>${verifiedCol}</td>
        <td>${bannedCol}</td>
        <td class="admin-actions-cell">${verifyBtn} ${banBtn}</td>
      </tr>`;
  }).join('');

  return `
    <div class="admin-section">
      <!-- Filter -->
      <div class="admin-filter-bar">
        <label class="admin-filter-label" for="admin-role-filter">
          <i class="fa-solid fa-filter text-primary"></i> Filter by Role:
        </label>
        <select id="admin-role-filter" class="admin-select" aria-label="Filter users by role">
          ${roles.map(r => `<option value="${r}" ${r === adminUserRoleFilter ? 'selected' : ''}>${capitalize(r)}</option>`).join('')}
        </select>
      </div>

      <!-- Table -->
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows : '<tr><td colspan="6" class="admin-empty">No users found.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Donations Ledger ─────────────────────────────────────────
function renderDonationsLedger() {
  const rows = adminDonations.map(d => {
    const id        = d._id || d.id || '—';
    const shortId   = typeof id === 'string' && id.length > 8 ? id.slice(-8) : id;
    const event     = esc(d.eventName  || d.event || '—');
    const donor     = esc(d.donorName  || (d.donor && d.donor.name) || d.donor || '—');
    const foodType  = esc(d.foodType   || d.type  || '—');
    const status    = d.status || 'unknown';
    const created   = d.createdAt ? formatDate(d.createdAt) : '—';

    const statusBadge = `<span class="badge badge--${status}">${capitalize(status)}</span>`;

    return `
      <tr class="admin-donation-row cursor-pointer" data-id="${id}" role="button" tabindex="0">
        <td><code class="font-mono font-bold text-primary">${shortId}</code></td>
        <td class="font-bold">${event}</td>
        <td>${donor}</td>
        <td>${foodType}</td>
        <td>${statusBadge}</td>
        <td class="font-mono text-sm">${created}</td>
        <td class="admin-actions-cell">
          <button class="btn btn--sm btn--danger admin-delete-donation-btn" data-id="${id}" title="Delete donation" aria-label="Delete donation">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="admin-section">
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Event</th>
              <th>Donor</th>
              <th>Food Type</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows : '<tr><td colspan="7" class="admin-empty">No donations found.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Activity Log ─────────────────────────────────────────────
function renderActivityLog() {
  const recent = [...adminDonations]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 10);

  if (!recent.length) {
    return `
      <div class="admin-section">
        <p class="admin-empty">No recent activity to display.</p>
      </div>`;
  }

  const items = recent.map(d => {
    const ts      = d.createdAt ? formatTimestamp(d.createdAt) : '—';
    const user    = esc(d.donorName || (d.donor && d.donor.name) || d.donor || 'Unknown');
    const food    = esc(d.foodType  || d.type  || 'item');
    const status  = d.status || 'created';
    const action  = `Donation of <strong>${food}</strong> — status: <span class="badge badge--${status}">${capitalize(status)}</span>`;

    return `
      <li class="admin-activity-item">
        <span class="admin-activity-dot"></span>
        <div class="admin-activity-body">
          <time class="admin-activity-time font-mono">${ts}</time>
          <p class="admin-activity-desc">${action}</p>
          <span class="admin-activity-user"><i class="fa-solid fa-user"></i> ${user}</span>
        </div>
      </li>`;
  }).join('');

  return `
    <div class="admin-section">
      <ul class="admin-activity-list">
        ${items}
      </ul>
    </div>`;
}

// ── Event Binding ────────────────────────────────────────────
function bindAdminEvents() {

  // ── Tabs ──────────────────────────────────────────────────
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      adminActiveTab = btn.dataset.tab;
      // Update active class
      document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.remove('admin-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('admin-tab--active');
      btn.setAttribute('aria-selected', 'true');
      // Re-render content
      document.getElementById('admin-tab-content').innerHTML = renderTabContent();
      bindTabContentEvents();
    });
  });

  bindTabContentEvents();
}

function bindTabContentEvents() {
  // ── Role filter ───────────────────────────────────────────
  const roleFilter = document.getElementById('admin-role-filter');
  if (roleFilter) {
    roleFilter.addEventListener('change', () => {
      adminUserRoleFilter = roleFilter.value;
      document.getElementById('admin-tab-content').innerHTML = renderTabContent();
      bindTabContentEvents();
    });
  }

  // ── Verify buttons ───────────────────────────────────────
  document.querySelectorAll('.admin-verify-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const userId = btn.dataset.id;
      try {
        showLoading();
        await api(`/api/admin/users/${userId}/verify`, { method: 'PUT' });
        showToast('User verified successfully.', 'success');
        await refreshAdminData();
      } catch (err) {
        showToast('Failed to verify user: ' + (err.message || err), 'error');
      } finally {
        hideLoading();
      }
    });
  });

  // ── Ban buttons ───────────────────────────────────────────
  document.querySelectorAll('.admin-ban-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const userId   = btn.dataset.id;
      const userName = btn.dataset.name || 'this user';
      const reason   = prompt(`Enter reason for banning ${userName}:`);
      if (reason === null) return; // cancelled
      try {
        showLoading();
        await api(`/api/admin/users/${userId}/ban`, {
          method: 'PUT',
          body: JSON.stringify({ reason })
        });
        showToast('User banned successfully.', 'success');
        await refreshAdminData();
      } catch (err) {
        showToast('Failed to ban user: ' + (err.message || err), 'error');
      } finally {
        hideLoading();
      }
    });
  });

  // ── Unban buttons ─────────────────────────────────────────
  document.querySelectorAll('.admin-unban-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const userId = btn.dataset.id;
      try {
        showLoading();
        await api(`/api/admin/users/${userId}/unban`, { method: 'PUT' });
        showToast('User unbanned successfully.', 'success');
        await refreshAdminData();
      } catch (err) {
        showToast('Failed to unban user: ' + (err.message || err), 'error');
      } finally {
        hideLoading();
      }
    });
  });

  // ── Delete donation buttons ───────────────────────────────
  document.querySelectorAll('.admin-delete-donation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const donationId = btn.dataset.id;
      showAdminConfirmModal(
        'Delete Donation',
        'Are you sure you want to permanently delete this donation? This action cannot be undone.',
        async () => {
          try {
            showLoading();
            await api(`/api/admin/donations/${donationId}`, { method: 'DELETE' });
            showToast('Donation deleted successfully.', 'success');
            await refreshAdminData();
          } catch (err) {
            showToast('Failed to delete donation: ' + (err.message || err), 'error');
          } finally {
            hideLoading();
          }
        }
      );
    });
  });

  // ── Donation row click (view detail) ──────────────────────
  document.querySelectorAll('.admin-donation-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.admin-actions-cell')) return;
      const donationId = row.dataset.id;
      if (typeof renderDonationDetail === 'function') {
        renderDonationDetail(donationId);
      } else {
        showToast('Donation detail view not available.', 'info');
      }
    });
  });
}

// ── Confirmation Modal ───────────────────────────────────────
function showAdminConfirmModal(title, body, onConfirm) {
  const overlay   = document.getElementById('admin-confirm-modal');
  const titleEl   = document.getElementById('admin-modal-title');
  const bodyEl    = document.getElementById('admin-modal-body');
  const cancelBtn = document.getElementById('admin-modal-cancel');
  const confirmBtn= document.getElementById('admin-modal-confirm');

  titleEl.textContent = title;
  bodyEl.textContent  = body;
  overlay.style.display = 'flex';

  // Clean up old listeners by cloning
  const newCancel  = cancelBtn.cloneNode(true);
  const newConfirm = confirmBtn.cloneNode(true);
  cancelBtn.replaceWith(newCancel);
  confirmBtn.replaceWith(newConfirm);

  const close = () => { overlay.style.display = 'none'; };

  newCancel.addEventListener('click', close);
  newConfirm.addEventListener('click', () => {
    close();
    onConfirm();
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

// ── Refresh Admin Data ───────────────────────────────────────
async function refreshAdminData() {
  try {
    const [statsRes, usersRes, donationsRes] = await Promise.all([
      api('/api/admin/stats'),
      api('/api/admin/users'),
      api('/api/admin/donations')
    ]);

    adminStats      = statsRes  || {};
    adminUsers      = usersRes  && Array.isArray(usersRes.users)     ? usersRes.users     : (Array.isArray(usersRes)     ? usersRes     : []);
    adminDonations  = donationsRes && Array.isArray(donationsRes.donations) ? donationsRes.donations : (Array.isArray(donationsRes) ? donationsRes : []);
  } catch (err) {
    showToast('Failed to refresh data: ' + (err.message || err), 'error');
    return;
  }

  // Re-render stats cards
  const statsGrid = document.querySelector('.admin-stats-grid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      ${renderStatsCard('Total Donors',        adminStats.totalDonors         ?? 0, 'fa-utensils')}
      ${renderStatsCard('Total NGOs',           adminStats.totalNGOs           ?? 0, 'fa-shield-heart')}
      ${renderStatsCard('Total Volunteers',     adminStats.totalVolunteers     ?? 0, 'fa-truck-fast')}
      ${renderStatsCard('Active Donations',     adminStats.activeDonations     ?? 0, 'fa-boxes-stacked')}
      ${renderStatsCard('Completed Deliveries', adminStats.completedDeliveries ?? 0, 'fa-circle-check')}
      ${renderStatsCard('Expired Items',        adminStats.expiredItems        ?? 0, 'fa-triangle-exclamation')}
    `;
  }

  // Re-render current tab
  const tabContent = document.getElementById('admin-tab-content');
  if (tabContent) {
    tabContent.innerHTML = renderTabContent();
    bindTabContentEvents();
  }
}

// ── Utility Helpers ──────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  const el = document.createElement('span');
  el.textContent = String(str);
  return el.innerHTML;
}

function escAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTimestamp(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch {
    return dateStr;
  }
}
