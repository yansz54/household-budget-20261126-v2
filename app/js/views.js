// Hearth & Ledger — one render function per page. Each returns HTML;
// main.js puts it on the page and draws the charts after. Nothing here
// reads the network, and every number comes from the store.

import { CATEGORIES, MONTH_LABELS, MONTHS } from './data.js';
import {
  monthIncome, monthSpending, monthSaved, categorySpending, overBudgetList,
  unpaidBills, unpaidBillsTotal, leftAfterBills, monthsToGoal, monthTxs,
} from './store.js';
import { fmtRp, fmtRpSigned, fmtPct, fmtDate, esc } from './format.js';

const EXPENSE_CATS = CATEGORIES.filter((c) => c.kind === 'expense');

function catById(id) {
  return CATEGORIES.find((c) => c.id === id) || { id, label: id, color: '#8d99ae' };
}

function monthNav(state) {
  const i = MONTHS.indexOf(state.month);
  return '<div class="month-nav">'
    + '<button data-action="month-prev" ' + (i === 0 ? 'disabled' : '') + '>‹ Sebelumnya</button>'
    + '<strong>' + MONTH_LABELS[state.month] + '</strong>'
    + '<button data-action="month-next" ' + (i === MONTHS.length - 1 ? 'disabled' : '') + '>Berikutnya ›</button>'
    + '</div>';
}

function kpi(label, value, sub, tone) {
  return '<div class="kpi' + (tone ? ' ' + tone : '') + '">'
    + '<span class="kpi-label">' + label + '</span>'
    + '<strong class="kpi-value">' + value + '</strong>'
    + '<span class="kpi-sub">' + sub + '</span></div>';
}

function bar(pct, over) {
  const w = Math.min(100, Math.max(0, pct * 100));
  return '<div class="bar"><div class="bar-fill' + (over ? ' over' : '') + '" style="width:' + w + '%"></div></div>';
}

// ---- Dashboard ----------------------------------------------------------

