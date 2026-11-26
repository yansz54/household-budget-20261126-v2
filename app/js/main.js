// Hearth & Ledger — hash router and event wiring. One render per route;
// filters and the planner keep their state in this module, edits go
// through the store, and charts are drawn after each render.

import { MONTH_LABELS, MONTHS } from './data.js';
import {
  loadState, saveState, resetState, stepMonth, monthIncome, monthSpending,
  monthSaved, categorySpending, addTx, updateTx, deleteTx, setBudget, addToGoal, addGoal,
  deleteGoal, toggleBill,
} from './store.js';
import { drawGroupedBars, drawDonut, drawLine } from './charts.js';
import {
  viewDashboard, viewTransactions, txTableHtml, viewBudgets, viewGoals,
  viewBills, viewPlanner, plannerResultHtml, viewReports,
} from './views.js';
import { CATEGORIES } from './data.js';

const state = loadState();
const query = { q: '', type: '', cat: '' };
const plan = { cat: 'groceries', cut: 20, goal: 'g1' };
let editingId = null;

const root = document.getElementById('app');
const titleEl = document.getElementById('page-title');

const ROUTES = {
  '/': { title: 'Dasbor', render: () => viewDashboard(state) },
  '/transactions': { title: 'Transaksi', render: () => viewTransactions(state, query, editingTx()) },
  '/budgets': { title: 'Anggaran', render: () => viewBudgets(state) },
  '/goals': { title: 'Tujuan Tabungan', render: () => viewGoals(state) },
  '/bills': { title: 'Tagihan', render: () => viewBills(state) },
  '/planner': { title: 'Perencana', render: () => viewPlanner(state, plan) },
  '/reports': { title: 'Laporan', render: () => viewReports(state) },
};

function editingTx() {
  if (!editingId) return null;
  return state.txs.find((t) => t.id === editingId) || null;
}

function route() {
  const hash = window.location.hash || '#/';
  const path = hash.slice(1).split('?')[0] || '/';
  return ROUTES[path] ? path : '/';
}

