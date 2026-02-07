/**
 * Pre-render Script for SEO
 *
 * Renders all routes to static HTML files after build
 * This makes content visible to crawlers that don't execute JavaScript
 *
 * Run after build: npm run prerender
 *
 * Requires: npm install puppeteer --save-dev
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Route-specific metadata for SEO
const routeMetadata = {
  '/': {
    title: 'Ignite Education | Free Online Courses in Tech & Professional Skills',
    description: 'Learn Product Management, Data Analysis, UX Design, Cyber Security and more with free, expert-led courses. AI-powered learning with real-world projects.',
  },
  '/welcome': {
    title: 'Welcome to Ignite | Start Your Free Learning Journey',
    description: 'Discover free online courses in Product Management, Data Analysis, UX Design, and more. Expert-led lessons with AI-powered feedback.',
  },
  '/privacy': {
    title: 'Privacy Policy | Ignite Education',
    description: 'Learn how Ignite Education protects your privacy and handles your data in compliance with GDPR and UK data protection laws.',
  },
  '/terms': {
    title: 'Terms of Service | Ignite Education',
    description: 'Terms and conditions for using Ignite Education online learning platform.',
  },
};

// Course-specific metadata template
const getCourseMetadata = (course) => ({
  title: `Free ${course.name} Course | Ignite Education`,
  description: course.description?.slice(0, 155) + '...' ||
    `Learn ${course.name} skills with our free, expert-led online course. Includes AI-powered lessons, real-world projects, and a completion certificate.`,
});

// Blog post metadata template
const getBlogMetadata = (post) => ({
  title: `${post.title} | Ignite Blog`,
  description: post.meta_description || post.excerpt?.slice(0, 155) + '...',
});

async function getRoutesToPrerender() {
  const routes = [
    '/',
    '/welcome',
    '/privacy',
    '/terms',
  ];

  // Fetch all live courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('name, description, status')
    .in('status', ['live', 'coming_soon']);

  if (coursesError) {
    console.error('Error fetching courses:', coursesError);
  } else {
    console.log(`Found ${courses?.length || 0} courses to prerender`);
    courses?.forEach(course => {
      const slug = course.name.toLowerCase().replace(/\s+/g, '-');
      routes.push(`/courses/${slug}`);
      // Store metadata for later injection
      routeMetadata[`/courses/${slug}`] = getCourseMetadata(course);
    });
  }

  // Fetch all published blog posts
  const { data: posts, error: postsError } = await supabase
    .from('blog_posts')
    .select('slug, title, meta_description, excerpt')
    .eq('status', 'published');

  if (postsError) {
    console.error('Error fetching blog posts:', postsError);
  } else {
    console.log(`Found ${posts?.length || 0} blog posts to prerender`);
    posts?.forEach(post => {
      routes.push(`/blog/${post.slug}`);
      routeMetadata[`/blog/${post.slug}`] = getBlogMetadata(post);
    });
  }

  return routes;
}

async function prerender() {
  console.log('Starting pre-render process...\n');

  const distPath = path.join(__dirname, '..', 'dist');

  // Check if dist folder exists
  if (!fs.existsSync(distPath)) {
    console.error('Error: dist folder not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Get all routes to prerender
  const routes = await getRoutesToPrerender();
  console.log(`\nPre-rendering ${routes.length} routes...\n`);

  // Start a local server to serve the built app
  const server = await preview({
    preview: {
      port: 4173,
      strictPort: true,
    },
  });
  console.log('Local preview server started on port 4173');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set a reasonable viewport
  await page.setViewport({ width: 1280, height: 800 });

  for (const route of routes) {
    try {
      console.log(`Rendering: ${route}`);

      const url = `http://localhost:4173${route}`;
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for React to hydrate and SEO component to update meta tags
      await page.waitForFunction(() => {
        const title = document.title;
        // Wait until title is not just "Ignite" (the default)
        return title && title !== 'Ignite';
      }, { timeout: 10000 }).catch(() => {
        console.log(`  Warning: Title may not have updated for ${route}`);
      });

      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the fully rendered HTML
      let html = await page.content();

      // Get metadata for this route
      const meta = routeMetadata[route];
      if (meta) {
        // Update title tag if needed
        html = html.replace(
          /<title>.*?<\/title>/,
          `<title>${meta.title}</title>`
        );

        // Update meta description
        html = html.replace(
          /<meta name="description" content=".*?"/,
          `<meta name="description" content="${meta.description}"`
        );

        // Update OG title
        html = html.replace(
          /<meta property="og:title" content=".*?"/,
          `<meta property="og:title" content="${meta.title}"`
        );

        // Update OG description
        html = html.replace(
          /<meta property="og:description" content=".*?"/,
          `<meta property="og:description" content="${meta.description}"`
        );

        // Update canonical URL
        html = html.replace(
          /<link rel="canonical" href=".*?"/,
          `<link rel="canonical" href="https://ignite.education${route === '/' ? '' : route}"`
        );

        // Update OG URL
        html = html.replace(
          /<meta property="og:url" content=".*?"/,
          `<meta property="og:url" content="https://ignite.education${route === '/' ? '' : route}"`
        );
      }

      // Determine output path
      let outputPath;
      if (route === '/') {
        outputPath = path.join(distPath, 'index.html');
      } else {
        // Create directory structure: /courses/product-manager -> dist/courses/product-manager/index.html
        const routeDir = path.join(distPath, route);
        fs.mkdirSync(routeDir, { recursive: true });
        outputPath = path.join(routeDir, 'index.html');
      }

      // Write the pre-rendered HTML
      fs.writeFileSync(outputPath, html);
      console.log(`  Saved: ${outputPath.replace(distPath, 'dist')}`);

    } catch (error) {
      console.error(`  Error rendering ${route}:`, error.message);
    }
  }

  await browser.close();
  server.httpServer.close();

  console.log('\nPre-rendering complete!');
  console.log(`Total routes pre-rendered: ${routes.length}`);
}

prerender().catch(error => {
  console.error('Pre-render failed:', error);
  process.exit(1);
});
