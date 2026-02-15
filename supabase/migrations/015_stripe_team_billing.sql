-- ============================================================
-- 015: Stripe Team Billing & Payment Failure Tracking
-- ============================================================

-- Stripe customers table
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  seats_quantity INT DEFAULT 3,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_failed_at TIMESTAMPTZ,
  payment_failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment events log (immutable)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_customer_id TEXT NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id),
  event_type TEXT NOT NULL, -- invoice.paid, invoice.payment_failed, subscription.updated, etc.
  stripe_event_id TEXT UNIQUE,
  amount_cents INT,
  currency TEXT DEFAULT 'usd',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user ON public.stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_workspace ON public.stripe_customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe ON public.stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_customer ON public.payment_events(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_workspace ON public.payment_events(workspace_id);

-- Trigger
CREATE TRIGGER stripe_customers_updated_at
  BEFORE UPDATE ON public.stripe_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY stripe_customers_own ON public.stripe_customers FOR SELECT
  USING (user_id = auth.uid() OR workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner') AND wm.status = 'active'
  ));

CREATE POLICY payment_events_own ON public.payment_events FOR SELECT
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner') AND wm.status = 'active'
  ));

-- Function to check workspace access level based on payment status
CREATE OR REPLACE FUNCTION public.get_workspace_access_level(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
  v_failed_at TIMESTAMPTZ;
  v_failure_count INT;
  v_days_overdue INT;
BEGIN
  SELECT subscription_status, payment_failed_at, payment_failure_count
  INTO v_status, v_failed_at, v_failure_count
  FROM public.stripe_customers
  WHERE workspace_id = p_workspace_id
  LIMIT 1;

  IF v_status IS NULL OR v_status = 'trialing' OR v_status = 'active' THEN
    RETURN 'full'; -- Full access
  END IF;

  IF v_status = 'past_due' AND v_failed_at IS NOT NULL THEN
    v_days_overdue := EXTRACT(DAY FROM NOW() - v_failed_at);

    IF v_days_overdue <= 7 THEN
      RETURN 'full'; -- Days 1-7: full access, admin gets daily email
    ELSIF v_days_overdue <= 14 THEN
      RETURN 'restricted'; -- Days 8-14: admin full, members read-only
    ELSIF v_days_overdue <= 45 THEN
      RETURN 'suspended'; -- Day 15-45: workspace suspended
    ELSE
      RETURN 'archived'; -- Day 45+: data archived
    END IF;
  END IF;

  IF v_status = 'canceled' THEN
    RETURN 'suspended';
  END IF;

  RETURN 'full';
END;
$$;
