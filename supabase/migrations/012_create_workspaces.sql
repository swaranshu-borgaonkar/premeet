-- ============================================================
-- 012: Workspaces & Workspace Members
-- Supports Team tier shared context
-- ============================================================

-- Workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.users(id),
  organization_id UUID, -- future: links to organizations table
  subscription_id TEXT, -- Stripe subscription ID
  max_seats INT DEFAULT 3,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
  branding JSONB DEFAULT '{}', -- Phase 4.5: custom branding
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role workspace_role DEFAULT 'member',
  enterprise_role enterprise_role, -- Phase 4: granular RBAC
  permissions JSONB DEFAULT '{}', -- Phase 4: JSONB permissions mask
  invited_by UUID REFERENCES public.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Workspace invites
CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES public.users(id),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add workspace_id to contacts (nullable for personal contacts)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id);

-- Add handoff and follow-up fields to notes
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS handoff_to UUID REFERENCES public.users(id);
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS follow_up BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS follow_up_note TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- Note templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  name TEXT NOT NULL,
  profession profession_type,
  template_body TEXT NOT NULL,
  fields JSONB DEFAULT '[]', -- structured quick-capture fields
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON public.workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON public.workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON public.contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notes_handoff ON public.notes(handoff_to);
CREATE INDEX IF NOT EXISTS idx_notes_follow_up ON public.notes(follow_up) WHERE follow_up = TRUE;
CREATE INDEX IF NOT EXISTS idx_note_templates_workspace ON public.note_templates(workspace_id);

-- Triggers
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER note_templates_updated_at
  BEFORE UPDATE ON public.note_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
