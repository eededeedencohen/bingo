/**
 * Every process.env read in the app happens here.
 *
 * Env vars are loaded by Node itself via `--env-file-if-exists=.env` in the npm
 * scripts — not by dotenv. `import 'dotenv/config'` only works when it is
 * lexically the first import, because ESM imports are hoisted and evaluated
 * before any module body runs; an import-sorting lint rule could silently move
 * it and every var would read as undefined without anything throwing. A CLI flag
 * cannot be reordered by a formatter.
 */

const bool = (value, fallback) => (value === undefined ? fallback : value === 'true');

export const IS_PROD = process.env.NODE_ENV === 'production';

export const PORT = Number(process.env.PORT ?? 4000);

/**
 * ADMIN_KEY is the machine credential — it stays valid for curl and tooling.
 * Humans log in at /admin with ADMIN_USER + ADMIN_PASSWORD and get a session
 * token instead, so the secret never sits in a URL or in browser history.
 */
export const ADMIN_KEY = process.env.ADMIN_KEY ?? 'dev-admin-key';
export const ADMIN_USER = process.env.ADMIN_USER ?? '';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
export const ADMIN_LOGIN_ENABLED = Boolean(ADMIN_USER && ADMIN_PASSWORD);

/** How long a browser session stays signed in. */
export const ADMIN_SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS ?? 8 * 60 * 60 * 1000);
export const STOP_ON_WIN = bool(process.env.STOP_ON_WIN, true);

/**
 * true  — any wrong mark anywhere on the card invalidates the claim
 *         ("you can't call bingo if you made a mistake").
 * false — only the completed line is judged, so a stray tap elsewhere is forgiven.
 */
export const STRICT_MARKS = bool(process.env.STRICT_MARKS, true);

export const CLAIM_COOLDOWN_MS = 1000;
export const MAX_NAME_LENGTH = 24;

export const ORIGIN_ALLOWLIST = (
  process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Render injects its own public URL. Trusting it means a deploy needs no manual
// CLIENT_ORIGIN at all — forgetting that variable would otherwise leave the
// socket unable to connect while the page itself loads fine, which looks like a
// broken app rather than a config mistake.
if (process.env.RENDER_EXTERNAL_URL) ORIGIN_ALLOWLIST.push(process.env.RENDER_EXTERNAL_URL);

// A production deploy on a custom domain with no CLIENT_ORIGIN loads the page
// fine and then silently fails to open the socket — which reads as "the app is
// broken" rather than "one variable is missing". Say so at boot instead.
if (IS_PROD && !process.env.CLIENT_ORIGIN && !process.env.RENDER_EXTERNAL_URL) {
  console.warn(
    '⚠️  NODE_ENV=production with no CLIENT_ORIGIN and no RENDER_EXTERNAL_URL.\n' +
      '    Browsers will be refused the socket connection. Set CLIENT_ORIGIN to the\n' +
      "    site's public URL (e.g. https://your-app.onrender.com).",
  );
}

/* ── Persistence ────────────────────────────────────────────────────────────── */

/**
 * Atlas hands you a URI with a literal `<PASSWORD>` placeholder and expects you to
 * substitute the secret, which keeps the password out of the URI in .env files
 * and out of anything that logs the connection string.
 */
function buildMongoUri() {
  const template = process.env.DATABASE;
  const password = process.env.DATABASE_PASSWORD;
  if (!template) return null;
  if (template.includes('<PASSWORD>') && !password) {
    console.error('❌ DATABASE contains <PASSWORD> but DATABASE_PASSWORD is unset.');
    return null;
  }
  // encodeURIComponent so a password containing @ / : ? # can't corrupt the URI.
  const uri = template.replace('<PASSWORD>', encodeURIComponent(password ?? ''));

  // Guard the database name. A URI with no path segment silently connects to
  // `test`, and this cluster also hosts an unrelated application's data — a
  // copy-pasted URI pointing at it would write game rounds into live records.
  const dbName = uri.match(/\.net\/([^/?]+)/)?.[1];
  if (!dbName) {
    console.error('❌ DATABASE has no database name in its path (…mongodb.net/<name>?…).');
    return null;
  }
  if (FORBIDDEN_DATABASES.has(dbName.toLowerCase())) {
    console.error(`❌ Refusing to use database "${dbName}" — it belongs to another application.`);
    return null;
  }

  return uri;
}

/** Databases this app must never write to, whatever the URI says. */
const FORBIDDEN_DATABASES = new Set(
  (process.env.FORBIDDEN_DATABASES ?? 'yitav,test,admin,local')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export const MONGO_URI = buildMongoUri();

/** No URI configured = run the game purely in memory. That is a supported mode. */
export const PERSISTENCE_ENABLED = Boolean(MONGO_URI);

/** Flush cadence for the write-behind outbox. */
export const PERSIST_FLUSH_MS = Number(process.env.PERSIST_FLUSH_MS ?? 2000);

/** Hard cap per outbox; overflow drops oldest and counts it rather than growing. */
export const PERSIST_MAX_QUEUE = Number(process.env.PERSIST_MAX_QUEUE ?? 5000);

/** A round older than this is never resurrected on boot. */
export const ROUND_RESUME_MAX_AGE_MS = Number(
  process.env.ROUND_RESUME_MAX_AGE_MS ?? 15 * 60 * 1000,
);

/** Redact credentials before anything reaches a log. */
export const safeUri = (uri) => (uri ?? '').replace(/\/\/[^@]*@/, '//***:***@');