export function viewDashboard(state) {
  const m = state.month;
  const income = monthIncome(state, m);
  const spent = monthSpending(state, m);
  const saved = monthSaved(state, m);
  const left = leftAfterBills(state, m);
  const unpaid = unpaidBills(state);
  const over = overBudgetList(state, m);
  const recent = monthTxs(state, m).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 5);

  let alert = '';
  if (over.length > 0) {
    const parts = over.map((o) => catById(o.catId).label + ' (+' + fmtRp(o.spent - o.limit) + ')');
    alert = '<div class="alert">'
      + '<strong>' + over.length + ' kategori lewat anggaran bulan ini.</strong> '
      + esc(parts.join(', ')) + '. '
      + '<a href="#/budgets">Lihat anggaran →</a></div>';
  }

  const slices = EXPENSE_CATS
    .map((c) => ({ ...c, value: categorySpending(state, m, c.id) }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  const topList = slices.slice(0, 5).map((s) => '<li><span class="dot" style="background:' + s.color + '"></span>'
    + esc(s.label) + '<strong>' + fmtRp(s.value) + '</strong></li>').join('');

  const billsHtml = unpaid.length === 0
    ? '<p class="muted">Semua tagihan bulan ini sudah lunas.</p>'
    : '<ul class="plain">' + unpaid.map((b) => '<li>' + esc(b.name)
      + ' <span class="muted">jatuh tempo tgl ' + b.due + '</span><strong>' + fmtRp(b.amount) + '</strong></li>').join('') + '</ul>'
      + '<p><a href="#/bills">Kelola tagihan →</a></p>';

  const recentHtml = recent.map((t) => '<li><span class="dot" style="background:' + catById(t.cat).color + '"></span>'
    + '<span>' + esc(t.desc) + ' <span class="muted">' + fmtDate(t.date) + '</span></span>'
    + '<strong class="' + (t.amount < 0 ? 'neg' : 'pos') + '">' + fmtRpSigned(t.amount) + '</strong></li>').join('');

  return monthNav(state)
    + '<section class="kpis">'
    + kpi('Pemasukan', fmtRp(income), 'gaji + freelance', '')
    + kpi('Pengeluaran', fmtRp(spent), 'dari ' + monthTxs(state, m).filter((t) => t.amount < 0).length + ' transaksi', '')
    + kpi('Ditabung', fmtRp(saved), 'pemasukan − pengeluaran', saved >= 0 ? 'good' : 'bad')
    + kpi('Sisa setelah tagihan', fmtRp(left), unpaid.length + ' tagihan belum dibayar (' + fmtRp(unpaidBillsTotal(state)) + ')', left >= 0 ? '' : 'bad')
    + '</section>'
    + alert
    + '<section class="grid-2">'
    + '<div class="card"><h2>Ke mana uang pergi</h2><canvas id="chart-donut" data-chart="donut"></canvas>'
    + '<ul class="plain legend">' + topList + '</ul></div>'
    + '<div class="card"><h2>Tagihan yang masih menunggu</h2>' + billsHtml
    + '<h2 class="mt">Aktivitas terakhir</h2><ul class="plain">' + recentHtml + '</ul>'
    + '<p><a href="#/transactions">Semua transaksi →</a></p></div>'
    + '</section>';
}

// ---- Transactions -------------------------------------------------------

export function txTableHtml(state, query) {
  let rows = monthTxs(state, state.month).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const q = (query.q || '').trim().toLowerCase();
  if (q) rows = rows.filter((t) => t.desc.toLowerCase().includes(q) || catById(t.cat).label.toLowerCase().includes(q));
  if (query.type === 'income') rows = rows.filter((t) => t.amount > 0);
  if (query.type === 'expense') rows = rows.filter((t) => t.amount < 0);
  if (query.cat) rows = rows.filter((t) => t.cat === query.cat);
  if (rows.length === 0) return '<p class="muted">Tidak ada transaksi yang cocok. Ubah pencarian atau tambah transaksi baru.</p>';
  const body = rows.map((t) => '<tr><td>' + fmtDate(t.date) + '</td><td>' + esc(t.desc) + '</td>'
    + '<td><span class="dot" style="background:' + catById(t.cat).color + '"></span>' + esc(catById(t.cat).label) + '</td>'
    + '<td class="num ' + (t.amount < 0 ? 'neg' : 'pos') + '">' + fmtRpSigned(t.amount) + '</td>'
    + '<td class="num"><button data-action="tx-edit" data-tx="' + t.id + '">Ubah</button> '
    + '<button data-action="tx-delete" data-tx="' + t.id + '">Hapus</button></td></tr>').join('');
  return '<p class="muted">' + rows.length + ' transaksi</p>'
    + '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th class="num">Jumlah</th><th></th></tr></thead>'
    + '<tbody>' + body + '</tbody></table></div>';
}

export function viewTransactions(state, query, editing) {
  const catOptions = ['<option value="">Semua kategori</option>']
    .concat(CATEGORIES.map((c) => '<option value="' + c.id + '"' + (query.cat === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>')).join('');
  const formTitle = editing ? 'Ubah transaksi' : 'Tambah transaksi';
  return monthNav(state)
    + '<section class="card"><h2>' + formTitle + '</h2>'
    + '<form id="tx-form"><div class="form-grid">'
    + '<label>Tanggal<input type="date" name="tx-date" value="' + (editing ? editing.date : state.month + '-15') + '" required></label>'
    + '<label>Keterangan<input type="text" name="tx-desc" value="' + (editing ? esc(editing.desc) : '') + '" placeholder="cth. Pasar Minggu — sayur" required></label>'
    + '<label>Kategori<select name="tx-cat">'
    + CATEGORIES.map((c) => '<option value="' + c.id + '"' + (editing && editing.cat === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>').join('')
    + '</select></label>'
    + '<label>Jenis<select name="tx-type"><option value="expense"' + (editing && editing.amount > 0 ? '' : ' selected') + '>Pengeluaran</option>'
    + '<option value="income"' + (editing && editing.amount > 0 ? ' selected' : '') + '>Pemasukan</option></select></label>'
    + '<label>Jumlah (Rp)<input type="number" name="tx-amount" min="1" value="' + (editing ? Math.abs(editing.amount) : '') + '" placeholder="cth. 250000" required></label>'
    + '</div><div class="form-actions"><button type="submit" class="primary">' + (editing ? 'Simpan perubahan' : 'Tambah') + '</button>'
    + (editing ? ' <button type="button" data-action="tx-cancel-edit">Batal</button>' : '')
    + '</div></form></section>'
    + '<section class="card"><h2>Daftar transaksi</h2>'
    + '<div class="filters"><input type="search" id="tx-search" placeholder="Cari keterangan atau kategori…" value="' + esc(query.q || '') + '">'
    + '<select id="tx-type-filter"><option value="">Semua jenis</option>'
    + '<option value="expense"' + (query.type === 'expense' ? ' selected' : '') + '>Pengeluaran</option>'
    + '<option value="income"' + (query.type === 'income' ? ' selected' : '') + '>Pemasukan</option></select>'
    + '<select id="tx-cat-filter">' + catOptions + '</select></div>'
    + '<div id="tx-table-wrap">' + txTableHtml(state, query) + '</div></section>';
}

// ---- Budgets ------------------------------------------------------------

export function viewBudgets(state) {
  const m = state.month;
  const rows = EXPENSE_CATS.map((c) => {
    const spent = categorySpending(state, m, c.id);
    const limit = state.budgets[c.id];
    const over = spent > limit;
    const left = limit - spent;
    return '<div class="budget-row"><div class="budget-head"><span class="dot" style="background:' + c.color + '"></span>'
      + '<strong>' + esc(c.label) + '</strong>'
      + '<span class="num">' + fmtRp(spent) + ' / ' + fmtRp(limit) + '</span></div>'
      + bar(limit > 0 ? spent / limit : 0, over)
      + '<div class="budget-foot"><span class="' + (over ? 'neg' : 'pos') + '">'
      + (over ? 'Lewat ' + fmtRp(-left) : 'Sisa ' + fmtRp(left)) + ' · ' + fmtPct(limit > 0 ? spent / limit : 0) + ' terpakai</span>'
      + '<span class="budget-edit"><input type="number" min="0" value="' + limit + '" data-budget-input="' + c.id + '" aria-label="Anggaran ' + esc(c.label) + '">'
      + '<button data-action="budget-save" data-cat="' + c.id + '">Simpan</button></span></div></div>';
  }).join('');
  const totalSpent = EXPENSE_CATS.reduce((s, c) => s + categorySpending(state, m, c.id), 0);
  const totalLimit = EXPENSE_CATS.reduce((s, c) => s + state.budgets[c.id], 0);
  return monthNav(state)
    + '<section class="card"><h2>Anggaran ' + MONTH_LABELS[m] + '</h2>'
    + '<p>Total terpakai <strong>' + fmtRp(totalSpent) + '</strong> dari anggaran <strong>' + fmtRp(totalLimit) + '</strong>. '
    + 'Ubah angka anggaran di bawah — halaman ini langsung menghitung ulang.</p>'
    + rows + '</section>';
}

// ---- Goals --------------------------------------------------------------

export function viewGoals(state) {
  const cards = state.goals.map((g) => {
    const pct = g.target > 0 ? g.saved / g.target : 0;
    const left = g.target - g.saved;
    return '<div class="card goal-card"><h3>' + esc(g.name) + '</h3>'
      + (g.note ? '<p class="muted">' + esc(g.note) + '</p>' : '')
      + '<p class="big">' + fmtRp(g.saved) + ' <span class="muted">dari ' + fmtRp(g.target) + '</span></p>'
      + bar(pct, false)
      + '<p>' + fmtPct(pct) + ' tercapai · ' + (left > 0 ? 'kurang ' + fmtRp(left) : 'tercapai!') + '</p>'
      + '<div class="inline-form"><input type="number" min="1" placeholder="Jumlah (Rp)" data-goal-amount="' + g.id + '" aria-label="Tambah dana ' + esc(g.name) + '">'
      + '<button data-action="goal-add" data-goal="' + g.id + '">Tambah dana</button>'
      + '<button data-action="goal-delete" data-goal="' + g.id + '">Hapus tujuan</button></div></div>';
  }).join('');
  return '<section class="card"><h2>Tujuan tabungan</h2>'
    + '<p>Setiap rupiah yang tidak terpakai bulan ini bisa langsung masuk ke salah satu tujuan di bawah.</p>'
    + '<form id="goal-form" class="inline-form"><input type="text" name="goal-name" placeholder="Nama tujuan baru" required>'
    + '<input type="number" name="goal-target" min="1" placeholder="Target (Rp)" required>'
    + '<button type="submit" class="primary">Buat tujuan</button></form></section>'
    + '<section class="grid-2">' + cards + '</section>';
}

// ---- Bills --------------------------------------------------------------

export function viewBills(state) {
  const total = state.bills.reduce((s, b) => s + b.amount, 0);
  const paidTotal = state.bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  const unpaidTotal = total - paidTotal;
  const rows = state.bills.slice().sort((a, b) => a.due - b.due).map((b) => '<tr><td>' + esc(b.name) + '</td>'
    + '<td>tgl ' + b.due + '</td><td class="num">' + fmtRp(b.amount) + '</td>'
    + '<td><span class="badge ' + (b.paid ? 'paid' : 'due') + '">' + (b.paid ? 'Lunas' : 'Belum dibayar') + '</span></td>'
    + '<td class="num"><button data-action="bill-toggle" data-bill="' + b.id + '">' + (b.paid ? 'Batalkan' : 'Tandai lunas') + '</button></td></tr>').join('');
  return '<section class="card"><h2>Tagihan bulan ini</h2>'
    + '<p>Total tagihan <strong>' + fmtRp(total) + '</strong> · sudah dibayar <strong>' + fmtRp(paidTotal) + '</strong> · '
    + 'masih menunggu <strong>' + fmtRp(unpaidTotal) + '</strong>.</p>'
    + '<div class="table-wrap"><table><thead><tr><th>Tagihan</th><th>Jatuh tempo</th><th class="num">Jumlah</th><th>Status</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div>'
    + '<p class="muted">Tagihan yang belum dibayar ikut dihitung di dasbor, pada kartu “Sisa setelah tagihan”.</p></section>';
}

// ---- What-if planner ------------------------------------------------------

export function plannerResultHtml(state, plan) {
  const m = state.month;
  const spent = categorySpending(state, m, plan.cat);
  const cut = Math.round((spent * plan.cut) / 100);
  const saved = monthSaved(state, m);
  const next = saved + cut;
  const goal = state.goals.find((g) => g.id === plan.goal) || state.goals[0];
  if (!goal) return '<p class="muted">Buat dulu satu tujuan tabungan untuk memakai perencana ini.</p>';
  const before = monthsToGoal(goal, saved);
  const after = monthsToGoal(goal, next);
  const sooner = before === null || after === null ? null : before - after;
  let verdict;
  if (goal.target - goal.saved <= 0) {
    verdict = '<strong>' + esc(goal.name) + ' sudah tercapai.</strong>';
  } else if (sooner === null) {
    verdict = 'Bulan ini tidak ada tabungan, jadi memotong belanja belum bisa mempercepat tujuan — kurangi dulu pengeluaran lain atau tambah pemasukan.';
  } else if (sooner <= 0) {
    verdict = 'Potongan ini belum mengubah jadwal: <strong>' + esc(goal.name) + '</strong> tetap tercapai dalam <strong>' + after + ' bulan</strong>. Coba potongan yang lebih besar.';
  } else {
    verdict = '<strong>' + esc(goal.name) + ' tercapai ' + sooner + ' bulan lebih cepat</strong> — '
      + after + ' bulan, tadinya ' + before + ' bulan.';
  }
  return '<div class="result"><p>Memotong <strong>' + esc(catById(plan.cat).label) + '</strong> sebesar <strong>' + plan.cut + '%</strong> '
    + 'menghemat <strong>' + fmtRp(cut) + '</strong> per bulan.</p>'
    + '<p>Tabungan bulanan naik dari <strong>' + fmtRp(saved) + '</strong> menjadi <strong>' + fmtRp(next) + '</strong>.</p>'
    + '<p class="verdict">' + verdict + '</p></div>';
}

export function viewPlanner(state, plan) {
  const catOptions = EXPENSE_CATS.map((c) => '<option value="' + c.id + '"' + (plan.cat === c.id ? ' selected' : '') + '>'
    + esc(c.label) + ' (' + fmtRp(categorySpending(state, state.month, c.id)) + ')</option>').join('');
  const goalOptions = state.goals.map((g) => '<option value="' + g.id + '"' + (plan.goal === g.id ? ' selected' : '') + '>'
    + esc(g.name) + '</option>').join('');
  return '<section class="card"><h2>Perencana “bagaimana jika”</h2>'
    + '<p>Setiap rupiah punya tugas — dan setiap potongan punya hasil. Pilih satu kategori, potong sekian persen, '
    + 'dan lihat berapa bulan lebih cepat satu tujuan tercapai. Angka dihitung dari bulan '
    + MONTH_LABELS[state.month] + '.</p>'
    + '<div class="form-grid"><label>Kategori yang dipotong<select id="plan-cat">' + catOptions + '</select></label>'
    + '<label>Potongan: <strong id="plan-cut-label">' + plan.cut + '%</strong>'
    + '<input type="range" id="plan-cut" min="5" max="50" step="5" value="' + plan.cut + '"></label>'
    + '<label>Tujuan yang dikejar<select id="plan-goal">' + goalOptions + '</select></label></div>'
    + '<div id="plan-result">' + plannerResultHtml(state, plan) + '</div></section>';
}

// ---- Reports --------------------------------------------------------------

export function viewReports(state) {
  const income = MONTHS.map((m) => monthIncome(state, m));
  const spending = MONTHS.map((m) => monthSpending(state, m));
  const saved = MONTHS.map((m) => monthSaved(state, m));
  const short = { '2026-06': 'Jun', '2026-07': 'Jul', '2026-08': 'Agu', '2026-09': 'Sep', '2026-10': 'Okt', '2026-11': 'Nov' };
  const labels = MONTHS.map((m) => short[m]);
  const rows = MONTHS.map((m, i) => '<tr><td>' + MONTH_LABELS[m] + '</td>'
    + '<td class="num pos">' + fmtRp(income[i]) + '</td>'
    + '<td class="num neg">' + fmtRp(spending[i]) + '</td>'
    + '<td class="num">' + fmtRp(saved[i]) + '</td></tr>').join('');
  return '<section class="card"><h2>Pemasukan lawan pengeluaran</h2>'
    + '<canvas id="chart-bars" data-chart="bars"></canvas>'
    + '<p class="muted">Hijau pemasukan, oranye pengeluaran — enam bulan terakhir.</p></section>'
    + '<section class="grid-2"><div class="card"><h2>Pengeluaran per kategori</h2>'
    + '<canvas id="chart-donut" data-chart="donut"></canvas>'
    + '<p class="muted">Bulan ' + MONTH_LABELS[state.month] + '.</p></div>'
    + '<div class="card"><h2>Tren tabungan</h2>'
    + '<canvas id="chart-line" data-chart="line"></canvas>'
    + '<p class="muted">Tabungan bulanan menipis karena pengeluaran naik lebih cepat dari pemasukan — itu sebabnya perencana “bagaimana jika” ada.</p></div></section>'
    + '<section class="card"><h2>Angka per bulan</h2>'
    + '<div class="table-wrap"><table><thead><tr><th>Bulan</th><th class="num">Pemasukan</th><th class="num">Pengeluaran</th><th class="num">Ditabung</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div></section>';
}
