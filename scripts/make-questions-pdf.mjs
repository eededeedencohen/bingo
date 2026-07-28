/**
 * Render the host's question booklet: every question and its answer, in Hebrew
 * with the English version beneath, grouped by theme.
 * Output: print/shekel-bingo-questions.pdf
 *
 * Usage:  node scripts/make-questions-pdf.mjs
 * Needs:  puppeteer-core (npm i -D puppeteer-core) + a local Chrome.
 *         Set CHROME_PATH if Chrome lives somewhere non-standard.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { QUESTIONS } from '../server/questions.js';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'print');
mkdirSync(OUT_DIR, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(
    existsSync,
  );

const markDataUri = `data:image/png;base64,${readFileSync(
  path.join(ROOT, 'client/public/shekel-mark.png'),
).toString('base64')}`;

/* ── Themes ─────────────────────────────────────────────────────────────────── */

const THEMES = {
  sea: { title: 'בים', icon: '🌊', accent: '#3f9e9d', soft: '#e4f5f4' },
  sun: { title: 'שמש וחום', icon: '☀️', accent: '#d78f2c', soft: '#fdf3e2' },
  food: { title: 'טעמים', icon: '🍉', accent: '#cf5270', soft: '#fbeaee' },
  fun: { title: 'חופש וכיף', icon: '🎈', accent: '#7c64a6', soft: '#efeaf7' },
  nature: { title: 'טבע בקיץ', icon: '🦋', accent: '#5a9e5d', soft: '#e9f4e9' },
};

/* ── HTML ───────────────────────────────────────────────────────────────────── */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function itemHtml(entry, number) {
  return `
  <div class="item">
    <div class="row">
      <div class="num">${number}</div>
      <div class="q">${esc(entry.he.q)}</div>
      <div class="a">${esc(entry.he.a)}</div>
    </div>
    <div class="en" dir="ltr">${esc(entry.en.q)} — <b>${esc(entry.en.a)}</b></div>
  </div>`;
}

function sectionHtml(themeKey, entries, startNumber) {
  const t = THEMES[themeKey];
  const items = entries.map((e, i) => itemHtml(e, startNumber + i)).join('');
  return `
  <section class="theme" style="--accent:${t.accent}; --soft:${t.soft};">
    <div class="theme-head">
      <span class="theme-icon">${t.icon}</span>
      <span class="theme-title">${t.title}</span>
      <span class="theme-count">${entries.length} שאלות</span>
    </div>
    ${items}
  </section>`;
}

