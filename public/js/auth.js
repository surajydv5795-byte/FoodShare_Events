// ============================================================
// auth.js – Authentication page renderers for FoodShare Events
// Refined Steampunk aesthetic · Clean Typography · High Contrast
// ============================================================

/* ------------------------------------------------------------------ */
/*  1.  renderLogin()                                                  */
/* ------------------------------------------------------------------ */
function renderLogin() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <section class="auth-section">
      <div class="card auth-card" style="max-width: 480px; margin: 0 auto; padding: 2.25rem;">
        <div class="card-header text-center mb-6">
          <h2 class="auth-heading" style="font-size: 2.1rem; color: var(--ink-dark); margin-bottom: 0.35rem;">
            <i class="fa-solid fa-key text-orange"></i> Log in
          </h2>
          <p class="auth-subtitle" style="color: var(--ink-faded); font-size: 0.95rem;">
            Enter the Workshop &bull; Authenticate your credentials to proceed.
          </p>
        </div>

        <form id="loginForm" class="steampunk-form" novalidate>
          <!-- Email -->
          <div class="form-group">
            <label for="loginEmail" class="form-label">Email Address</label>
            <input
              type="email"
              id="loginEmail"
              class="form-input"
              placeholder="e.g. donor@foodshare.org"
              required
            />
          </div>

          <!-- Password -->
          <div class="form-group">
            <label for="loginPassword" class="form-label">Password</label>
            <input
              type="password"
              id="loginPassword"
              class="form-input"
              placeholder="••••••••"
              required
            />
          </div>

          <!-- Submit -->
          <button type="submit" class="btn btn-primary btn-block text-lg py-3 mt-2">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Log in
          </button>
        </form>

        <div class="auth-footer text-center mt-6 pt-4 border-t border-brass/30">
          <p style="color: var(--ink-faded); font-size: 0.95rem;">
            Don't have an account?
            <a href="#register" class="font-bold text-orange hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </section>
  `;

  // ---- Form handler ----
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showToast('Please fill in both email and password', 'error');
      return;
    }

    try {
      showLoading();
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Store token & user info (isolated per-tab via AppState)
      AppState.setToken(data.token);
      if (data.user) {
        AppState.setCurrentUser(data.user);
      }

      showToast('Welcome back to FoodShare Events!', 'success');
      if (typeof updateNav === 'function') updateNav();
      window.location.hash = '#home';
    } catch (err) {
      showToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      hideLoading();
    }
  });
}

/* ------------------------------------------------------------------ */
/*  2.  renderRegister()                                               */
/* ------------------------------------------------------------------ */
function renderRegister() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <section class="auth-section">
      <div class="card auth-card" style="max-width: 580px; margin: 0 auto; padding: 2.25rem;">
        <div class="card-header text-center mb-6">
          <h2 class="auth-heading" style="font-size: 2.1rem; color: var(--ink-dark); margin-bottom: 0.35rem;">
            <i class="fa-solid fa-scroll text-orange"></i> Sign up
          </h2>
          <p class="auth-subtitle" style="color: var(--ink-faded); font-size: 0.95rem;">
            Join the Guild &bull; Register your role to start rescuing surplus food.
          </p>
        </div>

        <form id="registerForm" class="steampunk-form" novalidate>

          <!-- Identity Fields -->
          <div class="form-row">
            <div class="form-group">
              <label for="regName" class="form-label">Full Name</label>
              <input
                type="text"
                id="regName"
                class="form-input"
                placeholder="e.g. Lord Percival"
                required
              />
            </div>
            <div class="form-group">
              <label for="regEmail" class="form-label">Email Address</label>
              <input
                type="email"
                id="regEmail"
                class="form-input"
                placeholder="e.g. contact@domain.org"
                required
              />
            </div>
          </div>

          <!-- Password Fields -->
          <div class="form-row">
            <div class="form-group">
              <label for="regPassword" class="form-label">Password</label>
              <input
                type="password"
                id="regPassword"
                class="form-input"
                placeholder="Min 6 characters"
                minlength="6"
                required
              />
            </div>
            <div class="form-group">
              <label for="regConfirm" class="form-label">Confirm Password</label>
              <input
                type="password"
                id="regConfirm"
                class="form-input"
                placeholder="Repeat password"
                required
              />
            </div>
          </div>

          <!-- Role Selector -->
          <div class="form-group">
            <label class="form-label">Select Your Role</label>
            <div class="grid grid-cols-3 gap-3 mt-1">
              <label class="role-card card p-3 text-center cursor-pointer border border-brass/50 hover:border-orange transition" for="roleDonor" style="background:var(--parchment-light);">
                <input type="radio" name="role" id="roleDonor" value="donor" checked class="hidden" />
                <div class="role-icon text-xl text-orange mb-1"><i class="fa-solid fa-utensils"></i></div>
                <div class="font-bold text-sm text-ink-dark">Donor</div>
                <div class="text-xs text-ink-faded">Event Host / Caterer</div>
              </label>

              <label class="role-card card p-3 text-center cursor-pointer border border-brass/50 hover:border-orange transition" for="roleNgo" style="background:var(--parchment-light);">
                <input type="radio" name="role" id="roleNgo" value="ngo" class="hidden" />
                <div class="role-icon text-xl text-green mb-1"><i class="fa-solid fa-shield-heart"></i></div>
                <div class="font-bold text-sm text-ink-dark">NGO</div>
                <div class="text-xs text-ink-faded">Food Bank / Shelter</div>
              </label>

              <label class="role-card card p-3 text-center cursor-pointer border border-brass/50 hover:border-orange transition" for="roleVolunteer" style="background:var(--parchment-light);">
                <input type="radio" name="role" id="roleVolunteer" value="volunteer" class="hidden" />
                <div class="role-icon text-xl text-blue-700 mb-1"><i class="fa-solid fa-truck-fast"></i></div>
                <div class="font-bold text-sm text-ink-dark">Courier</div>
                <div class="text-xs text-ink-faded">Delivery Volunteer</div>
              </label>
            </div>
          </div>

          <!-- Organization (NGO only) -->
          <div id="orgFieldGroup" class="form-group" style="display:none;">
            <label for="regOrganization" class="form-label">Organization Name</label>
            <input
              type="text"
              id="regOrganization"
              class="form-input"
              placeholder="e.g. Community Hearth Foundation"
            />
          </div>

          <!-- Phone & Address -->
          <div class="form-row">
            <div class="form-group">
              <label for="regPhone" class="form-label">Phone Number</label>
              <input
                type="tel"
                id="regPhone"
                class="form-input"
                placeholder="+91 98765 43210"
              />
            </div>
            <div class="form-group">
              <label for="regAddress" class="form-label">Address / District</label>
              <input
                type="text"
                id="regAddress"
                class="form-input"
                placeholder="City, State"
              />
            </div>
          </div>

          <!-- Submit -->
          <button type="submit" class="btn btn-primary btn-block text-lg py-3 mt-2">
            <i class="fa-solid fa-user-plus"></i> Sign up
          </button>
        </form>

        <div class="auth-footer text-center mt-6 pt-4 border-t border-brass/30">
          <p style="color: var(--ink-faded); font-size: 0.95rem;">
            Already have an account?
            <a href="#login" class="font-bold text-orange hover:underline">Log in</a>
          </p>
        </div>
      </div>
    </section>
  `;

  // Role card active state toggling
  const roleCards = document.querySelectorAll('.role-card');
  const roleRadios = document.querySelectorAll('input[name="role"]');
  const orgGroup = document.getElementById('orgFieldGroup');

  function updateRoleSelection() {
    roleRadios.forEach((radio) => {
      const card = radio.closest('.role-card');
      if (radio.checked) {
        card.style.borderColor = 'var(--orange)';
        card.style.boxShadow = '0 0 0 2px var(--orange)';
        if (radio.value === 'ngo') {
          orgGroup.style.display = 'flex';
        } else {
          orgGroup.style.display = 'none';
        }
      } else {
        card.style.borderColor = 'rgba(122, 74, 18, 0.4)';
        card.style.boxShadow = 'none';
      }
    });
  }

  roleRadios.forEach((r) => r.addEventListener('change', updateRoleSelection));
  updateRoleSelection();

  // Register form submit handler
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    const roleEl = document.querySelector('input[name="role"]:checked');
    const role = roleEl ? roleEl.value : 'donor';
    const organization = document.getElementById('regOrganization').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const address = document.getElementById('regAddress').value.trim();

    if (!name || !email || !password || !confirm) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (password !== confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      showLoading();
      const payload = { name, email, password, role, organization, phone, address };
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Store token & user info (isolated per-tab via AppState)
      AppState.setToken(data.token);
      if (data.user) {
        AppState.setCurrentUser(data.user);
      }

      showToast('Account created successfully! Welcome to FoodShare.', 'success');
      if (typeof updateNav === 'function') updateNav();
      window.location.hash = '#home';
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
    } finally {
      hideLoading();
    }
  });
}

