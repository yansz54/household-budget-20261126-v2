// Hearth & Ledger — state, persistence and every total the pages ask
// for. The seed in data.js is the starting point; anything the household
// changes is kept in localStorage under one key, and the seed can be
// restored with a single reset.

import { BUDGETS as SEED_BUDGETS, GOALS as SEED_GOALS, BILLS as SEED_BILLS, TRANSACTIONS as SEED_TXS, HOUSEHOLD, MONTHS } from './data.js';

const KEY = 'hearth-ledger-v2';

function deepCopy(v) {
  return JSON.parse(JSON.stringify(v));
}

function seedState() {
  return {
    month: HOUSEHOLD.month,
    txs: deepCopy(SEED_TXS),
    budgets: deepCopy(SEED_BUDGETS),
    goals: deepCopy(SEED_GOALS),
    bills: deepCopy(SEED_BILLS),
  };
}

function looksLikeState(v) {
  return v && typeof v === 'object' && Array.isArray(v.txs) && v.txs.length > 0
    && v.budgets && typeof v.budgets === 'object'
    && Array.isArray(v.goals) && Array.isArray(v.bills)
    && typeof v.month === 'string';
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (looksLikeState(parsed)) return parsed;
    }
  } catch (e) {
    // A corrupt or unavailable store falls back to the seed.
  }
  const fresh = seedState();
  saveState(fresh);
  return fresh;
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Storage full or blocked: the page still works for this visit.
  }
}

export function resetState() {
  const fresh = seedState();
  saveState(fresh);
  return fresh;
}

// ---- Month arithmetic -------------------------------------------------

export function monthIndex(month) {
  return MONTHS.indexOf(month);
}

export function stepMonth(month, dir) {
  const i = monthIndex(month) + dir;
  if (i < 0 || i >= MONTHS.length) return month;
  return MONTHS[i];
}

export function monthTxs(state, month) {
  return state.txs.filter((t) => t.date.startsWith(month));
}

export function monthIncome(state, month) {
  return monthTxs(state, month)
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
}

export function monthSpending(state, month) {
  return -monthTxs(state, month)
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + t.amount, 0);
}

export function monthSaved(state, month) {
  return monthIncome(state, month) - monthSpending(state, month);
}

export function categorySpending(state, month, catId) {
  return -monthTxs(state, month)
    .filter((t) => t.amount < 0 && t.cat === catId)
    .reduce((s, t) => s + t.amount, 0);
}

export function overBudgetList(state, month) {
  return Object.keys(state.budgets)
    .map((catId) => ({ catId, spent: categorySpending(state, month, catId), limit: state.budgets[catId] }))
    .filter((row) => row.spent > row.limit);
}

export function unpaidBills(state) {
  return state.bills.filter((b) => !b.paid);
}

export function unpaidBillsTotal(state) {
  return unpaidBills(state).reduce((s, b) => s + b.amount, 0);
}

// Money left once this month's bills still due are paid too.
export function leftAfterBills(state, month) {
  return monthSaved(state, month) - unpaidBillsTotal(state);
}

// ---- Editing ----------------------------------------------------------

export function addTx(state, tx) {
  const amount = Math.round(Number(tx.amount) || 0);
  if (!tx.date || !tx.desc || !tx.cat || amount === 0) return null;
  const id = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  const row = { id, date: tx.date, desc: tx.desc.trim(), cat: tx.cat, amount };
  state.txs.push(row);
  saveState(state);
  return row;
}

export function updateTx(state, id, patch) {
  const row = state.txs.find((t) => t.id === id);
  if (!row) return false;
  if (patch.date) row.date = patch.date;
  if (patch.desc) row.desc = patch.desc.trim();
  if (patch.cat) row.cat = patch.cat;
  const amount = Math.round(Number(patch.amount));
  if (Number.isFinite(amount) && amount !== 0) row.amount = amount;
  saveState(state);
  return true;
}

export function deleteTx(state, id) {
  const before = state.txs.length;
  state.txs = state.txs.filter((t) => t.id !== id);
  if (state.txs.length !== before) saveState(state);
  return state.txs.length !== before;
}

export function setBudget(state, catId, limit) {
  const v = Math.round(Number(limit));
  if (!Number.isFinite(v) || v < 0) return false;
  state.budgets[catId] = v;
  saveState(state);
  return true;
}

export function addToGoal(state, goalId, amount) {
  const goal = state.goals.find((g) => g.id === goalId);
  const v = Math.round(Number(amount));
  if (!goal || !Number.isFinite(v) || v <= 0) return false;
  goal.saved = Math.min(goal.target, goal.saved + v);
  saveState(state);
  return true;
}

export function addGoal(state, name, target) {
  const t = Math.round(Number(target));
  if (!name || !name.trim() || !Number.isFinite(t) || t <= 0) return null;
  const goal = { id: 'g' + Date.now().toString(36), name: name.trim(), target: t, saved: 0, note: '' };
  state.goals.push(goal);
  saveState(state);
  return goal;
}

export function deleteGoal(state, goalId) {
  const before = state.goals.length;
  state.goals = state.goals.filter((g) => g.id !== goalId);
  if (state.goals.length !== before) saveState(state);
  return state.goals.length !== before;
}

export function toggleBill(state, billId) {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return false;
  bill.paid = !bill.paid;
  saveState(state);
  return true;
}

// Months until a goal is reached at a given monthly saving rate.
export function monthsToGoal(goal, monthlySaving) {
  if (monthlySaving <= 0) return null;
  const left = goal.target - goal.saved;
  if (left <= 0) return 0;
  return Math.ceil(left / monthlySaving);
}
