-- ============================================================
-- 016: Enterprise Organizations, SSO, SCIM, Granular RBAC
-- ============================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  domain TEXT, -- for email domain matching
  sso_provider TEXT, -- 'okta', 'azure_ad', 'google', 'onelogin'
  sso_connection_id TEXT, -- WorkOS connection ID
  scim_directory_id TEXT, -- WorkOS directory ID
  settings JSONB DEFAULT '{}',
  data_region TEXT DEFAULT 'us' CHECK (data_region IN ('us', 'eu', 'apac')),
  max_workspaces INT DEFAULT 10,
  custom_ai_prompts BOOLEAN DEFAULT FALSE,
  custom_branding BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link workspaces to organizations
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- SSO SAML states (temporary, 10 min expiry)
CREATE TABLE IF NOT EXISTS public.saml_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  redirect_url TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom fields definition (per workspace/org)
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id),
  organization_id UUID REFERENCES public.organizations(id),
  field_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'date', 'select', 'multiselect', 'boolean')),
  field_options JSONB DEFAULT '[]', -- for select/multiselect
  required BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI cost tracking
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  organization_id UUID REFERENCES public.organizations(id),
  model TEXT NOT NULL, -- 'gpt-4o-mini', 'claude-haiku', etc.
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  purpose TEXT DEFAULT 'prep', -- 'prep', 'auto_tag', 'search'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal holds (prevents deletion while active)
CREATE TABLE IF NOT EXISTS public.legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  released_by UUID REFERENCES public.users(id),
  released_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'released')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency access requests
CREATE TABLE IF NOT EXISTS public.emergency_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  requester_id UUID NOT NULL REFERENCES public.users(id),
  target_user_id UUID NOT NULL REFERENCES public.users(id),
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES public.users(id),
  waiting_period_days INT DEFAULT 7,
  access_granted_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'active')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data steward nomination
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS data_steward_id UUID REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS data_steward_legal_attestation BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON public.organizations(domain);
CREATE INDEX IF NOT EXISTS idx_organizations_sso ON public.organizations(sso_connection_id);
CREATE INDEX IF NOT EXISTS idx_saml_states_state ON public.saml_states(state);
CREATE INDEX IF NOT EXISTS idx_saml_states_expires ON public.saml_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace ON public.custom_fields(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace ON public.ai_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_legal_holds_org ON public.legal_holds(organization_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_emergency_access_org ON public.emergency_access_requests(organization_id);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_access_requests ENABLE ROW LEVEL SECURITY;

-- Organizations: members of workspaces under this org can read
CREATE POLICY organizations_read ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT w.organization_id FROM public.workspaces w
      JOIN public.workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

-- Custom fields: workspace members can read
CREATE POLICY custom_fields_read ON public.custom_fields FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

-- AI usage: admins can read
CREATE POLICY ai_usage_read ON public.ai_usage FOR SELECT
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner') AND wm.status = 'active'
    )
  );

-- Triggers
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cleanup expired SAML states
CREATE OR REPLACE FUNCTION cleanup_expired_saml_states()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.saml_states WHERE expires_at < NOW();
$$;
