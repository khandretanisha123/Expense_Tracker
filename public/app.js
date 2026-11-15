/**
 * Expense Tracker - Modern Financial Dashboard
 * Senior Frontend Architecture & UI Engine
 * Features: Complete Weekly, Monthly & Yearly Records & Analytics
 * Authentication: Unique User ID, Password Complexity & Protected Dashboards
 */

(function () {
  'use strict';

  // ==================== STATE MANAGEMENT ====================
  const state = {
    // Current Logged-in User
    currentUser: null,
    authMode: 'login', // 'login' | 'register'
    isAuthenticating: false,

    // Financial Data
    summary: { totalIncome: 0, totalExpenses: 0, balance: 0 },
    categories: [],
    transactions: [],

    // Timeframe & Grouping States
    dashboardPeriod: 'all', // 'all' | 'week' | 'month' | 'year'
    chartGrouping: 'monthly', // 'daily' | 'weekly' | 'monthly' | 'yearly'
    tablePeriodFilter: 'all', // 'all' | 'week' | 'month' | 'year'
    breakdownTab: 'monthly', // 'monthly' | 'weekly' | 'yearly'

    // Filter & Pagination State
    searchQuery: '',
    typeFilter: 'all', // 'all' | 'Income' | 'Expense'
    categoryFilter: 'all',
    sortOrder: 'date-desc', // 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
    currentPage: 1,
    pageSize: 8,

    // Active View
    currentView: 'dashboard',

    // Modal State
    modalType: 'Expense',
    transactionToDelete: null,
    isSubmitting: false,
    isDeleting: false
  };

  // ==================== FORMATTERS ====================
  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const numberFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function formatINR(amount) {
    const num = Number(amount) || 0;
    return currencyFormatter.format(num);
  }

  function formatDateDisplay(dateString) {
    if (!dateString) return '—';
    const cleanDate = String(dateString).slice(0, 10);
    const parts = cleanDate.split('-');
    if (parts.length !== 3) return dateString;

    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function parseTxDate(dateString) {
    if (!dateString) return new Date();
    const clean = String(dateString).slice(0, 10);
    const parts = clean.split('-').map(Number);
    if (parts.length !== 3) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function getTodayISO() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, (match) => {
      switch (match) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#039;';
        default: return match;
      }
    });
  }

  // ==================== PERIOD CALCULATION HELPERS ====================
  function getWeekBounds(refDate = new Date()) {
    const d = new Date(refDate);
    const day = d.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  function matchPeriod(dateString, period, refDate = new Date()) {
    if (period === 'all') return true;
    const txDate = parseTxDate(dateString);

    if (period === 'week') {
      const { start, end } = getWeekBounds(refDate);
      return txDate >= start && txDate <= end;
    }

    if (period === 'month') {
      return txDate.getFullYear() === refDate.getFullYear() && txDate.getMonth() === refDate.getMonth();
    }

    if (period === 'year') {
      return txDate.getFullYear() === refDate.getFullYear();
    }

    return true;
  }

  function getWeekNumber(date) {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  }

  // Category Icon Map for visually distinct badges
  function getCategoryIcon(category, type) {
    const cat = String(category || '').toLowerCase();
    if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dinner') || cat.includes('lunch') || cat.includes('grocery')) {
      return '🍔';
    }
    if (cat.includes('travel') || cat.includes('flight') || cat.includes('uber') || cat.includes('cab') || cat.includes('trip') || cat.includes('fuel')) {
      return '✈️';
    }
    if (cat.includes('salary') || cat.includes('payroll') || cat.includes('wage')) {
      return '💼';
    }
    if (cat.includes('freelance') || cat.includes('client') || cat.includes('consult')) {
      return '💻';
    }
    if (cat.includes('invest') || cat.includes('stock') || cat.includes('mutual') || cat.includes('crypto')) {
      return '📈';
    }
    if (cat.includes('rent') || cat.includes('house') || cat.includes('home')) {
      return '🏠';
    }
    if (cat.includes('bill') || cat.includes('util') || cat.includes('electric') || cat.includes('wifi') || cat.includes('water')) {
      return '⚡';
    }
    if (cat.includes('shop') || cat.includes('cloth') || cat.includes('amazon') || cat.includes('mart')) {
      return '🛍️';
    }
    if (cat.includes('health') || cat.includes('medic') || cat.includes('doctor') || cat.includes('hospital')) {
      return '💊';
    }
    if (cat.includes('entertain') || cat.includes('movie') || cat.includes('netflix') || cat.includes('game')) {
      return '🎬';
    }
    return type === 'Income' ? '💰' : '💳';
  }

  // ==================== DOM ELEMENTS ====================
  const dom = {
    // Auth Elements
    authOverlay: document.getElementById('auth-overlay'),
    authForm: document.getElementById('auth-form'),
    authTabLogin: document.getElementById('auth-tab-login'),
    authTabRegister: document.getElementById('auth-tab-register'),
    authUserIdInput: document.getElementById('auth-user-id'),
    authPasswordInput: document.getElementById('auth-password'),
    togglePasswordBtn: document.getElementById('toggle-password-btn'),
    passwordChecklistBox: document.getElementById('password-checklist-box'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authSubmitText: document.getElementById('auth-submit-text'),
    authSpinner: document.querySelector('.auth-spinner'),
    authErrorAlert: document.getElementById('auth-error-alert'),
    authSuccessAlert: document.getElementById('auth-success-alert'),
    authIdHint: document.getElementById('auth-id-hint'),
    authIdError: document.getElementById('auth-id-error'),
    authPasswordError: document.getElementById('auth-password-error'),
    authSwitchNote: document.getElementById('auth-switch-note'),

    // Password Checklist Items
    reqLength: document.getElementById('req-length'),
    reqUppercase: document.getElementById('req-uppercase'),
    reqLowercase: document.getElementById('req-lowercase'),
    reqNumber: document.getElementById('req-number'),
    reqSpecial: document.getElementById('req-special'),

    // User Profile Display
    sidebarUserAvatar: document.getElementById('sidebar-user-avatar'),
    sidebarUserName: document.getElementById('sidebar-user-name'),
    sidebarUserRole: document.getElementById('sidebar-user-role'),
    logoutBtn: document.getElementById('logout-btn'),
    topbarUserAvatar: document.getElementById('topbar-user-avatar'),
    topbarUserName: document.getElementById('topbar-user-name'),
    topbarLogoutBtn: document.getElementById('topbar-logout-btn'),

    // Stat Elements
    totalIncome: document.getElementById('total-income-value'),
    totalExpenses: document.getElementById('total-expenses-value'),
    netBalance: document.getElementById('net-balance-value'),
    balanceBadge: document.getElementById('balance-badge'),
    totalCount: document.getElementById('total-count-value'),
    sidebarCount: document.getElementById('sidebar-transaction-count'),
    badgeCount: document.getElementById('transaction-total-badge'),

    // Timeframe Controls
    dashboardPeriodBtns: document.querySelectorAll('.period-segmented .period-btn'),
    periodActiveLabel: document.getElementById('period-active-label'),

    // Periodic Summary Cards Elements (Weekly, Monthly, Yearly)
    weekDateRange: document.getElementById('week-date-range'),
    weekIncomeVal: document.getElementById('week-income-val'),
    weekExpenseVal: document.getElementById('week-expense-val'),
    weekNetVal: document.getElementById('week-net-val'),
    weekTxCount: document.getElementById('week-tx-count'),

    monthDateRange: document.getElementById('month-date-range'),
    monthIncomeVal: document.getElementById('month-income-val'),
    monthExpenseVal: document.getElementById('month-expense-val'),
    monthNetVal: document.getElementById('month-net-val'),
    monthTxCount: document.getElementById('month-tx-count'),

    yearDateRange: document.getElementById('year-date-range'),
    yearIncomeVal: document.getElementById('year-income-val'),
    yearExpenseVal: document.getElementById('year-expense-val'),
    yearNetVal: document.getElementById('year-net-val'),
    yearTxCount: document.getElementById('year-tx-count'),

    // Chart Grouping Controls
    chartGroupBtns: document.querySelectorAll('.chart-group-segmented .chart-group-btn'),

    // Live date & Refresh
    liveDateText: document.getElementById('live-date-text'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),

    // Table elements
    tableBody: document.getElementById('transaction-table-body'),
    tableEmptyState: document.getElementById('table-empty-state'),
    searchInput: document.getElementById('transaction-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    segmentedBtns: document.querySelectorAll('.filter-segmented .seg-btn'),
    categoryFilterSelect: document.getElementById('category-filter-select'),
    tablePeriodFilter: document.getElementById('table-period-filter'),
    sortOrderSelect: document.getElementById('sort-order-select'),

    // Pagination
    pagStart: document.getElementById('pag-start'),
    pagEnd: document.getElementById('pag-end'),
    pagTotal: document.getElementById('pag-total'),
    pagPrevBtn: document.getElementById('pag-prev-btn'),
    pagNextBtn: document.getElementById('pag-next-btn'),
    pagNumbers: document.getElementById('pag-numbers'),

    // Add Modal Elements
    openAddModalBtn: document.getElementById('open-add-modal-btn'),
    emptyAddBtn: document.getElementById('empty-add-btn'),
    addModal: document.getElementById('add-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    cancelModalBtn: document.getElementById('cancel-modal-btn'),
    addForm: document.getElementById('add-transaction-form'),
    formTypeInput: document.getElementById('form-type'),
    typeExpenseBtn: document.getElementById('type-expense-btn'),
    typeIncomeBtn: document.getElementById('type-income-btn'),
    categoryChipsWrapper: document.getElementById('quick-category-chips'),
    categoryInput: document.getElementById('form-category'),
    amountInput: document.getElementById('form-amount'),
    amountPreview: document.getElementById('amount-live-preview'),
    dateInput: document.getElementById('form-date'),
    submitBtn: document.getElementById('submit-transaction-btn'),
    submitSpinner: document.querySelector('.submit-spinner'),
    submitText: document.querySelector('.submit-text'),
    modalErrorAlert: document.getElementById('modal-general-error'),
    categoryError: document.getElementById('category-error'),
    amountError: document.getElementById('amount-error'),
    dateError: document.getElementById('date-error'),

    // Delete Modal Elements
    deleteModal: document.getElementById('delete-modal'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    deleteItemPreview: document.getElementById('delete-item-preview'),
    deleteSpinner: document.querySelector('.delete-spinner'),
    deleteText: document.querySelector('.delete-text'),

    // Views & Nav
    navItems: document.querySelectorAll('.sidebar-nav .nav-item'),
    viewDashboard: document.getElementById('view-dashboard'),
    viewTransactions: document.getElementById('view-transactions'),
    viewAnalytics: document.getElementById('view-analytics'),
    breadcrumbCurrent: document.getElementById('breadcrumb-current'),
    pageTitle: document.getElementById('page-title'),
    transactionsViewMount: document.getElementById('transactions-view-mount'),

    // Category breakdown list
    categorySummaryList: document.getElementById('category-summary-list'),
    detailedCategoryBreakdown: document.getElementById('detailed-category-breakdown'),

    // Periodic Breakdown Table in Analytics
    periodicBreakdownTbody: document.getElementById('periodic-breakdown-tbody'),
    breakdownTabBtns: document.querySelectorAll('.periodic-tab-segmented .p-tab-btn'),

    // Mobile Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
    sidebarCloseBtn: document.getElementById('sidebar-close-btn'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // Preset suggested category chips
  const suggestedCategories = {
    Expense: ['Food', 'Travelling', 'Rent', 'Shopping', 'Utilities', 'Entertainment', 'Health', 'Groceries'],
    Income: ['Salary', 'Freelance', 'Investment', 'Bonus', 'Dividend', 'Refund']
  };

  // Color palette for charts
  const chartColors = [
    '#10B981', '#6366F1', '#F59E0B', '#EC4899', '#3B82F6',
    '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
  ];

  // Chart instances
  let cashflowChart = null;
  let categoryDonutChart = null;
  let detailedComparisonChart = null;

  // ==================== TOAST SYSTEM ====================
  function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${escapeHTML(title)}</div>
        <div class="toast-message">${escapeHTML(message)}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
      <div class="toast-progress"></div>
    `;

    dom.toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 300);
    };

    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 4000);
  }

  // ==================== AUTHENTICATION LOGIC ====================
  function initAuth() {
    try {
      const stored = localStorage.getItem('expense_tracker_user');
      if (stored) {
        state.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      state.currentUser = null;
    }

    if (state.currentUser && state.currentUser.id) {
      dom.authOverlay.classList.add('hidden');
      updateUserProfileUI(state.currentUser.id);
      fetchDashboardData();
    } else {
      dom.authOverlay.classList.remove('hidden');
      switchAuthMode('login');
    }
  }

  function updateUserProfileUI(userId) {
    const initials = userId.slice(0, 2).toUpperCase();
    if (dom.sidebarUserAvatar) dom.sidebarUserAvatar.textContent = initials;
    if (dom.sidebarUserName) dom.sidebarUserName.textContent = userId;
    if (dom.sidebarUserRole) dom.sidebarUserRole.textContent = 'Personal Account';

    if (dom.topbarUserAvatar) dom.topbarUserAvatar.textContent = initials;
    if (dom.topbarUserName) dom.topbarUserName.textContent = userId;
  }

  function switchAuthMode(mode) {
    state.authMode = mode;
    clearAuthAlerts();

    if (mode === 'login') {
      dom.authTabLogin.classList.add('active');
      dom.authTabLogin.setAttribute('aria-selected', 'true');
      dom.authTabRegister.classList.remove('active');
      dom.authTabRegister.setAttribute('aria-selected', 'false');

      dom.passwordChecklistBox.classList.add('hidden');
      dom.authSubmitText.textContent = 'Sign In';
      dom.authUserIdInput.placeholder = 'Enter your User ID (e.g. john_doe)';
      dom.authIdHint.textContent = 'Enter your unique registered User ID.';
      dom.authSwitchNote.innerHTML = 'New user? Click <strong>Create Account</strong> above to register.';
    } else {
      dom.authTabRegister.classList.add('active');
      dom.authTabRegister.setAttribute('aria-selected', 'true');
      dom.authTabLogin.classList.remove('active');
      dom.authTabLogin.setAttribute('aria-selected', 'false');

      dom.passwordChecklistBox.classList.remove('hidden');
      dom.authSubmitText.textContent = 'Create Account';
      dom.authUserIdInput.placeholder = 'Choose a User ID (e.g. john_doe or alex24)';
      dom.authIdHint.textContent = 'Choose a unique User ID (3–50 characters, letters & numbers).';
      dom.authSwitchNote.innerHTML = 'Already have an account? Click <strong>Sign In</strong> above to log in.';
      validatePasswordLive(dom.authPasswordInput.value || '');
    }
  }

  function clearAuthAlerts() {
    dom.authErrorAlert.classList.add('hidden');
    dom.authErrorAlert.textContent = '';
    dom.authSuccessAlert.classList.add('hidden');
    dom.authSuccessAlert.textContent = '';
    dom.authIdError.classList.add('hidden');
    dom.authPasswordError.classList.add('hidden');
  }

  function validatePasswordLive(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
    };

    updateCheckItem(dom.reqLength, checks.length);
    updateCheckItem(dom.reqUppercase, checks.uppercase);
    updateCheckItem(dom.reqLowercase, checks.lowercase);
    updateCheckItem(dom.reqNumber, checks.number);
    updateCheckItem(dom.reqSpecial, checks.special);

    return Object.values(checks).every(Boolean);
  }

  function updateCheckItem(itemEl, isValid) {
    if (!itemEl) return;
    const bullet = itemEl.querySelector('.req-bullet');
    if (isValid) {
      itemEl.className = 'req-item valid';
      if (bullet) bullet.textContent = '✓';
    } else {
      itemEl.className = 'req-item invalid';
      if (bullet) bullet.textContent = '✕';
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    if (state.isAuthenticating) return;

    clearAuthAlerts();
    const id = dom.authUserIdInput.value.trim();
    const password = dom.authPasswordInput.value;

    if (!id || id.length < 3 || id.length > 50) {
      dom.authIdError.textContent = 'User ID must be between 3 and 50 characters.';
      dom.authIdError.classList.remove('hidden');
      dom.authUserIdInput.focus();
      return;
    }

    if (!/^[A-Za-z0-9_.-]+$/.test(id)) {
      dom.authIdError.textContent = 'User ID can only contain letters, numbers, dots, hyphens, and underscores.';
      dom.authIdError.classList.remove('hidden');
      dom.authUserIdInput.focus();
      return;
    }

    if (!password) {
      dom.authPasswordError.textContent = 'Password is required.';
      dom.authPasswordError.classList.remove('hidden');
      dom.authPasswordInput.focus();
      return;
    }

    if (state.authMode === 'register') {
      const isStrong = validatePasswordLive(password);
      if (!isStrong) {
        dom.authPasswordError.textContent = 'Please fulfill all password requirements below.';
        dom.authPasswordError.classList.remove('hidden');
        dom.authPasswordInput.focus();
        return;
      }
    }

    setAuthLoading(true);

    const endpoint = state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      state.currentUser = data.user;
      localStorage.setItem('expense_tracker_user', JSON.stringify(data.user));

      showToast(
        state.authMode === 'register' ? 'Account Created!' : 'Welcome Back!',
        `Logged in as ${data.user.id}`,
        'success'
      );

      dom.authOverlay.classList.add('hidden');
      dom.authForm.reset();
      updateUserProfileUI(data.user.id);
      await fetchDashboardData();
    } catch (err) {
      dom.authErrorAlert.textContent = err.message;
      dom.authErrorAlert.classList.remove('hidden');
    } finally {
      setAuthLoading(false);
    }
  }

  function setAuthLoading(isLoading) {
    state.isAuthenticating = isLoading;
    dom.authSubmitBtn.disabled = isLoading;
    if (isLoading) {
      dom.authSpinner.classList.remove('hidden');
      dom.authSubmitText.textContent = state.authMode === 'register' ? 'Creating Account…' : 'Signing In…';
    } else {
      dom.authSpinner.classList.add('hidden');
      dom.authSubmitText.textContent = state.authMode === 'register' ? 'Create Account' : 'Sign In';
    }
  }

  function logout() {
    state.currentUser = null;
    localStorage.removeItem('expense_tracker_user');

    // Reset data
    state.summary = { totalIncome: 0, totalExpenses: 0, balance: 0 };
    state.categories = [];
    state.transactions = [];

    // Reset form inputs
    dom.authForm.reset();
    clearAuthAlerts();
    switchAuthMode('login');
    dom.authOverlay.classList.remove('hidden');

    showToast('Signed Out', 'You have been logged out successfully.', 'info');
  }

  function getAuthHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (state.currentUser && state.currentUser.id) {
      headers['X-User-Id'] = state.currentUser.id;
    }
    return headers;
  }

  // ==================== NUMBER ANIMATION HELPER ====================
  function animateValue(element, start, end, duration = 600, isCurrency = true) {
    if (!element) return;
    const startTime = performance.now();
    const diff = end - start;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * ease;

      if (isCurrency) {
        element.textContent = formatINR(current);
      } else {
        element.textContent = Math.round(current);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (isCurrency) {
          element.textContent = formatINR(end);
        } else {
          element.textContent = Math.round(end);
        }
      }
    }

    requestAnimationFrame(step);
  }

  // ==================== API WORKFLOWS ====================
  async function fetchDashboardData() {
    if (!state.currentUser) return;

    try {
      if (dom.refreshIcon) dom.refreshIcon.classList.add('spin');
      const response = await fetch('/api/dashboard', {
        headers: getAuthHeaders({ 'Accept': 'application/json' })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      state.summary = {
        totalIncome: Number(data.summary?.totalIncome || 0),
        totalExpenses: Number(data.summary?.totalExpenses || 0),
        balance: Number(data.summary?.balance || 0)
      };
      state.categories = Array.isArray(data.categories) ? data.categories : [];
      state.transactions = Array.isArray(data.transactions) ? data.transactions : [];

      updateDashboardUI();
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      showToast('Connection Error', err.message || 'Could not fetch data from MySQL.', 'error');
      renderTableError(err.message);
    } finally {
      if (dom.refreshIcon) {
        setTimeout(() => dom.refreshIcon.classList.remove('spin'), 500);
      }
    }
  }

  // ==================== PERIODIC METRICS CALCULATOR ====================
  function calculatePeriodMetrics(period) {
    const now = new Date();
    const filtered = state.transactions.filter(t => matchPeriod(t.transaction_date, period, now));

    let income = 0;
    let expense = 0;
    filtered.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'Income') income += amt;
      else if (t.type === 'Expense') expense += amt;
    });

    return {
      income,
      expense,
      balance: income - expense,
      count: filtered.length
    };
  }

  // ==================== UI RENDERING ====================
  function updateDashboardUI() {
    // 1. Render Summary Cards based on Selected Dashboard Timeframe
    let activeSummary = state.summary;
    let countNum = state.transactions.length;

    if (state.dashboardPeriod !== 'all') {
      const periodData = calculatePeriodMetrics(state.dashboardPeriod);
      activeSummary = {
        totalIncome: periodData.income,
        totalExpenses: periodData.expense,
        balance: periodData.balance
      };
      countNum = periodData.count;
    }

    const incomeNum = activeSummary.totalIncome;
    const expenseNum = activeSummary.totalExpenses;
    const balanceNum = activeSummary.balance;

    animateValue(dom.totalIncome, 0, incomeNum, 600, true);
    animateValue(dom.totalExpenses, 0, expenseNum, 600, true);
    animateValue(dom.netBalance, 0, balanceNum, 600, true);
    animateValue(dom.totalCount, 0, countNum, 600, false);

    // Update Balance badge & styling
    if (balanceNum >= 0) {
      dom.netBalance.style.color = 'var(--income-dark)';
      dom.balanceBadge.className = 'stat-badge positive-badge';
      dom.balanceBadge.textContent = 'Surplus';
    } else {
      dom.netBalance.style.color = 'var(--expense-dark)';
      dom.balanceBadge.className = 'stat-badge negative-badge';
      dom.balanceBadge.textContent = 'Deficit';
    }

    // Update Timeframe Indicator Text
    if (dom.periodActiveLabel) {
      const labels = {
        all: 'Showing All Records (All Time)',
        week: 'Showing Records for This Week',
        month: 'Showing Records for This Month',
        year: 'Showing Records for This Year'
      };
      dom.periodActiveLabel.textContent = labels[state.dashboardPeriod] || 'Showing Records';
    }

    // Update Counts
    if (dom.sidebarCount) dom.sidebarCount.textContent = state.transactions.length;
    if (dom.badgeCount) dom.badgeCount.textContent = `${state.transactions.length} Record${state.transactions.length === 1 ? '' : 's'}`;

    // 2. Render 3-Card Periodic Summary (Weekly, Monthly, Yearly)
    renderPeriodicCards();

    // 3. Populate Category Filter Dropdown
    updateCategoryFilterDropdown();

    // 4. Render Table
    renderTransactionsTable();

    // 5. Render Charts
    renderCharts();

    // 6. Render Detailed Category Breakdown List
    renderCategoryBreakdownList();

    // 7. Render Periodic Breakdown Ledger in Analytics
    renderPeriodicBreakdownTable();
  }

  // ==================== PERIODIC CARDS (WEEKLY, MONTHLY, YEARLY) ====================
  function renderPeriodicCards() {
    const now = new Date();

    // 1. Weekly Record
    const weekData = calculatePeriodMetrics('week');
    const { start: weekStart, end: weekEnd } = getWeekBounds(now);
    const weekStartStr = weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const weekEndStr = weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (dom.weekDateRange) dom.weekDateRange.textContent = `${weekStartStr} – ${weekEndStr}`;
    if (dom.weekIncomeVal) dom.weekIncomeVal.textContent = formatINR(weekData.income);
    if (dom.weekExpenseVal) dom.weekExpenseVal.textContent = formatINR(weekData.expense);
    if (dom.weekNetVal) {
      dom.weekNetVal.textContent = formatINR(weekData.balance);
      dom.weekNetVal.style.color = weekData.balance >= 0 ? 'var(--income-dark)' : 'var(--expense-dark)';
    }
    if (dom.weekTxCount) dom.weekTxCount.textContent = `${weekData.count} transaction${weekData.count === 1 ? '' : 's'} recorded`;

    // 2. Monthly Record
    const monthData = calculatePeriodMetrics('month');
    const monthStr = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (dom.monthDateRange) dom.monthDateRange.textContent = monthStr;
    if (dom.monthIncomeVal) dom.monthIncomeVal.textContent = formatINR(monthData.income);
    if (dom.monthExpenseVal) dom.monthExpenseVal.textContent = formatINR(monthData.expense);
    if (dom.monthNetVal) {
      dom.monthNetVal.textContent = formatINR(monthData.balance);
      dom.monthNetVal.style.color = monthData.balance >= 0 ? 'var(--income-dark)' : 'var(--expense-dark)';
    }
    if (dom.monthTxCount) dom.monthTxCount.textContent = `${monthData.count} transaction${monthData.count === 1 ? '' : 's'} recorded`;

    // 3. Yearly Record
    const yearData = calculatePeriodMetrics('year');
    if (dom.yearDateRange) dom.yearDateRange.textContent = `Year ${now.getFullYear()}`;
    if (dom.yearIncomeVal) dom.yearIncomeVal.textContent = formatINR(yearData.income);
    if (dom.yearExpenseVal) dom.yearExpenseVal.textContent = formatINR(yearData.expense);
    if (dom.yearNetVal) {
      dom.yearNetVal.textContent = formatINR(yearData.balance);
      dom.yearNetVal.style.color = yearData.balance >= 0 ? 'var(--income-dark)' : 'var(--expense-dark)';
    }
    if (dom.yearTxCount) dom.yearTxCount.textContent = `${yearData.count} transaction${yearData.count === 1 ? '' : 's'} recorded`;
  }

  function updateCategoryFilterDropdown() {
    const select = dom.categoryFilterSelect;
    if (!select) return;

    const currentVal = select.value;
    const categoriesSet = new Set();
    state.transactions.forEach(t => {
      if (t.category) categoriesSet.add(t.category);
    });

    const sortedCategories = Array.from(categoriesSet).sort();
    select.innerHTML = '<option value="all">All Categories</option>';
    sortedCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      if (cat === currentVal) option.selected = true;
      select.appendChild(option);
    });
  }

  // ==================== TABLE FILTERING & PAGINATION ====================
  function getFilteredTransactions() {
    let list = [...state.transactions];

    // Filter by Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter(item => {
        const cat = (item.category || '').toLowerCase();
        const amt = String(item.amount || '');
        const date = (item.transaction_date || '').toLowerCase();
        const type = (item.type || '').toLowerCase();
        return cat.includes(q) || amt.includes(q) || date.includes(q) || type.includes(q);
      });
    }

    // Filter by Type
    if (state.typeFilter !== 'all') {
      list = list.filter(item => item.type === state.typeFilter);
    }

    // Filter by Category
    if (state.categoryFilter !== 'all') {
      list = list.filter(item => item.category === state.categoryFilter);
    }

    // Filter by Date Timeframe
    if (state.tablePeriodFilter !== 'all') {
      const now = new Date();
      list = list.filter(item => matchPeriod(item.transaction_date, state.tablePeriodFilter, now));
    }

    // Sort
    list.sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime() || 0;
      const dateB = new Date(b.transaction_date).getTime() || 0;
      const amtA = Number(a.amount) || 0;
      const amtB = Number(b.amount) || 0;

      switch (state.sortOrder) {
        case 'date-asc':
          return dateA - dateB || a.id - b.id;
        case 'amount-desc':
          return amtB - amtA;
        case 'amount-asc':
          return amtA - amtB;
        case 'date-desc':
        default:
          return dateB - dateA || b.id - a.id;
      }
    });

    return list;
  }

  function renderTransactionsTable() {
    const filtered = getFilteredTransactions();
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / state.pageSize) || 1;

    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    // Empty state handling
    if (totalItems === 0) {
      dom.tableBody.innerHTML = '';
      dom.tableEmptyState.classList.remove('hidden');
      dom.pagStart.textContent = '0';
      dom.pagEnd.textContent = '0';
      dom.pagTotal.textContent = '0';
      dom.pagPrevBtn.disabled = true;
      dom.pagNextBtn.disabled = true;
      dom.pagNumbers.innerHTML = '';
      return;
    }

    dom.tableEmptyState.classList.add('hidden');

    // Build rows HTML
    dom.tableBody.innerHTML = pageItems.map(item => {
      const isIncome = item.type === 'Income';
      const typeBadgeClass = isIncome ? 'type-income-badge' : 'type-expense-badge';
      const amountClass = isIncome ? 'amount-income' : 'amount-expense';
      const sign = isIncome ? '+' : '−';
      const icon = getCategoryIcon(item.category, item.type);

      return `
        <tr data-id="${item.id}">
          <td>
            <span class="type-badge ${typeBadgeClass}">
              ${isIncome ? '↗' : '↘'} ${escapeHTML(item.type)}
            </span>
          </td>
          <td>
            <div class="category-cell">
              <span class="category-icon-box">${icon}</span>
              <span class="category-title-text">${escapeHTML(item.category)}</span>
            </div>
          </td>
          <td>
            <span class="date-cell-text">${formatDateDisplay(item.transaction_date)}</span>
          </td>
          <td class="text-right">
            <span class="amount-text ${amountClass}">
              ${sign} ${formatINR(item.amount)}
            </span>
          </td>
          <td class="text-center">
            <button class="btn-delete-row" title="Delete transaction" data-action="delete" data-id="${item.id}" aria-label="Delete ${escapeHTML(item.category)} transaction">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Update Pagination Controls
    dom.pagStart.textContent = startIndex + 1;
    dom.pagEnd.textContent = endIndex;
    dom.pagTotal.textContent = totalItems;
    dom.pagPrevBtn.disabled = state.currentPage === 1;
    dom.pagNextBtn.disabled = state.currentPage === totalPages;

    // Render page number pills
    dom.pagNumbers.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 6 && Math.abs(p - state.currentPage) > 2 && p !== 1 && p !== totalPages) {
        continue;
      }
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-num-btn ${p === state.currentPage ? 'active' : ''}`;
      pageBtn.textContent = p;
      pageBtn.addEventListener('click', () => {
        state.currentPage = p;
        renderTransactionsTable();
      });
      dom.pagNumbers.appendChild(pageBtn);
    }
  }

  function renderTableError(message) {
    dom.tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 32px; text-align: center; color: var(--expense-dark);">
          <strong>Unable to fetch transactions:</strong> ${escapeHTML(message)}
        </td>
      </tr>
    `;
  }

  // ==================== CHARTS (CHART.JS) ====================
  function renderCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library is not loaded.');
      return;
    }

    renderCashflowChart();
    renderCategoryDonutChart();
    renderDetailedComparisonChart();
  }

  function renderCashflowChart() {
    const ctx = document.getElementById('cashflow-chart')?.getContext('2d');
    const emptyState = document.getElementById('cashflow-empty-state');
    if (!ctx) return;

    if (state.transactions.length === 0) {
      if (cashflowChart) cashflowChart.destroy();
      emptyState?.classList.remove('hidden');
      return;
    }
    emptyState?.classList.add('hidden');

    const grouping = state.chartGrouping; // 'daily' | 'weekly' | 'monthly' | 'yearly'
    const groupedMap = new Map();

    const sortedTx = [...state.transactions].sort((a, b) => {
      return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
    });

    sortedTx.forEach(tx => {
      const d = parseTxDate(tx.transaction_date);
      let key = '';

      if (grouping === 'daily') {
        key = formatDateDisplay(tx.transaction_date);
      } else if (grouping === 'weekly') {
        const weekNum = getWeekNumber(d);
        const { start } = getWeekBounds(d);
        const startStr = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        key = `W${weekNum} (${startStr})`;
      } else if (grouping === 'yearly') {
        key = `${d.getFullYear()}`;
      } else {
        // Default: 'monthly'
        key = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }

      if (!groupedMap.has(key)) {
        groupedMap.set(key, { income: 0, expense: 0 });
      }

      const item = groupedMap.get(key);
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'Income') {
        item.income += amt;
      } else {
        item.expense += amt;
      }
    });

    const labels = Array.from(groupedMap.keys());
    const incomeData = labels.map(l => groupedMap.get(l).income);
    const expenseData = labels.map(l => groupedMap.get(l).expense);

    if (cashflowChart) cashflowChart.destroy();

    cashflowChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income (₹)',
            data: incomeData,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            hoverBackgroundColor: '#059669',
            borderRadius: 6,
            barThickness: labels.length > 8 ? undefined : 24
          },
          {
            label: 'Expense (₹)',
            data: expenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            hoverBackgroundColor: '#DC2626',
            borderRadius: 6,
            barThickness: labels.length > 8 ? undefined : 24
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            titleFont: { family: 'Inter', size: 12, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${formatINR(context.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' }
          },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#64748B',
              callback: (value) => '₹' + numberFormatter.format(value)
            }
          }
        }
      }
    });
  }

  function renderCategoryDonutChart() {
    const ctx = document.getElementById('category-donut-chart')?.getContext('2d');
    const emptyState = document.getElementById('category-empty-state');
    if (!ctx) return;

    if (!state.categories || state.categories.length === 0) {
      if (categoryDonutChart) categoryDonutChart.destroy();
      emptyState?.classList.remove('hidden');
      dom.categorySummaryList.innerHTML = '<p style="font-size: 0.8rem; color: var(--slate-400); text-align: center; padding: 10px;">No expense breakdown available.</p>';
      return;
    }
    emptyState?.classList.remove('hidden');

    const labels = state.categories.map(c => c.category);
    const dataValues = state.categories.map(c => Number(c.total) || 0);

    if (categoryDonutChart) categoryDonutChart.destroy();

    categoryDonutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: chartColors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` ${context.label}: ${formatINR(context.parsed)}`
            }
          }
        },
        cutout: '72%'
      }
    });

    dom.categorySummaryList.innerHTML = state.categories.map((c, index) => {
      const color = chartColors[index % chartColors.length];
      return `
        <div class="cat-pill-row">
          <div class="cat-pill-left">
            <span class="cat-pill-color" style="background-color: ${color}"></span>
            <span class="cat-pill-name">${escapeHTML(c.category)}</span>
          </div>
          <span class="cat-pill-amount">${formatINR(c.total)}</span>
        </div>
      `;
    }).join('');
  }

  function renderDetailedComparisonChart() {
    const ctx = document.getElementById('detailed-comparison-chart')?.getContext('2d');
    if (!ctx) return;

    if (detailedComparisonChart) detailedComparisonChart.destroy();

    detailedComparisonChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Total Income', 'Total Expenses'],
        datasets: [{
          data: [state.summary.totalIncome, state.summary.totalExpenses],
          backgroundColor: ['#10B981', '#EF4444'],
          hoverBackgroundColor: ['#059669', '#DC2626'],
          borderWidth: 3,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Inter', weight: '600' }, color: '#334155' }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${formatINR(context.parsed)}`
            }
          }
        },
        cutout: '60%'
      }
    });
  }

  function renderCategoryBreakdownList() {
    if (!dom.detailedCategoryBreakdown) return;
    if (state.categories.length === 0) {
      dom.detailedCategoryBreakdown.innerHTML = '<p class="empty-desc" style="margin: 20px auto;">No expense data recorded yet.</p>';
      return;
    }

    const totalExpense = state.summary.totalExpenses || 1;
    dom.detailedCategoryBreakdown.innerHTML = state.categories.map((c, idx) => {
      const amt = Number(c.total) || 0;
      const percentage = Math.round((amt / totalExpense) * 100);
      const color = chartColors[idx % chartColors.length];

      return `
        <div class="detail-cat-row">
          <div class="detail-cat-top">
            <span class="detail-cat-name">${escapeHTML(c.category)} (${percentage}%)</span>
            <span class="detail-cat-amount">${formatINR(amt)}</span>
          </div>
          <div class="detail-cat-progress">
            <div class="detail-cat-fill" style="width: ${Math.max(percentage, 3)}%; background-color: ${color}"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==================== PERIODIC BREAKDOWN TABLE (REPORTS VIEW) ====================
  function renderPeriodicBreakdownTable() {
    const tbody = dom.periodicBreakdownTbody;
    if (!tbody) return;

    if (state.transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state text-center" style="padding: 30px;">No historical records available to aggregate.</td></tr>';
      return;
    }

    const tab = state.breakdownTab; // 'monthly' | 'weekly' | 'yearly'
    const groups = new Map();

    const sortedTx = [...state.transactions].sort((a, b) => {
      return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
    });

    sortedTx.forEach(tx => {
      const d = parseTxDate(tx.transaction_date);
      let key = '';

      if (tab === 'weekly') {
        const weekNum = getWeekNumber(d);
        const { start, end } = getWeekBounds(d);
        const sStr = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const eStr = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        key = `Week ${weekNum} (${sStr} – ${eStr})`;
      } else if (tab === 'yearly') {
        key = `Year ${d.getFullYear()}`;
      } else {
        // 'monthly'
        key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }

      if (!groups.has(key)) {
        groups.set(key, { income: 0, expense: 0, count: 0 });
      }

      const g = groups.get(key);
      g.count += 1;
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'Income') g.income += amt;
      else g.expense += amt;
    });

    const rowsHTML = Array.from(groups.keys()).map(label => {
      const { income, expense, count } = groups.get(label);
      const net = income - expense;
      let savingsRate = 0;
      let rateBadgeClass = 'rate-neutral';

      if (income > 0) {
        savingsRate = Math.round((net / income) * 100);
        if (savingsRate >= 20) rateBadgeClass = 'rate-positive';
        else if (savingsRate >= 0) rateBadgeClass = 'rate-neutral';
        else rateBadgeClass = 'rate-negative';
      } else if (expense > 0) {
        savingsRate = -100;
        rateBadgeClass = 'rate-negative';
      }

      return `
        <tr>
          <td><strong>${escapeHTML(label)}</strong></td>
          <td class="text-right"><span class="amount-text amount-income">+${formatINR(income)}</span></td>
          <td class="text-right"><span class="amount-text amount-expense">−${formatINR(expense)}</span></td>
          <td class="text-right">
            <span class="amount-text ${net >= 0 ? 'amount-income' : 'amount-expense'}">
              ${net >= 0 ? '+' : ''}${formatINR(net)}
            </span>
          </td>
          <td class="text-center">
            <span class="savings-rate-pill ${rateBadgeClass}">
              ${savingsRate >= 0 ? `${savingsRate}%` : `${savingsRate}%`}
            </span>
          </td>
          <td class="text-center">
            <span class="badge">${count} Record${count === 1 ? '' : 's'}</span>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHTML;
  }

  // ==================== ADD TRANSACTION MODAL ====================
  function openAddModal(defaultType = 'Expense') {
    state.modalType = defaultType;
    updateModalTypeUI();
    dom.addForm.reset();
    dom.dateInput.value = getTodayISO();
    dom.amountPreview.textContent = 'Formatted: ₹0.00';
    clearFormErrors();
    dom.addModal.classList.remove('hidden');
    dom.categoryInput.focus();
  }

  function closeAddModal() {
    dom.addModal.classList.add('hidden');
    clearFormErrors();
  }

  function setModalType(type) {
    state.modalType = type;
    updateModalTypeUI();
  }

  function updateModalTypeUI() {
    dom.formTypeInput.value = state.modalType;
    if (state.modalType === 'Expense') {
      dom.typeExpenseBtn.className = 'type-select-btn active-expense';
      dom.typeIncomeBtn.className = 'type-select-btn';
      dom.typeExpenseBtn.setAttribute('aria-checked', 'true');
      dom.typeIncomeBtn.setAttribute('aria-checked', 'false');
    } else {
      dom.typeExpenseBtn.className = 'type-select-btn';
      dom.typeIncomeBtn.className = 'type-select-btn active-income';
      dom.typeExpenseBtn.setAttribute('aria-checked', 'false');
      dom.typeIncomeBtn.setAttribute('aria-checked', 'true');
    }
    renderSuggestedChips();
  }

  function renderSuggestedChips() {
    const chips = suggestedCategories[state.modalType] || [];
    dom.categoryChipsWrapper.innerHTML = chips.map(chip => {
      return `<button type="button" class="cat-chip" data-chip="${escapeHTML(chip)}">${escapeHTML(chip)}</button>`;
    }).join('');
  }

  function clearFormErrors() {
    dom.categoryError.classList.add('hidden');
    dom.amountError.classList.add('hidden');
    dom.dateError.classList.add('hidden');
    dom.modalErrorAlert.classList.add('hidden');
    dom.modalErrorAlert.textContent = '';
  }

  function validateAddForm() {
    clearFormErrors();
    let isValid = true;

    const category = dom.categoryInput.value.trim();
    if (!category || category.length > 100) {
      dom.categoryError.classList.remove('hidden');
      isValid = false;
    }

    const amountVal = Number(dom.amountInput.value);
    if (!Number.isFinite(amountVal) || amountVal <= 0 || amountVal > 9999999999) {
      dom.amountError.classList.remove('hidden');
      isValid = false;
    }

    const dateVal = dom.dateInput.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal) || isNaN(Date.parse(dateVal + 'T00:00:00Z'))) {
      dom.dateError.classList.remove('hidden');
      isValid = false;
    }

    return isValid;
  }

  async function handleAddTransaction(event) {
    event.preventDefault();
    if (state.isSubmitting) return;

    if (!validateAddForm()) {
      return;
    }

    const payload = {
      type: state.modalType,
      category: dom.categoryInput.value.trim(),
      amount: Number(dom.amountInput.value),
      transaction_date: dom.dateInput.value
    };

    setSubmitting(true);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to record transaction.');
      }

      showToast('Transaction Added', `${payload.type} of ${formatINR(payload.amount)} saved.`, 'success');
      closeAddModal();
      await fetchDashboardData();
    } catch (err) {
      dom.modalErrorAlert.textContent = err.message || 'An error occurred while saving.';
      dom.modalErrorAlert.classList.remove('hidden');
      showToast('Save Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function setSubmitting(isSubmitting) {
    state.isSubmitting = isSubmitting;
    dom.submitBtn.disabled = isSubmitting;
    if (isSubmitting) {
      dom.submitSpinner.classList.remove('hidden');
      dom.submitText.textContent = 'Saving…';
    } else {
      dom.submitSpinner.classList.add('hidden');
      dom.submitText.textContent = 'Save Transaction';
    }
  }

  // ==================== DELETE TRANSACTION MODAL ====================
  function openDeleteModal(transaction) {
    state.transactionToDelete = transaction;
    const isIncome = transaction.type === 'Income';
    const sign = isIncome ? '+' : '−';
    const color = isIncome ? 'var(--income-dark)' : 'var(--expense-dark)';

    dom.deleteItemPreview.innerHTML = `
      <div style="font-weight: 700; color: var(--slate-900); font-size: 0.95rem;">${escapeHTML(transaction.category)}</div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <span style="font-size: 0.8rem; color: var(--slate-500);">${formatDateDisplay(transaction.transaction_date)} • ${escapeHTML(transaction.type)}</span>
        <span style="font-family: var(--font-mono); font-weight: 700; color: ${color};">${sign} ${formatINR(transaction.amount)}</span>
      </div>
    `;

    dom.deleteModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    dom.deleteModal.classList.add('hidden');
    state.transactionToDelete = null;
  }

  async function handleConfirmDelete() {
    if (!state.transactionToDelete || state.isDeleting) return;

    const id = state.transactionToDelete.id;
    state.isDeleting = true;
    dom.confirmDeleteBtn.disabled = true;
    dom.deleteSpinner.classList.remove('hidden');
    dom.deleteText.textContent = 'Deleting…';

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to delete transaction.');
      }

      showToast('Deleted', 'Transaction permanently removed.', 'info');
      closeDeleteModal();
      await fetchDashboardData();
    } catch (err) {
      showToast('Delete Failed', err.message, 'error');
    } finally {
      state.isDeleting = false;
      dom.confirmDeleteBtn.disabled = false;
      dom.deleteSpinner.classList.add('hidden');
      dom.deleteText.textContent = 'Yes, Delete';
    }
  }

  // ==================== VIEW SWITCHING ====================
  function switchView(viewName) {
    state.currentView = viewName;

    dom.navItems.forEach(item => {
      const v = item.dataset.view;
      if (v === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (viewName === 'dashboard') {
      dom.breadcrumbCurrent.textContent = 'Dashboard';
      dom.pageTitle.textContent = 'Financial Overview';
      dom.viewDashboard.classList.remove('hidden');
      dom.viewTransactions.classList.add('hidden');
      dom.viewAnalytics.classList.add('hidden');
      const tableCard = document.querySelector('.table-card');
      if (tableCard && !dom.viewDashboard.contains(tableCard)) {
        dom.viewDashboard.appendChild(tableCard);
      }
    } else if (viewName === 'transactions') {
      dom.breadcrumbCurrent.textContent = 'Transactions';
      dom.pageTitle.textContent = 'Transaction Ledger';
      dom.viewDashboard.classList.add('hidden');
      dom.viewTransactions.classList.remove('hidden');
      dom.viewAnalytics.classList.add('hidden');
      const tableCard = document.querySelector('.table-card');
      if (tableCard && dom.transactionsViewMount) {
        dom.transactionsViewMount.appendChild(tableCard);
      }
    } else if (viewName === 'analytics') {
      dom.breadcrumbCurrent.textContent = 'Reports & Analytics';
      dom.pageTitle.textContent = 'Financial Intelligence';
      dom.viewDashboard.classList.add('hidden');
      dom.viewTransactions.classList.add('hidden');
      dom.viewAnalytics.classList.remove('hidden');
      renderDetailedComparisonChart();
      renderCategoryBreakdownList();
      renderPeriodicBreakdownTable();
    }

    closeMobileSidebar();
  }

  // ==================== MOBILE SIDEBAR ====================
  function openMobileSidebar() {
    dom.sidebar.classList.add('open');
    dom.sidebarBackdrop.classList.add('active');
  }

  function closeMobileSidebar() {
    dom.sidebar.classList.remove('open');
    dom.sidebarBackdrop.classList.remove('active');
  }

  // ==================== EVENT LISTENERS ====================
  function setupEventListeners() {
    // Auth Form Tabs
    dom.authTabLogin.addEventListener('click', () => switchAuthMode('login'));
    dom.authTabRegister.addEventListener('click', () => switchAuthMode('register'));

    // Toggle Password Visibility
    dom.togglePasswordBtn.addEventListener('click', () => {
      const type = dom.authPasswordInput.type === 'password' ? 'text' : 'password';
      dom.authPasswordInput.type = type;
      dom.togglePasswordBtn.style.color = type === 'text' ? 'var(--primary)' : 'var(--slate-400)';
    });

    // Live Password Strength Checking (on input)
    dom.authPasswordInput.addEventListener('input', () => {
      if (state.authMode === 'register') {
        validatePasswordLive(dom.authPasswordInput.value);
      }
      dom.authPasswordError.classList.add('hidden');
    });

    dom.authUserIdInput.addEventListener('input', () => {
      dom.authIdError.classList.add('hidden');
    });

    // Auth Form Submit
    dom.authForm.addEventListener('submit', handleAuthSubmit);

    // Logout Buttons (Sidebar + Topbar)
    dom.logoutBtn?.addEventListener('click', logout);
    dom.topbarLogoutBtn?.addEventListener('click', logout);

    // Refresh button
    dom.refreshBtn.addEventListener('click', fetchDashboardData);

    // Dashboard Timeframe Selector Buttons
    dom.dashboardPeriodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.dashboardPeriodBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        state.dashboardPeriod = btn.dataset.dashboardPeriod;
        updateDashboardUI();
      });
    });

    // Chart Grouping Switcher (Daily / Weekly / Monthly / Yearly)
    dom.chartGroupBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.chartGroupBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.chartGrouping = btn.dataset.chartGroup;
        renderCashflowChart();
      });
    });

    // Periodic Breakdown Tab Switcher in Analytics
    dom.breakdownTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.breakdownTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.breakdownTab = btn.dataset.breakdownTab;
        renderPeriodicBreakdownTable();
      });
    });

    // Modal Triggers
    dom.openAddModalBtn.addEventListener('click', () => openAddModal('Expense'));
    dom.emptyAddBtn?.addEventListener('click', () => openAddModal('Expense'));
    dom.closeModalBtn.addEventListener('click', closeAddModal);
    dom.cancelModalBtn.addEventListener('click', closeAddModal);

    // Modal Type Toggle
    dom.typeExpenseBtn.addEventListener('click', () => setModalType('Expense'));
    dom.typeIncomeBtn.addEventListener('click', () => setModalType('Income'));

    // Category Suggestion Chip Clicks
    dom.categoryChipsWrapper.addEventListener('click', (e) => {
      const chipBtn = e.target.closest('[data-chip]');
      if (!chipBtn) return;
      dom.categoryInput.value = chipBtn.dataset.chip;
      dom.categoryInput.focus();
      dom.categoryError.classList.add('hidden');
    });

    // Live Amount Formatter Preview
    dom.amountInput.addEventListener('input', () => {
      const val = Number(dom.amountInput.value);
      if (val > 0) {
        dom.amountPreview.textContent = `Formatted: ${formatINR(val)}`;
      } else {
        dom.amountPreview.textContent = 'Formatted: ₹0.00';
      }
      dom.amountError.classList.add('hidden');
    });

    // Add Form Submit
    dom.addForm.addEventListener('submit', handleAddTransaction);

    // Table Row Action Clicks (Delegation for Delete)
    dom.tableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="delete"]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const transaction = state.transactions.find(t => t.id === id);
      if (transaction) {
        openDeleteModal(transaction);
      }
    });

    // Delete Modal Actions
    dom.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    dom.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

    // Search Input
    dom.searchInput.addEventListener('input', () => {
      state.searchQuery = dom.searchInput.value;
      if (state.searchQuery) {
        dom.clearSearchBtn.classList.remove('hidden');
      } else {
        dom.clearSearchBtn.classList.add('hidden');
      }
      state.currentPage = 1;
      renderTransactionsTable();
    });

    dom.clearSearchBtn.addEventListener('click', () => {
      dom.searchInput.value = '';
      state.searchQuery = '';
      dom.clearSearchBtn.classList.add('hidden');
      state.currentPage = 1;
      renderTransactionsTable();
    });

    // Filter Segmented Buttons (All / Income / Expense)
    dom.segmentedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.segmentedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.typeFilter = btn.dataset.typeFilter;
        state.currentPage = 1;
        renderTransactionsTable();
      });
    });

    // Category Dropdown Filter
    dom.categoryFilterSelect.addEventListener('change', () => {
      state.categoryFilter = dom.categoryFilterSelect.value;
      state.currentPage = 1;
      renderTransactionsTable();
    });

    // Table Timeframe Period Filter
    if (dom.tablePeriodFilter) {
      dom.tablePeriodFilter.addEventListener('change', () => {
        state.tablePeriodFilter = dom.tablePeriodFilter.value;
        state.currentPage = 1;
        renderTransactionsTable();
      });
    }

    // Sort Order Dropdown
    dom.sortOrderSelect.addEventListener('change', () => {
      state.sortOrder = dom.sortOrderSelect.value;
      renderTransactionsTable();
    });

    // Pagination Buttons
    dom.pagPrevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTransactionsTable();
      }
    });

    dom.pagNextBtn.addEventListener('click', () => {
      state.currentPage++;
      renderTransactionsTable();
    });

    // Navigation View switching
    dom.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view) switchView(view);
      });
    });

    // Mobile Sidebar Drawer
    dom.sidebarToggleBtn.addEventListener('click', openMobileSidebar);
    dom.sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
    dom.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    // Keyboard Shortcuts (Esc closes modals)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!dom.addModal.classList.contains('hidden')) closeAddModal();
        if (!dom.deleteModal.classList.contains('hidden')) closeDeleteModal();
        closeMobileSidebar();
      }
    });

    // Click outside modal card to close
    dom.addModal.addEventListener('click', (e) => {
      if (e.target === dom.addModal) closeAddModal();
    });
    dom.deleteModal.addEventListener('click', (e) => {
      if (e.target === dom.deleteModal) closeDeleteModal();
    });
  }

  // ==================== LIVE DATE INITIALIZATION ====================
  function initLiveDate() {
    const now = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    dom.liveDateText.textContent = now.toLocaleDateString('en-IN', options);
  }

  // ==================== INITIALIZATION ====================
  function init() {
    initLiveDate();
    setupEventListeners();
    initAuth();
  }

  // Start application once DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
