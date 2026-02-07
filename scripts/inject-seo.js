/**
 * SEO Injection Script
 *
 * Lightweight alternative to Puppeteer-based prerendering.
 * Injects page-specific meta tags into HTML files without needing a browser.
 * Works on Vercel and other serverless environments.
 *
 * Run after build: npm run inject-seo
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

// Route-specific metadata for SEO
const routeMetadata = {
  '/': {
    title: 'Ignite Education | Free Online Courses in Tech & Professional Skills',
    description: 'Learn Product Management, Data Analysis, UX Design, Cyber Security and more with free, expert-led courses. AI-powered learning with real-world projects.',
    keywords: 'free online courses, product management course, data analyst course, cyber security training, UX design course, AI-powered learning, tech skills, career development',
  },
  '/welcome': {
    title: 'Welcome to Ignite | Start Your Free Learning Journey',
    description: 'Discover free online courses in Product Management, Data Analysis, UX Design, and more. Expert-led lessons with AI-powered feedback and real-world projects.',
    keywords: 'free courses, online learning, product management, data analysis, cyber security, UX design, career change, professional development',
  },
  '/privacy': {
    title: 'Privacy Policy | Ignite Education',
    description: 'Learn how Ignite Education protects your privacy and handles your data in compliance with GDPR and UK data protection laws.',
    keywords: 'privacy policy, data protection, GDPR, Ignite Education',
  },
  '/terms': {
    title: 'Terms of Service | Ignite Education',
    description: 'Terms and conditions for using Ignite Education online learning platform.',
    keywords: 'terms of service, terms and conditions, Ignite Education',
  },
  '/progress': {
    title: 'Your Progress | Ignite Education',
    description: 'Track your learning progress and continue your courses on Ignite Education.',
    keywords: 'learning progress, course tracker, Ignite Education',
  },
  '/learning': {
    title: 'Learning | Ignite Education',
    description: 'Continue your learning journey with Ignite Education.',
    keywords: 'online learning, courses, Ignite Education',
  },
};

// Course-specific metadata template
const getCourseMetadata = (course) => {
  const courseTitle = course.name;
  return {
    title: `Become a ${courseTitle} | Ignite Education`,
    description: course.description?.slice(0, 155) + '...' ||
      `Learn ${courseTitle} skills with our free, expert-led online course. Includes AI-powered lessons, real-world projects, and a completion certificate.`,
    keywords: `${courseTitle.toLowerCase()} course, ${courseTitle.toLowerCase()} training, free ${courseTitle.toLowerCase()} course, learn ${courseTitle.toLowerCase()}, ${courseTitle.toLowerCase()} certification, online ${courseTitle.toLowerCase()} course`,
  };
};

// Blog post metadata template
const getBlogMetadata = (post) => ({
  title: `${post.title} | Ignite Blog`,
  description: post.meta_description || post.excerpt?.slice(0, 155) + '...',
  keywords: 'career advice, professional development, learning tips, tech careers',
});

/**
 * Inject meta tags into HTML content
 */
function injectMetaTags(html, meta, route) {
  const baseUrl = 'https://ignite.education';
  const canonicalUrl = `${baseUrl}${route === '/' ? '' : route}`;

  // Replace title
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${meta.title}</title>`
  );

  // Replace meta name="title"
  html = html.replace(
    /<meta name="title" content=".*?"/,
    `<meta name="title" content="${meta.title}"`
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content=".*?"/,
    `<meta name="description" content="${meta.description}"`
  );

  // Replace keywords if provided
  if (meta.keywords) {
    html = html.replace(
      /<meta name="keywords" content=".*?"/,
      `<meta name="keywords" content="${meta.keywords}"`
    );
  }

  // Replace OG title
  html = html.replace(
    /<meta property="og:title" content=".*?"/,
    `<meta property="og:title" content="${meta.title}"`
  );

  // Replace OG description
  html = html.replace(
    /<meta property="og:description" content=".*?"/,
    `<meta property="og:description" content="${meta.description}"`
  );

  // Replace OG URL
  html = html.replace(
    /<meta property="og:url" content=".*?"/,
    `<meta property="og:url" content="${canonicalUrl}"`
  );

  // Replace Twitter title
  html = html.replace(
    /<meta name="twitter:title" content=".*?"/,
    `<meta name="twitter:title" content="${meta.title}"`
  );

  // Replace Twitter description
  html = html.replace(
    /<meta name="twitter:description" content=".*?"/,
    `<meta name="twitter:description" content="${meta.description}"`
  );

  // Replace Twitter URL
  html = html.replace(
    /<meta name="twitter:url" content=".*?"/,
    `<meta name="twitter:url" content="${canonicalUrl}"`
  );

  // Replace canonical URL
  html = html.replace(
    /<link rel="canonical" href=".*?"/,
    `<link rel="canonical" href="${canonicalUrl}"`
  );

  return html;
}

async function getRoutesToInject() {
  const routes = [
    '/',
    '/welcome',
    '/privacy',
    '/terms',
    '/progress',
    '/learning',
  ];

  // Fetch all live courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('name, description, status')
    .in('status', ['live', 'coming_soon']);

  if (coursesError) {
    console.error('Error fetching courses:', coursesError);
  } else {
    console.log(`Found ${courses?.length || 0} courses`);
    courses?.forEach(course => {
      const slug = course.name.toLowerCase().replace(/\s+/g, '-');
      routes.push(`/courses/${slug}`);
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
    console.log(`Found ${posts?.length || 0} blog posts`);
    posts?.forEach(post => {
      routes.push(`/blog/${post.slug}`);
      routeMetadata[`/blog/${post.slug}`] = getBlogMetadata(post);
    });
  }

  return routes;
}

async function injectSEO() {
  console.log('Starting SEO injection...\n');

  const distPath = path.join(__dirname, '..', 'dist');

  // Check if dist folder exists
  if (!fs.existsSync(distPath)) {
    console.error('Error: dist folder not found. Run "vite build" first.');
    process.exit(1);
  }

  // Read base index.html
  const baseHtmlPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(baseHtmlPath)) {
    console.error('Error: dist/index.html not found.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(baseHtmlPath, 'utf-8');
  console.log('Read base index.html');

  // Get all routes to inject
  const routes = await getRoutesToInject();
  console.log(`\nInjecting SEO for ${routes.length} routes...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const route of routes) {
    try {
      const meta = routeMetadata[route];
      if (!meta) {
        console.log(`  Skipping ${route} - no metadata defined`);
        continue;
      }

      // Inject meta tags
      const injectedHtml = injectMetaTags(baseHtml, meta, route);

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

      // Write the injected HTML
      fs.writeFileSync(outputPath, injectedHtml);
      console.log(`  ✓ ${route}`);
      successCount++;

    } catch (error) {
      console.error(`  ✗ ${route}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n---');
  console.log(`SEO injection complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
}

injectSEO().catch(error => {
  console.error('SEO injection failed:', error);
  process.exit(1);
});
