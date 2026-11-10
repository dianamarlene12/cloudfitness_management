/* ==========================================================================
   FitTrack - Application Interactive Logic & View Management System
   Handles 4 Core Views (Dashboard, Members, Memberships, Payments)
   plus Trainers, Attendance & Turnstile Simulator, Reports, Settings, and Modals.
   Fully integrated with the Express REST API backend and MySQL database.
   ========================================================================== */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Primary View Switching (Landing <-> Login <-> Admin Portal)
  initViewSwitching();
  
  // 2. Initialize Admin Console Sub-Page Navigation (8 Pages)
  initAdminSubPageSwitching();

  // 3. Initialize Filters & Search Controls
  initMemberDirectoryFilters();
  initContractsFilters();
  initTransactionStreamFilters();
  initDashboardControls();
  initGlobalAdminSearch();
  initPricingToggle();

  // 4. Initialize Auth Form Handling
  initAuthSimulation();

  // 5. Initialize Modals & Toasts
  initModalHandlers();

  // 6. Check Active Session with Backend & Load Initial Telemetry
  try {
    if (window.FitTrackAPI) {
      const res = await window.FitTrackAPI.auth.getMe();
      if (res && res.user) {
        setCurrentUser(res.user);
        loadAllDashboardData();
      }
    }
  } catch (err) {
    // Visitor is unauthenticated; stay on landing page
  }
});

/* --------------------------------------------------------------------------
   Current User Session Management & Header UI Sync
   -------------------------------------------------------------------------- */
function setCurrentUser(user) {
  currentUser = user;
  
  const userNameElem = document.querySelector('.admin-user-name');
  const userTitleElem = document.querySelector('.admin-user-title');
  const userAvatarElem = document.querySelector('.admin-user-avatar');
  const topAvatarText = document.querySelector('.avatar-text');
  const topbarUserBox = document.querySelector('.topbar-user-avatar');

  if (user) {
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AR';
    const roleBadge = user.role === 'admin' ? 'Head Admin' : user.role === 'trainer' ? 'Certified Coach' : 'Member Athlete';

    if (userNameElem) userNameElem.textContent = user.name;
    if (userTitleElem) userTitleElem.textContent = roleBadge;
    if (userAvatarElem) userAvatarElem.textContent = initials;
    if (topAvatarText) topAvatarText.textContent = initials;
    if (topbarUserBox) topbarUserBox.title = `${user.name} (${roleBadge})`;
  }
}

/* --------------------------------------------------------------------------
   Data Loading Orchestrator
   -------------------------------------------------------------------------- */
window.loadAllDashboardData = function() {
  loadDashboardStats();
  loadMembers();
  loadSubscriptions();
  loadPayments();
  loadTrainers();
  refreshAttendanceLog();
  loadNotifications();
};

/* --------------------------------------------------------------------------
   1. Primary View Switcher (Landing Page | Login | Admin Portal)
   -------------------------------------------------------------------------- */
function initViewSwitching() {
  const landingView = document.getElementById('view-landing');
  const loginView = document.getElementById('view-login');
  const adminView = document.getElementById('view-admin');

  const navLoginBtns = document.querySelectorAll('.js-nav-login');
  const navHomeBtns = document.querySelectorAll('.js-nav-home');
  const navAdminBtns = document.querySelectorAll('.js-nav-admin');

  window.showPrimaryView = function(viewName) {
    if (landingView) landingView.classList.remove('active');
    if (loginView) loginView.classList.remove('active');
    if (adminView) adminView.classList.remove('active');

    if (viewName === 'login' && loginView) {
      loginView.classList.add('active');
    } else if (viewName === 'landing' && landingView) {
      landingView.classList.add('active');
    } else if (adminView) {
      adminView.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  navLoginBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showPrimaryView('login');
    });
  });

  navHomeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showPrimaryView('landing');
    });
  });

  navAdminBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showPrimaryView('admin');
    });
  });

  // Logout Buttons
  const logoutBtns = document.querySelectorAll('.btn-logout');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (window.FitTrackAPI) {
          await window.FitTrackAPI.auth.logout();
        }
        setCurrentUser(null);
        showToast('Successfully logged out of FitTrack.');
        showPrimaryView('login');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });

  // Handle URL Hash routes
  function handleHash() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#login') {
      showPrimaryView('login');
    } else if (hash === '#landing' || hash === '#home') {
      showPrimaryView('landing');
    } else if (hash.startsWith('#admin') || hash === '#dashboard' || hash === '#members' || hash === '#trainers' || hash === '#memberships' || hash === '#payments' || hash === '#attendance' || hash === '#reports' || hash === '#settings') {
      showPrimaryView('admin');
      const targetPage = hash.replace('#admin-', '').replace('#', '');
      if (targetPage && window.switchAdminPage) {
        window.switchAdminPage(targetPage);
      }
    }
  }

  window.addEventListener('hashchange', handleHash);
  if (window.location.hash) {
    handleHash();
  }
}

/* --------------------------------------------------------------------------
   2. Admin Console Sub-Page Switcher (All 8 Pages)
   -------------------------------------------------------------------------- */
const pageCrumbTitles = {
  'dashboard': 'FitTrack / Executive Studio Hub',
  'members': 'FitTrack / Member Directory',
  'trainers': 'FitTrack / Trainer Roster',
  'memberships': 'FitTrack / Membership Plans & Subscriptions',
  'payments': 'FitTrack / Payments & Financial Operations',
  'attendance': 'FitTrack / Attendance & Access Telemetry',
  'reports': 'FitTrack / Analytics & Intelligence Reports',
  'settings': 'FitTrack / System & Club Settings'
};

