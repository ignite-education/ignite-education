-- Create release_notes table
CREATE TABLE release_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,
  release_date DATE NOT NULL,
  notes JSONB NOT NULL,  -- Array of bullet point strings
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE release_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Public users can view published releases
CREATE POLICY "Public can view published releases" ON release_notes
  FOR SELECT USING (status = 'published');

-- Policy: Authenticated users can manage all releases
CREATE POLICY "Authenticated users can manage releases" ON release_notes
  FOR ALL USING (auth.role() = 'authenticated');

-- Index for performance on common queries
CREATE INDEX idx_release_notes_status_date ON release_notes(status, release_date DESC);

-- Updated_at trigger function (reuse if exists, otherwise create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_release_notes_updated_at
    BEFORE UPDATE ON release_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
