import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { note_id } = await req.json();
    if (!note_id) throw new Error('note_id is required');

    // Fetch the note and verify ownership
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, contact_id, user_id, summary, detailed_notes, workspace_id')
      .eq('id', note_id)
      .single();

    if (noteError || !note) throw new Error('Note not found');

    // Verify user has access (owner or workspace member)
    if (note.user_id !== user.id) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', note.workspace_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!member) throw new Error('Access denied');
    }

    const noteText = [note.summary, note.detailed_notes].filter(Boolean).join('\n\n');
    if (!noteText.trim()) throw new Error('Note has no text content');

    // ── Generate tags and embedding in parallel ──
    const [tagsResult, embeddingResult] = await Promise.allSettled([
      generateTags(noteText),
      generateEmbedding(noteText),
    ]);

    // ── Save tags ──
    let savedTags: any[] = [];
    if (tagsResult.status === 'fulfilled' && tagsResult.value.length > 0) {
      const tagRows = tagsResult.value.map((t: any) => ({
        contact_id: note.contact_id,
        tag: t.tag,
        auto_generated: true,
        confidence: t.confidence,
      }));

      const { data, error: tagError } = await supabase
        .from('contact_tags')
        .insert(tagRows)
        .select();

      if (tagError) {
        console.error('Failed to save tags:', tagError);
      } else {
        savedTags = data || [];
      }
    }

    // ── Upsert embedding ──
    let embeddingSaved = false;
    if (embeddingResult.status === 'fulfilled' && embeddingResult.value) {
      const { error: embError } = await supabase
        .from('note_embeddings')
        .upsert(
          {
            note_id: note.id,
            embedding: embeddingResult.value,
            model: 'text-embedding-3-small',
          },
          { onConflict: 'note_id' }
        );

      if (embError) {
        console.error('Failed to save embedding:', embError);
      } else {
        embeddingSaved = true;
      }
    }

    // ── Track AI usage ──
    await supabase.from('ai_usage').insert({
      user_id: user.id,
      workspace_id: note.workspace_id,
      model: 'gpt-4o-mini',
      input_tokens: Math.ceil(noteText.length / 4), // rough estimate
      output_tokens: 100,
      cost_usd: 0.0002, // approximate
      purpose: 'auto_tag',
    });

    return json({
      note_id,
      tags: savedTags,
      embedding_saved: embeddingSaved,
      tags_source: tagsResult.status === 'fulfilled' ? 'openai' : 'fallback',
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ── Generate tags via OpenAI GPT-4o-mini ──
async function generateTags(text: string): Promise<Array<{ tag: string; confidence: number }>> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 150,
        messages: [
          {
            role: 'system',
            content:
              'You extract topic tags from meeting notes. Return 3-5 concise, lowercase tags with confidence scores. Respond with JSON only.',
          },
          {
            role: 'user',
            content: `Extract topic tags from these meeting notes:\n\n${text.slice(0, 3000)}\n\nRespond as JSON: {"tags": [{"tag": "...", "confidence": 0.95}]}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tag_response',
            schema: {
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tag: { type: 'string' },
                      confidence: { type: 'number' },
                    },
                    required: ['tag', 'confidence'],
                  },
                },
              },
              required: ['tags'],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return (parsed.tags || []).slice(0, 5);
  } catch (err) {
    console.error('OpenAI tag generation failed, using fallback:', err);
    return fallbackTagExtraction(text);
  }
}

// ── Fallback: extract simple keyword tags locally ──
function fallbackTagExtraction(text: string): Array<{ tag: string; confidence: number }> {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
    'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
    'too', 'very', 'just', 'because', 'about', 'also', 'this', 'that',
    'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
    'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
    'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
    'meeting', 'discussed', 'mentioned', 'talked', 'said', 'noted',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  // Count word frequencies
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // Return top 3-5 by frequency
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxFreq = sorted[0]?.[1] || 1;
  return sorted.map(([tag, count]) => ({
    tag,
    confidence: Math.round((count / maxFreq) * 100) / 100,
  }));
}

// ── Generate embedding via text-embedding-3-small ──
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // API limit safety
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