function docHtml() {
  // The smallest theme shares page 1 with the cover; the rest keep bank order,
  // each on its own page.
  const themeOrder = [...new Set(QUESTIONS.map((q) => q.theme))];
  const count = (key) => QUESTIONS.filter((q) => q.theme === key).length;
  const smallest = themeOrder.reduce((a, b) => (count(b) < count(a) ? b : a));
  themeOrder.splice(themeOrder.indexOf(smallest), 1);
  themeOrder.unshift(smallest);
  let n = 1;
  const sections = themeOrder
    .map((key) => {
      const entries = QUESTIONS.filter((q) => q.theme === key);
      const html = sectionHtml(key, entries, n);
      n += entries.length;
      return html;
    })
    .join('');

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;900&display=swap" rel="stylesheet" />
<style>
  :root {
    --teal: #78c8c8; --teal-2: #4ca6a5; --teal-soft: #e4f5f4;
    --purple: #533a72; --purple-2: #7c64a6;
    --ink: #332a4a; --gray: #6b6b72;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: 'Heebo', sans-serif; color: var(--ink); }

  .cover {
    display: flex; align-items: center; gap: 6mm;
    border: 0.8mm solid var(--purple); border-radius: 5mm;
    padding: 5mm 7mm; margin-bottom: 6mm;
    background:
      radial-gradient(80mm 40mm at 8% -10%, rgba(120,200,200,.18), transparent 60%),
      radial-gradient(70mm 36mm at 95% -8%, rgba(124,100,166,.12), transparent 55%),
      white;
  }
  .cover .mark { height: 18mm; width: auto; }
  .cover .kicker { font-size: 4mm; font-weight: 700; color: var(--teal-2); letter-spacing: 0.3mm; }
  .cover .title { font-size: 9mm; font-weight: 900; color: var(--purple); line-height: 1.1; }
  .cover .subtitle { font-size: 3.6mm; color: var(--gray); margin-top: 1.5mm; }
  .cover .stats {
    margin-inline-start: auto; text-align: center;
    border: 0.5mm solid var(--teal-2); background: var(--teal-soft);
    border-radius: 3mm; padding: 2.5mm 5mm;
  }
  .cover .stats .big { font-size: 9mm; font-weight: 900; color: var(--purple); line-height: 1; }
  .cover .stats .small { font-size: 3mm; font-weight: 700; color: var(--teal-2); margin-top: 1mm; }

  /* One theme per page; the first shares the page with the cover. */
  .theme { break-before: page; }
  .cover + .theme { break-before: auto; }
  .theme-head {
    display: flex; align-items: baseline; gap: 3mm;
    background: var(--accent); color: white;
    border-radius: 3mm; padding: 2mm 4mm; margin-bottom: 2.5mm;
    break-after: avoid;
  }
  .theme-icon { font-size: 5mm; }
  .theme-title { font-size: 5.5mm; font-weight: 900; }
  .theme-count { margin-inline-start: auto; font-size: 3.2mm; font-weight: 700; opacity: .9; }

  .item {
    break-inside: avoid;
    border: 0.35mm solid var(--accent); border-inline-start-width: 1.4mm;
    border-radius: 2.5mm; background: white;
    padding: 2mm 3mm; margin-bottom: 2mm;
  }
  .row { display: flex; align-items: center; gap: 3mm; }
  .num {
    flex: none; width: 7mm; height: 7mm; border-radius: 50%;
    background: var(--soft); color: var(--accent);
    font-size: 3.4mm; font-weight: 900;
    display: flex; align-items: center; justify-content: center;
  }
  .q { flex: 1; font-size: 4mm; font-weight: 500; line-height: 1.35; }
  .a {
    flex: none; align-self: center; white-space: nowrap;
    background: var(--accent); color: white;
    font-size: 4mm; font-weight: 900;
    border-radius: 10mm; padding: 1.2mm 4mm;
  }
  .en { font-size: 2.9mm; color: var(--gray); margin-top: 0.8mm; margin-inline-start: 10mm; text-align: left; }
</style>
</head>
<body>
  <div class="cover">
    <img class="mark" src="${markDataUri}" alt="" />
    <div>
      <div class="kicker">בינגו שק״ל</div>
      <div class="title">חוברת שאלות ותשובות</div>
      <div class="subtitle">כל השאלות של משחק הקיץ, לפי נושא — התשובה בעיגול בסוף כל שורה, ומתחתיה הגרסה באנגלית.</div>
    </div>
    <div class="stats">
      <div class="big">${QUESTIONS.length}</div>
      <div class="small">שאלות</div>
    </div>
  </div>
  ${sections}
</body>
</html>`;
}

/* ── Render ─────────────────────────────────────────────────────────────────── */

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
page.setDefaultTimeout(180_000);
page.setDefaultNavigationTimeout(180_000);

await page.setContent(docHtml(), { waitUntil: 'load', timeout: 180_000 });
await page.evaluateHandle('document.fonts.ready');

if (process.env.QPDF_PREVIEW) {
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.screenshot({ path: process.env.QPDF_PREVIEW, fullPage: true });
  // Sanity-check the one-theme-per-page layout: every page's content must fit
  // the printable height (A4 297mm minus 9mm top / 12mm bottom margins).
  const heights = await page.evaluate(() => {
    const mm = (el) => Math.round(el.getBoundingClientRect().height / 3.7795);
    const cover = mm(document.querySelector('.cover'));
    return [...document.querySelectorAll('.theme')].map((s, i) => ({
      theme: s.querySelector('.theme-title').textContent,
      pageMm: mm(s) + (i === 0 ? cover + 6 : 0),
    }));
  });
  for (const h of heights) {
    const ok = h.pageMm <= 276 ? 'fits' : 'OVERFLOWS';
    console.log(`${h.theme}: ${h.pageMm}mm — ${ok} (276mm printable)`);
  }
}

const file = path.join(OUT_DIR, 'shekel-bingo-questions.pdf');
await page.pdf({
  path: file,
  format: 'A4',
  printBackground: true,
  margin: { top: '9mm', bottom: '12mm', left: '10mm', right: '10mm' },
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: `
    <div style="width:100%; font-size:8px; color:#6b6b72; text-align:center; font-family:sans-serif;">
      בינגו שק״ל · עמוד <span class="pageNumber"></span> מתוך <span class="totalPages"></span>
    </div>`,
});

const kb = Math.round(readFileSync(file).length / 1024);
console.log(`${path.basename(file)}: ${QUESTIONS.length} questions, ${kb}KB`);

await browser.close();
console.log('done');
