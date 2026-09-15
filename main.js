// =========================================================
// PennyLedger — shared behaviors
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCurrency();
  initDateFormat();
  setActiveNav();
  setupSidebarToggle();
  setupPasswordToggles();
  setupSignupValidation();
  animateProgressBars();
  setupModals();
  setupLogout();
  setupScrollReveal();
});

/* Logout — redirects to login screen preserving theme and currency */
function setupLogout(){
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Logging you out…');
      const target = 'login.html' + getQueryString();
      setTimeout(() => { window.location.href = target; }, 650);
    });
  });
}

/* Fade-in-on-scroll for landing page sections (feature cards, security
   section, CTA band) — complements the hero's entrance animation. */
function setupScrollReveal(){
  const targets = document.querySelectorAll('.reveal, .reveal-group');
  if (!targets.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach(t => io.observe(t));
}

/* =========================================================
   Theme & Currency State Management
   Settings are stored in localStorage when available and carried
   across internal page links via URL parameters (?theme=dark&currency=PHP)
   to ensure persistence in prototypes, sandboxed environments,
   and normal browsing alike.
   ========================================================= */

const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso (PHP)' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (EUR)' }
};

function normalizeCurrency(input){
  if (!input) return 'USD';
  const str = input.trim().toUpperCase();
  if (str === 'PHP' || str === '₱' || str.includes('PESO')) return 'PHP';
  if (str === 'EUR' || str === '€' || str.includes('EURO')) return 'EUR';
  if (str === 'USD' || str === '$' || str.includes('DOLLAR')) return 'USD';
  return 'USD';
}

function getCurrency(){
  const params = new URLSearchParams(location.search);
  const paramVal = params.get('currency');
  if (paramVal) return normalizeCurrency(paramVal);
  try {
    const saved = localStorage.getItem('pennyledger_currency');
    if (saved) return normalizeCurrency(saved);
  } catch(e){}
  return 'USD';
}

function getCurrencySymbol(code){
  const c = normalizeCurrency(code || getCurrency());
  return CURRENCIES[c] ? CURRENCIES[c].symbol : '$';
}

function formatCurrency(amount, includeSign = false){
  const sym = getCurrencySymbol();
  const num = Number(amount) || 0;
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (includeSign) {
    const sign = num > 0 ? '+' : (num < 0 ? '-' : '');
    return `${sign}${sym}${formatted}`;
  }
  return `${num < 0 ? '-' : ''}${sym}${formatted}`;
}

function getQueryString(){
  const theme = document.documentElement.getAttribute('data-theme');
  const currency = getCurrency();
  const dateformat = getDateFormat();
  const params = new URLSearchParams();
  if (theme === 'dark') params.set('theme', 'dark');
  if (currency && currency !== 'USD') params.set('currency', currency);
  if (dateformat && dateformat !== 'MMM D, YYYY') params.set('dateformat', dateformat);
  const q = params.toString();
  return q ? '?' + q : '';
}

function updateInternalLinks(){
  const theme = document.documentElement.getAttribute('data-theme');
  const currency = getCurrency();
  const dateformat = getDateFormat();
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    const path = href.split('?')[0];
    if (!path.endsWith('.html')) return;
    const url = new URL(href, location.href);
    if (theme === 'dark') url.searchParams.set('theme', 'dark');
    else url.searchParams.delete('theme');
    if (currency && currency !== 'USD') url.searchParams.set('currency', currency);
    else url.searchParams.delete('currency');
    if (dateformat && dateformat !== 'MMM D, YYYY') url.searchParams.set('dateformat', dateformat);
    else url.searchParams.delete('dateformat');
    a.setAttribute('href', path + (url.search ? url.search : ''));
  });
}

function updateThemeLinks(theme){
  updateInternalLinks();
}

function initTheme(){
  const params = new URLSearchParams(location.search);
  let theme = params.get('theme');
  if (!theme) {
    try { theme = localStorage.getItem('pennyledger_theme'); } catch(e){}
  }
  theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  updateInternalLinks();

  document.querySelectorAll('.theme-checkbox').forEach(box => {
    box.checked = theme === 'dark';
    box.addEventListener('change', () => setTheme(box.checked ? 'dark' : 'light'));
  });
}

function setTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('pennyledger_theme', theme); } catch(e){}
  document.querySelectorAll('.theme-checkbox').forEach(box => { box.checked = theme === 'dark'; });

  const url = new URL(location.href);
  if (theme === 'dark') url.searchParams.set('theme', 'dark');
  else url.searchParams.delete('theme');
  history.replaceState({}, '', url);

  updateInternalLinks();
}

function applyCurrencyToDom(symbol){
  if (!document.body) return;
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node){
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toUpperCase();
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        if (parent.closest('#s-currency') || parent.closest('.no-currency-replace')) return NodeFilter.FILTER_REJECT;
        if (/[\$₱€£¥]/.test(node.nodeValue)) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      }
    }
  );

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach(node => {
    node.nodeValue = node.nodeValue.replace(/[\$₱€£¥]/g, symbol);
  });
}

function setCurrency(code){
  const curr = normalizeCurrency(code);
  const symbol = getCurrencySymbol(curr);

  try {
    localStorage.setItem('pennyledger_currency', curr);
  } catch(e){}

  const url = new URL(location.href);
  if (curr !== 'USD') {
    url.searchParams.set('currency', curr);
  } else {
    url.searchParams.delete('currency');
  }
  history.replaceState({}, '', url);

  updateInternalLinks();

  const select = document.getElementById('s-currency');
  if (select && select.value !== curr) {
    select.value = curr;
  }

  applyCurrencyToDom(symbol);

  document.dispatchEvent(new CustomEvent('currencychange', { detail: { currency: curr, symbol } }));
}

function initCurrency(){
  const curr = getCurrency();
  const symbol = getCurrencySymbol(curr);

  const select = document.getElementById('s-currency');
  if (select) {
    select.value = curr;
    // Currency no longer applies on 'change' — it only takes effect once
    // the user clicks "Save Changes" on the profile form, which calls
    // setCurrency(select.value) itself (see settings.html).
  }

  applyCurrencyToDom(symbol);
  updateInternalLinks();
}

// =========================================================
// Date Format System
// Supported formats:
// - 'MMM D, YYYY' (e.g. Mar 14, 2026)
// - 'DD/MM/YYYY'  (e.g. 14/03/2026)
// - 'MM/DD/YYYY'  (e.g. 03/14/2026)
// =========================================================

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function normalizeDateFormat(input){
  if (!input) return 'MMM D, YYYY';
  const str = input.trim();
  if (str === 'DD/MM/YYYY' || str === '14/03/2026' || str.toLowerCase() === 'dmy') return 'DD/MM/YYYY';
  if (str === 'MM/DD/YYYY' || str === '03/14/2026' || str.toLowerCase() === 'mdy') return 'MM/DD/YYYY';
  return 'MMM D, YYYY';
}

function getDateFormat(){
  const params = new URLSearchParams(location.search);
  const paramVal = params.get('dateformat');
  if (paramVal) return normalizeDateFormat(paramVal);
  try {
    const saved = localStorage.getItem('pennyledger_dateformat');
    if (saved) return normalizeDateFormat(saved);
  } catch(e){}
  return 'MMM D, YYYY';
}

function parseDate(input){
  if (!input) return null;
  if (input instanceof Date && !isNaN(input.getTime())) {
    return { year: input.getFullYear(), month: input.getMonth() + 1, day: input.getDate() };
  }
  const str = String(input).trim();

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch){
    return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10), day: parseInt(isoMatch[3], 10) };
  }

  // Month Day, Year (e.g. "Mar 14, 2026" or "Aug 31, 2026" or "Mar 12")
  const mdyTextMatch = str.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
  if (mdyTextMatch){
    const mStr = mdyTextMatch[1].slice(0, 3).toLowerCase();
    const month = MONTH_MAP[mStr];
    if (month){
      const day = parseInt(mdyTextMatch[2], 10);
      const year = mdyTextMatch[3] ? parseInt(mdyTextMatch[3], 10) : 2026;
      return { year, month, day };
    }
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch){
    const n1 = parseInt(slashMatch[1], 10);
    const n2 = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    if (n1 > 12) {
      return { year, month: n2, day: n1 };
    } else if (n2 > 12) {
      return { year, month: n1, day: n2 };
    } else {
      const currFmt = getDateFormat();
      if (currFmt === 'DD/MM/YYYY') {
        return { year, month: n2, day: n1 };
      } else {
        return { year, month: n1, day: n2 };
      }
    }
  }

  return null;
}

