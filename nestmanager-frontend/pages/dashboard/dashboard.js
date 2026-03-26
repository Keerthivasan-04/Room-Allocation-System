/**
 * dashboard.js — NestManager Dashboard Page
 *
 * Responsibilities (UI only):
 *  - Auth guard: redirect to login if no token
 *  - Render user info in sidebar and topbar from session/localStorage
 *  - Fetch dashboard summary from Spring Boot  GET /api/dashboard/summary
 *  - Fetch recent activity               from  GET /api/dashboard/activity
 *  - Fetch payment alerts                from  GET /api/payments/alerts
 *  - Render stat cards, charts (Chart.js), activity feed, payment alerts
 *  - Sidebar toggle on mobile
 *  - Refresh button with loading state
 *  - Period tab switching on revenue chart (3M / 6M)
 */

'use strict';

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const API_BASE = 'https://room-allocation-system.up.railway.app';
const ENDPOINTS = {
    summary: `${API_BASE}/api/dashboard/summary`,
    activity: `${API_BASE}/api/dashboard/activity`,
    alerts: `${API_BASE}/api/payments/alerts`,
    revenue6: `${API_BASE}/api/dashboard/revenue?months=6`,
    revenue3: `${API_BASE}/api/dashboard/revenue?months=3`,
};

const LOGIN_PAGE = '../login/login.html';

/* ------------------------------------------------------------------ */
/*  Auth Guard                                                          */
/* ------------------------------------------------------------------ */

/**
 * Reads JWT from sessionStorage or localStorage.
 * Redirects to login if not found.
 * @returns {string} token
 */

function getToken() {
    return sessionStorage.getItem('nestmanager_token')
        || localStorage.getItem('nestmanager_token')
        || null;
}

function guardAuth() {
    if (!getToken()) {
        window.location.href = LOGIN_PAGE;
    }
}

/**
 * Returns the Authorization header object for fetch calls.
 * @returns {Object}
 */
function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
    };
}

/* ------------------------------------------------------------------ */
/*  DOM References                                                      */
/* ------------------------------------------------------------------ */

const userAvatarEl = document.getElementById('user-avatar');
const userNameEl = document.getElementById('user-name');
const userRoleEl = document.getElementById('user-role');
const topbarGreetEl = document.getElementById('topbar-greeting');
const topbarUsernameEl = document.getElementById('topbar-username');
const topbarDateEl = document.getElementById('topbar-date');
const lastUpdatedEl = document.getElementById('last-updated');
const logoutBtn = document.getElementById('logout-btn');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const refreshBtn = document.getElementById('refresh-btn');
const topbarNotifDot = document.getElementById('topbar-notif-dot');

// Stat card value elements
const statEls = {
    totalRooms: document.getElementById('stat-total-rooms'),
    vacant: document.getElementById('stat-vacant'),
    occupied: document.getElementById('stat-occupied'),
    tenants: document.getElementById('stat-tenants'),
    revenue: document.getElementById('stat-revenue'),
    pending: document.getElementById('stat-pending'),
    occPill: document.getElementById('occ-pill'),
    donutPct: document.getElementById('donut-pct'),
    legOcc: document.getElementById('leg-occ'),
    legVac: document.getElementById('leg-vac'),
    legMaint: document.getElementById('leg-maint'),
};

// Trend badge elements
const trendEls = {
    rooms: document.getElementById('trend-rooms'),
    vacant: document.getElementById('trend-vacant'),
    occupied: document.getElementById('trend-occupied'),
    tenants: document.getElementById('trend-tenants'),
    revenue: document.getElementById('trend-revenue'),
    pending: document.getElementById('trend-pending'),
};

// Progress bar fill elements
const barEls = {
    rooms: document.getElementById('bar-rooms'),
    vacant: document.getElementById('bar-vacant'),
    tenants: document.getElementById('bar-tenants'),
    revenue: document.getElementById('bar-revenue'),
    pending: document.getElementById('bar-pending'),
};

