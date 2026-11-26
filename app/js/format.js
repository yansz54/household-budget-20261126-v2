// Hearth & Ledger — formatting helpers. Rupiah first, everything else
// plain: no library, no locale surprises beyond id-ID grouping.

export function fmtRp(n) {
  const v = Math.round(n);
  return 'Rp ' + Math.abs(v).toLocaleString('id-ID');
}

export function fmtRpSigned(n) {
  const v = Math.round(n);
  return (v < 0 ? '−Rp ' : '+Rp ') + Math.abs(v).toLocaleString('id-ID');
}

// Short form for chart labels: Rp 14,3 jt / Rp 850 rb.
export function fmtShort(n) {
  const v = Math.abs(n);
  if (v >= 1000000) {
    const jt = v / 1000000;
    const s = jt >= 10 ? String(Math.round(jt)) : jt.toFixed(1).replace('.', ',');
    return 'Rp ' + s + ' jt';
  }
  return 'Rp ' + Math.round(v / 1000) + ' rb';
}

export function fmtPct(n) {
  return Math.round(n * 100) + '%';
}

export function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return d + ' ' + names[m - 1] + ' ' + y;
}

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
