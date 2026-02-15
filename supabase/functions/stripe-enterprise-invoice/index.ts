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

    const { action, ...params } = await req.json();

    switch (action) {
      // Create invoice for enterprise (NET-30/60)
      case 'create_invoice': {
        const { customer_id, amount_cents, description, due_days = 30, currency = 'usd' } = params;

        const invoice = await stripe.invoices.create({
          customer: customer_id,
          collection_method: 'send_invoice',
          days_until_due: due_days,
          auto_advance: true,
        });

        await stripe.invoiceItems.create({
          customer: customer_id,
          invoice: invoice.id,
          amount: amount_cents,
          currency,
          description,
        });

        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

        // Log payment event
        await supabase.from('payment_events').insert({
          stripe_customer_id: customer_id,
          event_type: 'invoice.created',
          stripe_event_id: finalizedInvoice.id,
          amount_cents,
          currency,
          metadata: { due_days, description },
        });

        return new Response(
          JSON.stringify({
            invoice_id: finalizedInvoice.id,
            invoice_url: finalizedInvoice.hosted_invoice_url,
            invoice_pdf: finalizedInvoice.invoice_pdf,
            due_date: new Date(finalizedInvoice.due_date! * 1000).toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // List invoices for a customer
      case 'list_invoices': {
        const { customer_id, limit = 20 } = params;
        const invoices = await stripe.invoices.list({
          customer: customer_id,
          limit,
        });

        const formatted = invoices.data.map(inv => ({
          id: inv.id,
          amount: inv.amount_due,
          currency: inv.currency,
          status: inv.status,
          due_date: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
          paid_at: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : null,
          invoice_url: inv.hosted_invoice_url,
          invoice_pdf: inv.invoice_pdf,
          created: new Date(inv.created * 1000).toISOString(),
        }));

        return new Response(
          JSON.stringify(formatted),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create portal session for self-serve billing management
      case 'billing_portal': {
        const { customer_id, return_url } = params;
        const session = await stripe.billingPortal.sessions.create({
          customer: customer_id,
          return_url: return_url || Deno.env.get('SITE_URL'),
        });

        return new Response(
          JSON.stringify({ url: session.url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
