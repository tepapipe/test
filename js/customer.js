/* ============================================
   BestBuddies Pet Grooming - Customer Dashboard
   ============================================ */

// Load customer dashboard
async function loadCustomerDashboard() {
  // Check if user is logged in
  const isLoggedIn = await requireLogin();
  if (!isLoggedIn) {
    return;
  }

  const user = await getCurrentUser();

  // Debug: Log user data to console
  console.log('Current user data:', user);
  console.log('User name:', user?.name);

  // Update welcome message
  const welcomeElement = document.getElementById('welcomeName');
  if (welcomeElement && user) {
    const displayName = user.name || user.email?.split('@')[0] || 'Customer';
    welcomeElement.textContent = displayName;
    console.log('Updated welcome name to:', displayName);
  } else if (welcomeElement) {
    console.warn('User not found or welcome element missing');
    welcomeElement.textContent = 'Customer';
  }

  // Setup sidebar navigation
  setupCustomerSidebarNavigation();
  setupCustomerBookingFilters();

  await renderWarningPanel();

  // Load quick stats
  await loadQuickStats();

  renderTeamCalendarPreview();
  renderCommunityShowcase();

  // Load user bookings
  await loadUserBookings();

  // Load calendar
  const bookings = await getUserBookings();
  renderCustomerCalendar(bookings);

  // Account
  setupCustomerPasswordForm();
}

// Setup sidebar navigation
function setupCustomerSidebarNavigation() {
  const menuItems = document.querySelectorAll('.sidebar-menu a[data-view]');
  menuItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const view = this.dataset.view;
      if (view) {
        switchCustomerView(view);
      }
    });
  });

  // Setup dropdown toggle
  const dropdownToggle = document.querySelector('.dropdown-toggle');
  const dropdownSubmenu = document.querySelector('.dropdown-submenu');
  const dropdownArrow = document.querySelector('.dropdown-arrow');

  if (dropdownToggle && dropdownSubmenu) {
    dropdownToggle.addEventListener('click', function (e) {
      e.preventDefault();
      const isExpanded = dropdownSubmenu.classList.contains('expanded');

      if (isExpanded) {
        dropdownSubmenu.classList.remove('expanded');
        dropdownToggle.classList.remove('expanded');
        dropdownSubmenu.style.maxHeight = '0';
      } else {
        dropdownSubmenu.classList.add('expanded');
        dropdownToggle.classList.add('expanded');
        dropdownSubmenu.style.maxHeight = '500px';
      }
    });
  }

  // Setup submenu link handlers
  const submenuLinks = document.querySelectorAll('.submenu-link');
  submenuLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      // Remove active class from all menu items
      document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
      document.querySelectorAll('.submenu-link').forEach(a => a.classList.remove('active'));

      // Add active class to clicked submenu link
      this.classList.add('active');

      // Handle different submenu actions
      if (this.dataset.filter) {
        // Filter bookings and switch to bookings view
        setCustomerBookingFilter(this.dataset.filter);
        switchCustomerView('bookings');
      } else if (this.dataset.view) {
        // Switch to specified view
        switchCustomerView(this.dataset.view);
      }
    });
  });

  // Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.customer-layout .sidebar');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', function () {
      sidebar.classList.toggle('active');
      const isOpen = sidebar.classList.contains('active');
      // Update button text cleanly
      if (this.firstChild && this.firstChild.nodeType === 3) { // if text node
        this.firstChild.textContent = isOpen ? '✕ Close' : '☰ Menu';
      } else {
        this.textContent = isOpen ? '✕ Close' : '☰ Menu';
      }

      if (isOpen) {
        this.classList.remove('btn-outline');
        this.classList.add('btn-primary');
      } else {
        this.classList.add('btn-outline');
        this.classList.remove('btn-primary');
      }
    });
  }
}

let customerBookingsCache = [];
let customerBookingState = {
  filter: 'all',
  page: 1,
  pageSize: 4
};

function setupCustomerBookingFilters() {
  const filterGroup = document.getElementById('customerBookingFilters');
  if (!filterGroup || filterGroup.dataset.bound === 'true') return;
  filterGroup.dataset.bound = 'true';
  filterGroup.querySelectorAll('button[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => setCustomerBookingFilter(btn.dataset.filter));
  });
}

