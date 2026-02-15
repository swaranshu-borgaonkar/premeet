CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  summary TEXT,
  detailed_notes TEXT,
  voice_transcript TEXT,
  tags JSONB DEFAULT '[]',
  version INT DEFAULT 1,
  is_follow_up BOOLEAN DEFAULT FALSE,
  follow_up_note TEXT,
  event_id TEXT,
  event_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_contact ON notes(contact_id);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_workspace ON notes(workspace_id);
CREATE INDEX idx_notes_event_date ON notes(event_date DESC);

-- Full-text search index
CREATE INDEX idx_notes_fts ON notes USING gin(
  to_tsvector('english', COALESCE(summary, '') || ' ' || COALESCE(detailed_notes, ''))
);

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION increment_note_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_version_increment
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION increment_note_version();