function initAdminSubPageSwitching() {
  const navItems = document.querySelectorAll('.admin-nav-item');
  const subPages = document.querySelectorAll('.admin-sub-page');
  const crumbTitle = document.getElementById('topbar-crumb-title');

  window.switchAdminPage = function(targetPageId) {
    navItems.forEach(item => {
      if (item.dataset.target === targetPageId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    subPages.forEach(page => {
      if (page.id === `page-${targetPageId}`) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });

    if (crumbTitle && pageCrumbTitles[targetPageId]) {
      crumbTitle.textContent = pageCrumbTitles[targetPageId];
    }

    const contentArea = document.querySelector('.admin-content-area');
    if (contentArea) contentArea.scrollTop = 0;

    // Refresh specific page data on tab switch
    if (targetPageId === 'members') loadMembers();
    else if (targetPageId === 'memberships') loadSubscriptions();
    else if (targetPageId === 'payments') loadPayments();
    else if (targetPageId === 'trainers') loadTrainers();
    else if (targetPageId === 'attendance') refreshAttendanceLog();
    else if (targetPageId === 'dashboard') loadDashboardStats();
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target) {
        switchAdminPage(target);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   3. Member Directory Management
   -------------------------------------------------------------------------- */
function initMemberDirectoryFilters() {
  const planFilter = document.getElementById('filter-member-plan');
  const statusFilter = document.getElementById('filter-member-status');
  const coachFilter = document.getElementById('filter-member-coach');
  const searchInput = document.getElementById('filter-member-search');
  const checkAll = document.getElementById('check-all-members');

  function triggerFilteredLoad() {
    const plan = planFilter ? planFilter.value.toLowerCase() : 'all';
    const status = statusFilter ? statusFilter.value.toLowerCase() : 'all';
    const search = searchInput ? searchInput.value.trim() : '';
    loadMembers({ plan, status, search });
  }

  if (planFilter) planFilter.addEventListener('change', triggerFilteredLoad);
  if (statusFilter) statusFilter.addEventListener('change', triggerFilteredLoad);
  if (coachFilter) coachFilter.addEventListener('change', triggerFilteredLoad);
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(triggerFilteredLoad, 300);
    });
  }

  if (checkAll) {
    checkAll.addEventListener('change', () => {
      const rowChecks = document.querySelectorAll('#table-members tbody .row-select');
      rowChecks.forEach(cb => { cb.checked = checkAll.checked; });
      showToast(checkAll.checked ? `All ${rowChecks.length} athletes selected` : 'Deselected all athletes');
    });
  }
}

// Fetch and render members from API
async function loadMembers(filters = {}) {
  const tbody = document.querySelector('#table-members tbody');
  if (!tbody || !window.FitTrackAPI) return;

  try {
    const res = await window.FitTrackAPI.members.list(filters);
    const members = res.data || [];

    // Update member count badge
    const badgeCount = document.querySelector('.badge-athletes-count');
    if (badgeCount) badgeCount.textContent = `${res.pagination ? res.pagination.total : members.length} Athletes`;

    if (members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No athlete profiles matched your filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = members.map(m => {
      const initials = m.name ? m.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'FT';
      const planBadge = m.plan_tier === 'elite'
        ? '<span class="badge-plan-purple">⚡ Elite Performance</span>'
        : m.plan_tier === 'pro'
        ? '<span class="badge-plan-lime">⚡ Pro Athlete</span>'
        : '<span class="badge-plan-gray">🛡️ Standard Access</span>';

      const coach = m.assigned_coach || 'Marcus Vance';
      const coachInitials = coach.split(' ').map(n => n[0]).join('').toUpperCase();
      const statusDot = m.status === 'active' 
        ? '<span class="badge-status-dot green">● Active</span>' 
        : '<span class="badge-status-dot" style="color: #ef4444;">● Inactive</span>';

      return `
        <tr data-plan="${m.plan_tier || 'basic'}" data-status="${m.status}" data-id="${m.id}">
          <td><input type="checkbox" class="custom-checkbox row-select" value="${m.id}"></td>
          <td>
            <div class="athlete-profile-cell">
              <div class="athlete-avatar">${initials}</div>
              <div>
                <div class="athlete-name">${m.name}</div>
                <div class="athlete-email">${m.email}</div>
              </div>
            </div>
          </td>
          <td class="font-mono member-id-tag">${m.rfid_tag || '#FT-' + m.id}</td>
          <td class="font-mono text-muted">${m.phone || 'N/A'}</td>
          <td>${planBadge}</td>
          <td>
            <div class="coach-meta-cell">
              <div class="coach-avatar">${coachInitials}</div>
              <span>${coach}</span>
            </div>
          </td>
          <td class="font-mono text-muted">${m.created_at ? m.created_at.split('T')[0] : 'Today'}</td>
          <td>${statusDot}</td>
        </tr>
      `;
    }).join('');

    // Also populate member dropdowns in modals
    populateMemberDropdowns(members);
  } catch (err) {
    console.error('Failed to load members:', err);
  }
}

function populateMemberDropdowns(members) {
  const payMemberSelect = document.getElementById('pay-input-member');
  const subMemberSelect = document.getElementById('sub-input-member');

  if (payMemberSelect && members.length > 0) {
    payMemberSelect.innerHTML = members.map(m => 
      `<option value="${m.id}">${m.name} (${m.email})</option>`
    ).join('');
  }

  if (subMemberSelect && members.length > 0) {
    subMemberSelect.innerHTML = members.map(m => 
      `<option value="${m.id}">${m.name} (${m.email})</option>`
    ).join('');
  }
}

window.openAddMemberModal = function() {
  const modal = document.getElementById('modal-add-member');
  if (modal) modal.classList.add('active');
};

window.closeAddMemberModal = function() {
  const modal = document.getElementById('modal-add-member');
  if (modal) modal.classList.remove('active');
};

window.handleAddMemberSubmit = async function(e) {
  e.preventDefault();
  const name = document.getElementById('add-member-name').value;
  const email = document.getElementById('add-member-email').value;
  const phone = document.getElementById('add-member-phone').value;
  const id = document.getElementById('add-member-id').value;
  const plan = document.getElementById('add-member-plan').value;

  try {
    if (window.FitTrackAPI) {
      const res = await window.FitTrackAPI.members.create({
        name,
        email,
        phone,
        rfid_tag: id,
        plan
      });
      showToast(res.message || `Athlete "${name}" onboarded and RFID badge ${id} synced!`);
      closeAddMemberModal();
      loadMembers();
      loadDashboardStats();
    }
  } catch (err) {
    showToast(err.message, true);
  }
};

window.triggerBulkActions = function() {
  const selected = document.querySelectorAll('#table-members tbody .row-select:checked');
  if (selected.length === 0) {
    showToast('Select one or more athletes to apply bulk actions.', true);
  } else {
    showToast(`Bulk Action Menu: ${selected.length} athletes queued for RFID batch update.`);
  }
};

window.exportMembersCSV = function() {
  showToast('Generating and downloading Member_Roster_Audit.csv...');
};

/* --------------------------------------------------------------------------
   4. Contracts & Memberships
   -------------------------------------------------------------------------- */
function initContractsFilters() {
  const searchInput = document.getElementById('contracts-search');
  const renewFilter = document.getElementById('contracts-renew-filter');
  const tabPills = document.querySelectorAll('.contract-tab');

  let activeTier = 'all';

  function triggerFilteredLoad() {
    const query = searchInput ? searchInput.value.trim() : '';
    const renew = renewFilter ? renewFilter.value : 'all';
    loadSubscriptions({ tier: activeTier, search: query, autorenew: renew });
  }

  tabPills.forEach(tab => {
    tab.addEventListener('click', () => {
      tabPills.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTier = tab.getAttribute('data-filter') || 'all';
      triggerFilteredLoad();
    });
  });

  if (searchInput) searchInput.addEventListener('input', triggerFilteredLoad);
  if (renewFilter) renewFilter.addEventListener('change', triggerFilteredLoad);
}

async function loadSubscriptions(filters = {}) {
  const tbody = document.querySelector('#table-contracts tbody');
  if (!tbody || !window.FitTrackAPI) return;

  try {
    const res = await window.FitTrackAPI.memberships.getSubscriptions(filters);
    const subs = res.data || [];

    if (subs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No subscription mandates found.</td></tr>`;
      return;
    }

    tbody.innerHTML = subs.map(s => {
      const initials = s.member_name ? s.member_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'FT';
      const isElite = s.tier_code === 'elite';
      const isPro = s.tier_code === 'pro';
      const tierBadge = isElite 
        ? '<span class="badge-tag-purple font-mono">Elite VIP</span>' 
        : isPro 
        ? '<span class="badge-tag-lime font-mono">Pro Tier</span>' 
        : '<span class="badge-tag-gray font-mono">Basic</span>';

      return `
        <tr data-tier="${s.tier_code || 'basic'}" data-renew="${s.auto_renew ? 'on' : 'off'}">
          <td>
            <div class="athlete-profile-cell">
              <div class="athlete-avatar">${initials}</div>
              <div>
                <div class="athlete-name">${s.member_name}</div>
                <div class="athlete-email">${s.member_email}</div>
              </div>
            </div>
          </td>
          <td>${tierBadge}</td>
          <td class="font-mono text-muted">${s.start_date || '2024-04-01'}</td>
          <td class="font-mono text-muted">${s.end_date || '2024-05-01'}</td>
          <td class="font-mono text-muted">${s.duration_months === 12 ? 'Annual' : s.duration_months === 3 ? 'Quarterly' : 'Monthly'}</td>
          <td>
            <label class="switch-toggle">
              <input type="checkbox" ${s.auto_renew ? 'checked' : ''} onchange="toggleAutoRenew(this, '${s.member_name}', ${s.id})">
              <span class="slider round"></span>
            </label>
          </td>
          <td class="font-mono font-bold">₹${parseFloat(s.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td><span class="badge-status-dot green">● Active</span></td>
          <td style="text-align: right;"><button class="btn-menu-dots font-mono" onclick="showToast('Contract details for ${s.member_name}')">⋮</button></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load subscriptions:', err);
  }
}

window.toggleAutoRenew = async function(checkbox, memberName, subId) {
  try {
    if (window.FitTrackAPI && subId) {
      await window.FitTrackAPI.memberships.toggleAutoRenew(subId, checkbox.checked);
    }
    showToast(`Auto-renew for ${memberName} switched ${checkbox.checked ? 'ON (UPI / e-NACH Mandate Active)' : 'OFF'}.`);
  } catch (err) {
    showToast(err.message, true);
    checkbox.checked = !checkbox.checked;
  }
};

window.refreshContracts = function() {
  loadSubscriptions();
  showToast('Synchronized contract renewal cycles with Indian payment gateways (NPCI / Razorpay).');
};

window.openNewSubscriptionModal = function() {
  const modal = document.getElementById('modal-new-subscription');
  if (modal) modal.classList.add('active');
};

window.closeNewSubscriptionModal = function() {
  const modal = document.getElementById('modal-new-subscription');
  if (modal) modal.classList.remove('active');
};

window.handleNewSubscriptionSubmit = async function(e) {
  e.preventDefault();
  const memberSelect = document.getElementById('sub-input-member');
  const tier = document.getElementById('sub-input-tier').value;
  const freq = document.getElementById('sub-input-freq').value;
  const autorenew = document.getElementById('sub-input-autorenew').checked;

  const memberId = parseInt(memberSelect.value, 10) || 1;
  const planId = tier.includes('Elite') ? 3 : tier.includes('Pro') ? 2 : 1;
  const duration = freq.includes('Annual') ? 12 : freq.includes('Quarterly') ? 3 : 1;

  try {
    if (window.FitTrackAPI) {
      const res = await window.FitTrackAPI.memberships.subscribe({
        member_id: memberId,
        membership_id: planId,
        duration_months: duration,
        auto_renew: autorenew
      });
      showToast(res.message || 'Subscription mandate configured!');
      closeNewSubscriptionModal();
      loadSubscriptions();
      loadPayments();
      loadDashboardStats();
    }
  } catch (err) {
    showToast(err.message, true);
  }
};

window.openEditPlanModal = function(planName, price) {
  openModal(
    `Configure ${planName} Architecture`,
    `Adjust dynamic pricing (currently ₹${price}/mo), facility capacity yield caps, and automated retry schedules.`,
    'Save Changes'
  );
};

window.openCreateCustomTierModal = function() {
  openModal(
    'Create Custom Membership Tier',
    'Set up corporate perks, seasonal promotion codes, student access intervals, and turnstile bypass authorizations.',
    'Publish Tier'
  );
};

/* --------------------------------------------------------------------------
   5. Payments & Transaction Stream
   -------------------------------------------------------------------------- */
let activeTxStatus = 'all';

window.filterTransactions = function() {
  const methodFilter = document.getElementById('filter-tx-method');
  const searchInput = document.getElementById('filter-tx-search');
  loadPayments({
    status: activeTxStatus,
    method: methodFilter ? methodFilter.value.toLowerCase() : 'all',
    search: searchInput ? searchInput.value.trim() : ''
  });
};

function initTransactionStreamFilters() {
  const methodFilter = document.getElementById('filter-tx-method');
  const searchInput = document.getElementById('filter-tx-search');

  if (methodFilter) methodFilter.addEventListener('change', window.filterTransactions);
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(window.filterTransactions, 250);
    });
  }
}

window.setTxStatusFilter = function(status, btn) {
  activeTxStatus = status;
  const tabs = document.querySelectorAll('.tx-status-tab');
  tabs.forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.filterTransactions();
};

async function loadPayments(filters = {}) {
  const tbody = document.getElementById('tx-table-body');
  if (!tbody || !window.FitTrackAPI) return;

  try {
    const res = await window.FitTrackAPI.payments.list(filters);
    const payments = res.data || [];
    const summary = res.summary || {};

    // 1. Render Table Rows
    if (payments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted); font-family: var(--font-mono);">No simulated transaction records match this filter.</td></tr>`;
    } else {
      tbody.innerHTML = payments.map(p => {
        const initials = p.member_name ? p.member_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'FT';
        const isPaid = p.status === 'paid';
        const isFailed = p.status === 'failed';
        const statusBadge = isPaid 
          ? '<span class="badge-status-dot green">● Paid</span>'
          : isFailed
          ? '<span class="badge-status-dot red">● Failed</span>'
          : '<span class="badge-status-dot" style="color: #f59e0b;">● Pending</span>';

        const formattedAmount = `₹${parseFloat(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return `
          <tr data-status="${p.status}" data-method="${(p.payment_method || '').toLowerCase()}">
            <td class="font-mono text-lime font-bold">#${p.invoice_number}</td>
            <td>
              <div class="athlete-profile-cell">
                <div class="athlete-avatar">${initials}</div>
                <div>
                  <div class="athlete-name">${p.member_name || 'Member'}</div>
                  <div class="athlete-email">${p.member_email || 'athlete@fittrack.in'}</div>
                </div>
              </div>
            </td>
            <td><span class="badge-tag-purple-sm">${p.plan_name || p.notes || 'Gym Settlement'}</span></td>
            <td class="font-mono font-bold">${formattedAmount}</td>
            <td>
              <div class="tx-method-cell">
                <span class="method-tag-card">${p.payment_method || 'UPI / POS'}</span>
              </div>
            </td>
            <td class="font-mono text-muted text-xs">${p.payment_date ? p.payment_date.split('T')[0] : 'Today'}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right;">
              <button class="btn-invoice-download" title="Download Invoice PDF" onclick="downloadSingleInvoice('${p.invoice_number}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Sync Top 4 KPI Metrics with Indian Currency (₹ / en-IN)
    const totalSettled = summary.total_settled || 0;
    const totalPending = summary.total_pending || 0;
    const totalRefunded = summary.total_refunded || 0;
    const monthCollection = summary.this_month_collection || 0;
    const counts = summary.counts || { total: payments.length, paid: 0, pending: 0, failed: 0, refunded: 0 };

    const totalRevElem = document.getElementById('stat-total-revenue');
    if (totalRevElem) {
      totalRevElem.innerHTML = `₹${totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="kpi-currency">INR</span>`;
    }

    const pendingDuesElem = document.getElementById('stat-pending-dues');
    if (pendingDuesElem) {
      pendingDuesElem.innerHTML = `₹${totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="kpi-unit font-mono" id="stat-pending-count">${counts.pending} accts</span>`;
    }

    const refundsElem = document.getElementById('stat-refunds-total');
    if (refundsElem) {
      refundsElem.innerHTML = `₹${totalRefunded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="kpi-unit font-mono" id="stat-refunds-count">${summary.refund_count || 0} txns</span>`;
    }

    const monthCollectionElem = document.getElementById('stat-month-collection');
    if (monthCollectionElem) {
      monthCollectionElem.innerHTML = `₹${monthCollection.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="kpi-unit font-mono text-lime" id="stat-month-pct">${totalSettled > 0 ? Math.round((monthCollection / totalSettled) * 100) : 100}%</span>`;
    }

    const monthSubElem = document.getElementById('stat-month-sub');
    if (monthSubElem) {
      monthSubElem.textContent = `${counts.paid} settled transactions`;
    }

    // 3. Sync Stream Total Badge & Tab Counts
    const streamBadge = document.getElementById('stream-total-badge');
    if (streamBadge) streamBadge.textContent = `${counts.total} TOTAL`;

    const tabAll = document.getElementById('tab-count-all');
    if (tabAll) tabAll.textContent = counts.total;

    const tabPaid = document.getElementById('tab-count-paid');
    if (tabPaid) tabPaid.textContent = counts.paid;

    const tabPending = document.getElementById('tab-count-pending');
    if (tabPending) tabPending.textContent = counts.pending;

    const tabFailed = document.getElementById('tab-count-failed');
    if (tabFailed) tabFailed.textContent = counts.failed;

    const tabRefunded = document.getElementById('tab-count-refunded');
    if (tabRefunded) tabRefunded.textContent = counts.refunded;

    // 4. Sync Payment Channels Breakdown
    if (Array.isArray(summary.channels) && totalSettled > 0) {
      let cardAmt = 0, enachAmt = 0, upiAmt = 0, cashAmt = 0;
      summary.channels.forEach(ch => {
        const m = (ch.payment_method || '').toLowerCase();
        if (m.includes('card') || m.includes('rupay') || m.includes('visa') || m.includes('mastercard')) cardAmt += ch.total_amount;
        else if (m.includes('debit') || m.includes('enach') || m.includes('sepa') || m.includes('netbanking')) enachAmt += ch.total_amount;
        else if (m.includes('upi') || m.includes('qr') || m.includes('gpay') || m.includes('phonepe') || m.includes('wallet') || m.includes('apple')) upiAmt += ch.total_amount;
        else cashAmt += ch.total_amount;
      });

      const setChannel = (key, amt) => {
        const pct = Math.min(100, Math.round((amt / totalSettled) * 100));
        const pctEl = document.getElementById(`channel-pct-${key}`);
        const amtEl = document.getElementById(`channel-amt-${key}`);
        const fillEl = document.getElementById(`channel-fill-${key}`);
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (amtEl) amtEl.textContent = `(₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
        if (fillEl) fillEl.style.width = `${pct}%`;
      };

      setChannel('card', cardAmt);
      setChannel('enach', enachAmt);
      setChannel('upi', upiAmt);
      setChannel('cash', cashAmt);
    }
  } catch (err) {
    console.error('Failed to load payments:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #ef4444; font-family: var(--font-mono);">Failed to sync live payments from server: ${err.message}</td></tr>`;
  }
}

window.openRecordPaymentModal = function() {
  const modal = document.getElementById('modal-record-payment');
  if (modal) modal.classList.add('active');
};

window.closeRecordPaymentModal = function() {
  const modal = document.getElementById('modal-record-payment');
  if (modal) modal.classList.remove('active');
};

window.handleManualPaymentSubmit = async function(e) {
  e.preventDefault();
  const memberSelect = document.getElementById('pay-input-member');
  const amount = parseFloat(document.getElementById('pay-input-amount').value) || 4999.00;
  const method = document.getElementById('pay-input-method').value;
  const desc = document.getElementById('pay-input-desc').value;

  const memberId = parseInt(memberSelect.value, 10) || 1;

  try {
    if (window.FitTrackAPI) {
      const res = await window.FitTrackAPI.payments.recordPayment({
        member_id: memberId,
        amount,
        payment_method: method,
        notes: desc
      });
      showToast(res.message || 'Payment recorded!');
      closeRecordPaymentModal();
      loadPayments();
      loadDashboardStats();
    }
  } catch (err) {
    showToast(err.message, true);
  }
};

window.downloadFinancialReport = function() {
  showToast('Generating Audit-Ready Financial Ledger Statement (PDF)...');
};

window.downloadSingleInvoice = function(invId) {
  showToast(`Downloading Tax Invoice #${invId} (PDF)...`);
};

/* --------------------------------------------------------------------------
   6. Dashboard Controls & Real-Time Stats Sync
   -------------------------------------------------------------------------- */
function initDashboardControls() {
  const campusCentral = document.getElementById('campus-central');
  const campusEast = document.getElementById('campus-east');
  const tfPills = document.querySelectorAll('.tf-pill');

  if (campusCentral && campusEast) {
    campusCentral.addEventListener('click', () => {
      campusCentral.classList.add('active');
      campusEast.classList.remove('active');
      showToast('Telemetry stream focused on Central Campus Hub');
      loadDashboardStats();
    });

    campusEast.addEventListener('click', () => {
      campusEast.classList.add('active');
      campusCentral.classList.remove('active');
      showToast('Telemetry stream focused on East District Athletic Lab');
      loadDashboardStats();
    });
  }

  tfPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tfPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const tf = pill.getAttribute('data-tf');
      showToast(`Yield progression cadence recalculated for ${tf} timeframe`);
    });
  });
}

async function loadDashboardStats() {
  if (!window.FitTrackAPI) return;

  try {
    const res = await window.FitTrackAPI.dashboard.getStats();
    const stats = res.data;
    if (!stats) return;

    // KPI 1: Total Members
    const memberKpi = document.querySelector('#page-dashboard .kpi-card:nth-child(1) .kpi-big-num');
    if (memberKpi) memberKpi.textContent = stats.total_members.toLocaleString();

    // KPI 2: Active Trainers
    const trainerKpi = document.querySelector('#page-dashboard .kpi-card:nth-child(2) .kpi-big-num');
    if (trainerKpi) trainerKpi.innerHTML = `${stats.trainer_count} <span class="kpi-fraction">/ ${stats.trainer_count}</span>`;

    // KPI 3: Monthly Revenue
    const revKpi = document.querySelector('#page-dashboard .kpi-card:nth-child(3) .kpi-big-num');
    if (revKpi) revKpi.textContent = `₹${stats.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

    // KPI 4: Today's Attendance Check-ins
    const attKpi = document.querySelector('#page-dashboard .kpi-card:nth-child(4) .kpi-big-num');
    if (attKpi) attKpi.textContent = stats.today_checkins.toLocaleString();

    // Hero HUD preview occupancy
    const hudOccupancy = document.getElementById('hud-occupancy');
    if (hudOccupancy) hudOccupancy.textContent = `${Math.min(100, Math.round((stats.current_occupancy / 50) * 100))}%`;

    const hudSessions = document.getElementById('hud-sessions');
    if (hudSessions) hudSessions.textContent = stats.current_occupancy || stats.today_checkins;

    // Telemetry badge
    const telemetryPill = document.querySelector('.telemetry-live-pill span:last-child');
    if (telemetryPill) {
      telemetryPill.textContent = `LIVE TELEMETRY Synced with MySQL at ${new Date().toLocaleTimeString()}`;
    }
  } catch (err) {
    console.error('Failed to load dashboard statistics:', err);
  }
}

window.triggerPromptAction = function(name, tier) {
  openModal(
    `Dispatch Renewal Prompt &bull; ${name}`,
    `An automated SMS and push notification with one-click payment token for ${tier} will be dispatched to ${name}'s FitTrack mobile app.`,
    'Send Prompt Now'
  );
};

window.triggerExtendAction = function(name, tier) {
  showToast(`Extended ${tier} access for ${name} by 30 grace days.`);
};

/* --------------------------------------------------------------------------
   7. Trainers Showcase
   -------------------------------------------------------------------------- */
async function loadTrainers() {
  if (!window.FitTrackAPI) return;
  try {
    const res = await window.FitTrackAPI.trainers.list();
    // Verify trainers loaded cleanly
  } catch (err) {
    console.error('Failed to load trainers:', err);
  }
}

/* --------------------------------------------------------------------------
   8. Attendance & Automated Turnstile Simulator
   -------------------------------------------------------------------------- */
window.handleTurnstileMemberChange = function(selectElem) {
  const customGroup = document.getElementById('turnstile-custom-input-group');
  if (customGroup) {
    customGroup.style.display = selectElem.value === 'CUSTOM' ? 'block' : 'none';
  }
};

window.executeTurnstileScan = async function(isExit) {
  const memberSelect = document.getElementById('turnstile-member-select');
  const customInput = document.getElementById('turnstile-rfid-input');
  const gateSelect = document.getElementById('turnstile-gate-select');
  const methodSelect = document.getElementById('turnstile-method-select');
  const consoleScreen = document.getElementById('turnstile-console-screen');
  const gateIndicator = document.getElementById('turnstile-gate-indicator');

  let rfid = memberSelect ? memberSelect.value : '#FT-8841';
  if (rfid === 'CUSTOM' && customInput) {
    rfid = customInput.value.trim();
  }

  const turnstile_id = gateSelect ? gateSelect.value : 'Gate-Bay-01';
  const access_method = methodSelect ? methodSelect.value : 'rfid';
  const timeStr = new Date().toLocaleTimeString();

  function log(msg, color) {
    if (!consoleScreen) return;
    const line = document.createElement('div');
    line.style.color = color || '#a1a1aa';
    line.innerHTML = `[${timeStr}] ${msg}`;
    consoleScreen.appendChild(line);
    consoleScreen.scrollTop = consoleScreen.scrollHeight;
  }

  log(`[OPTICAL SCAN] Reading RFID badge ${rfid} at ${turnstile_id}...`, '#D4FF00');

  try {
    let res;
    if (isExit) {
      res = await window.FitTrackAPI.attendance.checkOut({ rfid_tag: rfid, turnstile_id });
    } else {
      res = await window.FitTrackAPI.attendance.checkIn({ rfid_tag: rfid, turnstile_id, access_method });
    }

    if (gateIndicator) {
      gateIndicator.textContent = 'GATE: UNLOCKED (CLEARANCE OK)';
      gateIndicator.style.color = '#D4FF00';
    }

    log(`✔ ${res.message}`, '#D4FF00');
    showToast(res.message);
    refreshAttendanceLog();
    loadDashboardStats();

    setTimeout(() => {
      if (gateIndicator) {
        gateIndicator.textContent = 'GATE: READY (LOCKED)';
        gateIndicator.style.color = '#D4FF00';
      }
    }, 3500);
  } catch (err) {
    if (gateIndicator) {
      gateIndicator.textContent = 'GATE: LOCKED (DENIED)';
      gateIndicator.style.color = '#ef4444';
    }
    log(`❌ ${err.message}`, '#ef4444');
    showToast(err.message, true);

    setTimeout(() => {
      if (gateIndicator) {
        gateIndicator.textContent = 'GATE: READY (LOCKED)';
        gateIndicator.style.color = '#D4FF00';
      }
    }, 3500);
  }
};

async function refreshAttendanceLog() {
  const tbody = document.getElementById('attendance-table-body');
  if (!tbody || !window.FitTrackAPI) return;

  try {
    const res = await window.FitTrackAPI.attendance.getHistory({ limit: 15 });
    const records = res.data || [];

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No attendance events recorded today yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const isInside = r.status === 'checked_in';
      const statusBadge = isInside 
        ? '<span class="badge-status-dot green">● Checked In (Active)</span>' 
        : '<span class="badge-status-dot" style="color: var(--text-muted);">○ Checked Out</span>';

      const inTime = r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '--';
      const outTime = r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : 'Current';
      const duration = r.duration_minutes ? `${r.duration_minutes}m` : 'Live';

      return `
        <tr>
          <td>
            <div class="athlete-name">${r.member_name}</div>
            <div class="athlete-email">${r.member_email}</div>
          </td>
          <td class="font-mono text-lime">${r.rfid_tag || 'N/A'}</td>
          <td class="font-mono text-muted text-xs">${inTime} ➔ ${outTime}</td>
          <td class="font-mono">${r.turnstile_id || 'Gate-Bay-01'}</td>
          <td class="font-mono text-muted">${r.access_method.toUpperCase()}</td>
          <td class="font-mono">${duration}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to refresh attendance log:', err);
  }
}

/* --------------------------------------------------------------------------
   9. Notifications Center
   -------------------------------------------------------------------------- */
async function loadNotifications() {
  if (!window.FitTrackAPI) return;

  try {
    const res = await window.FitTrackAPI.notifications.list();
    const notifBtn = document.getElementById('btn-notifications');
    const dot = notifBtn ? notifBtn.querySelector('.notif-dot') : null;

    if (dot) {
      dot.style.display = res.unread_count > 0 ? 'block' : 'none';
    }

    // Connect click to open modal
    if (notifBtn) {
      notifBtn.onclick = () => openNotificationsModal(res.data || []);
    }
  } catch (err) {
    // Visitor not logged in
  }
}

window.openNotificationsModal = function(notifications = []) {
  const modal = document.getElementById('modal-notifications');
  const container = document.getElementById('notifications-list-container');
  if (!modal || !container) return;

  if (notifications.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Zero unread telemetry alerts. All facility systems nominal.</div>`;
  } else {
    container.innerHTML = notifications.map(n => `
      <div style="background: #111418; border: 1px solid var(--border-dark); border-radius: 8px; padding: 0.85rem; border-left: 3px solid ${n.type === 'success' ? 'var(--accent-lime)' : n.type === 'warning' ? '#f59e0b' : 'var(--accent-cyan)'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <strong style="font-size: 0.85rem; color: #fff;">${n.title}</strong>
          <span class="font-mono text-muted text-xs">${new Date(n.created_at).toLocaleTimeString()}</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; margin: 0;">${n.message}</p>
      </div>
    `).join('');
  }

  modal.classList.add('active');
};

window.closeNotificationsModal = function() {
  const modal = document.getElementById('modal-notifications');
  if (modal) modal.classList.remove('active');
};

window.markAllNotificationsRead = async function() {
  try {
    if (window.FitTrackAPI) {
      await window.FitTrackAPI.notifications.markAllRead();
      showToast('All notifications marked as read.');
      loadNotifications();
      closeNotificationsModal();
    }
  } catch (err) {
    showToast(err.message, true);
  }
};

/* --------------------------------------------------------------------------
   10. Global Admin Search
   -------------------------------------------------------------------------- */
function initGlobalAdminSearch() {
  const globalSearch = document.getElementById('admin-global-search');
  if (!globalSearch) return;

  globalSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const activeSubpage = document.querySelector('.admin-sub-page.active');
    if (!activeSubpage) return;

    const rows = activeSubpage.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      globalSearch.focus();
    }
  });
}

