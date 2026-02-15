CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  profession profession_type DEFAULT 'other',
  subscription_tier subscription_tier DEFAULT 'free',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  timezone TEXT DEFAULT 'UTC',
  calendar_provider calendar_provider,
  email_provider email_provider,
  encrypted_google_refresh_token TEXT,
  encrypted_microsoft_refresh_token TEXT,
  token_updated_at TIMESTAMPTZ DEFAULT NOW(),
  status user_status DEFAULT 'active',
  deletion_requested_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
