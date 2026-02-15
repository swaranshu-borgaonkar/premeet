import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { workspace_id, seats = 3, plan = 'monthly' } = await req.json();

    if (seats < 3) throw new Error('Minimum 3 seats required');

    // Get or create Stripe customer
    let { data: stripeCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('workspace_id', workspace_id)
      .single();

    let customerId: string;

    if (stripeCustomer?.stripe_customer_id) {
      customerId = stripeCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { workspace_id, user_id: user.id },
      });
      customerId = customer.id;

      await supabase.from('stripe_customers').insert({
        user_id: user.id,
        workspace_id,
        stripe_customer_id: customerId,
        seats_quantity: seats,
      });
    }

    // Select price based on plan
    const priceId = plan === 'yearly'
      ? Deno.env.get('STRIPE_TEAM_YEARLY_PRICE_ID')
      : Deno.env.get('STRIPE_TEAM_MONTHLY_PRICE_ID');

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: seats,
      }],
      subscription_data: {
        trial_period_days: 30,
        metadata: { workspace_id, user_id: user.id },
      },
      success_url: `${Deno.env.get('SITE_URL')}/team/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('SITE_URL')}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
