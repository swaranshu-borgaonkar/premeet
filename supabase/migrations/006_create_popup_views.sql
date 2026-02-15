CREATE TABLE popup_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  event_id TEXT,
  action TEXT CHECK (action IN ('viewed', 'dismissed', 'snoozed', 'expanded')),
  prep_cache_id UUID REFERENCES prep_cache(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_popup_views_user ON popup_views(user_id);
CREATE INDEX idx_popup_views_date ON popup_views(viewed_at DESC);
