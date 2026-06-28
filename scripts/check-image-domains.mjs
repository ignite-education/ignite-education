#!/usr/bin/env node

/**
 * Storage Image Domain Health Check for Ignite Education
 *
 * Why this exists:
 *   All site images are served from the Supabase custom storage domain
 *   `auth.ignite.education`. When the Supabase project is paused, the
 *   custom-domain registration is torn down and the domain starts returning
 *   Cloudflare error 1014 (CNAME Cross-User Banned) → every image 403s while
 *   the underlying `<project-ref>.supabase.co` domain keeps working.
 *
 *   Run this after reactivating Supabase (or any time images look broken) to
 *   tell instantly whether the custom domain is healthy and, if not, whether
 *   the direct domain still serves the same assets.
 *
 * Usage:
 *   node scripts/check-image-domains.mjs
 */

const PROJECT_REF = 'yjvdakdghkfnlhdpbocg';
const CUSTOM_DOMAIN = 'auth.ignite.education';
const DIRECT_DOMAIN = `${PROJECT_REF}.supabase.co`;

// A few real assets referenced across the site.
const SAMPLE_ASSETS = [
  'assets/White%20Tick.png',
  'assets/Star-LandingPage.png',
  'assets/Bulb-LandingPage.png',
];

const STORAGE_PREFIX = 'storage/v1/object/public';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

function url(domain, asset) {
  return `https://${domain}/${STORAGE_PREFIX}/${asset}`;
}

async function probe(domain, asset) {
  const target = url(domain, asset);
  const started = Date.now();
  try {
    // GET (not HEAD) — Supabase storage edge can behave differently for HEAD.
    const res = await fetch(target, { method: 'GET', redirect: 'manual' });
    const ms = Date.now() - started;
    const cfError = res.status === 403 ? await res.text().catch(() => '') : '';
    return {
      ok: res.status === 200,
      status: res.status,
      ms,
      contentType: res.headers.get('content-type') || '',
      cfError: cfError.trim().slice(0, 60),
    };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, error: err.message };
  }
}

function fmt(domain, r) {
  const tag = r.ok ? `${GREEN}OK${RESET}` : `${RED}FAIL${RESET}`;
  const detail = r.error
    ? `${RED}${r.error}${RESET}`
    : `HTTP ${r.status}${r.cfError ? ` ${YELLOW}(${r.cfError})${RESET}` : ''} ${DIM}${r.contentType} ${r.ms}ms${RESET}`;
  return `  [${tag}] ${domain.padEnd(34)} ${detail}`;
}

async function main() {
  console.log(`\n🔎 Ignite image-domain health check (${new Date().toISOString()})\n`);

  let customHealthy = true;
  let directHealthy = true;

  for (const asset of SAMPLE_ASSETS) {
    console.log(`• ${decodeURIComponent(asset)}`);
    const [custom, direct] = await Promise.all([
      probe(CUSTOM_DOMAIN, asset),
      probe(DIRECT_DOMAIN, asset),
    ]);
    console.log(fmt(CUSTOM_DOMAIN, custom));
    console.log(fmt(DIRECT_DOMAIN, direct));
    if (!custom.ok) customHealthy = false;
    if (!direct.ok) directHealthy = false;
  }

  console.log('\n─── Diagnosis ───────────────────────────────────────────────');
  if (customHealthy) {
    console.log(`${GREEN}✓ Custom domain (${CUSTOM_DOMAIN}) is serving images. Site images should work.${RESET}`);
  } else if (directHealthy) {
    console.log(`${RED}✗ Custom domain (${CUSTOM_DOMAIN}) is DOWN, but the direct Supabase domain works.${RESET}`);
    console.log(`${YELLOW}  → This is the "paused project tore down the custom domain" failure (Cloudflare 1014).${RESET}`);
    console.log(`${YELLOW}  → Fix: re-activate the custom domain in Supabase (Settings → Custom Domains),${RESET}`);
    console.log(`${YELLOW}    or via CLI: supabase domains reverify --project-ref ${PROJECT_REF} && \\${RESET}`);
    console.log(`${YELLOW}                supabase domains activate --project-ref ${PROJECT_REF}${RESET}`);
    process.exitCode = 1;
  } else {
    console.log(`${RED}✗ BOTH domains are failing. Check that the Supabase project is unpaused and the${RESET}`);
    console.log(`${RED}  'assets' storage bucket exists and is public.${RESET}`);
    process.exitCode = 2;
  }
  console.log('');
}

main();
