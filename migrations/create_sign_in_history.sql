-- Track sign-in timestamps for behaviour analysis (time-of-day, day-of-week patterns)
CREATE TABLE public.sign_in_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  signed_in_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sign_in_history_user ON sign_in_history(user_id, signed_in_at DESC);

ALTER TABLE public.sign_in_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sign-ins"
  ON public.sign_in_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own sign-ins"
  ON public.sign_in_history FOR SELECT
  USING (auth.uid() = user_id);