/* ------------------------------------------------------------------ */
/*  3.  renderProfile()                                                */
/* ------------------------------------------------------------------ */
async function renderProfile() {
  const app = document.getElementById('app');

  const token = AppState.getToken();
  if (!token) {
    showToast('Please log in first', 'error');
    window.location.hash = '#login';
    return;
  }

  app.innerHTML = `
    <section class="page-section">
      <div class="card p-8 text-center max-w-md mx-auto">
        <i class="fa-solid fa-gear fa-spin text-3xl text-brass mb-3"></i>
        <p class="text-ink-faded font-sans">Loading member profile…</p>
      </div>
    </section>
  `;

  try {
    showLoading();
    const user = await api('/api/auth/me');

    AppState.setCurrentUser(user);

    app.innerHTML = `
      <section class="page-section">
        <div class="card p-8 max-w-2xl mx-auto">
          <div class="flex justify-between items-center pb-4 mb-6 border-b border-brass/30">
            <div>
              <h2 class="text-2xl font-bold font-serif text-ink-dark">
                <i class="fa-solid fa-id-badge text-orange"></i> Profile
              </h2>
              <p class="text-sm text-ink-faded font-sans">Artisan Dossier &bull; Account Settings</p>
            </div>
            <span class="status-badge status-pending font-mono uppercase font-bold text-xs">
              ROLE: ${escapeHTML(user.role || 'user')}
            </span>
          </div>

          <form id="profileForm" class="steampunk-form" novalidate>
            <div class="form-row">
              <div class="form-group">
                <label for="profName" class="form-label">Full Name</label>
                <input type="text" id="profName" class="form-input" value="${escapeHTML(user.name || '')}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Email Address (Immutable)</label>
                <input type="email" class="form-input bg-gray-100 opacity-75 cursor-not-allowed" value="${escapeHTML(user.email || '')}" disabled />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="profPhone" class="form-label">Phone Number</label>
                <input type="tel" id="profPhone" class="form-input" value="${escapeHTML(user.phone || '')}" />
              </div>
              <div class="form-group">
                <label for="profOrg" class="form-label">Organization</label>
                <input type="text" id="profOrg" class="form-input" value="${escapeHTML(user.organization || '')}" />
              </div>
            </div>

            <div class="form-group">
              <label for="profAddress" class="form-label">Address</label>
              <input type="text" id="profAddress" class="form-input" value="${escapeHTML(user.address || '')}" />
            </div>

            <div class="pt-4 flex justify-between items-center">
              <button type="submit" class="btn btn-primary px-8 py-2.5">
                <i class="fa-solid fa-floppy-disk"></i> Update Profile
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="AppState.logout()">
                <i class="fa-solid fa-right-from-bracket"></i> Log out
              </button>
            </div>
          </form>
        </div>
      </section>
    `;

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        showLoading();
        const updated = await api('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({
            name: document.getElementById('profName').value.trim(),
            phone: document.getElementById('profPhone').value.trim(),
            organization: document.getElementById('profOrg').value.trim(),
            address: document.getElementById('profAddress').value.trim(),
          }),
        });
        AppState.setCurrentUser(updated);
        showToast('Profile updated successfully!', 'success');
        if (typeof updateNav === 'function') updateNav();
      } catch (err) {
        showToast(err.message || 'Failed to update profile.', 'error');
      } finally {
        hideLoading();
      }
    });
  } catch (err) {
    showToast('Failed to load profile.', 'error');
  } finally {
    hideLoading();
  }
}