// Quick Action Modal
window.openQuickActionModal = function() {
  openModal(
    'Quick Terminal Override',
    'Execute emergency facility commands: Broadcast gym alert, toggle emergency turnstile evacuation mode, or force telemetry refresh.',
    'Execute Emergency Unlock'
  );

  const actionBtn = document.getElementById('modal-action-btn');
  if (actionBtn) {
    actionBtn.onclick = async () => {
      closeModal();
      try {
        if (window.FitTrackAPI) {
          const res = await window.FitTrackAPI.admin.overrideTurnstile(true);
          showToast(res.message);
        }
      } catch (err) {
        showToast(err.message, true);
      }
    };
  }
};

/* --------------------------------------------------------------------------
   11. Landing Page Pricing Toggle
   -------------------------------------------------------------------------- */
function initPricingToggle() {
  const billingToggle = document.getElementById('billing-toggle');
  const monthlyLabel = document.getElementById('label-monthly');
  const annualLabel = document.getElementById('label-annual');
  
  const priceBasic = document.getElementById('price-basic');
  const pricePro = document.getElementById('price-pro');
  const priceElite = document.getElementById('price-elite');

  if (!billingToggle) return;

  let isAnnual = false;

  billingToggle.addEventListener('click', () => {
    isAnnual = !isAnnual;
    billingToggle.classList.toggle('active', isAnnual);
    if (monthlyLabel) monthlyLabel.classList.toggle('active', !isAnnual);
    if (annualLabel) annualLabel.classList.toggle('active', isAnnual);

    if (isAnnual) {
      if (priceBasic) priceBasic.textContent = '₹3,199';
      if (pricePro) pricePro.textContent = '₹6,399';
      if (priceElite) priceElite.textContent = '₹12,799';
      showToast('20% Annual billing cadence applied!');
    } else {
      if (priceBasic) priceBasic.textContent = '₹3,999';
      if (pricePro) pricePro.textContent = '₹7,999';
      if (priceElite) priceElite.textContent = '₹15,999';
    }
  });
}

