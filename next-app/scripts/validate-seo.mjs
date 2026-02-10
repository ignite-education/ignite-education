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
    expectedTypes: ['ItemList', 'FAQPage', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses',
    expectedTitle: /courses/i,
    expectedTypes: ['ItemList', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses/product-manager',
    expectedTitle: /product manager/i,
    expectedTypes: ['Course', 'FAQPage', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses/cyber-security-analyst',
    expectedTitle: /cyber security/i,
    expectedTypes: ['Course', 'FAQPage', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses/data-analyst',
    expectedTitle: /data analyst/i,
    expectedTypes: ['Course', 'FAQPage', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/courses/ux-designer',
    expectedTitle: /ux designer/i,
    expectedTypes: ['Course', 'FAQPage', 'BreadcrumbList', 'WebPage'],
    requireKeywords: true,
  },
  {
    path: '/blog/the-case-for-slow-dopamine',
    expectedTitle: /slow dopamine/i,
    expectedTypes: ['BlogPosting', 'BreadcrumbList'],
    requireKeywords: false,
  },
  {
    path: '/privacy',
    expectedTitle: /privacy/i,
    expectedTypes: ['BreadcrumbList'],
    requireKeywords: false,
  },
  {
    path: '/terms',
    expectedTitle: /terms/i,
    expectedTypes: ['BreadcrumbList'],
    requireKeywords: false,
  },
  {
    path: '/release-notes',
    expectedTitle: /release notes/i,
    expectedTypes: ['BreadcrumbList'],
    requireKeywords: false,
  },
  {
    path: '/sign-in',
    expectedTitle: /sign in/i,
    expectedTypes: [],
    requireKeywords: false,
  },
  {
    path: '/reset-password',
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
      // Handle array of schemas in a single script tag
      if (Array.isArray(parsed)) {
        scripts.push(...parsed);
      } else {
        scripts.push(parsed);
      }
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
  } else {
    fail(`Missing <title>`);
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
    for (const schema of jsonLd.filter((j) => !j._parseError)) {
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
  const expectedPaths = ['/welcome', '/courses', '/courses/product-manager', '/privacy', '/terms'];
  for (const path of expectedPaths) {
    if (xml.includes(`ignite.education${path}`)) {
      pass(`Contains ${path}`);
    } else {
      fail(`Missing ${path} from sitemap`);
    }
  }

  // Count URLs
  const urlCount = (xml.match(/<loc>/g) || []).length;
  pass(`${urlCount} URLs in sitemap`);
}

// ─── Robots.txt Validation ───────────────────────────────────────────────────

async function validateRobots() {
  section('Robots.txt (/robots.txt)');

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

  // We expect either a 404 or a 200 with a "not found" page
  if (res.status === 404) {
    pass(`Returns 404 for non-existent course`);
  } else if (res.status === 200) {
    const html = await res.text();
    if (/not found/i.test(html)) {
      warn(`Returns 200 with "not found" content (ideally should be 404)`);
    } else {
      fail(`Returns 200 without "not found" indication — may be indexing bad URLs`);
    }
  } else {
    warn(`Unexpected status ${res.status}`);
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
