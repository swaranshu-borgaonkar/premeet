-- ============================================================
-- 017: Webhooks & Public API (Phase 5 — Scale)
-- ============================================================

-- Webhook endpoints registered by workspaces
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- HMAC-SHA256 signing key
  events TEXT[] DEFAULT '{}', -- e.g. {'note.created','contact.created'}
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INT,
  response_body TEXT,
  attempts INT DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys for public read-only API
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL, -- SHA-256 hash of the full key
  key_prefix TEXT, -- first 8 chars for display (e.g. "pk_live_a")
  name TEXT,
  permissions JSONB DEFAULT '["read"]',
  rate_limit INT DEFAULT 1000, -- requests per hour
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API request audit log
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status INT NOT NULL,
  response_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_key_created ON public.api_request_logs(api_key_id, created_at);

-- ── RLS ──
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- Webhook endpoints: workspace admins can manage
CREATE POLICY webhook_endpoints_admin ON public.webhook_endpoints
  FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
        AND wm.status = 'active'
    )
  );

-- Webhook deliveries: readable by workspace admins
CREATE POLICY webhook_deliveries_read ON public.webhook_deliveries
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT we.id FROM public.webhook_endpoints we
      WHERE we.workspace_id IN (
        SELECT wm.workspace_id FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.role IN ('admin', 'owner')
          AND wm.status = 'active'
      )
    )
  );

-- API keys: workspace admins can manage
CREATE POLICY api_keys_admin ON public.api_keys
  FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
        AND wm.status = 'active'
    )
  );

-- API request logs: readable by the key owner
CREATE POLICY api_request_logs_owner ON public.api_request_logs
  FOR SELECT
  USING (
    api_key_id IN (
      SELECT ak.id FROM public.api_keys ak
      WHERE ak.user_id = auth.uid()
    )
  );

-- ── Triggers ──
CREATE TRIGGER webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