// Nav badges
const navBookingsBadge = document.getElementById('nav-bookings-badge');
const navPaymentsBadge = document.getElementById('nav-payments-badge');
const navNotifBadge = document.getElementById('nav-notif-badge');

/* ------------------------------------------------------------------ */
/*  Greeting & Date                                                     */
/* ------------------------------------------------------------------ */

function setGreeting() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning'
        : hour < 17 ? 'Good afternoon'
            : 'Good evening';
    topbarGreetEl.textContent = greeting;
}

function setDate() {
    const now = new Date();
    const opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    topbarDateEl.textContent = now.toLocaleDateString('en-IN', opts);
}

/* ------------------------------------------------------------------ */
/*  Populate User Info from Storage                                     */
/* ------------------------------------------------------------------ */

function populateUserInfo() {
    const name = sessionStorage.getItem('nestmanager_username')
               || localStorage.getItem('nestmanager_username')
               || 'Admin';
    const role = sessionStorage.getItem('nestmanager_role')
               || localStorage.getItem('nestmanager_role')
               || 'ADMIN';
    
    const avatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    
    if (avatar) avatar.textContent = initials(name);
    if (userName) userName.textContent = name;
    if (userRole) userRole.textContent = formatRole(role);
}

function formatRole(role) {
    const map = { ADMIN: 'Owner / Admin', MANAGER: 'Manager', STAFF: 'Staff' };
    return map[role] || role;
}

