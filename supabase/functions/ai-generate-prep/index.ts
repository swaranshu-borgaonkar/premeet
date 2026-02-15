import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Circuit breaker state
let failureCount = 0;
let lastFailureTime = 0;
let usingFallback = false;

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 15 * 60 * 1000; // 15 minutes

serve(async (req) => {
  try {
    const { contact_id, user_id } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check for cached prep
    const { data: cached } = await supabase
      .from('prep_cache')
      .select('*')
      .eq('contact_id', contact_id)
      .eq('user_id', user_id)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch last 5 notes for this contact
    const { data: notes } = await supabase
      .from('notes')
      .select('summary, detailed_notes, event_date')
      .eq('contact_id', contact_id)
      .eq('user_id', user_id)
      .order('event_date', { ascending: false })
      .limit(5);

    // Fetch contact info
    const { data: contact } = await supabase
      .from('contacts')
      .select('full_name')
      .eq('id', contact_id)
      .single();

    // Fetch user's profession for prompt selection
    const { data: user } = await supabase
      .from('users')
      .select('profession')
      .eq('id', user_id)
      .single();

    // Handle edge cases
    if (!notes || notes.length === 0) {
      const result = {
        contact_id,
        user_id,
        bullets: [],
        focus_line: 'First session — no prior notes',
        prompt_version: 'fallback_first',
        event_id: null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      await supabase.from('prep_cache').insert(result);

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (notes.length === 1) {
      const result = {
        contact_id,
        user_id,
        bullets: [notes[0].summary || 'Previous session notes available'],
        focus_line: 'Follow up on initial session',
        prompt_version: 'fallback_single',
        event_id: null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      await supabase.from('prep_cache').insert(result);

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the appropriate AI prompt
    const { data: promptTemplate } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('profession', user?.profession || 'advisor')
      .eq('active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const notesText = notes
      .map((n, i) => `[${n.event_date}] ${n.summary}\n${n.detailed_notes || ''}`)
      .join('\n\n');

    const prompt = (promptTemplate?.template || 'Summarize: {{notes}}')
      .replace('{{contact_name}}', contact?.full_name || 'Client')
      .replace('{{notes}}', notesText);

    const systemPrompt = promptTemplate?.system_prompt || 'You are a professional assistant.';

    // Generate with AI (with fallback chain)
    let aiResult;
    try {
      aiResult = await generateWithOpenAI(prompt, systemPrompt);
    } catch (e) {
      console.error('OpenAI failed, trying Claude:', e);
      try {
        aiResult = await generateWithClaude(prompt, systemPrompt);
      } catch (e2) {
        console.error('Claude failed, using local fallback:', e2);
        aiResult = localFallback(notes, contact?.full_name);
      }
    }

    const result = {
      contact_id,
      user_id,
      bullets: aiResult.bullets,
      focus_line: aiResult.focusLine,
      prompt_version: promptTemplate?.version || 'fallback',
      event_id: null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    await supabase.from('prep_cache').insert(result);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function generateWithOpenAI(prompt: string, systemPrompt: string) {
  checkCircuitBreaker();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'prep_response',
          schema: {
            type: 'object',
            properties: {
              bullets: { type: 'array', items: { type: 'string' }, maxItems: 2 },
              focusLine: { type: 'string' },
            },
            required: ['bullets', 'focusLine'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    recordFailure();
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  resetFailures();
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateWithClaude(prompt: string, systemPrompt: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nRespond with JSON: {"bullets": ["bullet1", "bullet2"], "focusLine": "focus"}`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const data = await response.json();
  const text = data.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse Claude response');
  return JSON.parse(jsonMatch[0]);
}

function localFallback(notes: any[], contactName: string) {
  const recentSummaries = notes
    .slice(0, 2)
    .map((n) => n.summary)
    .filter(Boolean);

  return {
    bullets:
      recentSummaries.length > 0
        ? recentSummaries
        : ['Review previous session notes before meeting'],
    focusLine: `Continue discussion with ${contactName || 'client'}`,
  };
}

function checkCircuitBreaker() {
  if (usingFallback) {
    if (Date.now() - lastFailureTime > CIRCUIT_BREAKER_RESET_MS) {
      usingFallback = false;
      failureCount = 0;
    } else {
      throw new Error('Circuit breaker open');
    }
  }
}

function recordFailure() {
  failureCount++;
  lastFailureTime = Date.now();
  if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    usingFallback = true;
  }
}

function resetFailures() {
  failureCount = 0;
  usingFallback = false;
}