function formatDateParts(parts, formatType){
  if (!parts) return '';
  const fmt = normalizeDateFormat(formatType || getDateFormat());
  const y = parts.year;
  const m = parts.month;
  const d = parts.day;
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  const monthName = MONTH_NAMES_SHORT[m - 1] || 'Jan';

  if (fmt === 'DD/MM/YYYY') {
    return `${dd}/${mm}/${y}`;
  } else if (fmt === 'MM/DD/YYYY') {
    return `${mm}/${dd}/${y}`;
  }
  return `${monthName} ${d}, ${y}`;
}

function formatDate(date, formatType){
  const parts = parseDate(date);
  return parts ? formatDateParts(parts, formatType) : '';
}

function applyDateFormatToDom(formatType){
  const fmt = normalizeDateFormat(formatType || getDateFormat());
  const elements = document.querySelectorAll('.td-date, .td-gen, .tx-date, [data-raw-date]');

  elements.forEach(el => {
    if (!el.dataset.rawDate) {
      const parsed = parseDate(el.textContent.trim());
      if (parsed) {
        el.dataset.rawDate = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
      }
    }

    if (el.dataset.rawDate) {
      const parts = parseDate(el.dataset.rawDate);
      if (parts) {
        el.textContent = formatDateParts(parts, fmt);
      }
    }
  });
}

function setDateFormat(formatType){
  const fmt = normalizeDateFormat(formatType);

  try {
    localStorage.setItem('pennyledger_dateformat', fmt);
  } catch(e){}

  const url = new URL(location.href);
  if (fmt !== 'MMM D, YYYY') {
    url.searchParams.set('dateformat', fmt);
  } else {
    url.searchParams.delete('dateformat');
  }
  history.replaceState({}, '', url);

  updateInternalLinks();

  const select = document.getElementById('s-dateformat');
  if (select && select.value !== fmt) {
    select.value = fmt;
  }

  applyDateFormatToDom(fmt);

  document.dispatchEvent(new CustomEvent('dateformatchange', { detail: { format: fmt } }));
}

function initDateFormat(){
  const fmt = getDateFormat();

  const select = document.getElementById('s-dateformat');
  if (select) {
    select.value = fmt;
    if (!select.dataset.dateFormatBound) {
      select.dataset.dateFormatBound = 'true';
      select.addEventListener('change', () => {
        setDateFormat(select.value);
        showToast(`Date format changed to ${select.options[select.selectedIndex]?.text || select.value}`);
      });
    }
  }

  applyDateFormatToDom(fmt);
  updateInternalLinks();
}

window.getCurrency = getCurrency;
window.getCurrencySymbol = getCurrencySymbol;
window.formatCurrency = formatCurrency;
window.setCurrency = setCurrency;
window.applyCurrencyToDom = applyCurrencyToDom;

window.getDateFormat = getDateFormat;
window.setDateFormat = setDateFormat;
window.formatDate = formatDate;
window.applyDateFormatToDom = applyDateFormatToDom;

window.addEventListener('popstate', () => {
  initTheme();
  initCurrency();
  initDateFormat();
});

/* Highlight the current page in the sidebar nav */
function setActiveNav(){
  const file = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.side-nav a').forEach(link => {
    const href = (link.getAttribute('href') || '').split('?')[0];
    if (href === file) link.classList.add('active');
    else link.classList.remove('active');
  });
}

/* Mobile sidebar drawer */
function setupSidebarToggle(){
  const toggle = document.querySelector('.hamburger');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (!toggle || !sidebar || !overlay) return;

  const open = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
  const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };

  toggle.addEventListener('click', open);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* Show/hide password fields */
function setupPasswordToggles(){
  document.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      btn.innerHTML = isPw ? eyeOffIcon() : eyeIcon();
    });
  });
}

function eyeIcon(){
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
function eyeOffIcon(){
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a21.6 21.6 0 0 1-2.6 3.63M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

/* Basic client-side validation for the signup form */
function setupSignupValidation(){
  const form = document.querySelector('#signup-form');
  if (!form) return;
  const pw = form.querySelector('#password');
  const verify = form.querySelector('#verify-password');
  const hint = form.querySelector('#verify-hint');

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (pw.value.length < 6){
      hint.textContent = 'Password should be at least 6 characters.';
      pw.focus();
      return;
    }
    if (pw.value !== verify.value){
      hint.textContent = "Passwords don't match.";
      verify.focus();
      return;
    }
    hint.textContent = '';
    showToast('Account created — redirecting to your dashboard…');
    const target = 'dashboard.html' + getQueryString();
    setTimeout(() => { window.location.href = target; }, 1100);
  });
}

