/**
 * reports.js — NestManager Reports & Analytics Page
 *
 * Responsibilities (UI only):
 *  - Auth guard: redirect to login if no token
 *  - Fetch full report data    GET /api/reports/summary?year={year}
 *  - Render 6 KPI cards
 *  - Monthly revenue bar/line chart (Chart.js) — switchable
 *  - Room status doughnut chart
 *  - Payment collection stacked bar chart (Paid/Pending/Overdue)
 *  - Room type pie chart
 *  - Key metrics summary grid
 *  - Tenant rent summary table
 *  - Year selector — refetches report for selected year
 *  - Revenue chart type toggle (bar / line)
 *  - Export CSV (downloads metrics as .csv)
 *  - Export PDF (browser print dialog)
 *  - Mobile sidebar toggle
 */

'use strict';

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const API_BASE = 'https://room-allocation-system.up.railway.app';
const LOGIN_PAGE = '../login/login.html';

function reportUrl(year) {
    return `${API_BASE}/api/reports/summary?year=${year}`;
}

/* ------------------------------------------------------------------ */
/*  Auth                                                                */
/* ------------------------------------------------------------------ */

function getToken() {
    return sessionStorage.getItem('nestmanager_token')
        || localStorage.getItem('nestmanager_token')
        || null;
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
    };
}

function clearSession() {
    ['nestmanager_token', 'nestmanager_role', 'nestmanager_username'].forEach(k => {
        sessionStorage.removeItem(k); localStorage.removeItem(k);
    });
}

/* ------------------------------------------------------------------ */
/*  DOM References                                                      */
/* ------------------------------------------------------------------ */

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle = document.getElementById('menu-toggle');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');
const topbarDate = document.getElementById('topbar-date');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userRole = document.getElementById('user-role');
const yearSelect = document.getElementById('year-select');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const reportPeriod = document.getElementById('report-period');
const metricsPeriod = document.getElementById('metrics-period');

/* KPI elements */
const kpiEls = {
    revenue: document.getElementById('kpi-revenue'),
    revenueChange: document.getElementById('kpi-revenue-change'),
    occupancy: document.getElementById('kpi-occupancy'),
    occupancyChange: document.getElementById('kpi-occupancy-change'),
    tenants: document.getElementById('kpi-tenants'),
    tenantsChange: document.getElementById('kpi-tenants-change'),
    collection: document.getElementById('kpi-collection'),
    collectionChange: document.getElementById('kpi-collection-change'),
    bookings: document.getElementById('kpi-bookings'),
    bookingsChange: document.getElementById('kpi-bookings-change'),
    avgStay: document.getElementById('kpi-avg-stay'),
    stayChange: document.getElementById('kpi-stay-change'),
};

/* Chart donut elements */
const donutPct = document.getElementById('donut-pct');
const legOcc = document.getElementById('leg-occ');
const legVac = document.getElementById('leg-vac');
const legMaint = document.getElementById('leg-maint');

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */

let revenueChartInstance = null;
let roomStatusChartInstance = null;
let paymentChartInstance = null;
let roomTypeChartInstance = null;
let currentChartType = 'bar';
let currentData = null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str ?? '')));
    return d.innerHTML;
}

function formatCurrency(val) {
    const n = Number(val || 0);
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + n.toLocaleString('en-IN');
}

function formatCurrencyFull(val) {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
}

function formatRole(role) {
    const map = { ADMIN: 'Owner / Admin', MANAGER: 'Manager', STAFF: 'Staff' };
    return map[role] || role;
}

