/**
 * Render the printed bingo sheets: one A4-portrait PDF per board size, two
 * boards per page, each carrying its ID. Output: print/shekel-bingo-{3,4,5}x.pdf
 *
 * Usage:  node scripts/make-paper-pdf.mjs
 * Needs:  puppeteer-core (npm i -D puppeteer-core) + a local Chrome.
 *         Set CHROME_PATH if Chrome lives somewhere non-standard.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAPER_BOARDS } from '../server/paper-boards.js';
import { QUESTION_BY_ID } from '../server/game.js';

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

// The mark is embedded as a data URI so the page needs zero network for images.
const markDataUri = `data:image/png;base64,${readFileSync(
  path.join(ROOT, 'client/public/shekel-mark.png'),
).toString('base64')}`;

/* ── HTML ───────────────────────────────────────────────────────────────────── */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function cellHtml(qid, size) {
  if (qid === null) {
    return `<div class="cell free"><div class="heart">♥</div><div class="free-label">חופשי</div></div>`;
  }
  const answer = QUESTION_BY_ID.get(qid).he.a;
  return `<div class="cell"><span>${esc(answer)}</span></div>`;
}

function boardHtml(board) {
  const rows = board.cells
    .map((row) => row.map((qid) => cellHtml(qid, board.size)).join(''))
    .join('');
  return `
  <div class="card size-${board.size}">
    <div class="head">
      <img class="mark" src="${markDataUri}" alt="" />
      <div class="titles">
        <div class="title">בינגו שק״ל</div>
        <div class="subtitle">סמנו את התשובה כששואלים את השאלה שלה · שורה, טור או אלכסון מלא = בינגו!</div>
      </div>
      <div class="badge"><div class="badge-label">מס׳ לוח</div><div class="badge-id">${board.id}</div></div>
    </div>
    <div class="grid" style="grid-template-columns: repeat(${board.size}, 1fr);">${rows}</div>
  </div>`;
}

function pageHtml(pair) {
  return `<section class="page">${pair.map(boardHtml).join('<div class="cut"></div>')}</section>`;
}

function docHtml(boards) {
  const pages = [];
  for (let i = 0; i < boards.length; i += 2) pages.push(pageHtml(boards.slice(i, i + 2)));
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;900&display=swap" rel="stylesheet" />
<style>
  :root {
    --teal: #78c8c8; --teal-2: #4ca6a5; --teal-soft: #e4f5f4;
    --purple: #533a72; --purple-2: #7c64a6; --purple-soft: #efeaf7;
    --ink: #332a4a; --gray: #6b6b72;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: 'Heebo', sans-serif; color: var(--ink); }
  .page {
    width: 210mm; height: 296mm; padding: 9mm 10mm;
    display: flex; flex-direction: column; justify-content: space-between;
    page-break-after: always;
  }
  .cut { border-top: 1px dashed #b9b3c6; margin: 4mm 0; position: relative; }
  .cut::after { content: '✂'; position: absolute; right: 2mm; top: -3.2mm; color: #b9b3c6; font-size: 4mm; }

  .card {
    border: 0.8mm solid var(--purple); border-radius: 5mm; padding: 5mm;
    height: 132mm; display: flex; flex-direction: column;
    background:
      radial-gradient(80mm 40mm at 8% -10%, rgba(120,200,200,.18), transparent 60%),
      radial-gradient(70mm 36mm at 95% -8%, rgba(124,100,166,.12), transparent 55%),
      white;
  }
  .head { display: flex; align-items: center; gap: 4mm; margin-bottom: 4mm; }
  .mark { height: 13mm; width: auto; }
  .titles { flex: 1; min-width: 0; }
  .title { font-size: 8mm; font-weight: 900; color: var(--purple); line-height: 1.05; }
  .subtitle { font-size: 3mm; color: var(--gray); margin-top: 1mm; }
  .badge {
    border: 0.5mm solid var(--teal-2); background: var(--teal-soft);
    border-radius: 3mm; padding: 1.5mm 3.5mm; text-align: center;
  }
  .badge-label { font-size: 2.6mm; color: var(--teal-2); font-weight: 700; }
  .badge-id { font-size: 8mm; font-weight: 900; color: var(--purple); line-height: 1; direction: ltr; }

  .grid { flex: 1; display: grid; gap: 2mm; }
  .cell {
    border: 0.4mm solid rgba(83,58,114,.35); border-radius: 2.5mm;
    display: flex; align-items: center; justify-content: center; text-align: center;
    padding: 1.5mm; font-weight: 700; background: white;
    overflow: hidden;
  }
  .size-3 .cell { font-size: 6.5mm; }
  .size-4 .cell { font-size: 5mm; }
  .size-5 .cell { font-size: 3.9mm; }
  .cell.free {
    background: var(--purple); color: white; flex-direction: column; gap: 1mm;
    border-color: var(--purple);
  }
  .heart { font-size: 7mm; line-height: 1; }
  .free-label { font-size: 3.2mm; font-weight: 700; }
</style>
</head>
<body>${pages.join('')}</body>
</html>`;
}

/* ── Render ─────────────────────────────────────────────────────────────────── */

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
// 25 pages of grids + a webfont fetch: give layout room to breathe.
page.setDefaultTimeout(180_000);
page.setDefaultNavigationTimeout(180_000);

for (const size of [3, 4, 5]) {
  const boards = PAPER_BOARDS.filter((b) => b.size === size);
  const html = docHtml(boards);

  await page.setContent(html, { waitUntil: 'load', timeout: 180_000 });
  await page.evaluateHandle('document.fonts.ready');

  const file = path.join(OUT_DIR, `shekel-bingo-${size}x${size}.pdf`);
  await page.pdf({ path: file, format: 'A4', printBackground: true });

  const kb = Math.round(readFileSync(file).length / 1024);
  console.log(`${path.basename(file)}: ${boards.length} boards, ${boards.length / 2} pages, ${kb}KB`);
}

await browser.close();
console.log('done');
