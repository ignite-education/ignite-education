import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yjvdakdghkfnlhdpbocg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('\nTo get your service role key:');
  console.error('1. Go to https://supabase.com/dashboard');
  console.error('2. Select your project');
  console.error('3. Go to Settings → API');
  console.error('4. Copy the service_role key (NOT the anon key)');
  console.error('\nThen run:');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_key node migrations/seed-blog-posts.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const samplePosts = [
  {
    slug: 'welcome-to-ignite-education',
    title: 'Welcome to Ignite Education',
    excerpt: 'Discover how Ignite is revolutionizing career education with free, expert-led courses in Product Management and Cybersecurity.',
    content: `
      <p>We're thrilled to launch Ignite Education, your gateway to mastering in-demand skills without breaking the bank.</p>

      <h2>Why Ignite?</h2>
      <p>In today's competitive job market, having the right skills is more important than ever. But quality education shouldn't come with a hefty price tag. That's why we created Ignite—completely free courses taught by industry experts.</p>

      <h2>What We Offer</h2>
      <ul>
        <li><strong>Product Management:</strong> Learn to build products users love, from ideation to launch</li>
        <li><strong>Cybersecurity:</strong> Master the fundamentals of protecting digital assets</li>
        <li><strong>Interactive Learning:</strong> Hands-on lessons with knowledge checks</li>
        <li><strong>Industry Certificates:</strong> Boost your CV with recognized credentials</li>
      </ul>

      <h2>Learn at Your Own Pace</h2>
      <p>All courses are self-paced, so you can learn when it suits you. We recommend completing 2-4 lessons per week for optimal retention.</p>

      <p>Ready to ignite your career? Get started today.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=630&fit=crop',
    author_name: 'Ignite Team',
    author_role: 'Education Platform',
    meta_title: 'Welcome to Ignite Education - Free Career Courses',
    meta_description: 'Discover how Ignite is revolutionizing career education with free, expert-led courses in Product Management and Cybersecurity.',
    status: 'published',
    published_at: new Date('2025-01-15T10:00:00Z').toISOString(),
  },
  {
    slug: 'why-product-management-matters',
    title: 'Why Product Management Matters in 2025',
    excerpt: 'Product Managers are the bridge between technology, business, and users. Learn why this role is more critical than ever.',
    content: `
      <p>Product Management has evolved from a nice-to-have role to an essential function in modern organizations.</p>

      <h2>The Product Manager's Role</h2>
      <p>Product Managers sit at the intersection of business, technology, and user experience. They're responsible for:</p>
      <ul>
        <li>Defining product vision and strategy</li>
        <li>Prioritizing features based on user needs and business goals</li>
        <li>Collaborating with engineering, design, and stakeholders</li>
        <li>Measuring success through data and metrics</li>
      </ul>

      <h2>Why It's High-Demand</h2>
      <p>According to recent industry reports, Product Manager salaries have grown 15% year-over-year, with median salaries exceeding £70,000 in the UK. The demand shows no signs of slowing.</p>

      <h2>Skills You'll Need</h2>
      <ul>
        <li>User research and empathy</li>
        <li>Data analysis and decision-making</li>
        <li>Communication and stakeholder management</li>
        <li>Technical understanding (no coding required!)</li>
        <li>Strategic thinking</li>
      </ul>

      <p>Our Product Management course covers all these fundamentals and more.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=630&fit=crop',
    author_name: 'Sarah Mitchell',
    author_role: 'Senior Product Manager',
    meta_title: 'Why Product Management Matters in 2025 | Ignite',
    meta_description: 'Product Managers are the bridge between technology, business, and users. Learn why this role is more critical than ever.',
    status: 'published',
    published_at: new Date('2025-01-20T14:30:00Z').toISOString(),
  },
  {
    slug: 'cybersecurity-career-guide',
    title: 'Your Complete Guide to Starting a Cybersecurity Career',
    excerpt: 'Cybersecurity professionals are in high demand, with 3.5 million unfilled positions globally. Here\'s how to break into this lucrative field.',
    content: `
      <p>Cybersecurity is one of the fastest-growing fields in tech, with opportunities ranging from entry-level analyst to CISO positions.</p>

      <h2>The Cybersecurity Landscape</h2>
      <p>Every organization needs cybersecurity professionals to protect their digital assets. This creates enormous opportunity:</p>
      <ul>
        <li>3.5 million unfilled cybersecurity positions globally</li>
        <li>Average UK salary: £45,000 - £80,000+</li>
        <li>Multiple specializations to choose from</li>
        <li>Remote work opportunities</li>
      </ul>

      <h2>Common Career Paths</h2>
      <ul>
        <li><strong>Security Analyst:</strong> Monitor systems and respond to threats</li>
        <li><strong>Penetration Tester:</strong> Ethically hack systems to find vulnerabilities</li>
        <li><strong>Security Engineer:</strong> Build and maintain security infrastructure</li>
        <li><strong>Security Consultant:</strong> Advise organizations on security strategy</li>
      </ul>

      <h2>Getting Started</h2>
      <p>You don't need a computer science degree to start in cybersecurity. Our course covers:</p>
      <ul>
        <li>Network security fundamentals</li>
        <li>Threat detection and response</li>
        <li>Encryption and cryptography basics</li>
        <li>Security best practices</li>
        <li>Industry-recognized concepts</li>
      </ul>

      <p>Ready to protect the digital world? Start your cybersecurity journey.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=630&fit=crop',
    author_name: 'James Chen',
    author_role: 'Cybersecurity Expert',
    meta_title: 'Complete Guide to Starting a Cybersecurity Career | Ignite',
    meta_description: 'Cybersecurity professionals are in high demand, with 3.5 million unfilled positions globally. Here\'s how to break into this lucrative field.',
    status: 'published',
    published_at: new Date('2025-01-25T09:00:00Z').toISOString(),
  },
  {
    slug: 'learning-tips-for-busy-professionals',
    title: '5 Learning Tips for Busy Professionals',
    excerpt: 'Juggling work, life, and learning? These proven strategies will help you master new skills without burning out.',
    content: `
      <p>Learning new skills while working full-time can feel overwhelming. Here's how to make it work.</p>

      <h2>1. Set Realistic Goals</h2>
      <p>Don't try to complete an entire course in a week. Aim for 2-4 lessons per week. Consistency beats intensity.</p>

      <h2>2. Create a Schedule</h2>
      <p>Block out specific times for learning, just like you would for meetings. Morning before work or lunch breaks work great for many people.</p>

      <h2>3. Use Active Learning</h2>
      <p>Don't just watch or read—take notes, complete exercises, and apply what you learn immediately. This improves retention by 75%.</p>

      <h2>4. Join a Community</h2>
      <p>Learning with others keeps you accountable and makes the journey more enjoyable. Our Ignite community is here to support you.</p>

      <h2>5. Track Your Progress</h2>
      <p>Celebrate small wins. Completed a lesson? Great! Finished a module? Even better! Progress tracking keeps you motivated.</p>

      <h2>Bonus: The 20-Minute Rule</h2>
      <p>Even on your busiest days, commit to just 20 minutes of learning. You'll be surprised how much you can accomplish in short bursts.</p>

      <p>Our courses are designed with busy professionals in mind.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=630&fit=crop',
    author_name: 'Emily Roberts',
    author_role: 'Learning Experience Designer',
    meta_title: '5 Learning Tips for Busy Professionals | Ignite',
    meta_description: 'Juggling work, life, and learning? These proven strategies will help you master new skills without burning out.',
    status: 'published',
    published_at: new Date('2025-02-01T11:00:00Z').toISOString(),
  },
  {
    slug: 'ignite-premium-announcement',
    title: 'Introducing Ignite Premium: Ad-Free Learning + Exclusive Perks',
    excerpt: 'Get the best learning experience with Ignite Premium—ad-free courses, expert access, and curated job opportunities for just 99p/week.',
    content: `
      <p>We're excited to announce Ignite Premium, our new subscription tier that enhances your learning experience.</p>

      <h2>What's Included?</h2>
      <p>For just 99p per week, you get:</p>
      <ul>
        <li><strong>Ad-Free Experience:</strong> Focus on learning without distractions</li>
        <li><strong>Expert Q&A Sessions:</strong> Monthly live sessions with industry professionals</li>
        <li><strong>Job Board Access:</strong> Curated opportunities matched to your skills</li>
        <li><strong>Priority Support:</strong> Get help when you need it</li>
        <li><strong>Early Access:</strong> Be the first to try new courses and features</li>
      </ul>

      <h2>Why We Created Premium</h2>
      <p>Our core courses will always be free. Premium exists to provide extra value for those who want more—while helping us continue offering free education to everyone.</p>

      <h2>Free vs. Premium</h2>
      <p><strong>Free Plan:</strong></p>
      <ul>
        <li>Full access to all courses</li>
        <li>Certificates upon completion</li>
        <li>Community support</li>
        <li>Limited advertising</li>
      </ul>

      <p><strong>Premium Plan (99p/week):</strong></p>
      <ul>
        <li>Everything in Free</li>
        <li>Ad-free experience</li>
        <li>Expert Q&A sessions</li>
        <li>Job board access</li>
        <li>Priority support</li>
      </ul>

      <p>Ready to upgrade your learning? Try Premium today.</p>
    `,
    featured_image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=630&fit=crop',
    author_name: 'Ignite Team',
    author_role: 'Product Team',
    meta_title: 'Introducing Ignite Premium - Ad-Free Learning | Ignite',
    meta_description: 'Get the best learning experience with Ignite Premium—ad-free courses, expert access, and curated job opportunities for just 99p/week.',
    status: 'published',
    published_at: new Date('2025-02-05T10:00:00Z').toISOString(),
  },
];

async function seedBlogPosts() {
  try {
    console.log('🌱 Starting blog posts seeding...\n');

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(samplePosts)
      .select();

    if (error) throw error;

    console.log(`✅ Successfully created ${data.length} blog posts!\n`);
    console.log('📝 Created posts:');
    data.forEach((post, index) => {
      console.log(`   ${index + 1}. ${post.title} (/blog/${post.slug})`);
    });

    console.log('\n🎉 Blog seeding complete!');
    console.log('\n📍 View your posts at your Ignite site');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }
}

seedBlogPosts();
