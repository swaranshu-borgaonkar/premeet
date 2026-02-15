-- Subscription tiers
CREATE TYPE subscription_tier AS ENUM ('free', 'individual', 'team', 'enterprise');

-- Profession types
CREATE TYPE profession_type AS ENUM ('therapist', 'lawyer', 'doctor', 'advisor', 'consultant', 'other');

-- User status
CREATE TYPE user_status AS ENUM ('active', 'pending_deletion', 'deleted', 'suspended');

-- Workspace roles
CREATE TYPE workspace_role AS ENUM ('admin', 'member', 'viewer');

-- Enterprise roles
CREATE TYPE enterprise_role AS ENUM ('owner', 'billing_admin', 'compliance_officer', 'clinical_director', 'clinician', 'trainee', 'viewer');

-- Email schedule options
CREATE TYPE email_schedule AS ENUM ('immediate', 'next_morning', 'custom');

-- Sync status
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'conflict', 'failed');

-- Calendar provider
CREATE TYPE calendar_provider AS ENUM ('google', 'microsoft', 'apple');

-- Email provider
CREATE TYPE email_provider AS ENUM ('gmail', 'outlook', 'smtp');
