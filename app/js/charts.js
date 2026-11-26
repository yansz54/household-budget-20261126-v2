// Hearth & Ledger — plain canvas charts, no library. Every chart draws
// from the numbers the store hands it, so a chart can never disagree
// with the tables on the same page.

import { fmtShort } from './format.js';

function setup(canvas, height) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.font = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
  return { ctx, width, height };
}

function niceMax(values) {
  const max = Math.max(1, ...values);
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

function gridlines(ctx, width, height, max, pad) {
  ctx.strokeStyle = '#e8dfd0';
  ctx.fillStyle = '#8a7f6d';
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i;
    const y = pad.top + (height - pad.top - pad.bottom) * (1 - i / 4);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(fmtShort(v), pad.left - 8, y);
  }
}

// Income vs spending, one grouped pair per month.
export function drawGroupedBars(canvas, labels, income, spending) {
  const { ctx, width, height } = setup(canvas, 260);
  const max = niceMax([...income, ...spending]);
  const pad = { top: 12, right: 10, bottom: 26, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  gridlines(ctx, width, height, max, pad);
  const n = labels.length;
  const slot = plotW / n;
  const barW = Math.min(22, (slot - 14) / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  labels.forEach((label, i) => {
    const x = pad.left + slot * i + slot / 2;
    const ih = (income[i] / max) * plotH;
    const sh = (spending[i] / max) * plotH;
    ctx.fillStyle = '#1f4d3a';
    ctx.fillRect(x - barW - 2, pad.top + plotH - ih, barW, ih);
    ctx.fillStyle = '#c4552d';
    ctx.fillRect(x + 2, pad.top + plotH - sh, barW, sh);
    ctx.fillStyle = '#5d5344';
    ctx.fillText(label, x, height - 20);
  });
}

// Spending by category, one slice each.
export function drawDonut(canvas, slices) {
  const { ctx, width, height } = setup(canvas, 240);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 14;
  const inner = r * 0.58;
  if (total <= 0) {
    ctx.fillStyle = '#8a7f6d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Belum ada pengeluaran bulan ini', cx, cy);
    return;
  }
  let a = -Math.PI / 2;
  for (const s of slices) {
    const sweep = (s.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a, a + sweep);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    a += sweep;
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#2b2620';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 15px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(fmtShort(total), cx, cy - 8);
  ctx.font = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = '#8a7f6d';
  ctx.fillText('pengeluaran', cx, cy + 10);
}

// Monthly saving trend, one point per month.
export function drawLine(canvas, labels, values) {
  const { ctx, width, height } = setup(canvas, 240);
  const max = niceMax(values);
  const pad = { top: 12, right: 14, bottom: 26, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  gridlines(ctx, width, height, max, pad);
  const n = labels.length;
  const px = (i) => pad.left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const py = (v) => pad.top + plotH * (1 - v / max);
  ctx.strokeStyle = '#1f4d3a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  values.forEach((v, i) => {
    if (i === 0) ctx.moveTo(px(i), py(v));
    else ctx.lineTo(px(i), py(v));
  });
  ctx.stroke();
  ctx.fillStyle = '#1f4d3a';
  values.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(px(i), py(v), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d5344';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(labels[i], px(i), height - 20);
    ctx.fillStyle = '#1f4d3a';
    ctx.textBaseline = 'bottom';
    // Edge points keep their value label inside the canvas.
    ctx.textAlign = i === 0 ? 'left' : i === n - 1 ? 'right' : 'center';
    ctx.fillText(fmtShort(v), px(i), py(v) - 8);
    ctx.fillStyle = '#1f4d3a';
  });
}