/* Login form -> straight to dashboard with a toast */
document.addEventListener('DOMContentLoaded', () => {
  const login = document.querySelector('#login-form');
  if (!login) return;
  login.addEventListener('submit', e => {
    e.preventDefault();
    showToast('Welcome back — signing you in…');
    const target = 'dashboard.html' + getQueryString();
    setTimeout(() => { window.location.href = target; }, 900);
  });
});

/* Animate width-based progress bars once they're on screen */
function animateProgressBars(){
  const bars = document.querySelectorAll('.prog-fill[data-value]');
  if (!bars.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        const el = entry.target;
        el.style.width = el.dataset.value + '%';
        io.unobserve(el);
      }
    });
  }, { threshold: 0.2 });
  bars.forEach(b => io.observe(b));
}

/* Modal open/close wiring, shared by Add Transaction / Add Goal dialogs */
function setupModals(){
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.dataset.openModal);
      if (modal) modal.classList.add('open');
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('open'));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  });

  // Add Transaction -> prepend a row to the transactions table (if present)
  const txForm = document.querySelector('#add-transaction-form');
  if (txForm){
    txForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = txForm.querySelector('#tx-name').value.trim() || 'Untitled transaction';
      const category = txForm.querySelector('#tx-category').value;
      const amountRaw = parseFloat(txForm.querySelector('#tx-amount').value || '0');
      const isIncome = category === 'Income';
      const amount = Math.abs(amountRaw);
      const today = new Date();
      const isoStr = today.toISOString().split('T')[0];
      const dateStr = formatDate(today);
      const sym = getCurrencySymbol();

      const tbody = document.querySelector('#tx-table-body');
      if (tbody){
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="td-desc">${escapeHtml(name)}</td>
          <td class="td-category"><span class="pill ${pillClass(category)}">${category}</span></td>
          <td class="td-date" data-raw-date="${isoStr}">${dateStr}</td>
          <td class="td-amount ${isIncome ? 'amt-pos' : ''}">${isIncome ? '+' : '-'}${sym}${amount.toFixed(2)}</td>`;
        row.style.animation = 'rise .4s ease both';
        tbody.prepend(row);
      }

      txForm.reset();
      document.getElementById('add-transaction-modal').classList.remove('open');
      showToast('Transaction added');
    });
  }

  // Add Goal -> append a card to the goals grid (if present)
  const goalForm = document.querySelector('#add-goal-form');
  if (goalForm){
    goalForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = goalForm.querySelector('#goal-name').value.trim() || 'New goal';
      const target = parseFloat(goalForm.querySelector('#goal-target').value || '0');
      const saved = parseFloat(goalForm.querySelector('#goal-saved').value || '0');
      const by = goalForm.querySelector('#goal-date').value.trim() || 'No date set';
      const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
      const sym = getCurrencySymbol();

      const grid = document.querySelector('#goals-grid');
      if (grid){
        const card = document.createElement('div');
        card.className = 'goal-card';
        card.style.animation = 'rise .4s ease both';
        card.innerHTML = `
          <div class="gc-top">
            <div class="gc-icon"><i></i></div>
            <div>
              <strong>${escapeHtml(name)}</strong>
              <span>Target: ${escapeHtml(by)}</span>
            </div>
          </div>
          <div class="prog-track"><div class="prog-fill fill-green" style="width:${pct}%"></div></div>
          <div class="gc-foot"><span>${sym}${saved.toLocaleString()} saved of ${sym}${target.toLocaleString()}</span><b>${pct}%</b></div>`;
        grid.prepend(card);
      }

      goalForm.reset();
      document.getElementById('add-goal-modal').classList.remove('open');
      showToast('Goal added');
    });
  }
}

function pillClass(category){
  const map = { Income:'pill-green', Groceries:'pill-green', Entertainment:'pill-blue', Transportation:'pill-blue',
    Housing:'pill-gray', Utilities:'pill-gray', 'Dining Out':'pill-red' };
  return map[category] || 'pill-gray';
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* Toast helper */
let toastTimer;
function showToast(message){
  let toast = document.querySelector('.toast');
  if (!toast){
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}