// Switch customer view
function switchCustomerView(view) {
  // Hide all views
  const views = ['overviewView', 'bookingsView', 'calendarView', 'historyView', 'accountView'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });

  // Update active menu item
  document.querySelectorAll('.sidebar-menu a[data-view]').forEach(item => {
    if (item.dataset.view === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Show appropriate view
  const targetView = document.getElementById(view + 'View');
  if (targetView) {
    targetView.style.display = 'block';

    // Explicitly re-render calendar if switching to it, to ensure it has latest data
    if (view === 'calendarView') {
      if (typeof renderCustomerCalendar === 'function') {
        renderCustomerCalendar();
      }
    }
  }

  // Load data if needed
  if (view === 'bookings') {
    loadUserBookings().then(() => renderCustomerSlotsList());
  } else if (view === 'calendar') {
    getUserBookings().then(bookings => renderCustomerCalendar(bookings));
  } else if (view === 'history') {
    renderCustomerBookingHistory();
  }
}

// Load quick stats with clickable cards
async function loadQuickStats() {
  const bookings = await getUserBookings();
  const totalBookings = bookings.length;
  // Slots removed
  const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'];
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const cancelledBookings = bookings.filter(b => cancelledStatuses.includes(b.status)).length;

  const statsContainer = document.getElementById('quickStats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-card" style="background: linear-gradient(135deg, rgba(100, 181, 246, 0.15), rgba(66, 165, 245, 0.15)); cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease;" onclick="sortCustomerBookings('all')" data-sort="all">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
        <div class="stat-value" style="font-size: 2.5rem; color: #1976d2; font-weight: 700;">${totalBookings}</div>
        <div class="stat-label" style="color: var(--gray-700); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">TOTAL BOOKINGS</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, rgba(255, 235, 59, 0.2), rgba(255, 224, 130, 0.2)); cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease;" onclick="sortCustomerBookings('pending')" data-sort="pending">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⏳</div>
        <div class="stat-value" style="font-size: 2.5rem; color: #f57c00; font-weight: 700;">${pendingBookings}</div>
        <div class="stat-label" style="color: var(--gray-700); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">PENDING</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, rgba(129, 199, 132, 0.2), rgba(102, 187, 106, 0.2)); cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease;" onclick="sortCustomerBookings('confirmed')" data-sort="confirmed">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">✅</div>
        <div class="stat-value" style="font-size: 2.5rem; color: #388e3c; font-weight: 700;">${confirmedBookings}</div>
        <div class="stat-label" style="color: var(--gray-700); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">CONFIRMED</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, rgba(239, 83, 80, 0.15), rgba(229, 115, 115, 0.15)); cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease;" onclick="sortCustomerBookings('cancelled')" data-sort="cancelled">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">❌</div>
        <div class="stat-value" style="font-size: 2.5rem; color: #d32f2f; font-weight: 700;">${cancelledBookings}</div>
        <div class="stat-label" style="color: var(--gray-700); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">CANCELLED</div>
      </div>
    `;

    // Add hover effects
    statsContainer.querySelectorAll('.stat-card').forEach(card => {
      card.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-4px)';
        this.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
      });
      card.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'var(--shadow)';
      });
    });
  }
}

// Sort customer bookings based on stat card click
function sortCustomerBookings(sortType) {
  setCustomerBookingFilter(sortType);

  // Update active stat card
  document.querySelectorAll('.stat-card[data-sort]').forEach(card => {
    if (card.dataset.sort === sortType) {
      card.style.border = '2px solid #000';
    } else {
      card.style.border = 'none';
    }
  });

  // Scroll to Recent Bookings section instead of switching views
  const bookingsSection = document.querySelector('[id="bookingsContainer"]')?.closest('div');
  if (bookingsSection) {
    bookingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function getFilteredCustomerBookings(bookings = customerBookingsCache) {
  const filter = customerBookingState.filter;
  const searchTerm = (document.getElementById('myBookingsSearch')?.value || '').toLowerCase();

  const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'];

  // 1. First apply tab filter
  let result = [];
  switch (filter) {
    case 'pending':
      result = bookings.filter(b => b.status === 'pending');
      break;
    case 'confirmed':
      result = bookings.filter(b => b.status === 'confirmed');
      break;
    case 'completed':
      result = bookings.filter(b => b.status === 'completed');
      break;
    case 'cancelled':
      result = bookings.filter(b => cancelledStatuses.includes(b.status));
      break;
    case 'upcoming':
      result = bookings.filter(b => {
        if (cancelledStatuses.includes(b.status)) return false;
        if (b.status === 'completed') return false;
        const bookingDate = new Date(b.date + ' ' + b.time);
        return bookingDate >= new Date();
      });
      break;
    case 'all':
    default:
      result = bookings;
      break;
  }

  // 2. Then apply search filter (if any)
  if (searchTerm) {
    result = result.filter(b => {
      const petName = (b.petName || '').toLowerCase();
      const service = (b.packageId || b.serviceId || '').toLowerCase(); // simplified check
      const packageName = (b.packageName || '').toLowerCase();
      const date = (b.date || '').toLowerCase();

      return petName.includes(searchTerm) ||
        service.includes(searchTerm) ||
        packageName.includes(searchTerm) ||
        date.includes(searchTerm);
    });
  }

  return result;
}

// Change the function declaration to async so await is allowed inside
async function renderCustomerBookings() {
  const container = document.getElementById('bookingsContainer');
  const pagination = document.getElementById('customerBookingPagination');
  if (!container) return;

  if (!Array.isArray(customerBookingsCache) || !customerBookingsCache.length) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:3rem;"><h3>No Bookings Yet</h3></div>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const filtered = getFilteredCustomerBookings();
  const totalPages = Math.ceil(filtered.length / customerBookingState.pageSize) || 1;
  const safePage = Math.min(customerBookingState.page, totalPages);
  customerBookingState.page = safePage;
  const start = (safePage - 1) * customerBookingState.pageSize;
  const pageBookings = filtered.slice(start, start + customerBookingState.pageSize);

  // Build HTML asynchronously and ensure Promise.all is awaited
  const items = await Promise.all(pageBookings.map(async booking => {
    const statusClass = getCustomerStatusClass(booking.status);
    const statusLabel = formatBookingStatus ? formatBookingStatus(booking.status) : (booking.status || 'Unknown');
    const petEmoji = booking.petType === 'dog' ? '🐕' : '🐈';
    const appointmentDate = new Date((booking.date || '') + ' ' + (booking.time || ''));
    const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'];
    const isUpcoming = !cancelledStatuses.includes(booking.status) && appointmentDate >= new Date();
    const canEdit = isUpcoming && booking.status === 'pending';
    const canCancel = isUpcoming;
    const profile = booking.profile || {};
    let cost = booking.cost;
    if (!cost) {
      try {
        const maybe = computeBookingCost ? computeBookingCost(booking.packageId, booking.petWeight, booking.addOns, booking.singleServices) : null;
        cost = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
      } catch (e) { cost = booking.cost || null; }
    }
    const bookingCode = typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : (booking.shortId || booking.id);
    return `
      <div class="card booking-card" onclick="openBookingDetailModal('${booking.id}')">
        <div class="booking-main">
          <div class="booking-avatar">${petEmoji}</div>
          <div>
            <h3>${escapeHtml(booking.petName || '')}</h3>
            <p><strong>Receipt:</strong> ${escapeHtml(String(bookingCode))}</p>
            <p><strong>Package:</strong> ${escapeHtml(booking.packageName || 'Custom')}</p>
            <p><strong>Groomer:</strong> ${escapeHtml(booking.groomerName || 'TBD')}</p>
            <p><strong>Schedule:</strong> ${formatDate ? formatDate(booking.date) : booking.date} · ${formatTime ? formatTime(booking.time) : booking.time}</p>
          </div>
          <div class="booking-status"><span class="${statusClass}">${escapeHtml(statusLabel)}</span>
            ${canEdit ? `<button onclick="event.stopPropagation(); openBookingEditModal('${booking.id}')">Edit</button>` : ''}
            ${canCancel ? `<button onclick="event.stopPropagation(); openBookingCancelModal('${booking.id}')">Cancel</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }));

  container.innerHTML = items.join('');
  if (pagination) {
    pagination.innerHTML = `<div>Page ${customerBookingState.page} of ${totalPages}</div>`;
  }
}
window.renderCustomerBookings = renderCustomerBookings;

// Simple formatter for booking status used by renderCustomerBookings
function formatBookingStatus(status) {
  if (status === null || status === undefined) return 'Unknown';
  const s = String(status).trim();
  const map = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    inprogress: 'In Progress',
    'in progress': 'In Progress',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    cancelledbycustomer: 'Cancelled (Customer)',
    cancelledbyadmin: 'Cancelled (Admin)'
  };
  const key = s.toLowerCase().replace(/\s+/g, '');
  return map[key] || map[s.toLowerCase()] || s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}
window.formatBookingStatus = formatBookingStatus;

// Minimal community showcase renderer used on dashboard (safe no-op)
async function renderCommunityShowcase() {
  try {
    const container = document.getElementById('communityShowcase') || document.getElementById('customerShowcase');
    if (!container) return;
    if (typeof getCommunityPosts === 'function') {
      const posts = await getCommunityPosts().catch(() => []);
      if (Array.isArray(posts) && posts.length) {
        container.innerHTML = posts.slice(0, 6).map(p =>
          `<div class="showcase-item"><img src="${p.image || 'assets/default.jpg'}" alt="${(p.title || '')}" /><div class="caption">${p.title || ''}</div></div>`
        ).join('');
        return;
      }
    }
    container.innerHTML = '<div class="muted" style="padding:1rem">Community photos coming soon.</div>';
  } catch (e) {
    console.warn('renderCommunityShowcase failed:', e);
  }
}
window.renderCommunityShowcase = renderCommunityShowcase;

// Minimal helper: return badge class for a booking status
function getCustomerStatusClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending': return 'badge-warning';
    case 'confirmed': return 'badge-success';
    case 'inprogress':
    case 'in_progress':
    case 'in progress': return 'badge-info';
    case 'completed': return 'badge-primary';
    case 'cancelled':
    case 'cancelledbycustomer':
    case 'cancelledbyadmin': return 'badge-danger';
    default: return 'badge-secondary';
  }
}
window.getCustomerStatusClass = getCustomerStatusClass;

// Allow switching booking filter (called by UI)
function setCustomerBookingFilter(filter) {
  customerBookingState.filter = filter || 'all';
  customerBookingState.page = 1;
  // Prefer the async renderer if present
  try {
    const r = (typeof renderCustomerBookings === 'function') ? renderCustomerBookings() : (typeof loadUserBookings === 'function' ? loadUserBookings() : null);
    if (r && typeof r.then === 'function') r.catch(() => { });
  } catch (e) { console.warn('setCustomerBookingFilter failed', e); }
}
window.setCustomerBookingFilter = setCustomerBookingFilter;

// Minimal team calendar preview used on dashboard (safe no-op if calendar building absent)
async function renderTeamCalendarPreview() {
  try {
    let bookings = [];
    try { bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []); } catch (e) { bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : []; }
    let absences = [];
    try { absences = typeof getStaffAbsences === 'function' ? await getStaffAbsences() : (typeof getStaffAbsencesSync === 'function' ? getStaffAbsencesSync() : []); } catch (e) { absences = typeof getStaffAbsencesSync === 'function' ? getStaffAbsencesSync() : []; }
    if (!Array.isArray(bookings)) bookings = [];
    if (!Array.isArray(absences)) absences = [];
    if (typeof buildCalendarDataset === 'function' && typeof renderMegaCalendar === 'function') {
      // Pass empty array for displayBookings to show NO details (Privacy) for the overview widget
      const dataset = buildCalendarDataset(bookings, absences, []);
      renderMegaCalendar('customerTeamCalendar', dataset);
    }
  } catch (e) {
    console.warn('renderTeamCalendarPreview failed:', e);
  }
}
window.renderTeamCalendarPreview = renderTeamCalendarPreview;

// Minimal customer slots list renderer
async function renderCustomerSlotsList() {
  try {
    let bookings = [];
    try { bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []); } catch (e) { bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : []; }
    if (!Array.isArray(bookings)) bookings = [];
    if (typeof buildCalendarDataset === 'function') {
      const dataset = buildCalendarDataset(bookings, []);
      // lightweight rendering fallback: populate container if present
      const container = document.getElementById('customerSlotsList');
      if (container) {
        const entries = Object.entries(dataset || {}).slice(0, 4).map(([d, s]) => `<div><strong>${d}</strong> — ${s.remaining || 0} slots</div>`).join('');
        container.innerHTML = entries || '<p>No open slots.</p>';
      }
    }
  } catch (e) {
    console.warn('renderCustomerSlotsList failed:', e);
  }
}
window.renderCustomerSlotsList = renderCustomerSlotsList;

// Minimal calendar renderer used by dashboard view
// Minimal calendar renderer used by dashboard view
async function renderCustomerCalendar(userBookings = []) {
  try {
    // If userBookings IS passed but empty, it might be intentional or default.
    // However, if we want to ensure data is loaded, let's double check.
    // We'll refetch if the array is empty to be safe, filtering by current user.
    let displayBookings = userBookings;

    if (!displayBookings || displayBookings.length === 0) {
      // Attempt to fetch current user's bookings
      try {
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        if (user) {
          let all = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
          if (all.length === 0 && typeof getBookings === 'function') all = await getBookings();

          // Filter for THIS user
          displayBookings = all.filter(b => b.customerName === user.username || b.firstName === user.firstName);
        }
      } catch (err) {
        console.warn('Could not auto-fetch user bookings for calendar:', err);
      }
    }

    // Fetch ALL bookings to determine blackout/capacity status
    let allBookings = [];
    try {
      allBookings = typeof getBookings === 'function' ? await getBookings() : [];
    } catch {
      allBookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
    }

    // Fetch absences
    let absences = [];
    try {
      absences = typeof getStaffAbsences === 'function' ? await getStaffAbsences() : [];
    } catch {
      absences = typeof getStaffAbsencesSync === 'function' ? getStaffAbsencesSync() : [];
    }

    if (typeof buildCalendarDataset === 'function' && typeof renderMegaCalendar === 'function') {
      // Pass allBookings for capacity, displayBookings for user-specific display list
      const dataset = buildCalendarDataset(allBookings, absences, displayBookings);
      renderMegaCalendar('customerCalendar', dataset);
    }
  } catch (e) { console.warn('renderCustomerCalendar failed:', e); }
}
window.renderCustomerCalendar = renderCustomerCalendar;

// Fix renderCustomerBookings: await Promise.all(...) before .join()
async function renderCustomerBookings() {
  const container = document.getElementById('bookingsContainer');
  const pagination = document.getElementById('customerBookingPagination');
  if (!container) return;

  if (!Array.isArray(customerBookingsCache) || !customerBookingsCache.length) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:3rem;"><h3>No Bookings Yet</h3></div>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const filtered = getFilteredCustomerBookings();
  const totalPages = Math.ceil(filtered.length / customerBookingState.pageSize) || 1;
  const safePage = Math.min(customerBookingState.page, totalPages);
  customerBookingState.page = safePage;
  const start = (safePage - 1) * customerBookingState.pageSize;
  const pageBookings = filtered.slice(start, start + customerBookingState.pageSize);

  // Build HTML asynchronously and ensure Promise.all is awaited
  const items = await Promise.all(pageBookings.map(async booking => {
    const statusClass = getCustomerStatusClass(booking.status);
    const statusLabel = formatBookingStatus ? formatBookingStatus(booking.status) : (booking.status || 'Unknown');
    const petEmoji = booking.petType === 'dog' ? '🐕' : '🐈';
    const appointmentDate = new Date((booking.date || '') + ' ' + (booking.time || ''));
    const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'];
    const isUpcoming = !cancelledStatuses.includes(booking.status) && appointmentDate >= new Date();
    const canEdit = isUpcoming && booking.status === 'pending';
    const canCancel = isUpcoming;
    const profile = booking.profile || {};
    let cost = booking.cost;
    if (!cost) {
      try {
        const maybe = computeBookingCost ? computeBookingCost(booking.packageId, booking.petWeight, booking.addOns, booking.singleServices) : null;
        cost = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
      } catch (e) { cost = booking.cost || null; }
    }
    const bookingCode = typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : (booking.shortId || booking.id);
    return `
      <div class="card booking-card" onclick="openBookingDetailModal('${booking.id}')">
        <div class="booking-main">
          <div class="booking-avatar">${petEmoji}</div>
          <div>
            <h3>${escapeHtml(booking.petName || '')}</h3>
            <p><strong>Receipt:</strong> ${escapeHtml(String(bookingCode))}</p>
            <p><strong>Package:</strong> ${escapeHtml(booking.packageName || 'Custom')}</p>
            <p><strong>Groomer:</strong> ${escapeHtml(booking.groomerName || 'TBD')}</p>
            <p><strong>Schedule:</strong> ${formatDate ? formatDate(booking.date) : booking.date} · ${formatTime ? formatTime(booking.time) : booking.time}</p>
          </div>
          <div class="booking-status"><span class="${statusClass}">${escapeHtml(statusLabel)}</span>
            ${canEdit ? `<button onclick="event.stopPropagation(); openBookingEditModal('${booking.id}')">Edit</button>` : ''}
            ${canCancel ? `<button onclick="event.stopPropagation(); openBookingCancelModal('${booking.id}')">Cancel</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }));

  container.innerHTML = items.join('');
  if (pagination) {
    pagination.innerHTML = `<div>Page ${customerBookingState.page} of ${totalPages}</div>`;
  }
}
window.renderCustomerBookings = renderCustomerBookings;

// Make openBookingDetailModal async and use awaited bookings
// Make openBookingDetailModal async and use awaited bookings
async function openBookingDetailModal(bookingId) {
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('openBookingDetailModal: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const profile = booking.profile || {};
  const statusClass = getCustomerStatusClass(booking.status);
  const statusLabel = formatBookingStatus(booking.status);

  // Cost Calculation / Display Logic
  let cost = booking.cost;

  // Use stored totalPrice if available (for real-time updates)
  const totalAmount = booking.totalPrice !== undefined ? booking.totalPrice : (cost ? (cost.totalAmount || cost.subtotal) : 0);

  // Add-ons Display
  let addOnDisplay = 'None';
  if (booking.addOns && booking.addOns.length > 0) {
    // Check if it's an array of strings or objects
    if (typeof booking.addOns[0] === 'string') {
      addOnDisplay = escapeHtml(booking.addOns.join(', '));
    } else {
      // Array of objects { name, price, ... }
      addOnDisplay = booking.addOns.map(a =>
        `${escapeHtml(a.name)} (${formatCurrency(a.price)})`
      ).join(', ');
    }
  } else if (cost && cost.addOns && cost.addOns.length > 0) {
    addOnDisplay = cost.addOns.map(addon => `${escapeHtml(addon.label)} (${formatCurrency(addon.price)})`).join(', ');
  }

  const weightLabel = booking.petWeight || profile.weight || '';
  const bookingCode = typeof getBookingDisplayCode === 'function'
    ? getBookingDisplayCode(booking)
    : (booking.shortId || booking.id);

  // Prepare Subtotal / Total display
  // If we have dynamic pricing (In-Progress), showing just 'Total Amount' is clearer than confused Subtotal/Fee logic
  // unless we want to maintain the 'Booking Fee' deducted visual.
  // For In-Progress/Completed with ad-hoc addons, the 'cost' object might be stale if we didn't update it fully.
  // Let's prioritize showing the Total Amount prominently.

  const bookingFee = cost ? (cost.bookingFee || cost.totalDueToday || 100) : 100;
  const balanceToPay = totalAmount - bookingFee;

  showModal(`
    <h3>Booking Details</h3>
    <div class="summary-item">
      <span class="summary-label">Pet Name:</span>
      <span class="summary-value">${escapeHtml(booking.petName)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Owner:</span>
      <span class="summary-value">${escapeHtml(profile.ownerName || booking.customerName)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Receipt:</span>
      <span class="summary-value">${escapeHtml(bookingCode)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Pet Type:</span>
      <span class="summary-value">${escapeHtml(booking.petType.charAt(0).toUpperCase() + booking.petType.slice(1))}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Package:</span>
      <span class="summary-value">${escapeHtml(booking.packageName)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Weight:</span>
      <span class="summary-value">${weightLabel ? escapeHtml(weightLabel) : 'Not specified'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Groomer:</span>
      <span class="summary-value">${escapeHtml(booking.groomerName || 'Assigned on site')}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Date:</span>
      <span class="summary-value">${formatDate(booking.date)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Time:</span>
      <span class="summary-value">${formatTime(booking.time)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Phone:</span>
      <span class="summary-value">${escapeHtml(booking.phone)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Status:</span>
      <span class="summary-value"><span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span></span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Add-ons:</span>
      <span class="summary-value">${addOnDisplay}</span>
    </div>
    ${booking.bookingNotes && booking.bookingNotes.trim() ? `
      <div class="summary-item">
        <span class="summary-label">Preferred Cut/Notes:</span>
        <span class="summary-value" style="background: #e8f5e9; padding: 0.5rem; border-radius: 0.25rem; color: #2e7d32; font-weight: 500;">✂️ ${escapeHtml(booking.bookingNotes)}</span>
      </div>
    ` : ''}
    ${booking.groomingNotes ? `
      <div class="summary-item">
        <span class="summary-label">Service Notes:</span>
        <span class="summary-value" style="background: #f0f9f0; padding: 0.5rem; border-radius: 0.25rem; color: #2e7d32; font-weight: 500;">✂️ ${escapeHtml(booking.groomingNotes)}</span>
      </div>
    ` : ''}
    
    <div class="summary-item" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--gray-200); font-weight: 600;">
      <span class="summary-label">Total Amount:</span>
      <span class="summary-value">${formatCurrency(totalAmount)}</span>
    </div>
    <div class="summary-item" style="font-size: 0.85rem; color: var(--gray-600);">
      <span class="summary-label">Booking Fee (Paid):</span>
      <span class="summary-value">-₱${bookingFee}</span>
    </div>
    <div class="summary-item" style="margin-top: 0.5rem; padding-top: 0.5rem; font-weight: 600; color: var(--success-600);">
      <span class="summary-label">Balance to Pay:</span>
      <span class="summary-value">${formatCurrency(balanceToPay)}</span>
    </div>
    
    <div class="modal-actions">
      ${booking.status === 'pending' ? `
        <button class="btn btn-outline" onclick="closeModal(); openBookingEditModal('${booking.id}')">Edit</button>
        <button class="btn btn-danger" onclick="closeModal(); startCancelBooking('${booking.id}')">Cancel</button>
      ` : ''}
      <button class="btn btn-primary" onclick="closeModal()">Close</button>
    </div>
  `);
}

// Ensure openBookingEditModal exists globally so inline onclick handlers don't throw.
// If you have a full edit-modal implementation elsewhere, set window._openBookingEditModal to it.
async function openBookingEditModal(bookingId) {
  // prefer an in-app impl if available
  if (typeof window._openBookingEditModal === 'function') {
    try { return await window._openBookingEditModal(bookingId); } catch (e) { console.warn('fallback openBookingEditModal failed', e); }
  }

  // find booking from local store / API
  try {
    let bookings = [];
    if (typeof getBookings === 'function') {
      bookings = await getBookings();
    }
    const booking = (bookings || []).find(b => b.id === bookingId || b.shortId === bookingId);
    if (!booking) {
      // fallback: redirect with edit marker if booking not found locally
      const urlFallback = new URL(window.location.origin + '/booking.html');
      urlFallback.searchParams.set('edit', bookingId);
      return (typeof redirect === 'function') ? redirect(urlFallback.toString()) : window.location.href = urlFallback.toString();
    }

    // Map existing booking to bookingData format expected by booking page
    const formData = {
      petType: booking.petType || booking.packageType || '',
      packageId: booking.packageId || '',
      groomerId: booking.groomerId || null,
      groomerName: booking.groomerName || '',
      date: booking.date || '',
      time: booking.time || '',
      ownerName: booking.customerName || booking.profile?.ownerName || '',
      contactNumber: booking.phone || booking.profile?.contactNumber || '',
      ownerAddress: booking.profile?.address || '',
      petName: booking.petName || booking.profile?.petName || '',
      petBreed: booking.profile?.breed || '',
      petAge: booking.petAge || booking.profile?.age || '',
      petWeight: booking.petWeight || booking.profile?.weight || '',
      medicalNotes: booking.profile?.medical || booking.medicalNotes || '',
      vaccinationNotes: booking.profile?.vaccinations || booking.vaccinationNotes || '',
      addOns: booking.addOns || [],
      bookingNotes: booking.bookingNotes || '',
      saveProfile: true,
      singleServices: booking.singleServices || []
    };

    // mark editing id so booking page can update existing booking instead of creating new
    sessionStorage.setItem('editingBookingId', booking.id);
    sessionStorage.setItem('bookingData', JSON.stringify(formData));
    // go to review/summary step so user can edit fields or navigate steps
    sessionStorage.setItem('bookingStep', '4');

    // navigate to booking page
    if (typeof redirect === 'function') redirect('booking.html');
    else window.location.href = 'booking.html';
  } catch (e) {
    console.warn('openBookingEditModal fallback failed', e);
    // final fallback redirect with query param
    const url = new URL(window.location.origin + '/booking.html');
    url.searchParams.set('edit', bookingId);
    if (typeof redirect === 'function') redirect(url.toString());
    else window.location.href = url.toString();
  }
}

async function openBookingCancelModal(bookingId) {
  // prefer in-app impl
  if (typeof window._openBookingCancelModal === 'function') {
    try { return await window._openBookingCancelModal(bookingId); } catch (e) { console.warn('fallback openBookingCancelModal failed', e); }
  }

  try {
    // store cancel intent so booking page can show cancel UI immediately
    sessionStorage.setItem('bookingCancelId', bookingId);
    sessionStorage.setItem('bookingStep', '4'); // point to review where cancel action is visible
    if (typeof redirect === 'function') redirect('booking.html');
    else window.location.href = 'booking.html';
  } catch (e) {
    console.warn('openBookingCancelModal fallback failed', e);
    const url = new URL(window.location.origin + '/booking.html');
    url.searchParams.set('cancel', bookingId);
    if (typeof redirect === 'function') redirect(url.toString());
    else window.location.href = url.toString();
  }
}

// Expose globally for inline handlers
window.openBookingCancelModal = openBookingCancelModal;

window.openBookingDetailModal = openBookingDetailModal;
window.sortCustomerBookings = sortCustomerBookings;
window.changeCustomerBookingPage = changeCustomerBookingPage;
window.setRating = setRating;
window.saveReview = saveReview;

let customerHistoryState = {
  page: 1,
  pageSize: 5
};

async function renderCustomerBookingHistory() {
  const container = document.getElementById('customerHistoryTable');
  if (!container) return;

  const user = await getCurrentUser();
  if (!user) return;

  // Fetch bookings (async Firebase or sync fallback)
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('renderCustomerBookingHistory: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  const history = getBookingHistory().filter(h => {
    const booking = bookings.find(b => b.id === h.bookingId);
    return booking && booking.userId === user.id;
  }).sort((a, b) => b.timestamp - a.timestamp);
  const userBookings = bookings.filter(b => b.userId === user.id);

  if (!history.length) {
    if (!userBookings.length) {
      container.innerHTML = '<p class="empty-state">No booking history yet.</p>';
    } else {
      container.innerHTML = renderCustomerHistoryFallback(userBookings);
    }
    const controls = document.getElementById('customerHistoryControls');
    if (controls) controls.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(history.length / customerHistoryState.pageSize);
  const start = (customerHistoryState.page - 1) * customerHistoryState.pageSize;
  const end = start + customerHistoryState.pageSize;
  const currentHistory = history.slice(start, end);

  const controls = document.getElementById('customerHistoryControls');
  if (controls) {
    controls.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <label for="customerHistoryPageSize" style="font-size: 0.9rem; color: var(--gray-600);">Show:</label>
          <select id="customerHistoryPageSize" class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeCustomerHistoryPageSize(this.value)">
            <option value="3" ${customerHistoryState.pageSize === 3 ? 'selected' : ''}>3</option>
            <option value="5" ${customerHistoryState.pageSize === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${customerHistoryState.pageSize === 10 ? 'selected' : ''}>10</option>
            <option value="20" ${customerHistoryState.pageSize === 20 ? 'selected' : ''}>20</option>
          </select>
          <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 0.9rem; color: var(--gray-600);">
            Showing ${start + 1} to ${Math.min(end, history.length)} of ${history.length}
          </span>
          ${totalPages > 1 ? `
            <button class="btn btn-outline btn-sm" onclick="changeCustomerHistoryPage(${customerHistoryState.page - 1})" ${customerHistoryState.page === 1 ? 'disabled' : ''}>Previous</button>
            <span style="font-size: 0.9rem; color: var(--gray-600);">Page ${customerHistoryState.page} of ${totalPages}</span>
            <button class="btn btn-outline btn-sm" onclick="changeCustomerHistoryPage(${customerHistoryState.page + 1})" ${customerHistoryState.page === totalPages ? 'disabled' : ''}>Next</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Booking ID</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${currentHistory.map(entry => `
            ${(() => {
      const booking = bookings.find(b => b.id === entry.bookingId);
      const displayId = booking ? (typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id) : entry.bookingId;
      const actionLabel = formatCustomerHistoryAction(entry.action);
      return `
            <tr>
              <td>
  ${new Date(entry.timestamp).toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,  // 12-hour format (AM/PM)
      })}
  ${new Date(entry.timestamp).toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })}
</td>
              <td>${escapeHtml(displayId)}</td>
              <td>${escapeHtml(actionLabel)}</td>
              <td>${escapeHtml(entry.message || entry.note || '')}</td>
            </tr>
              `;
    })()}
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function changeCustomerHistoryPageSize(newSize) {
  customerHistoryState.pageSize = parseInt(newSize);
  customerHistoryState.page = 1;
  renderCustomerBookingHistory();
}

async function changeCustomerHistoryPage(newPage) {
  const user = await getCurrentUser();
  if (!user) return;

  // Fetch bookings once (async or sync fallback) before filtering history
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('changeCustomerHistoryPage: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  const history = getBookingHistory().filter(h => {
    const booking = bookings.find(b => b.id === h.bookingId);
    return booking && booking.userId === user.id;
  });
  const totalPages = Math.ceil(history.length / customerHistoryState.pageSize);
  if (newPage >= 1 && newPage <= totalPages) {
    customerHistoryState.page = newPage;
    await renderCustomerBookingHistory();
  }
}

window.changeCustomerHistoryPageSize = changeCustomerHistoryPageSize;
window.changeCustomerHistoryPage = changeCustomerHistoryPage;

function formatCustomerHistoryAction(action = '') {
  const normalized = action.toLowerCase();
  if (normalized.includes('cancel')) {
    return 'Cancelled';
  }
  if (normalized.includes('resched') || normalized.includes('edit')) {
    return 'Rescheduled';
  }
  if (normalized.includes('created')) {
    return 'Booked';
  }
  if (normalized.includes('updated')) {
    return 'Updated';
  }
  if (normalized.includes('confirmed')) {
    return 'Confirmed';
  }
  if (normalized.includes('completed')) {
    return 'Completed';
  }
  if (normalized.includes('no-show')) {
    return 'No Show';
  }
  return 'Pending';
}

function renderCustomerHistoryFallback(bookings = []) {
  if (!bookings.length) return '<p class="empty-state">No booking history yet.</p>';
  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Booking ID</th>
            <th>Pet</th>
            <th>Package</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(booking => {
    const code = typeof getBookingDisplayCode === 'function'
      ? getBookingDisplayCode(booking)
      : booking.id;

    // Calculate price from booking cost
    let price = '—';
    if (booking.cost && booking.cost.totalAmount) {
      price = typeof formatCurrency === 'function'
        ? formatCurrency(booking.cost.totalAmount)
        : `₱${booking.cost.totalAmount}`;
    } else if (booking.totalAmount) {
      price = typeof formatCurrency === 'function'
        ? formatCurrency(booking.totalAmount)
        : `₱${booking.totalAmount}`;
    }

    return `
              <tr>
                <td>${formatDate(booking.date)} · ${formatTime(booking.time)}</td>
                <td>${escapeHtml(code)}</td>
                <td>${escapeHtml(booking.petName || '—')}</td>
                <td>${escapeHtml(booking.packageName || '—')}</td>
                <td style="font-weight: 600; color: var(--gray-900);">${price}</td>
                <td>${escapeHtml(formatBookingStatus(booking.status))}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Ensure changeCustomerBookingPage exists before it's exported/used
function changeCustomerBookingPage(newPage) {
  if (!window.customerBookingState) {
    window.customerBookingState = { filter: 'all', page: 1, pageSize: 4 };
  }
  customerBookingState.page = Number(newPage) || 1;

  // Call the renderer; support async or sync implementations
  try {
    const result = (typeof renderCustomerBookings === 'function') ? renderCustomerBookings() : (typeof loadUserBookings === 'function' ? loadUserBookings() : null);
    if (result && typeof result.then === 'function') result.catch(() => { });
  } catch (e) {
    console.warn('changeCustomerBookingPage fallback render failed', e);
  }
}

// (Keep or move the global exposure so it runs after functions are defined)
window.changeCustomerBookingPage = changeCustomerBookingPage;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('customerDashboard')) {
    loadCustomerDashboard();
  }
});

// Ensure setRating exists for inline handlers (updates booking + redirects to review page)
async function setRating(bookingId, rating, redirectToReview = true) {
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('setRating: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  booking.rating = Number(rating) || 0;

  try {
    if (typeof saveBookings === 'function') await saveBookings(bookings);
    else localStorage.setItem('bookings', JSON.stringify(bookings));
  } catch (e) {
    console.warn('setRating: save failed', e);
  }

  // Optionally navigate to review page so user can write a review
  if (redirectToReview) {
    window.location.href = `review.html?booking=${encodeURIComponent(bookingId)}`;
  }
}

// Expose globally for inline onclick attributes
window.setRating = setRating;

// Save review function
async function saveReview(bookingId) {
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function'
      ? await getBookings()
      : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('saveReview: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const reviewText = document.getElementById(`review-${bookingId}`)?.value?.trim() || '';
  const staffReviewText = document.getElementById(`staff-review-${bookingId}`)?.value?.trim() || '';

  booking.review = reviewText;
  booking.staffReview = staffReviewText;

  try {
    if (typeof saveBookings === 'function') {
      await saveBookings(bookings);
    } else {
      localStorage.setItem('bookings', JSON.stringify(bookings));
    }
  } catch (err) {
    console.error('saveReview: save failed', err);
  }

  // refresh UI if renderer exists
  try { if (typeof renderCustomerBookings === 'function') await renderCustomerBookings(); } catch (e) { /* ignore */ }

  customAlert.success('Review saved.');
}

// Expose globally for inline onclick attributes
window.saveReview = saveReview;

// Safe renderWarningPanel: minimal UI so dashboard won't crash if original impl is missing
async function renderWarningPanel(user) {
  const container = document.getElementById('customerWarningPanel') || document.getElementById('customerHeader');
  if (!container) return;
  try {
    if (user?.isBanned) {
      container.insertAdjacentHTML('afterbegin',
        `<div class="alert alert-danger" style="margin-bottom:0.75rem;">Account flagged: your access is restricted. Contact support.</div>`);
      return;
    }
    const warnings = user?.warnings || user?.warningCount || 0;
    if (warnings && warnings > 0) {
      container.insertAdjacentHTML('afterbegin',
        `<div class="alert alert-warning" style="margin-bottom:0.75rem;">You have ${warnings} warning(s). Please check your messages.</div>`);
      return;
    }
    // no warnings — remove any previous panel (non-destructive)
    const existing = container.querySelector('.alert');
    if (existing) existing.remove();
  } catch (e) {
    console.warn('renderWarningPanel failed:', e);
  }
}
window.renderWarningPanel = renderWarningPanel;

// --- Added safe stubs to avoid runtime ReferenceErrors ---
// Minimal modal helper used by openBookingDetailModal (safe fallback)
function showModal(html) {
  // If a modal system exists elsewhere prefer it
  if (typeof window._showModal === 'function') {
    try { return window._showModal(html); } catch (e) { /* fallthrough to simple fallback */ }
  }
  // Simple fallback: create a basic modal element
  try {
    let existing = document.getElementById('simpleFallbackModal');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'simpleFallbackModal';
      existing.style.position = 'fixed';
      existing.style.left = '0';
      existing.style.top = '0';
      existing.style.width = '100%';
      existing.style.height = '100%';
      existing.style.background = 'rgba(0,0,0,0.5)';
      existing.style.display = 'flex';
      existing.style.alignItems = 'center';
      existing.style.justifyContent = 'center';
      existing.innerHTML = `<div id="simpleFallbackModalInner" style="background:#fff; max-width:860px; width:90%; max-height:90%; overflow:auto; padding:1rem; border-radius:8px;"></div>`;
      document.body.appendChild(existing);
      existing.addEventListener('click', (ev) => {
        if (ev.target === existing) existing.style.display = 'none';
      });
    }
    const inner = document.getElementById('simpleFallbackModalInner');
    // removed extra appended Close button to avoid duplicate small close UI
    inner.innerHTML = html;
    existing.style.display = 'flex';
  } catch (e) {
    // Last-resort fallback
    console.warn('showModal fallback failed, using alert', e);
    customAlert.show(stripHtml(html).slice(0, 200) + '...', 'info');
  }
}
window.showModal = showModal;

// Minimal password form setup stub (no-op if real impl is elsewhere)
function setupCustomerPasswordForm() {
  // prefer existing implementation if present
  if (typeof window._setupCustomerPasswordForm === 'function') {
    try { return window._setupCustomerPasswordForm(); } catch (e) { console.warn('fallback setupCustomerPasswordForm failed', e); }
  }
  // no-op: ensure any callers won't throw
  const el = document.getElementById('customerPasswordForm');
  if (el && !el.dataset.initialized) {
    el.dataset.initialized = 'true';
    // simple validation hookup if a form exists
    el.addEventListener('submit', function (ev) {
      ev.preventDefault();
      customAlert.info('Password change not configured on this build.');
    });
  }
}
window.setupCustomerPasswordForm = setupCustomerPasswordForm;

// helper used by alert fallback to remove tags
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Ensure getUserBookings and loadUserBookings exist for dashboard usage
async function getUserBookings() {
  const user = await (typeof getCurrentUser === 'function' ? getCurrentUser() : Promise.resolve(null));
  if (!user) return [];

  let allBookings;
  try {
    allBookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('getUserBookings: getBookings failed, using sync fallback', e);
    allBookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(allBookings)) allBookings = [];

  return allBookings
    .filter(b => b.userId === user.id)
    .sort((a, b) => {
      const da = new Date((a.date || '') + ' ' + (a.time || ''));
      const db = new Date((b.date || '') + ' ' + (b.time || ''));
      return db - da;
    });
}

async function loadUserBookings() {
  try {
    const bookings = await getUserBookings();
    customerBookingsCache = Array.isArray(bookings) ? bookings : [];
    if (typeof renderCustomerBookings === 'function') {
      await renderCustomerBookings();
    } else {
      // best-effort: if renderer missing, log and keep cache populated
      console.warn('renderCustomerBookings not found; customerBookingsCache updated.');
    }
    // Refresh calendar/preview if those exist
    if (typeof renderTeamCalendarPreview === 'function') await renderTeamCalendarPreview();
    if (typeof renderCustomerSlotsList === 'function') await renderCustomerSlotsList();
    return customerBookingsCache;
  } catch (e) {
    console.error('loadUserBookings failed:', e);
    return [];
  }
}

// Expose to global scope for inline handlers / nav
window.getUserBookings = getUserBookings;
window.loadUserBookings = loadUserBookings;

// Ensure required helpers exist early (fallbacks) so loadCustomerDashboard can call them safely
if (typeof window.renderCommunityShowcase !== 'function') {
  async function renderCommunityShowcase() {
    const container = document.getElementById('communityShowcase') || document.getElementById('customerShowcase');
    if (!container) return;
    container.innerHTML = '<div class="muted" style="padding:1rem">Community photos coming soon.</div>';
  }
  window.renderCommunityShowcase = renderCommunityShowcase;
}

if (typeof window.formatBookingStatus !== 'function') {
  function formatBookingStatus(status) {
    if (status === null || status === undefined) return 'Unknown';
    const s = String(status).trim();
    const map = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      inprogress: 'In Progress',
      'in progress': 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      cancelledbycustomer: 'Cancelled (Customer)',
      cancelledbyadmin: 'Cancelled (Admin)'
    };
    const key = s.toLowerCase().replace(/\s+/g, '');
    return map[key] || s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
  }
  window.formatBookingStatus = formatBookingStatus;
}

// Provide a safe global closeModal so HTML buttons won't throw
function closeModal() {
  // prefer an existing app-provided hook
  if (typeof window._closeModal === 'function') {
    try { window._closeModal(); return; } catch (e) { /* fallback below */ }
  }

  // Hide the simple fallback modal if present
  const simple = document.getElementById('simpleFallbackModal');
  if (simple) {
    simple.style.display = 'none';
    return;
  }

  // Generic fallback: hide common modal containers / role=dialog elements
  try {
    const candidates = Array.from(document.querySelectorAll('.modal, .modal-backdrop, [role="dialog"]'));
    candidates.forEach(el => {
      try { el.style.display = 'none'; } catch (e) { /* ignore */ }
    });
  } catch (e) { /* ignore */ }
}
window.closeModal = closeModal;

// Provide a safe startCancelBooking that cancels immediately (prefers app impl if present)
async function startCancelBooking(bookingId) {
  if (!bookingId) return;
  if (typeof window._startCancelBooking === 'function') {
    try { return await window._startCancelBooking(bookingId); } catch (e) { console.warn('fallback _startCancelBooking failed', e); }
  }

  customAlert.confirm('Confirm', 'Are you sure you want to cancel this booking? This action cannot be undone.').then(async (confirmed) => {
    if (!confirmed) return;

    try {
      let booking = null;
      if (typeof getBookingById === 'function') booking = await getBookingById(bookingId);
      else {
        const all = (typeof getBookings === 'function') ? await getBookings() : JSON.parse(localStorage.getItem('bookings') || '[]');
        booking = all.find(b => b.id === bookingId || b.shortId === bookingId) || null;
      }
      if (!booking) { customAlert.error('Booking not found.'); return; }
      booking.status = 'cancelledByCustomer';
      booking.cancellationNote = booking.cancellationNote || 'Cancelled by customer';
      booking.cancelledAt = Date.now();

      if (typeof updateBooking === 'function') {
        await updateBooking(booking);
      } else if (typeof saveBookings === 'function' && typeof getBookings === 'function') {
        const all = await getBookings();
        const idx = all.findIndex(b => b.id === booking.id);
        if (idx >= 0) all[idx] = booking; else all.push(booking);
        await saveBookings(all);
      } else {
        const all = JSON.parse(localStorage.getItem('bookings') || '[]');
        const idx = all.findIndex(b => b.id === booking.id);
        if (idx >= 0) all[idx] = booking; else all.push(booking);
        localStorage.setItem('bookings', JSON.stringify(all));
      }

      if (typeof logBookingHistory === 'function') {
        try {
          logBookingHistory({
            bookingId: booking.id,
            action: 'Cancelled',
            message: `Customer cancelled booking ${booking.shortId || booking.id}`,
            actor: 'Customer'
          });
        } catch (e) { /* ignore */ }
      }

      // try to increment slot if booking date/time available
      try { if (typeof window.adjustSlotCount === 'function') await adjustSlotCount(booking.date, booking.time, +1); } catch (e) { /* ignore */ }

      customAlert.success('Your booking has been cancelled.');
      if (typeof refreshCustomerBookings === 'function') refreshCustomerBookings(); else window.location.reload();
    } catch (err) {
      console.error('Cancel booking failed', err);
      customAlert.error('Unable to cancel booking. Please try again or contact support.');
    }
  });
}
window.startCancelBooking = startCancelBooking;
