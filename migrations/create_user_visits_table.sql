-- Track page visits with geo location data (from Vercel headers)
CREATE TABLE public.user_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  page TEXT NOT NULL,
  country TEXT,
  region TEXT,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_visits_user_id ON public.user_visits(user_id);
CREATE INDEX idx_user_visits_page ON public.user_visits(page);
CREATE INDEX idx_user_visits_country ON public.user_visits(country);
CREATE INDEX idx_user_visits_visited_at ON public.user_visits(visited_at);

-- RLS: users can insert their own visits, admins can read all
ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own visits"
  ON public.user_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all visits"
  ON public.user_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