function initials(name) {
    return (name || '?').trim().split(' ')
        .map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ------------------------------------------------------------------ */
/*  Format Helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Formats a number into Indian currency string.  e.g. 240000 → "₹2.4L"
 * @param {number} val
 * @returns {string}
 */
function formatCurrency(val) {
    if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
    return '₹' + val;
}

/**
 * Renders a trend badge text from a percent string like "+8%".
 * @param {string|number} val
 * @param {string} elId  trend element key
 * @param {boolean} invertColor  if true, positive = bad (e.g. pending payments)
 */
function setTrend(key, val, invertColor = false) {
    const el = trendEls[key];
    if (!el) return;
    const str = String(val);
    el.textContent = str;
    const positive = str.startsWith('+') || (!str.startsWith('-') && parseFloat(str) >= 0);

    el.classList.remove('stat-trend--up', 'stat-trend--down', 'stat-trend--neutral');
    if (invertColor) {
        el.classList.add(positive ? 'stat-trend--down' : 'stat-trend--up');
    } else {
        el.classList.add(positive ? 'stat-trend--up' : 'stat-trend--down');
    }
}

/**
 * Animates a progress bar fill to a given percent (0–100).
 * Small timeout to allow CSS transition to run after paint.
 */
function setBar(key, pct) {
    const el = barEls[key];
    if (!el) return;
    requestAnimationFrame(() => {
        el.style.width = Math.min(100, Math.max(0, pct)) + '%';
    });
}

/* ------------------------------------------------------------------ */
/*  Render Stat Cards                                                   */
/* ------------------------------------------------------------------ */

/**
 * Populates all stat card values from the summary API response.
 *
 * Expected shape from GET /api/dashboard/summary:
 * {
 *   totalRooms     : number,
 *   vacantRooms    : number,
 *   occupiedRooms  : number,
 *   maintenanceRooms: number,
 *   totalTenants   : number,
 *   monthlyRevenue : number,
 *   pendingPayments: number,
 *   pendingBookings: number,
 *   overduePayments: number,
 *   unreadNotifs   : number,
 *   trends: {
 *     rooms    : string,   e.g. "+2"
 *     vacant   : string,
 *     occupied : string,
 *     tenants  : string,
 *     revenue  : string,   e.g. "+8%"
 *     pending  : string,
 *   }
 * }
 *
 * @param {Object} data
 */
function renderStats(data) {
    const occPct = data.totalRooms
        ? Math.round((data.occupiedRooms / data.totalRooms) * 100)
        : 0;

    statEls.totalRooms.textContent = data.totalRooms ?? '--';
    statEls.vacant.textContent = data.vacantRooms ?? '--';
    statEls.occupied.textContent = data.occupiedRooms ?? '--';
    statEls.tenants.textContent = data.totalTenants ?? '--';
    statEls.revenue.textContent = formatCurrency(data.monthlyRevenue ?? 0);
    statEls.pending.textContent = formatCurrency(data.pendingPayments ?? 0);
    statEls.occPill.textContent = `${occPct}% occupied`;
    statEls.donutPct.textContent = `${occPct}%`;

    // Donut legend
    statEls.legOcc.textContent = data.occupiedRooms ?? '--';
    statEls.legVac.textContent = data.vacantRooms ?? '--';
    statEls.legMaint.textContent = data.maintenanceRooms ?? '--';

    // Trend badges
    if (data.trends) {
        setTrend('rooms', data.trends.rooms);
        setTrend('vacant', data.trends.vacant);
        setTrend('occupied', data.trends.occupied);
        setTrend('tenants', data.trends.tenants);
        setTrend('revenue', data.trends.revenue);
        setTrend('pending', data.trends.pending, true);
    }

    // Progress bars (% of max sensible value)
    setBar('rooms', (data.totalRooms / 60) * 100);
    setBar('vacant', (data.vacantRooms / data.totalRooms) * 100);
    setBar('tenants', (data.totalTenants / 100) * 100);
    setBar('revenue', Math.min(100, (data.monthlyRevenue / 300000) * 100));
    setBar('pending', Math.min(100, (data.pendingPayments / 50000) * 100));

    // Nav badges
    if (data.pendingBookings > 0) {
        navBookingsBadge.textContent = data.pendingBookings;
        navBookingsBadge.classList.add('visible');
    }
    if (data.overduePayments > 0) {
        navPaymentsBadge.textContent = data.overduePayments;
        navPaymentsBadge.classList.add('visible');
    }
    if (data.unreadNotifs > 0) {
        navNotifBadge.textContent = data.unreadNotifs;
        navNotifBadge.classList.add('visible');
        topbarNotifDot.classList.add('visible');
    }
}

/* ------------------------------------------------------------------ */
/*  Charts                                                              */
/* ------------------------------------------------------------------ */

let revenueChart = null;
let occupancyChart = null;

/**
 * Initialises (or updates) the Revenue line chart.
 *
 * Expected shape from GET /api/dashboard/revenue?months=N:
 * {
 *   labels  : string[],   e.g. ["Oct","Nov","Dec","Jan","Feb","Mar"]
 *   values  : number[],   e.g. [185000, 198000, 210000, 225000, 218000, 240000]
 * }
 *
 * @param {{ labels: string[], values: number[] }} data
 */
function renderRevenueChart(data) {
    const ctx = document.getElementById('revenue-chart').getContext('2d');

    const chartData = {
        labels: data.labels ?? [],
        datasets: [{
            label: 'Revenue (₹)',
            data: data.values ?? [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4,
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => '₹' + Number(ctx.raw).toLocaleString('en-IN'),
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#64748b', font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
            y: {
                ticks: {
                    color: '#64748b',
                    font: { size: 11 },
                    callback: v => '₹' + (v / 1000).toFixed(0) + 'K',
                },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
        },
    };

    if (revenueChart) {
        revenueChart.data = chartData;
        revenueChart.options = options;
        revenueChart.update();
    } else {
        revenueChart = new Chart(ctx, { type: 'line', data: chartData, options });
    }
}

/**
 * Initialises (or updates) the Occupancy doughnut chart.
 *
 * @param {{ occupiedRooms: number, vacantRooms: number, maintenanceRooms: number }} data
 */
function renderOccupancyChart(data) {
    const ctx = document.getElementById('occupancy-chart').getContext('2d');

    const chartData = {
        labels: ['Occupied', 'Vacant', 'Maintenance'],
        datasets: [{
            data: [data.occupiedRooms ?? 0, data.vacantRooms ?? 0, data.maintenanceRooms ?? 0],
            backgroundColor: ['#ef4444', '#10b981', '#f59e0b'],
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: { display: false },
        },
        cutout: '72%',
    };

    if (occupancyChart) {
        occupancyChart.data = chartData;
        occupancyChart.options = options;
        occupancyChart.update();
    } else {
        occupancyChart = new Chart(ctx, { type: 'doughnut', data: chartData, options });
    }
}

/* ------------------------------------------------------------------ */
/*  Activity Feed                                                       */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

/**
 * Renders the recent activity list.
 *
 * Expected shape from GET /api/dashboard/activity:
 * [
 *   {
 *     id      : number,
 *     text    : string,    e.g. "Arjun Sharma paid rent ₹5,500 for Room 101"
 *     time    : string,    e.g. "10 min ago"
 *     initials: string,    e.g. "AS"
 *     color   : string,    optional hex color
 *   },
 *   ...
 * ]
 *
 * @param {Array} items
 */
function renderActivity(items) {
    const list = document.getElementById('activity-list');

    if (!items || items.length === 0) {
        list.innerHTML = '<li class="activity-empty">No recent activity.</li>';
        return;
    }

    list.innerHTML = items.map((item, i) => {
        const color = item.color || AVATAR_COLORS[i % AVATAR_COLORS.length];
        return `
      <li class="activity-item">
        <div class="activity-avatar" style="background:${color}">
          ${escapeHtml(item.initials ?? '?')}
        </div>
        <div class="activity-body">
          <div class="activity-text">${escapeHtml(item.text)}</div>
          <div class="activity-time">${escapeHtml(item.time)}</div>
        </div>
      </li>`;
    }).join('');
}

/* ------------------------------------------------------------------ */
/*  Payment Alerts                                                      */
/* ------------------------------------------------------------------ */

/**
 * Renders the overdue / pending payment alerts list.
 *
 * Expected shape from GET /api/payments/alerts:
 * [
 *   {
 *     id      : number,
 *     tenant  : string,
 *     room    : string,
 *     amount  : number,
 *     status  : "OVERDUE" | "PENDING",
 *     dueDate : string,
 *   },
 *   ...
 * ]
 *
 * @param {Array} items
 */
function renderAlerts(items) {
    const list = document.getElementById('alert-list');

    if (!items || items.length === 0) {
        list.innerHTML = '<li class="activity-empty">No payment alerts.</li>';
        return;
    }

    list.innerHTML = items.slice(0, 6).map(item => {
        const isOverdue = item.status === 'OVERDUE';
        const dotColor = isOverdue ? '#ef4444' : '#f59e0b';
        const badgeCls = isOverdue ? 'alert-badge--overdue' : 'alert-badge--pending';
        const badgeTxt = isOverdue ? 'Overdue' : 'Pending';

        return `
      <li class="alert-item">
        <div class="alert-dot" style="background:${dotColor}"></div>
        <div class="alert-body">
          <div class="alert-name">${escapeHtml(item.tenant)} — Room ${escapeHtml(item.room)}</div>
          <div class="alert-detail">₹${Number(item.amount).toLocaleString('en-IN')} · Due ${escapeHtml(item.dueDate)}</div>
        </div>
        <span class="alert-badge ${badgeCls}">${badgeTxt}</span>
      </li>`;
    }).join('');
}

/* ------------------------------------------------------------------ */
/*  Security helper                                                     */
/* ------------------------------------------------------------------ */

/**
 * Escapes HTML special characters to prevent XSS when rendering
 * API-provided strings directly into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str ?? '')));
    return div.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  Fetch Dashboard Data                                                */
/* ------------------------------------------------------------------ */

let currentPeriod = 6;   // active chart period (3 or 6 months)

/**
 * Fetches all dashboard data from the Spring Boot backend in parallel
 * and populates the UI.
 */
async function loadDashboard() {
    setRefreshing(true);

    try {
        const headers = authHeaders();

        const [summaryRes, activityRes, alertsRes, revenueRes] = await Promise.all([
            fetch(ENDPOINTS.summary, { headers }),
            fetch(ENDPOINTS.activity, { headers }),
            fetch(ENDPOINTS.alerts, { headers }),
            fetch(currentPeriod === 6 ? ENDPOINTS.revenue6 : ENDPOINTS.revenue3, { headers }),
        ]);

        // Handle 401 Unauthorized — token expired
        if (summaryRes.status === 401) {
            clearSession();
            window.location.href = LOGIN_PAGE;
            return;
        }

        const [summary, activity, alerts, revenue] = await Promise.all([
            summaryRes.ok ? summaryRes.json() : null,
            activityRes.ok ? activityRes.json() : [],
            alertsRes.ok ? alertsRes.json() : [],
            revenueRes.ok ? revenueRes.json() : { labels: [], values: [] },
        ]);

        if (summary) {
            renderStats(summary);
            renderOccupancyChart(summary);
        }

        renderRevenueChart(revenue);
        renderActivity(activity);
        renderAlerts(alerts);

        const now = new Date();
        lastUpdatedEl.textContent = `Last updated at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

    } catch (err) {
        // Network error — backend might be unreachable
        console.error('[Dashboard] Fetch failed:', err);
        lastUpdatedEl.textContent = 'Could not connect to server. Retrying...';
    } finally {
        setRefreshing(false);
    }
}

/**
 * Fetches only the revenue chart data when the period tab is switched.
 * @param {number} months  3 or 6
 */
async function loadRevenue(months) {
    try {
        const url = months === 6 ? ENDPOINTS.revenue6 : ENDPOINTS.revenue3;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        renderRevenueChart(data);
    } catch (err) {
        console.error('[Dashboard] Revenue fetch failed:', err);
    }
}

/* ------------------------------------------------------------------ */
/*  UI State Helpers                                                    */
/* ------------------------------------------------------------------ */

function setRefreshing(isRefreshing) {
    refreshBtn.classList.toggle('spinning', isRefreshing);
    refreshBtn.disabled = isRefreshing;
}

function clearSession() {
    sessionStorage.removeItem('nestmanager_token');
    sessionStorage.removeItem('nestmanager_role');
    sessionStorage.removeItem('nestmanager_username');
    localStorage.removeItem('nestmanager_token');
    localStorage.removeItem('nestmanager_role');
    localStorage.removeItem('nestmanager_username');
}

/* ------------------------------------------------------------------ */
/*  Sidebar (mobile)                                                    */
/* ------------------------------------------------------------------ */

function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
    document.body.style.overflow = '';
}

menuToggle.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

sidebarOverlay.addEventListener('click', closeSidebar);

/* ------------------------------------------------------------------ */
/*  Revenue Chart Period Tabs                                           */
/* ------------------------------------------------------------------ */

document.getElementById('chart-tabs').addEventListener('click', async (e) => {
    const tab = e.target.closest('.chart-tab');
    if (!tab) return;

    const period = parseInt(tab.dataset.period);
    if (period === currentPeriod) return;

    currentPeriod = period;
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    await loadRevenue(period);
});

/* ------------------------------------------------------------------ */
/*  Refresh Button                                                      */
/* ------------------------------------------------------------------ */

refreshBtn.addEventListener('click', loadDashboard);

/* ------------------------------------------------------------------ */
/*  Logout                                                              */
/* ------------------------------------------------------------------ */

/**
 * Calls POST /api/auth/logout to invalidate the token server-side,
 * then clears local storage and redirects to login.
 */
logoutBtn.addEventListener('click', async () => {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            headers: authHeaders(),
        });
    } catch (_) {
        // Even if the request fails, clear locally and redirect
    } finally {
        clearSession();
        window.location.href = LOGIN_PAGE;
    }
});

/* ------------------------------------------------------------------ */
/*  Init                                                                */
/* ------------------------------------------------------------------ */

(function init() {
    guardAuth();
    setDate();
    populateUserInfo();
    loadDashboard();
})();