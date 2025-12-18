-- ============================================================================
-- STAGING SCHEMA FOR IGNITE EDUCATION
-- ============================================================================
-- Run this SQL in your STAGING Supabase project's SQL Editor
-- This creates all tables, indexes, RLS policies, and triggers
--
-- IMPORTANT: Run this in a NEW Supabase project (not production!)
-- ============================================================================

-- Enable UUID extension (usually enabled by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  enrolled_course TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger to auto-create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, onboarding_completed, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), ''),
    false,
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. COURSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
  name TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('live', 'coming_soon', 'requested')),
  modules TEXT,
  lessons INTEGER,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  module_structure JSONB,
  tutor_name TEXT,
  tutor_position TEXT,
  tutor_description TEXT,
  tutor_image TEXT,
  linkedin_link TEXT,
  calendly_link TEXT,
  reddit_channel TEXT,
  reddit_url TEXT,
  reddit_channel_2 TEXT,
  reddit_url_2 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_display_order ON courses(display_order);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON courses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON courses FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON courses FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 3. LESSONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT REFERENCES courses(name) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  section_number INTEGER NOT NULL,
  lesson_name TEXT,
  title TEXT,
  content_type TEXT NOT NULL,
  content JSONB,
  suggested_question TEXT,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_module_lesson ON lessons(course_id, module_number, lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, module_number, lesson_number, section_number);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON lessons FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON lessons FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON lessons FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON lessons FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 4. LESSON COMPLETIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id, module_number, lesson_number)
);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_course ON lesson_completions(course_id);

ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions" ON lesson_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own completions" ON lesson_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. USER PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  current_module INTEGER NOT NULL DEFAULT 1,
  current_lesson INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON user_progress FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Admins can update all progress" ON user_progress FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- ============================================================================
-- 6. COURSE COMPLETIONS TABLE (Daily Limit Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_completions_user_date ON course_completions(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_course_completions_user_course ON course_completions(user_id, course_id);

-- ============================================================================
-- 7. CERTIFICATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_date TIMESTAMPTZ DEFAULT NOW(),
  user_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON certificates(certificate_number);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates" ON certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view certificates by number" ON certificates FOR SELECT USING (true);
CREATE POLICY "System can insert certificates" ON certificates FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 8. FLASHCARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_lookup ON flashcards(course_id, module_number, lesson_number);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flashcards are viewable by everyone" ON flashcards FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage flashcards" ON flashcards FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- 9. LESSON RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  rating BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id, module_number, lesson_number)
);

CREATE INDEX IF NOT EXISTS idx_lesson_ratings_lookup ON lesson_ratings(course_id, module_number, lesson_number);

ALTER TABLE lesson_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ratings" ON lesson_ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ratings" ON lesson_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings" ON lesson_ratings FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 10. EXPLAINED SECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS explained_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_explained_sections_lesson ON explained_sections(user_id, course_id, module_number, lesson_number);

ALTER TABLE explained_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own explained sections" ON explained_sections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own explained sections" ON explained_sections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own explained sections" ON explained_sections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own explained sections" ON explained_sections FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 11. COURSE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'requested')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_name)
);

CREATE INDEX IF NOT EXISTS idx_course_requests_course_name ON course_requests(course_name);

ALTER TABLE course_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own course requests" ON course_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own course requests" ON course_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all course requests" ON course_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- ============================================================================
-- 12. COACHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL REFERENCES courses(name) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  description TEXT,
  image_url TEXT,
  linkedin_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_course_id ON coaches(course_id);

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coaches" ON coaches FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage coaches" ON coaches FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- 13. REDDIT CACHE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS reddit_posts_cache (
  id TEXT PRIMARY KEY,
  subreddit TEXT NOT NULL,
  author TEXT NOT NULL,
  author_icon TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  tag TEXT,
  upvotes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  url TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id, subreddit)
);

CREATE TABLE IF NOT EXISTS reddit_comments_cache (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  subreddit TEXT NOT NULL,
  author TEXT NOT NULL,
  author_icon TEXT,
  body TEXT NOT NULL,
  created_utc BIGINT NOT NULL,
  score INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (post_id) REFERENCES reddit_posts_cache(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reddit_fetch_log (
  subreddit TEXT PRIMARY KEY,
  last_fetch_at TIMESTAMPTZ DEFAULT NOW(),
  posts_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success'
);

CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit ON reddit_posts_cache(subreddit, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_post_id ON reddit_comments_cache(post_id);

-- ============================================================================
-- 14. BLOCKED REDDIT POSTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blocked_reddit_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reddit_post_id TEXT NOT NULL UNIQUE,
  blocked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_blocked_reddit_posts_reddit_id ON blocked_reddit_posts(reddit_post_id);

-- ============================================================================
-- 15. COMMUNITY TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_icon TEXT,
  tag TEXT,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON community_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view comments" ON community_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view likes" ON community_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their likes" ON community_likes FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 16. BLOG POSTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_name VARCHAR(255) NOT NULL DEFAULT 'Ignite Team',
  author_role VARCHAR(255),
  author_avatar TEXT,
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),
  og_image TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published posts" ON blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Authenticated users can read all posts" ON blog_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert posts" ON blog_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update posts" ON blog_posts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete posts" ON blog_posts FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 17. LESSON AUDIO TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  lesson_name TEXT,
  full_text TEXT,
  audio_base64 TEXT NOT NULL,
  alignment_data JSONB,
  section_markers JSONB,
  voice_gender TEXT DEFAULT 'male',
  voice_id TEXT,
  duration_seconds FLOAT,
  character_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, module_number, lesson_number)
);

CREATE INDEX IF NOT EXISTS idx_lesson_audio_lookup ON lesson_audio(course_id, module_number, lesson_number);

ALTER TABLE lesson_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to lesson_audio" ON lesson_audio FOR SELECT USING (true);
CREATE POLICY "Allow service role full access to lesson_audio" ON lesson_audio FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 18. BLOG POST AUDIO TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_post_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  audio_base64 TEXT NOT NULL,
  alignment_data JSONB,
  voice_id TEXT,
  duration_seconds FLOAT,
  character_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blog_post_id)
);

ALTER TABLE blog_post_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to blog_post_audio" ON blog_post_audio FOR SELECT USING (true);
CREATE POLICY "Allow service role full access to blog_post_audio" ON blog_post_audio FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 19. KNOWLEDGE CHECK RESULTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_check_results_user ON knowledge_check_results(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_check_results_lesson ON knowledge_check_results(course_id, module_number, lesson_number);

ALTER TABLE knowledge_check_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own results" ON knowledge_check_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own results" ON knowledge_check_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTION: update_updated_at_column
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ BEGIN RAISE NOTICE 'Staging schema created successfully!'; END $$;
