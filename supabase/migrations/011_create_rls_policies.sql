-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update own record
CREATE POLICY users_self_select ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_self_update ON users
  FOR UPDATE USING (auth.uid() = id);

-- Contacts: own contacts or workspace contacts
CREATE POLICY contacts_own ON contacts
  FOR ALL USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Notes: read own or workspace notes
CREATE POLICY notes_read ON notes
  FOR SELECT USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Notes: write own notes only
CREATE POLICY notes_write ON notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notes_update ON notes
  FOR UPDATE USING (user_id = auth.uid());

-- Prep cache: own only
CREATE POLICY prep_cache_own ON prep_cache
  FOR ALL USING (user_id = auth.uid());

-- Popup views: own only
CREATE POLICY popup_views_own ON popup_views
  FOR ALL USING (user_id = auth.uid());

-- Email queue: own only
CREATE POLICY email_queue_own ON email_queue
  FOR ALL USING (user_id = auth.uid());

-- Email templates: own or workspace
CREATE POLICY email_templates_own ON email_templates
  FOR ALL USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Sync queue: own only
CREATE POLICY sync_queue_own ON sync_queue
  FOR ALL USING (user_id = auth.uid());

-- Workspaces: members only
CREATE POLICY workspaces_member ON workspaces
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY workspaces_owner_modify ON workspaces
  FOR ALL USING (owner_id = auth.uid());

-- Workspace members: visible to workspace members
CREATE POLICY workspace_members_read ON workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid())
  );

-- Workspace members: only admins can modify
CREATE POLICY workspace_members_admin ON workspace_members
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Data exports: own only
CREATE POLICY data_exports_own ON data_exports
  FOR ALL USING (user_id = auth.uid());

-- Audit logs: workspace admins can read
CREATE POLICY audit_logs_read ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Audit logs: insert only (via service role or triggers)
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (TRUE);
