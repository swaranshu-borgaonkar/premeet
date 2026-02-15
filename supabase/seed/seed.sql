-- Test user
INSERT INTO users (id, email, full_name, profession, subscription_tier, timezone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@prepmeet.com',
  'Dr. Test User',
  'therapist',
  'individual',
  'America/New_York'
);

-- Test contacts
INSERT INTO contacts (id, user_id, email, full_name, source) VALUES
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'client1@example.com', 'Alice Johnson', 'calendar'),
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'client2@example.com', 'Bob Smith', 'calendar'),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'client3@example.com', 'Carol Williams', 'calendar');

-- Test notes for Alice (multiple, for AI prep testing)
INSERT INTO notes (contact_id, user_id, summary, detailed_notes, event_date) VALUES
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
  'Discussed anxiety management techniques',
  'Alice reported increased anxiety at work. Explored CBT techniques for managing workplace stress. Assigned breathing exercises as homework. She mentioned difficulty sleeping.',
  NOW() - INTERVAL '14 days'),
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
  'Follow-up on CBT techniques',
  'Alice found breathing exercises helpful. Sleep has improved slightly. Discussed progressive muscle relaxation. She is considering talking to HR about workload.',
  NOW() - INTERVAL '7 days'),
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
  'Progress review and new goals',
  'Significant improvement in anxiety levels. Sleep now averaging 7 hours. Wants to work on assertiveness skills next. Considering joining a support group.',
  NOW() - INTERVAL '1 day');

-- Test note for Bob (single note, for single-bullet fallback)
INSERT INTO notes (contact_id, user_id, summary, detailed_notes, event_date) VALUES
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
  'Initial consultation',
  'Bob is seeking help with relationship issues. Has been married for 10 years. Reports communication difficulties with spouse. No prior therapy experience.',
  NOW() - INTERVAL '3 days');

-- Carol has no notes (first session fallback test)
