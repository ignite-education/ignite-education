import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteConfig'
import { getAllCourseSlugs } from '@/lib/courseData'
import { getAllPublishedPosts } from '@/lib/blogData'
import { getAllProfessionSlugs } from '@/lib/professionUtils'
import { getAllPublicProfiles } from '@/lib/profileData'
import { getAllPromptSlugs } from '@/data/placeholderPrompts'

export const revalidate = 3600

/**
 * The sitemap.
 *
 * This lives in the Next app rather than the Vite root project (where
 * scripts/generate-sitemap.js used to write a static public/sitemap.xml) for
 * two reasons:
 *
 *  1. The noindex decisions are here. Profiles, /sign-in, /reset-password and
 *     /certificate/* are noindexed in their generateMetadata; a generator in
 *     another app inevitably drifts out of sync with them — which is how the
 *     repo ended up with three divergent sitemaps.
 *  2. Freshness. Publishing a blog post previously didn't reach the sitemap
 *     until someone deployed the *Vite* app. ISR picks it up within the hour.
 *
 * Deliberately excluded:
 *  - `/`            — 307s to /welcome; never list a redirecting URL.
 *  - `/sign-in`, `/reset-password`, `/certificate/*` — noindexed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courseSlugs, posts, professionSlugs, promptSlugs, profiles] = await Promise.all([
    getAllCourseSlugs(),
    getAllPublishedPosts(),
    getAllProfessionSlugs(),
    getAllPromptSlugs(),
    getAllPublicProfiles(),
  ])

  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/welcome`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/courses`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/prompts`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/release-notes`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const courses: MetadataRoute.Sitemap = courseSlugs.map((slug) => ({
    url: `${SITE_URL}/courses/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const blogPosts: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at || post.published_at || now),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const professions: MetadataRoute.Sitemap = professionSlugs.map((slug) => ({
    url: `${SITE_URL}/prompts/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const prompts: MetadataRoute.Sitemap = promptSlugs.map(({ professionSlug, slug }) => ({
    url: `${SITE_URL}/prompts/${professionSlug}/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  // Lowest priority of anything listed: these are the thinnest pages on the
  // site and there is eventually one per signup, so they should never outrank
  // the course/blog content in Google's crawl budget.
  const userProfiles: MetadataRoute.Sitemap = profiles.map((profile) => ({
    url: `${SITE_URL}/${profile.username}`,
    lastModified: new Date(profile.joined_at || now),
    changeFrequency: 'monthly',
    priority: 0.3,
  }))

  return [...staticPages, ...courses, ...blogPosts, ...professions, ...prompts, ...userProfiles]
}
