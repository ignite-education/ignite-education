#!/usr/bin/env node

/**
 * SEO Validation Script for Ignite Education
 * Validates meta tags, structured data, OG tags, sitemap, and robots.txt
 * across all public pages.
 *
 * Usage: node next-app/scripts/validate-seo.mjs [--base-url https://ignite.education]
 */

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'https://ignite.education';

// ─── Page Definitions ────────────────────────────────────────────────────────

const PAGES = [
  {
    path: '/welcome',
    expectedTitle: /welcome/i,
    expectedTypes: ['WebSite', 'ItemList', 'FAQPage', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses',
    expectedTitle: /courses/i,
    expectedTypes: ['WebSite', 'ItemList', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses/product-manager',
    expectedTitle: /product manager/i,
    expectedTypes: ['WebSite', 'Course', 'FAQPage', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses/cyber-security-analyst',
    expectedTitle: /cyber security/i,
    expectedTypes: ['WebSite', 'Course', 'FAQPage', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses/data-analyst',
    expectedTitle: /data analyst/i,
    expectedTypes: ['WebSite', 'Course', 'FAQPage', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses/ux-designer',
    expectedTitle: /ux designer/i,
    expectedTypes: ['WebSite', 'Course', 'FAQPage', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/blog/the-case-for-slow-dopamine',
    expectedTitle: /slow dopamine/i,
    expectedTypes: ['WebSite', 'BlogPosting', 'BreadcrumbList'],
    requireKeywords: false,
  },
  {
    path: '/privacy',
    expectedTitle: /privacy/i,
    expectedTypes: ['WebSite', 'BreadcrumbList'],
    requireKeywords: false,
  },
  {
    path: '/terms',
    expectedTitle: /terms/i,
    expectedTypes: ['WebSite', 'BreadcrumbList'],
    requireKeywords: false,
  },
  {
    path: '/release-notes',
    expectedTitle: /release notes/i,
    expectedTypes: ['WebSite', 'BreadcrumbList'],
    requireKeywords: false,
  },
  {
    path: '/blog',
    expectedTitle: /blog/i,
    expectedTypes: ['WebSite', 'CollectionPage', 'BreadcrumbList'],
  },
  {
    path: '/prompts',
    expectedTitle: /prompt/i,
    expectedTypes: ['WebSite', 'CollectionPage', 'BreadcrumbList'],
    requireKeywords: true,
  },
  {
    path: '/prompts/data-analyst',
    expectedTitle: /prompt/i,
    expectedTypes: ['WebSite', 'CollectionPage', 'BreadcrumbList'],
  },
  {
    path: '/prompts/data-analyst/data-quality-audit',
    expectedTitle: /prompt/i,
    expectedTypes: ['WebSite', 'CreativeWork', 'BreadcrumbList'],
  },
  {
    path: '/sign-in',
    noindex: true,
    expectedTitle: /sign in/i,
    expectedTypes: [],
    requireKeywords: false,
  },
  {
    path: '/reset-password',
    noindex: true,
    expectedTitle: /reset|password/i,
    expectedTypes: [],
    requireKeywords: false,
  },
];

// ─── HTML Parsing Helpers ────────────────────────────────────────────────────

function extractTag(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : null;
}

function extractMetaContent(html, attr, name) {
  // Handles both name="x" content="y" and content="y" name="x" orderings
  const patterns = [
    new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]*)"`, 'i'),
    new RegExp(`<meta\\s+content="([^"]*)"\\s+${attr}="${name}"`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractJsonLd(html) {
  const scripts = [];
  const regex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      // Handle an array of schemas in one script tag, and @graph containers
      // (the site-wide Organization + WebSite entity uses @graph).
      // `_inGraph` marks nodes lifted out of an @graph container. They
      // legitimately have no own @context — it lives on the container — so the
      // @context assertion below must skip them.
      const flatten = (node, inGraph = false) => {
        if (Array.isArray(node)) return node.flatMap((n) => flatten(n, inGraph));
        if (node && Array.isArray(node['@graph'])) {
          return node['@graph'].flatMap((n) => flatten(n, true));
        }
        return [inGraph ? { ...node, _inGraph: true } : node];
      };
      scripts.push(...flatten(parsed));
    } catch {
      scripts.push({ _parseError: true, _raw: match[1].slice(0, 200) });
    }
  }
  return scripts;
}

// ─── Check Runner ────────────────────────────────────────────────────────────

let totalPass = 0;
let totalFail = 0;
let totalWarn = 0;

function pass(msg) {
  totalPass++;
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function fail(msg) {
  totalFail++;
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
}

function warn(msg) {
  totalWarn++;
  console.log(`  \x1b[33m⚠\x1b[0m ${msg}`);
}

function section(title) {
  console.log(`\n\x1b[1m\x1b[36m━━━ ${title} ━━━\x1b[0m`);
}

// ─── Page Validation ─────────────────────────────────────────────────────────

async function validatePage(page) {
  const url = `${BASE_URL}${page.path}`;
  section(`${page.path}`);

  let res;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch (e) {
    fail(`Fetch failed: ${e.message}`);
    return;
  }

  // Status code
  if (res.status === 200) {
    pass(`HTTP ${res.status}`);
  } else {
    fail(`HTTP ${res.status} (expected 200)`);
  }

  const html = await res.text();

  // Title
  const title = extractTag(html, /<title[^>]*>([^<]+)<\/title>/i);
  if (title) {
    pass(`Title: "${title}"`);
    if (page.expectedTitle && page.expectedTitle.test(title)) {
      pass(`Title matches expected pattern`);
    } else if (page.expectedTitle) {
      fail(`Title doesn't match pattern ${page.expectedTitle}`);
    }
    if (/ignite education/i.test(title)) {
      pass(`Title includes brand name`);
    } else {
      warn(`Title missing brand name "Ignite Education"`);
    }
    // The root layout applies a `%s | Ignite Education` template, so any title
    // that already carries the brand renders double- or triple-branded.
    const brandCount = (title.match(/ignite/gi) || []).length;
    if (brandCount > 1) {
      fail(`Title is multi-branded (${brandCount}x "Ignite"): "${title}"`);
    } else {
      pass(`Title is branded exactly once`);
    }
  } else {
    fail(`Missing <title>`);
  }

  // Canonical — previously unchecked entirely.
  const canonical = extractTag(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || extractTag(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const expectsCanonical = page.noindex !== true;
  if (canonical) {
    if (!/^https:\/\/ignite\.education\//.test(canonical)) {
      fail(`Canonical is not an absolute apex URL: ${canonical}`);
    } else if (canonical.replace('https://ignite.education', '') !== page.path) {
      fail(`Canonical "${canonical}" does not match request path "${page.path}"`);
    } else {
      pass(`Canonical: ${canonical}`);
    }
  } else if (expectsCanonical) {
    fail(`Missing <link rel="canonical">`);
  } else {
    pass(`No canonical (page is noindex)`);
  }

  // Robots directive
  const robotsMeta = extractMetaContent(html, 'name', 'robots');
  if (page.noindex) {
    if (robotsMeta && /noindex/i.test(robotsMeta)) pass(`Robots: ${robotsMeta}`);
    else fail(`Expected noindex, got "${robotsMeta || 'no robots meta'}"`);
  } else if (robotsMeta && /noindex/i.test(robotsMeta)) {
    fail(`Page is unexpectedly noindexed: "${robotsMeta}"`);
  } else {
    pass(`Indexable (no noindex directive)`);
  }

  // Meta description
  const desc = extractMetaContent(html, 'name', 'description');
  if (desc) {
    if (desc.length >= 50 && desc.length <= 300) {
      pass(`Description (${desc.length} chars): "${desc.slice(0, 80)}..."`);
    } else {
      warn(`Description length ${desc.length} (ideal: 50-300): "${desc.slice(0, 80)}..."`);
    }
  } else {
    fail(`Missing meta description`);
  }

  // Keywords
  const keywords = extractMetaContent(html, 'name', 'keywords');
  if (keywords) {
    pass(`Keywords present (${keywords.split(',').length} terms)`);
  } else if (page.requireKeywords) {
    fail(`Missing keywords (expected for this page)`);
  } else {
    // Not required, just note it
    pass(`Keywords not required for this page type`);
  }

  // OpenGraph tags
  const ogTitle = extractMetaContent(html, 'property', 'og:title');
  const ogDesc = extractMetaContent(html, 'property', 'og:description');
  const ogUrl = extractMetaContent(html, 'property', 'og:url');
  const ogType = extractMetaContent(html, 'property', 'og:type');

  if (ogTitle) pass(`OG title: "${ogTitle}"`);
  else fail(`Missing og:title`);

  if (ogDesc) pass(`OG description present`);
  else fail(`Missing og:description`);

  // og:image — previously not extracted at all, which is how a 404ing
  // og-image.png shipped on every page for months. Verify it RESOLVES.
  const ogImage = extractMetaContent(html, 'property', 'og:image');
  if (!ogImage) {
    fail(`Missing og:image`);
  } else if (!/^https?:\/\//.test(ogImage)) {
    fail(`og:image is not an absolute URL: ${ogImage}`);
  } else {
    try {
      const imgRes = await fetch(ogImage, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      const ct = imgRes.headers.get('content-type') || '';
      // Some CDNs answer a Range request with a multi-value Content-Type, so
      // match a substring rather than a prefix. `text/html` here means the apex
      // catch-all served the SPA shell where an image was declared.
      if (imgRes.ok && /image\//.test(ct)) {
        pass(`og:image resolves (${ct}): ${ogImage.slice(0, 70)}`);
      } else {
        fail(`og:image does not resolve to an image — HTTP ${imgRes.status}, Content-Type "${ct}": ${ogImage}`);
      }
    } catch (e) {
      fail(`og:image fetch failed: ${e.message}`);
    }
  }

  if (ogUrl) {
    if (ogUrl.includes('ignite.education') && !ogUrl.includes('next.ignite.education')) {
      pass(`OG URL correct: ${ogUrl}`);
    } else {
      fail(`OG URL uses wrong domain: ${ogUrl}`);
    }
  } else {
    fail(`Missing og:url`);
  }

  if (ogType) pass(`OG type: ${ogType}`);
  else warn(`Missing og:type`);

  // Twitter card
  const twCard = extractMetaContent(html, 'name', 'twitter:card');
  const twTitle = extractMetaContent(html, 'name', 'twitter:title');

  if (twCard === 'summary_large_image') {
    pass(`Twitter card: summary_large_image`);
  } else if (twCard) {
    warn(`Twitter card: "${twCard}" (expected summary_large_image)`);
  } else {
    fail(`Missing twitter:card`);
  }

  if (twTitle) pass(`Twitter title present`);
  else fail(`Missing twitter:title`);

  // JSON-LD structured data
  const jsonLd = extractJsonLd(html);
  if (jsonLd.length > 0) {
    pass(`${jsonLd.length} JSON-LD script(s) found`);

    // Check for parse errors
    const parseErrors = jsonLd.filter((j) => j._parseError);
    if (parseErrors.length > 0) {
      fail(`${parseErrors.length} JSON-LD script(s) failed to parse`);
    }

    // Check expected types
    const foundTypes = jsonLd
      .filter((j) => !j._parseError)
      .map((j) => j['@type'])
      .filter(Boolean);

    for (const expectedType of page.expectedTypes) {
      if (foundTypes.includes(expectedType)) {
        pass(`Structured data: ${expectedType}`);
      } else {
        fail(`Missing structured data type: ${expectedType}`);
      }
    }

    // Validate @context
    for (const schema of jsonLd.filter((j) => !j._parseError && !j._inGraph)) {
      if (schema['@context'] !== 'https://schema.org') {
        warn(`JSON-LD @context is "${schema['@context']}" (expected "https://schema.org")`);
      }
    }
  } else if (page.expectedTypes.length > 0) {
    fail(`No JSON-LD found (expected: ${page.expectedTypes.join(', ')})`);
  } else {
    pass(`No JSON-LD expected for this page`);
  }
}

// ─── Sitemap Validation ──────────────────────────────────────────────────────

async function validateSitemap() {
  section('Sitemap (/sitemap.xml)');

  let res;
  try {
    res = await fetch(`${BASE_URL}/sitemap.xml`);
  } catch (e) {
    fail(`Fetch failed: ${e.message}`);
    return;
  }

  if (res.status === 200) pass(`HTTP ${res.status}`);
  else fail(`HTTP ${res.status}`);

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('xml')) {
    pass(`Content-Type: ${contentType}`);
  } else {
    warn(`Content-Type: "${contentType}" (expected xml)`);
  }

  const xml = await res.text();

  if (xml.includes('<?xml')) pass(`Valid XML declaration`);
  else fail(`Missing XML declaration`);

  if (xml.includes('<urlset')) pass(`Contains <urlset>`);
  else fail(`Missing <urlset>`);

  // Check for expected URLs
  const expectedPaths = ['/welcome', '/courses', '/blog', '/prompts', '/courses/product-manager', '/privacy', '/terms'];
  for (const path of expectedPaths) {
    if (xml.includes(`<loc>https://ignite.education${path}</loc>`) || xml.includes(`ignite.education${path}<`)) {
      pass(`Contains ${path}`);
    } else {
      fail(`Missing ${path} from sitemap`);
    }
  }

  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

  // A sitemap must not list URLs that redirect or are noindexed.
  if (locs.includes('https://ignite.education/')) {
    fail(`Lists the bare "/" URL, which 307s to /welcome — never sitemap a redirect`);
  } else {
    pass(`Does not list the redirecting "/" URL`);
  }

  const KNOWN_TOP_LEVEL = new Set(['welcome', 'courses', 'blog', 'prompts', 'privacy', 'terms', 'release-notes']);
  const profileUrls = locs.filter((l) => {
    const path = l.replace(/^https?:\/\/[^/]+\//, '');
    return path && !path.includes('/') && !KNOWN_TOP_LEVEL.has(path);
  });
  if (profileUrls.length) {
    fail(`Lists ${profileUrls.length} noindexed profile URL(s), e.g. ${profileUrls[0]}`);
  } else {
    pass(`Contains no noindexed profile URLs`);
  }

  const nonApex = locs.filter((l) => !l.startsWith('https://ignite.education/'));
  if (nonApex.length) {
    fail(`${nonApex.length} URL(s) are not on the apex host, e.g. ${nonApex[0]}`);
  } else {
    pass(`All URLs use the apex host`);
  }

  pass(`${locs.length} URLs in sitemap`);
}

// ─── Robots.txt Validation ───────────────────────────────────────────────────

async function validateRobots() {
  section('Robots.txt (/robots.txt)');

  // The apex robots.txt is served from the ROOT (Vite) project's public/ dir.
  // The Next origin serves its own "Disallow: /" via app/robots.ts, so these
  // assertions only make sense against the apex.
  if (!BASE_URL.startsWith('https://ignite.education')) {
    warn('Skipped — apex-only check (this origin serves its own Disallow: / robots.txt)');
    return;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}/robots.txt`);
  } catch (e) {
    fail(`Fetch failed: ${e.message}`);
    return;
  }

  if (res.status === 200) pass(`HTTP ${res.status}`);
  else fail(`HTTP ${res.status}`);

  const text = await res.text();

  if (text.includes('User-agent:')) pass(`Contains User-agent directive`);
  else fail(`Missing User-agent directive`);

  if (text.includes('Disallow: /admin')) pass(`Disallows /admin`);
  else fail(`Missing Disallow: /admin`);

  if (text.includes('Disallow: /api/')) pass(`Disallows /api/`);
  else warn(`Missing Disallow: /api/`);

  if (text.includes('Sitemap:') && text.includes('ignite.education/sitemap.xml')) {
    pass(`Sitemap directive present and correct`);
  } else {
    fail(`Missing or incorrect Sitemap directive`);
  }
}

// ─── 404 Handling ────────────────────────────────────────────────────────────

async function validate404() {
  section('404 Handling (/courses/nonexistent-test-slug)');

  let res;
  try {
    res = await fetch(`${BASE_URL}/courses/nonexistent-test-slug`, { redirect: 'follow' });
  } catch (e) {
    fail(`Fetch failed: ${e.message}`);
    return;
  }

  // A 200 with "not found" content is a SOFT 404 — Google logs it as such and
  // uses it to discount the whole directory. This used to be a warn; it is a
  // failure. See courses/[courseSlug]/layout.tsx for the cause and the fix.
  if (res.status === 404) {
    pass(`Returns 404 for non-existent course`);
  } else if (res.status === 200) {
    const html = await res.text();
    if (/not found/i.test(html)) {
      fail(`SOFT 404: returns 200 with "not found" content (must be a real 404)`);
    } else {
      fail(`Returns 200 without "not found" indication — may be indexing bad URLs`);
    }
  } else {
    warn(`Unexpected status ${res.status}`);
  }

  // Same defect class on the blog route.
  section('404 Handling (/blog/does-not-exist)');
  try {
    const blogRes = await fetch(`${BASE_URL}/blog/does-not-exist`, { redirect: 'follow' });
    if (blogRes.status === 404) {
      pass(`Returns 404 for non-existent post`);
    } else {
      fail(`SOFT 404: returns ${blogRes.status} for a non-existent post (must be 404)`);
    }
  } catch (e) {
    fail(`Fetch failed: ${e.message}`);
  }
}

// ─── Staging Host Containment ────────────────────────────────────────────────

/**
 * next.ignite.education serves a byte-identical copy of the whole public site.
 * Its own robots.txt must disallow everything, or Google is free to index the
 * duplicate. Note this must NOT be done with an X-Robots-Tag header on that
 * project — Vercel rewrites forward upstream headers, so it would ride along
 * onto apex responses and deindex production.
 */
async function validateStagingHost() {
  section('Staging host containment (next.ignite.education)');

  if (!BASE_URL.includes('//ignite.education')) {
    warn('Skipped — only meaningful when validating the production apex');
    return;
  }

  try {
    const res = await fetch('https://next.ignite.education/robots.txt');
    if (res.status !== 200) {
      fail(`next.ignite.education/robots.txt returned ${res.status} (expected 200)`);
      return;
    }
    const txt = await res.text();
    if (/^\s*Disallow:\s*\/\s*$/im.test(txt)) {
      pass('Origin host robots.txt disallows all crawling');
    } else {
      fail(`Origin host robots.txt does not "Disallow: /" — duplicate site is crawlable`);
    }
  } catch (e) {
    fail(`Fetch failed: ${e.message}`);
  }

  // The apex must NOT inherit a noindex header from the origin project.
  try {
    const res = await fetch(`${BASE_URL}/welcome`);
    const xRobots = res.headers.get('x-robots-tag');
    if (xRobots && /noindex/i.test(xRobots)) {
      fail(`CRITICAL: apex /welcome carries "X-Robots-Tag: ${xRobots}" — production is deindexed`);
    } else {
      pass('Apex carries no noindex X-Robots-Tag header');
    }
  } catch (e) {
    fail(`Fetch failed: ${e.message}`);
  }
}

// ─── Manual Checklist ────────────────────────────────────────────────────────

function printManualChecklist() {
  console.log(`
\x1b[1m\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
\x1b[1m  Manual SEO Checklist — External Tools\x1b[0m
\x1b[1m\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m

  \x1b[1m1. Google Rich Results Test\x1b[0m
     https://search.google.com/test/rich-results
     Test these URLs:
     - ${BASE_URL}/welcome
     - ${BASE_URL}/courses
     - ${BASE_URL}/courses/product-manager
     - ${BASE_URL}/blog/the-case-for-slow-dopamine

  \x1b[1m2. Lighthouse (Chrome DevTools → Lighthouse tab)\x1b[0m
     Run on: /welcome, /courses, /courses/product-manager
     Targets: Performance > 90, SEO > 95, Accessibility > 90

  \x1b[1m3. Facebook Sharing Debugger\x1b[0m
     https://developers.facebook.com/tools/debug/
     Paste: ${BASE_URL}/welcome
     Verify OG image, title, description render correctly

  \x1b[1m4. Twitter/X Card Validator\x1b[0m
     https://cards-dev.twitter.com/validator
     Verify summary_large_image card renders for course pages

  \x1b[1m5. Schema.org Validator\x1b[0m
     https://validator.schema.org/
     Paste JSON-LD from /courses/product-manager

  \x1b[1m6. Google Search Console\x1b[0m
     - Submit sitemap: ${BASE_URL}/sitemap.xml
     - Check Coverage report for crawl errors
     - Verify index status for migrated pages
`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m║       Ignite Education — SEO Validation Suite                ║\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════╝\x1b[0m`);
  console.log(`  Base URL: ${BASE_URL}\n`);

  // Validate all pages
  for (const page of PAGES) {
    await validatePage(page);
  }

  // Sitemap, robots, 404
  await validateSitemap();
  await validateRobots();
  await validate404();
  await validateStagingHost();

  // Summary
  console.log(`\n\x1b[1m\x1b[36m━━━ Summary ━━━\x1b[0m`);
  console.log(`  \x1b[32m✓ ${totalPass} passed\x1b[0m`);
  if (totalFail > 0) console.log(`  \x1b[31m✗ ${totalFail} failed\x1b[0m`);
  if (totalWarn > 0) console.log(`  \x1b[33m⚠ ${totalWarn} warnings\x1b[0m`);
  console.log();

  // Manual checklist
  printManualChecklist();

  // Exit code
  process.exit(totalFail > 0 ? 1 : 0);
}

main();