const AVATAR_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];
function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name) {
    return (name || '?').trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ------------------------------------------------------------------ */
/*  User info & Date                                                    */
/* ------------------------------------------------------------------ */

function populateUserInfo() {
    const name = sessionStorage.getItem('nestmanager_username') || localStorage.getItem('nestmanager_username') || 'Admin';
    const role = sessionStorage.getItem('nestmanager_role') || localStorage.getItem('nestmanager_role') || 'ADMIN';
    userAvatar.textContent = initials(name);
    userName.textContent = name;
    userRole.textContent = formatRole(role);
}

function setDate() {
    const now = new Date();
    topbarDate.textContent = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    reportPeriod.textContent = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    metricsPeriod.textContent = `January – ${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
}

/* ------------------------------------------------------------------ */
/*  Chart.js shared options                                             */
/* ------------------------------------------------------------------ */

const GRID_COLOR = 'rgba(255,255,255,0.04)';
const TICK_COLOR = '#64748b';
const FONT_FAMILY = "'DM Sans', sans-serif";

function baseScales() {
    return {
        x: { ticks: { color: TICK_COLOR, font: { family: FONT_FAMILY, size: 11 } }, grid: { color: GRID_COLOR } },
        y: { ticks: { color: TICK_COLOR, font: { family: FONT_FAMILY, size: 11 }, callback: v => '₹' + (v / 1000).toFixed(0) + 'K' }, grid: { color: GRID_COLOR } },
    };
}

/* ------------------------------------------------------------------ */
/*  Render KPI Cards                                                    */
/* ------------------------------------------------------------------ */

/**
 * Populates KPI cards from report data.
 *
 * Expected shape from GET /api/reports/summary?year={year}:
 * {
 *   year            : number,
 *   annualRevenue   : number,
 *   avgOccupancyRate: number,   0-100
 *   totalTenants    : number,
 *   collectionRate  : number,   0-100
 *   totalBookings   : number,
 *   avgStayDays     : number,
 *   totalRooms      : number,
 *   occupiedRooms   : number,
 *   vacantRooms     : number,
 *   maintenanceRooms: number,
 *   changes: {
 *     revenue    : string,  e.g. "+12%"
 *     occupancy  : string,
 *     tenants    : string,
 *     collection : string,
 *     bookings   : string,
 *     avgStay    : string,
 *   },
 *   monthlyRevenue : number[12],      Jan–Dec
 *   monthlyPaid    : number[12],
 *   monthlyPending : number[12],
 *   monthlyOverdue : number[12],
 *   roomTypes: { SINGLE:n, DOUBLE:n, SHARED:n, SUITE:n },
 *   tenants: [
 *     { id, name, phone, roomNumber, rentPerMonth, paidYTD, pendingAmt, rentStatus }
 *   ]
 * }
 *
 * @param {Object} data
 */
function renderKPIs(data) {
    kpiEls.revenue.textContent = formatCurrency(data.annualRevenue);
    kpiEls.occupancy.textContent = Math.round(data.avgOccupancyRate) + '%';
    kpiEls.tenants.textContent = data.totalTenants;
    kpiEls.collection.textContent = Math.round(data.collectionRate) + '%';
    kpiEls.bookings.textContent = data.totalBookings;
    kpiEls.avgStay.textContent = data.avgStayDays + ' days';

    // Change badges
    function setBadge(el, val) {
        if (!el || !val) return;
        el.textContent = val;
        const isPositive = val.startsWith('+') || parseFloat(val) > 0;
        el.classList.remove('kpi-change--up', 'kpi-change--down', 'kpi-change--neutral');
        el.classList.add(isPositive ? 'kpi-change--up' : 'kpi-change--down');
    }

    if (data.changes) {
        setBadge(kpiEls.revenueChange, data.changes.revenue);
        setBadge(kpiEls.occupancyChange, data.changes.occupancy);
        setBadge(kpiEls.tenantsChange, data.changes.tenants);
        setBadge(kpiEls.collectionChange, data.changes.collection);
        setBadge(kpiEls.bookingsChange, data.changes.bookings);
        kpiEls.stayChange.textContent = data.changes.avgStay || '—';
    }

    // Donut legend
    donutPct.textContent = Math.round(data.avgOccupancyRate) + '%';
    legOcc.textContent = data.occupiedRooms || 0;
    legVac.textContent = data.vacantRooms || 0;
    legMaint.textContent = data.maintenanceRooms || 0;
}

/* ------------------------------------------------------------------ */
/*  Revenue Chart                                                       */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Renders or updates the monthly revenue chart.
 * @param {number[]} values  12-element array
 * @param {string}   type    'bar' | 'line'
 */
function renderRevenueChart(values, type = 'bar') {
    const ctx = document.getElementById('revenue-chart').getContext('2d');

    const dataset = type === 'bar'
        ? {
            label: 'Revenue',
            data: values,
            backgroundColor: values.map((_, i) => i === values.length - 1 ? '#3b82f6' : 'rgba(59,130,246,0.45)'),
            borderRadius: 6,
            borderSkipped: false,
        }
        : {
            label: 'Revenue',
            data: values,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4,
            fill: true,
            tension: 0.4,
        };

    const config = {
        type: type,
        data: { labels: MONTHS, datasets: [dataset] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => '₹' + Number(ctx.raw).toLocaleString('en-IN') } },
            },
            scales: baseScales(),
        },
    };

    if (revenueChartInstance) {
        revenueChartInstance.destroy();
        revenueChartInstance = null;
    }
    revenueChartInstance = new Chart(ctx, config);
}

/* ------------------------------------------------------------------ */
/*  Room Status Doughnut                                                */
/* ------------------------------------------------------------------ */

function renderRoomStatusChart(data) {
    const ctx = document.getElementById('room-status-chart').getContext('2d');

    const config = {
        type: 'doughnut',
        data: {
            labels: ['Occupied', 'Vacant', 'Maintenance'],
            datasets: [{
                data: [data.occupiedRooms || 0, data.vacantRooms || 0, data.maintenanceRooms || 0],
                backgroundColor: ['#ef4444', '#10b981', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            cutout: '72%',
        },
    };

    if (roomStatusChartInstance) { roomStatusChartInstance.destroy(); roomStatusChartInstance = null; }
    roomStatusChartInstance = new Chart(ctx, config);
}

/* ------------------------------------------------------------------ */
/*  Payment Collection Stacked Bar                                      */
/* ------------------------------------------------------------------ */

function renderPaymentChart(data) {
    const ctx = document.getElementById('payment-chart').getContext('2d');

    const config = {
        type: 'bar',
        data: {
            labels: MONTHS,
            datasets: [
                { label: 'Paid', data: data.monthlyPaid || new Array(12).fill(0), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 3 },
                { label: 'Pending', data: data.monthlyPending || new Array(12).fill(0), backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 3 },
                { label: 'Overdue', data: data.monthlyOverdue || new Array(12).fill(0), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 3 },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: TICK_COLOR, font: { family: FONT_FAMILY, size: 11 } } },
                tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ₹' + Number(ctx.raw).toLocaleString('en-IN') } },
            },
            scales: {
                ...baseScales(),
                x: { ...baseScales().x, stacked: true },
                y: { ...baseScales().y, stacked: true },
            },
        },
    };

    if (paymentChartInstance) { paymentChartInstance.destroy(); paymentChartInstance = null; }
    paymentChartInstance = new Chart(ctx, config);
}

/* ------------------------------------------------------------------ */
/*  Room Type Pie                                                       */
/* ------------------------------------------------------------------ */

function renderRoomTypeChart(data) {
    const ctx = document.getElementById('room-type-chart').getContext('2d');
    const rt = data.roomTypes || { SINGLE: 0, DOUBLE: 0, SHARED: 0, SUITE: 0 };

    const config = {
        type: 'pie',
        data: {
            labels: ['Single', 'Double', 'Shared', 'Suite'],
            datasets: [{
                data: [rt.SINGLE, rt.DOUBLE, rt.SHARED, rt.SUITE],
                backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 4,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: TICK_COLOR, font: { family: FONT_FAMILY, size: 11 } } } },
        },
    };

    if (roomTypeChartInstance) { roomTypeChartInstance.destroy(); roomTypeChartInstance = null; }
    roomTypeChartInstance = new Chart(ctx, config);
}

/* ------------------------------------------------------------------ */
/*  Metrics Summary Grid                                                */
/* ------------------------------------------------------------------ */

function renderMetrics(data) {
    const metrics = [
        { label: 'Total Rooms', value: data.totalRooms, cls: '' },
        { label: 'Occupied Rooms', value: `${data.occupiedRooms} (${Math.round(data.avgOccupancyRate)}%)`, cls: 'metric-value--blue' },
        { label: 'Vacant Rooms', value: data.vacantRooms, cls: 'metric-value--green' },
        { label: 'Maintenance Rooms', value: data.maintenanceRooms, cls: 'metric-value--yellow' },
        { label: 'Total Active Tenants', value: data.totalTenants, cls: '' },
        { label: 'New Tenants This Month', value: data.newTenantsThisMonth || '—', cls: 'metric-value--green' },
        { label: 'Annual Revenue', value: formatCurrencyFull(data.annualRevenue), cls: 'metric-value--blue' },
        { label: 'Monthly Avg. Revenue', value: formatCurrencyFull(Math.round(data.annualRevenue / 12)), cls: '' },
        { label: 'Collection Rate', value: Math.round(data.collectionRate) + '%', cls: 'metric-value--green' },
        { label: 'Pending Payments', value: formatCurrencyFull(data.totalPending || 0), cls: 'metric-value--yellow' },
        { label: 'Overdue Payments', value: formatCurrencyFull(data.totalOverdue || 0), cls: 'metric-value--red' },
        { label: 'Avg. Room Rent', value: formatCurrencyFull(data.avgRoomRent || 0), cls: '' },
        { label: 'Total Bookings', value: data.totalBookings, cls: '' },
        { label: 'Avg. Stay Duration', value: data.avgStayDays + ' days', cls: '' },
        { label: 'Most Popular Room Type', value: data.popularRoomType || 'Double', cls: '' },
        { label: 'Highest Revenue Month', value: data.highestRevenueMonth || '—', cls: 'metric-value--blue' },
    ];

    document.getElementById('metrics-grid').innerHTML = metrics.map(m => `
    <div class="metric-item">
      <span class="metric-label">${escapeHtml(m.label)}</span>
      <span class="metric-value ${m.cls}">${escapeHtml(String(m.value))}</span>
    </div>`).join('');
}

/* ------------------------------------------------------------------ */
/*  Tenant Rent Summary Table                                           */
/* ------------------------------------------------------------------ */

function renderTenantTable(tenants) {
    const tbody = document.getElementById('tenant-report-tbody');
    if (!tenants || tenants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text3)">No tenant data available.</td></tr>';
        return;
    }

    tbody.innerHTML = tenants.map(t => {
        const color = avatarColor(t.name);
        const inits = initials(t.name);
        const scMap = { PAID: 'pay-status-badge--paid', PENDING: 'pay-status-badge--pending', OVERDUE: 'pay-status-badge--overdue' };
        const scCls = scMap[t.rentStatus] || 'pay-status-badge--pending';

        return `<tr>
      <td>
        <div class="tenant-cell">
          <div class="t-avatar" style="background:${color}">${escapeHtml(inits)}</div>
          <div>
            <div class="t-name">${escapeHtml(t.name)}</div>
            <div class="t-phone">${escapeHtml(t.phone || '')}</div>
          </div>
        </div>
      </td>
      <td><span class="room-badge">Room ${escapeHtml(t.roomNumber)}</span></td>
      <td style="color:var(--text);font-weight:500">${formatCurrencyFull(t.rentPerMonth)}</td>
      <td style="color:var(--green)">${formatCurrencyFull(t.paidYTD)}</td>
      <td style="color:var(--yellow)">${formatCurrencyFull(t.pendingAmt)}</td>
      <td><span class="pay-status-badge ${scCls}">${t.rentStatus || 'PENDING'}</span></td>
    </tr>`;
    }).join('');
}

/* ------------------------------------------------------------------ */
/*  API — Fetch Report                                                  */
/*                                                                      */
/*  GET /api/reports/summary?year={year}                               */
/*  Response: ReportData  (see full shape in renderKPIs docs above)    */
/* ------------------------------------------------------------------ */

async function fetchReport(year) {
    setRefreshing(true);
    try {
        const res = await fetch(reportUrl(year), { headers: authHeaders() });
        if (res.status === 401) { clearSession(); window.location.href = LOGIN_PAGE; return; }
        if (!res.ok) throw new Error('Failed to fetch report data');

        currentData = await res.json();
        renderAll(currentData);
    } catch (err) {
        console.error('[Reports] Fetch error:', err);
        showToast('Could not load report data. Check server connection.', 'error');
    } finally {
        setRefreshing(false);
    }
}

function renderAll(data) {
    renderKPIs(data);
    renderRevenueChart(data.monthlyRevenue || new Array(12).fill(0), currentChartType);
    renderRoomStatusChart(data);
    renderPaymentChart(data);
    renderRoomTypeChart(data);
    renderMetrics(data);
    renderTenantTable(data.tenants || []);
}

/* ------------------------------------------------------------------ */
/*  Revenue Chart Type Toggle                                           */
/* ------------------------------------------------------------------ */

document.getElementById('revenue-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.chart-tab');
    if (!tab) return;
    const type = tab.dataset.type;
    if (type === currentChartType) return;
    currentChartType = type;
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (currentData) {
        renderRevenueChart(currentData.monthlyRevenue || new Array(12).fill(0), currentChartType);
    }
});

/* ------------------------------------------------------------------ */
/*  Year Selector                                                       */
/* ------------------------------------------------------------------ */

yearSelect.addEventListener('change', () => {
    fetchReport(yearSelect.value);
});

/* ------------------------------------------------------------------ */
/*  Export CSV                                                          */
/* ------------------------------------------------------------------ */

exportCsvBtn.addEventListener('click', () => {
    if (!currentData) { showToast('No data to export.', 'info'); return; }

    const rows = [
        ['Metric', 'Value'],
        ['Year', currentData.year],
        ['Annual Revenue', currentData.annualRevenue],
        ['Avg Occupancy Rate (%)', Math.round(currentData.avgOccupancyRate)],
        ['Total Tenants', currentData.totalTenants],
        ['Collection Rate (%)', Math.round(currentData.collectionRate)],
        ['Total Bookings', currentData.totalBookings],
        ['Avg Stay Duration (days)', currentData.avgStayDays],
        ['Total Rooms', currentData.totalRooms],
        ['Occupied Rooms', currentData.occupiedRooms],
        ['Vacant Rooms', currentData.vacantRooms],
        ['Maintenance Rooms', currentData.maintenanceRooms],
        [''],
        ['Month', 'Revenue', 'Paid', 'Pending', 'Overdue'],
        ...MONTHS.map((m, i) => [
            m,
            currentData.monthlyRevenue?.[i] || 0,
            currentData.monthlyPaid?.[i] || 0,
            currentData.monthlyPending?.[i] || 0,
            currentData.monthlyOverdue?.[i] || 0,
        ]),
    ];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nestmanager-report-${currentData.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.', 'success');
});

/* ------------------------------------------------------------------ */
/*  Export PDF (print)                                                  */
/* ------------------------------------------------------------------ */

exportPdfBtn.addEventListener('click', () => {
    window.print();
});

/* ------------------------------------------------------------------ */
/*  Refresh / Sidebar / Logout                                         */
/* ------------------------------------------------------------------ */

refreshBtn.addEventListener('click', () => fetchReport(yearSelect.value));
function setRefreshing(on) { refreshBtn.classList.toggle('spinning', on); refreshBtn.disabled = on; }

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('visible', sidebar.classList.contains('open'));
});
sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
});

logoutBtn.addEventListener('click', async () => {
    try { await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: authHeaders() }); } catch (_) { }
    clearSession();
    window.location.href = LOGIN_PAGE;
});

/* ------------------------------------------------------------------ */
/*  Toast                                                               */
/* ------------------------------------------------------------------ */

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span class="toast-msg">${escapeHtml(msg)}</span>`;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function getToken() {
    return sessionStorage.getItem('nestmanager_token')
        || localStorage.getItem('nestmanager_token')
        || null;
}

function guardAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = LOGIN_PAGE;
    }
}

/* ------------------------------------------------------------------ */
/*  Init                                                                */
/* ------------------------------------------------------------------ */

(function init() {
    guardAuth();
    setDate();
    populateUserInfo();
    fetchReport(yearSelect.value);
})();