/* --------------------------------------------------------------------------
   12. Authentication Form Handling (Real REST API Login & Sign Up)
   -------------------------------------------------------------------------- */
function initAuthSimulation() {
  const tabLogin = document.getElementById('tab-btn-login');
  const tabSignup = document.getElementById('tab-btn-signup');
  const authTitle = document.getElementById('auth-form-title');
  const authSubtitle = document.getElementById('auth-form-subtitle');
  const submitBtn = document.getElementById('auth-submit-btn');
  const authForm = document.getElementById('auth-form');

  if (!tabLogin || !tabSignup || !authForm) return;

  let isSignUpMode = false;

  tabLogin.addEventListener('click', () => {
    isSignUpMode = false;
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    if (authTitle) authTitle.textContent = 'Welcome back';
    if (authSubtitle) authSubtitle.textContent = 'Access your gym dashboard and biometric workout logs';
    if (submitBtn) submitBtn.innerHTML = 'Log in to Dashboard &rarr;';
  });

  tabSignup.addEventListener('click', () => {
    isSignUpMode = true;
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    if (authTitle) authTitle.textContent = 'Create Terminal Account';
    if (authSubtitle) authSubtitle.textContent = 'Register your athlete account for full access';
    if (submitBtn) submitBtn.innerHTML = 'Register Athlete Account &rarr;';
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('input-email') ? document.getElementById('input-email').value : '';
    const password = document.getElementById('input-password') ? document.getElementById('input-password').value : '';

    if (!email || !password) {
      showToast('Please provide both email and password.', true);
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="pulse-dot"></span> Authenticating Terminal...';
    }

    try {
      if (!window.FitTrackAPI) {
        throw new Error('API helper not loaded');
      }

      let res;
      if (isSignUpMode) {
        const name = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
        res = await window.FitTrackAPI.auth.register({ name, email, password });
      } else {
        res = await window.FitTrackAPI.auth.login(email, password);
      }

      showToast(`Authenticated as ${res.user.name}! Redirecting to Admin Console...`);
      setCurrentUser(res.user);
      loadAllDashboardData();
      showPrimaryView('admin');
    } catch (err) {
      showToast(err.message, true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isSignUpMode ? 'Register Athlete Account &rarr;' : 'Log in to Dashboard &rarr;';
      }
    }
  });
}

