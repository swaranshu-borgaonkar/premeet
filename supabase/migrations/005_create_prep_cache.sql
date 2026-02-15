CREATE TABLE prep_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bullets JSONB NOT NULL DEFAULT '[]',
  focus_line TEXT,
  prompt_version TEXT DEFAULT '1.0',
  event_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prep_cache_contact ON prep_cache(contact_id);
CREATE INDEX idx_prep_cache_user ON prep_cache(user_id);
CREATE INDEX idx_prep_cache_expires ON prep_cache(expires_at);

-- Auto-cleanup expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_prep_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM prep_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
