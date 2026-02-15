-- ============================================================
-- 018: AI Vector Search & Auto-Tagging (Phase 5 — Scale)
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Note embeddings for semantic search
CREATE TABLE IF NOT EXISTS public.note_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL UNIQUE REFERENCES public.notes(id) ON DELETE CASCADE,
  embedding vector(1536),
  model TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generated (and manual) contact tags
CREATE TABLE IF NOT EXISTS public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  auto_generated BOOLEAN DEFAULT FALSE,
  confidence NUMERIC(3,2), -- 0.00 to 1.00
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──

-- IVFFlat index for fast approximate nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_note_embeddings_vector
  ON public.note_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON public.contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON public.contact_tags(tag);

-- ── RLS ──
ALTER TABLE public.note_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- Note embeddings: same access as the underlying note (user owns it or workspace member)
CREATE POLICY note_embeddings_read ON public.note_embeddings
  FOR SELECT
  USING (
    note_id IN (
      SELECT n.id FROM public.notes n
      WHERE n.user_id = auth.uid()
         OR n.workspace_id IN (
           SELECT wm.workspace_id FROM public.workspace_members wm
           WHERE wm.user_id = auth.uid() AND wm.status = 'active'
         )
    )
  );

CREATE POLICY note_embeddings_insert ON public.note_embeddings
  FOR INSERT
  WITH CHECK (
    note_id IN (
      SELECT n.id FROM public.notes n
      WHERE n.user_id = auth.uid()
    )
  );

-- Contact tags: same access as the underlying contact
CREATE POLICY contact_tags_read ON public.contact_tags
  FOR SELECT
  USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.user_id = auth.uid()
         OR c.workspace_id IN (
           SELECT wm.workspace_id FROM public.workspace_members wm
           WHERE wm.user_id = auth.uid() AND wm.status = 'active'
         )
    )
  );

CREATE POLICY contact_tags_insert ON public.contact_tags
  FOR INSERT
  WITH CHECK (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.user_id = auth.uid()
    )
  );

-- ── Semantic Search Function ──
CREATE OR REPLACE FUNCTION public.semantic_search_notes(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  note_id UUID,
  contact_id UUID,
  summary TEXT,
  detailed_notes TEXT,
  event_date TIMESTAMPTZ,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    n.id AS note_id,
    n.contact_id,
    n.summary,
    n.detailed_notes,
    n.event_date,
    1 - (ne.embedding <=> query_embedding) AS similarity
  FROM public.note_embeddings ne
  JOIN public.notes n ON n.id = ne.note_id
  WHERE
    (p_user_id IS NULL OR n.user_id = p_user_id
     OR n.workspace_id IN (
       SELECT wm.workspace_id FROM public.workspace_members wm
       WHERE wm.user_id = p_user_id AND wm.status = 'active'
     ))
    AND 1 - (ne.embedding <=> query_embedding) > match_threshold
  ORDER BY ne.embedding <=> query_embedding
  LIMIT match_count;
$$;
