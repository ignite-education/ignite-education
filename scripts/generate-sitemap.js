/**
 * Build-time sitemap generator
 *
 * Fetches all courses and blog posts from Supabase and generates sitemap.xml
 * Run with: node scripts/generate-sitemap.js
 *
 * Called automatically during build via package.json scripts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function generateSitemap() {
  const baseUrl = 'https://www.ignite.education';
  const today = new Date().toISOString().split('T')[0];

  console.log('Generating sitemap...');

  // Static pages with priorities
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/welcome', priority: '0.9', changefreq: 'weekly' },
    { url: '/privacy', priority: '0.3', changefreq: 'monthly' },
    { url: '/terms', priority: '0.3', changefreq: 'monthly' }
  ];

  // Fetch all live and coming soon courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('name, updated_at')
    .in('status', ['live', 'coming_soon']);

  if (coursesError) {
    console.error('Error fetching courses:', coursesError);
  } else {
    console.log(`Found ${courses?.length || 0} courses`);
  }

  // Fetch all published blog posts
  const { data: posts, error: postsError } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published');

  if (postsError) {
    console.error('Error fetching blog posts:', postsError);
  } else {
    console.log(`Found ${posts?.length || 0} blog posts`);
  }

  // Build sitemap XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add static pages
  staticPages.forEach(page => {
    xml += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  // Add course pages (convert course names to URL-safe slugs)
  courses?.forEach(course => {
    const lastmod = course.updated_at?.split('T')[0] || today;
    // Convert course name to URL-safe slug: "Data Analyst" -> "data-analyst"
    const slug = course.name.toLowerCase().replace(/\s+/g, '-');
    xml += `  <url>
    <loc>${baseUrl}/courses/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  });

  // Add blog posts
  posts?.forEach(post => {
    const lastmod = post.updated_at?.split('T')[0] || today;
    xml += `  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  });

  xml += '</urlset>';

  // Write to public/sitemap.xml
  const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml);

  const totalUrls = staticPages.length + (courses?.length || 0) + (posts?.length || 0);
  console.log(`Sitemap generated with ${totalUrls} URLs`);
  console.log(`Written to: ${sitemapPath}`);
}

generateSitemap().catch(error => {
  console.error('Error generating sitemap:', error);
  process.exit(1);
});