/* --------------------------------------------------------------------------
   13. Base Modal Dialog & Toast Notification System
   -------------------------------------------------------------------------- */
function initModalHandlers() {
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-body-text');
  const modalClose = document.getElementById('modal-close');
  const modalActionBtn = document.getElementById('modal-action-btn');

  window.openModal = function(title, message, actionText = 'Confirm') {
    if (!modalBackdrop) return;
    if (modalTitle) modalTitle.textContent = title;
    if (modalContent) modalContent.textContent = message;
    if (modalActionBtn) modalActionBtn.textContent = actionText;
    modalBackdrop.classList.add('active');
  };

  window.closeModal = function() {
    if (modalBackdrop) modalBackdrop.classList.remove('active');
  };

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  if (modalActionBtn) {
    modalActionBtn.addEventListener('click', () => {
      closeModal();
      showToast('Action confirmed! Settings dispatched across facility hubs.');
    });
  }
}

// Global Toast Notification Helper
window.showToast = function(message, isError = false) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.style.borderColor = isError ? '#ef4444' : '#D4FF00';
  toast.innerHTML = `
    <span class="pulse-dot" style="background-color: ${isError ? '#ef4444' : '#D4FF00'}; box-shadow: 0 0 10px ${isError ? '#ef4444' : '#D4FF00'}"></span>
    <span style="font-size: 0.85rem; font-weight: 600;">${message}</span>
  `;

  toast.classList.add('show');

  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
};
