-- ============================================================
-- 014: Team Analytics Views & Functions
-- ============================================================

-- Team analytics: appointments per provider
CREATE OR REPLACE FUNCTION public.team_analytics_summary(p_workspace_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_contacts', (
      SELECT COUNT(*) FROM public.contacts
      WHERE workspace_id = p_workspace_id
    ),
    'total_notes', (
      SELECT COUNT(*) FROM public.notes n
      JOIN public.contacts c ON n.contact_id = c.id
      WHERE c.workspace_id = p_workspace_id
    ),
    'active_members', (
      SELECT COUNT(*) FROM public.workspace_members
      WHERE workspace_id = p_workspace_id AND status = 'active'
    ),
    'notes_this_week', (
      SELECT COUNT(*) FROM public.notes n
      JOIN public.contacts c ON n.contact_id = c.id
      WHERE c.workspace_id = p_workspace_id
        AND n.created_at >= NOW() - INTERVAL '7 days'
    ),
    'notes_this_month', (
      SELECT COUNT(*) FROM public.notes n
      JOIN public.contacts c ON n.contact_id = c.id
      WHERE c.workspace_id = p_workspace_id
        AND n.created_at >= NOW() - INTERVAL '30 days'
    ),
    'pending_follow_ups', (
      SELECT COUNT(*) FROM public.notes n
      JOIN public.contacts c ON n.contact_id = c.id
      WHERE c.workspace_id = p_workspace_id
        AND n.follow_up = TRUE
    ),
    'inactive_contacts_30d', (
      SELECT COUNT(*) FROM public.contacts
      WHERE workspace_id = p_workspace_id
        AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '30 days')
    ),
    'notes_per_member', (
      SELECT json_agg(json_build_object(
        'user_id', n.user_id,
        'count', COUNT(*)
      ))
      FROM public.notes n
      JOIN public.contacts c ON n.contact_id = c.id
      WHERE c.workspace_id = p_workspace_id
        AND n.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY n.user_id
    ),
    'contact_frequency', (
      SELECT json_agg(json_build_object(
        'contact_id', c.id,
        'full_name', c.full_name,
        'note_count', (SELECT COUNT(*) FROM public.notes n WHERE n.contact_id = c.id),
        'last_seen_at', c.last_seen_at
      ) ORDER BY c.last_seen_at DESC NULLS LAST)
      FROM public.contacts c
      WHERE c.workspace_id = p_workspace_id
      LIMIT 50
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Full-text search on notes
CREATE INDEX IF NOT EXISTS idx_notes_fts_search
  ON public.notes
  USING GIN (to_tsvector('english', COALESCE(summary, '') || ' ' || COALESCE(detailed_notes, '')));

-- Full-text search function
CREATE OR REPLACE FUNCTION public.search_notes(
  p_user_id UUID,
  p_query TEXT,
  p_workspace_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  contact_id UUID,
  summary TEXT,
  detailed_notes TEXT,
  event_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.contact_id,
    n.summary,
    n.detailed_notes,
    n.event_date,
    n.created_at,
    ts_rank(
      to_tsvector('english', COALESCE(n.summary, '') || ' ' || COALESCE(n.detailed_notes, '')),
      plainto_tsquery('english', p_query)
    ) AS rank
  FROM public.notes n
  LEFT JOIN public.contacts c ON n.contact_id = c.id
  WHERE
    to_tsvector('english', COALESCE(n.summary, '') || ' ' || COALESCE(n.detailed_notes, ''))
    @@ plainto_tsquery('english', p_query)
    AND (
      n.user_id = p_user_id
      OR (p_workspace_id IS NOT NULL AND c.workspace_id = p_workspace_id)
    )
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;
