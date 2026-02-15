-- ============================================================
-- 013: RLS Policies for Workspaces & Team Features
-- ============================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

-- Workspaces: owner or member can read
CREATE POLICY workspaces_read ON public.workspaces FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Workspaces: only owner can update
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- Workspaces: authenticated users can create
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Workspace members: members can see other members in their workspace
CREATE POLICY workspace_members_read ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

-- Workspace members: only admins/owners can manage members
CREATE POLICY workspace_members_manage ON public.workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner') AND wm.status = 'active'
    )
  );

-- Workspace invites: admins can manage invites
CREATE POLICY workspace_invites_admin ON public.workspace_invites FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner') AND wm.status = 'active'
    )
  );

-- Workspace invites: invited user can read their own invite
CREATE POLICY workspace_invites_self ON public.workspace_invites FOR SELECT
  USING (
    email IN (
      SELECT u.email FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Contacts: workspace members can see workspace contacts
CREATE POLICY contacts_workspace_read ON public.contacts FOR SELECT
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

-- Notes: workspace members can read notes for workspace contacts
CREATE POLICY notes_workspace_read ON public.notes FOR SELECT
  USING (
    user_id = auth.uid()
    OR contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.workspace_id IN (
        SELECT wm.workspace_id FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid() AND wm.status = 'active'
      )
    )
  );

-- Notes: workspace members can insert notes for workspace contacts
CREATE POLICY notes_workspace_insert ON public.notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.workspace_id IN (
        SELECT wm.workspace_id FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid() AND wm.status = 'active'
      )
    )
  );

-- Note templates: user's own or workspace templates
CREATE POLICY note_templates_read ON public.note_templates FOR SELECT
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
  );

CREATE POLICY note_templates_manage ON public.note_templates FOR ALL
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner') AND wm.status = 'active'
    )
  );
