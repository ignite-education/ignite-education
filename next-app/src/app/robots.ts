import type { MetadataRoute } from 'next'

/**
 * robots.txt for THIS Vercel project's own hostname (next.ignite.education).
 *
 * The apex ignite.education is served by the root project, which has its own
 * public/robots.txt and no rewrite mapping /robots.txt here — so this file only
 * ever answers for the origin host. That host serves a byte-identical copy of
 * the whole public site, which Google would otherwise be free to index as
 * duplicate content (canonicals point at the apex, but that's mitigation, not
 * containment).
 *
 * Deliberately NOT an `X-Robots-Tag: noindex` header on this project: Vercel
 * external rewrites forward upstream response headers to the client, so that
 * header would ride along onto apex responses for /welcome, /courses/* and
 * /blog/* and deindex production. A middleware host-check can't distinguish the
 * two either — Vercel rewrites Host to the destination, so this app sees
 * `next.ignite.education` on both direct and proxied requests. robots.txt is
 * scoped per-host by definition and has no header to leak, which makes it the
 * only safe mechanism here.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  }
}