function drawCharts() {
  const donut = document.querySelector('[data-chart="donut"]');
  if (donut) {
    const slices = CATEGORIES.filter((c) => c.kind === 'expense')
      .map((c) => ({ ...c, value: categorySpending(state, state.month, c.id) }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
    drawDonut(donut, slices);
  }
  const bars = document.querySelector('[data-chart="bars"]');
  if (bars) {
    const short = { '2026-06': 'Jun', '2026-07': 'Jul', '2026-08': 'Agu', '2026-09': 'Sep', '2026-10': 'Okt', '2026-11': 'Nov' };
    drawGroupedBars(bars, MONTHS.map((m) => short[m]), MONTHS.map((m) => monthIncome(state, m)), MONTHS.map((m) => monthSpending(state, m)));
  }
  const line = document.querySelector('[data-chart="line"]');
  if (line) {
    const short = { '2026-06': 'Jun', '2026-07': 'Jul', '2026-08': 'Agu', '2026-09': 'Sep', '2026-10': 'Okt', '2026-11': 'Nov' };
    drawLine(line, MONTHS.map((m) => short[m]), MONTHS.map((m) => monthSaved(state, m)));
  }
}

function render() {
  const path = route();
  const r = ROUTES[path];
  titleEl.textContent = r.title + ' — ' + MONTH_LABELS[state.month];
  root.innerHTML = r.render();
  document.querySelectorAll('nav a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + path);
  });
  requestAnimationFrame(drawCharts);
}

function refreshTxTable() {
  const wrap = document.getElementById('tx-table-wrap');
  if (wrap) wrap.innerHTML = txTableHtml(state, query);
}

function refreshPlanner() {
  const wrap = document.getElementById('plan-result');
  if (wrap) wrap.innerHTML = plannerResultHtml(state, plan);
  const label = document.getElementById('plan-cut-label');
  if (label) label.textContent = plan.cut + '%';
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  if (action === 'month-prev') {
    state.month = stepMonth(state.month, -1);
    saveState(state);
    render();
  } else if (action === 'month-next') {
    state.month = stepMonth(state.month, 1);
    saveState(state);
    render();
  } else if (action === 'tx-edit') {
    editingId = el.getAttribute('data-tx');
    render();
    const form = document.getElementById('tx-form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (action === 'tx-cancel-edit') {
    editingId = null;
    render();
  } else if (action === 'tx-delete') {
    if (window.confirm('Hapus transaksi ini?')) {
      deleteTx(state, el.getAttribute('data-tx'));
      render();
    }
  } else if (action === 'budget-save') {
    const cat = el.getAttribute('data-cat');
    const input = document.querySelector('[data-budget-input="' + cat + '"]');
    if (input && setBudget(state, cat, input.value)) render();
  } else if (action === 'goal-add') {
    const goalId = el.getAttribute('data-goal');
    const input = document.querySelector('[data-goal-amount="' + goalId + '"]');
    if (input && input.value) {
      if (addToGoal(state, goalId, input.value)) render();
      else window.alert('Masukkan jumlah yang valid.');
    }
  } else if (action === 'goal-delete') {
    if (window.confirm('Hapus tujuan ini? Dana yang sudah terkumpul ikut hilang.')) {
      deleteGoal(state, el.getAttribute('data-goal'));
      render();
    }
  } else if (action === 'bill-toggle') {
    toggleBill(state, el.getAttribute('data-bill'));
    render();
  } else if (action === 'reset-data') {
    if (window.confirm('Kembalikan semua data ke contoh awal? Perubahanmu akan hilang.')) {
      const fresh = resetState();
      state.month = fresh.month;
      state.txs = fresh.txs;
      state.budgets = fresh.budgets;
      state.goals = fresh.goals;
      state.bills = fresh.bills;
      editingId = null;
      render();
    }
  }
});

document.addEventListener('submit', (ev) => {
  if (ev.target.id === 'tx-form') {
    ev.preventDefault();
    const f = ev.target;
    const amount = Math.round(Math.abs(Number(f.elements['tx-amount'].value) || 0));
    if (amount <= 0) {
      window.alert('Masukkan jumlah yang valid.');
      return;
    }
    const signed = f.elements['tx-type'].value === 'income' ? amount : -amount;
    const patch = {
      date: f.elements['tx-date'].value,
      desc: f.elements['tx-desc'].value,
      cat: f.elements['tx-cat'].value,
      amount: signed,
    };
    if (editingId) {
      updateTx(state, editingId, patch);
      editingId = null;
    } else {
      addTx(state, patch);
    }
    render();
  } else if (ev.target.id === 'goal-form') {
    ev.preventDefault();
    const f = ev.target;
    const goal = addGoal(state, f.elements['goal-name'].value, f.elements['goal-target'].value);
    if (goal) render();
    else window.alert('Isi nama dan target yang valid.');
  }
});

document.addEventListener('input', (ev) => {
  if (ev.target.id === 'tx-search') {
    query.q = ev.target.value;
    refreshTxTable();
  } else if (ev.target.id === 'plan-cut') {
    plan.cut = Number(ev.target.value);
    refreshPlanner();
  }
});

document.addEventListener('change', (ev) => {
  if (ev.target.id === 'tx-type-filter') {
    query.type = ev.target.value;
    refreshTxTable();
  } else if (ev.target.id === 'tx-cat-filter') {
    query.cat = ev.target.value;
    refreshTxTable();
  } else if (ev.target.id === 'plan-cat') {
    plan.cat = ev.target.value;
    refreshPlanner();
  } else if (ev.target.id === 'plan-goal') {
    plan.goal = ev.target.value;
    refreshPlanner();
  }
});

window.addEventListener('hashchange', render);
render();
