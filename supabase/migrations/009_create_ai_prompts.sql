CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  profession profession_type,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  template TEXT NOT NULL,
  system_prompt TEXT,
  active BOOLEAN DEFAULT TRUE,
  model TEXT DEFAULT 'gpt-4o-mini',
  max_tokens INT DEFAULT 200,
  temperature NUMERIC(3,2) DEFAULT 0.3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_prompts_active ON ai_prompts(profession, active) WHERE active = TRUE;

-- Insert default prompts per profession
INSERT INTO ai_prompts (version, profession, template, system_prompt) VALUES
('1.0', 'therapist',
  'Based on the following session notes for {{contact_name}}, provide exactly 2 concise bullet points summarizing key themes and a focus line for the upcoming session.\n\nNotes:\n{{notes}}',
  'You are a clinical assistant helping therapists prepare for sessions. Be concise, clinically relevant, and sensitive to therapeutic dynamics. Never diagnose.'),
('1.0', 'lawyer',
  'Based on the following case notes for {{contact_name}}, provide exactly 2 concise bullet points summarizing case status and a focus line for the upcoming meeting.\n\nNotes:\n{{notes}}',
  'You are a legal assistant helping attorneys prepare for client meetings. Focus on case status, deadlines, and action items. Maintain attorney-client privilege awareness.'),
('1.0', 'doctor',
  'Based on the following patient notes for {{contact_name}}, provide exactly 2 concise bullet points summarizing recent concerns and a focus line for the upcoming appointment.\n\nNotes:\n{{notes}}',
  'You are a medical assistant helping physicians prepare for patient appointments. Be clinically accurate and concise. Focus on ongoing concerns and follow-ups.'),
('1.0', 'advisor',
  'Based on the following meeting notes for {{contact_name}}, provide exactly 2 concise bullet points summarizing key discussion points and a focus line for the upcoming meeting.\n\nNotes:\n{{notes}}',
  'You are a professional assistant helping advisors prepare for client meetings. Focus on goals, action items, and relationship context.'),
('1.0', 'consultant',
  'Based on the following engagement notes for {{contact_name}}, provide exactly 2 concise bullet points summarizing project status and a focus line for the upcoming meeting.\n\nNotes:\n{{notes}}',
  'You are a consulting assistant helping consultants prepare for client meetings. Focus on deliverables, milestones, and stakeholder concerns.');
