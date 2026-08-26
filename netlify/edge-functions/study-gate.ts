import type { Context } from '@netlify/edge-functions';

/**
 * Password gate for /study/*.
 *
 * This runs at the edge, before the file is served, so a visitor without the
 * password never receives the page at all — there is nothing to find in view
 * source. A client-side check would ship the whole page and merely hide it.
 *
 * The password lives in the STUDY_PASSWORD environment variable, set in the
 * Netlify UI. It is never committed. If it is missing the gate refuses
 * everything rather than falling open.
 */

const COOKIE = 'fe_study';
const SALT = 'fe-study-v1';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string | null {
  try {
    // @ts-ignore - Netlify global, present at the edge.
    const v = Netlify.env.get('STUDY_PASSWORD');
    if (v) return v;
  } catch { /* fall through */ }
  try {
    // @ts-ignore - Deno global.
    return Deno.env.get('STUDY_PASSWORD') ?? null;
  } catch {
    return null;
  }
}

/** The cookie holds a hash of the password, so the password itself is never
 *  stored in the browser and the cookie cannot be forged without it. */
async function token(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(SALT + ':' + password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant time, so a wrong guess reveals nothing through response timing. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function loginPage(path: string, failed: boolean, status: number): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Private study page</title>
<meta name="robots" content="noindex, nofollow" />
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@600;700&family=Montserrat:wght@400;500&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg: #eef2ec; --panel: #fff; --line: #d5ddd2;
    --ink: #171c18; --muted: #626c64; --accent: #46814a; --bad: #bd5330;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0e110e; --panel: #171b17; --line: #262d26;
      --ink: #eaefe8; --muted: #98a29a; --accent: #6fa86a; --bad: #cd6236;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    background: var(--bg); color: var(--ink);
    font-family: Montserrat, system-ui, sans-serif;
  }
  .card {
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 16px; padding: 34px 30px; width: 100%; max-width: 380px;
    box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 10px 30px rgba(0,0,0,.08);
  }
  .mark {
    font-family: 'League Spartan', system-ui, sans-serif;
    font-size: 13px; letter-spacing: .16em; text-transform: uppercase;
    color: var(--muted); margin: 0 0 20px;
  }
  .mark b { color: var(--accent); font-weight: 700; }
  h1 {
    font-family: 'League Spartan', system-ui, sans-serif;
    font-size: 25px; font-weight: 700; letter-spacing: -.01em;
    margin: 0 0 8px; line-height: 1.15;
  }
  p.sub { margin: 0 0 22px; font-size: 14px; color: var(--muted); }
  label {
    display: block; font-size: 11px; letter-spacing: .12em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 7px;
  }
  input {
    width: 100%; padding: 11px 13px; font: inherit; font-size: 15px;
    color: var(--ink); background: var(--bg);
    border: 1px solid var(--line); border-radius: 9px;
  }
  input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  button {
    width: 100%; margin-top: 14px; padding: 12px;
    font-family: 'League Spartan', system-ui, sans-serif;
    font-size: 15px; font-weight: 600; letter-spacing: .02em;
    color: #fff; background: var(--accent);
    border: 0; border-radius: 9px; cursor: pointer;
  }
  button:hover { filter: brightness(1.06); }
  button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  .err {
    margin: 0 0 16px; padding: 9px 12px; font-size: 13.5px;
    color: var(--bad); border: 1px solid var(--bad); border-radius: 8px;
  }
</style>
</head>
<body>
  <form class="card" method="POST" action="${esc(path)}">
    <p class="mark"><b>Felt</b> Experience</p>
    <h1>Private study page</h1>
    <p class="sub">Enter the password to continue.</p>
    ${failed ? '<p class="err">That password is not right. Try again.</p>' : ''}
    <label for="p">Password</label>
    <input id="p" name="password" type="password" autocomplete="current-password" autofocus required />
    <button type="submit">Open</button>
  </form>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export default async function handler(request: Request, context: Context) {
  const pass = secret();
  const url = new URL(request.url);

  // Fail closed: no password configured means nobody gets in, rather than
  // the page quietly becoming public.
  if (!pass) {
    return new Response(
      'This page is not available yet: STUDY_PASSWORD is not set for this site.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } },
    );
  }

  const expected = await token(pass);

  if (request.method === 'POST') {
    let given = '';
    try {
      const form = await request.formData();
      given = String(form.get('password') ?? '');
    } catch { /* malformed body counts as a wrong answer */ }

    if (same(await token(given), expected)) {
      return new Response(null, {
        status: 303,
        headers: {
          location: url.pathname,
          'cache-control': 'no-store',
          'set-cookie':
            `${COOKIE}=${expected}; Path=/study; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return loginPage(url.pathname, true, 401);
  }

  const cookie = readCookie(request.headers.get('cookie'), COOKIE);
  if (cookie && same(cookie, expected)) {
    const res = await context.next();
    // A cached copy of a private page is a private page sitting in a cache.
    const out = new Response(res.body, res);
    out.headers.set('cache-control', 'private, no-store');
    out.headers.set('x-robots-tag', 'noindex, nofollow');
    return out;
  }

  return loginPage(url.pathname, false, 401);
}
