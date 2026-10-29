/**
 * Expense Tracker - Modern Financial Dashboard
 * Senior Frontend Architecture & UI Engine
 */

(function () {
  'use strict';

  // ==================== STATE MANAGEMENT ====================
  const state = {
    summary: { totalIncome: 0, totalExpenses: 0, balance: 0 },
    categories: [],
    transactions: [],
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
    // Stat Elements
    totalIncome: document.getElementById('total-income-value'),
    totalExpenses: document.getElementById('total-expenses-value'),
    netBalance: document.getElementById('net-balance-value'),
    balanceBadge: document.getElementById('balance-badge'),
    totalCount: document.getElementById('total-count-value'),
    sidebarCount: document.getElementById('sidebar-transaction-count'),
    badgeCount: document.getElementById('transaction-total-badge'),
    
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
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
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

  // ==================== NUMBER ANIMATION HELPER ====================
  function animateValue(element, start, end, duration = 800, isCurrency = true) {
    if (!element) return;
    const startTime = performance.now();
    const diff = end - start;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing out cubic
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
    try {
      if (dom.refreshIcon) dom.refreshIcon.classList.add('spin');
      const response = await fetch('/api/dashboard', {
        headers: { 'Accept': 'application/json' }
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

  // ==================== UI RENDERING ====================
  function updateDashboardUI() {
    // 1. Render Summary Cards with Animated Counters
    const incomeNum = state.summary.totalIncome;
    const expenseNum = state.summary.totalExpenses;
    const balanceNum = state.summary.balance;
    const countNum = state.transactions.length;

    animateValue(dom.totalIncome, 0, incomeNum, 700, true);
    animateValue(dom.totalExpenses, 0, expenseNum, 700, true);
    animateValue(dom.netBalance, 0, balanceNum, 700, true);
    animateValue(dom.totalCount, 0, countNum, 700, false);

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

    // Update Counts
    if (dom.sidebarCount) dom.sidebarCount.textContent = countNum;
    if (dom.badgeCount) dom.badgeCount.textContent = `${countNum} Record${countNum === 1 ? '' : 's'}`;

    // 2. Populate Category Filter Dropdown
    updateCategoryFilterDropdown();

    // 3. Render Table
    renderTransactionsTable();

    // 4. Render Charts
    renderCharts();

    // 5. Render Detailed Category Breakdown List
    renderCategoryBreakdownList();
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

    // Group transactions by date
    const dateMap = {};
    const sortedTx = [...state.transactions].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    sortedTx.forEach(tx => {
      const d = formatDateDisplay(tx.transaction_date);
      if (!dateMap[d]) {
        dateMap[d] = { income: 0, expense: 0 };
      }
      if (tx.type === 'Income') {
        dateMap[d].income += Number(tx.amount) || 0;
      } else {
        dateMap[d].expense += Number(tx.amount) || 0;
      }
    });

    const labels = Object.keys(dateMap);
    const incomeData = labels.map(l => dateMap[l].income);
    const expenseData = labels.map(l => dateMap[l].expense);

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
            barThickness: labels.length > 8 ? undefined : 20
          },
          {
            label: 'Expense (₹)',
            data: expenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            hoverBackgroundColor: '#DC2626',
            borderRadius: 6,
            barThickness: labels.length > 8 ? undefined : 20
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
    emptyState?.classList.add('hidden');

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

    // Populate category pills list below chart
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

  // ==================== MODAL LOGIC & FORM VALIDATION ====================
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

    // Category validation
    const category = dom.categoryInput.value.trim();
    if (!category || category.length > 100) {
      dom.categoryError.classList.remove('hidden');
      isValid = false;
    }

    // Amount validation
    const amountVal = Number(dom.amountInput.value);
    if (!Number.isFinite(amountVal) || amountVal <= 0 || amountVal > 9999999999) {
      dom.amountError.classList.remove('hidden');
      isValid = false;
    }

    // Date validation (YYYY-MM-DD)
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
        headers: { 'Content-Type': 'application/json' },
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

  // ==================== DELETE MODAL LOGIC ====================
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
        method: 'DELETE'
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

    // Update Navigation links
    dom.navItems.forEach(item => {
      const v = item.dataset.view;
      if (v === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update Breadcrumb & Title
    if (viewName === 'dashboard') {
      dom.breadcrumbCurrent.textContent = 'Dashboard';
      dom.pageTitle.textContent = 'Financial Overview';
      dom.viewDashboard.classList.remove('hidden');
      dom.viewTransactions.classList.add('hidden');
      dom.viewAnalytics.classList.add('hidden');
      // If table was moved, return it to dashboard
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
      // Mount table card inside transactions view
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
    }

    // Close mobile sidebar if open
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
    // Refresh button
    dom.refreshBtn.addEventListener('click', fetchDashboardData);

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
    fetchDashboardData();
  }

  // Start application once DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

